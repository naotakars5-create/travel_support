import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoPoint, PackingItem, ParseApiResponse, PlanApiResponse, PlanEntry, ScheduleSlot, SpotSuggestion } from "@/lib/types";
import { buildSeedEntries } from "@/lib/seedEntries";
import { loadState, saveState } from "@/lib/storage";
import { buildRail, firstSeedGeo, lastSeedGeo, RailItem, sortedGroupEvents } from "@/lib/itinerary";
import { getDayOfState, DayOfState } from "@/lib/dayof";
import {
  buildEventsFromSchedule,
  computePlanTotals,
  entryPlaceText,
  eventToPlanEntry,
  inputToEntry,
  localSchedule,
  PlanEntryInput,
  scheduleSignature,
  suggestionToEntry,
} from "@/lib/plan";
import { buildDefaultPacking } from "@/lib/packing";
import { TransitEstimate, createPrecomputedEstimator, guessMode } from "@/lib/transit";
import { apiUrl } from "@/lib/apiBase";
import { haversineMeters } from "@/lib/geo";
import { useLiveLocation } from "./useLiveLocation";

/** この距離（メートル）以内に近づいたら、GPSで到着を自動記録する。 */
const ARRIVAL_THRESHOLD_METERS = 120;

export type Tab = "plan" | "itin" | "today" | "packing";

interface FlashState {
  visible: boolean;
  text: string;
}

function genId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useAppState() {
  const [entries, setEntries] = useState<PlanEntry[] | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [packing, setPacking] = useState<PackingItem[]>([]);
  const [currentNodeKey, setCurrentNodeKey] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("plan");
  const [flash, setFlash] = useState<FlashState>({ visible: false, text: "" });
  const [justAddedEventId, setJustAddedEventId] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  const [suggestions, setSuggestions] = useState<SpotSuggestion[]>([]);
  const [planNotes, setPlanNotes] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const initializedRef = useRef(false);
  // 「構造」が既にスケジュール済みかを追跡し、座標だけ埋まった時の不要な再ローカル化を防ぐ。
  const scheduleSigRef = useRef<string | null>(null);

  // 初期化：AsyncStorageに保存済みなら復元、無ければシード行き先を生成
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void (async () => {
      const persisted = await loadState();
      if (persisted) {
        setEntries(persisted.entries);
        setSlots(persisted.slots);
        setPacking(persisted.packing);
        setCurrentNodeKey(persisted.currentNodeKey);
        scheduleSigRef.current = scheduleSignature(persisted.entries);
      } else {
        const seeded = buildSeedEntries(new Date());
        setEntries(seeded);
        setSlots(localSchedule(seeded, new Date()));
        setPacking(buildDefaultPacking());
        scheduleSigRef.current = scheduleSignature(seeded);
      }
    })();
  }, []);

  // 永続化
  useEffect(() => {
    if (!entries) return;
    void saveState({ version: 2, entries, slots, currentNodeKey, packing, savedAt: new Date().toISOString() });
  }, [entries, slots, currentNodeKey, packing]);

  // 現在時刻の更新（当日画面のカウントダウン用）
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 行き先の「構造」が変わったら（追加・削除・時刻/滞在/重要度/種別の変更）、ローカルで即座に再スケジュール。
  // 座標だけがジオコーディングで埋まった場合は署名が変わらないため、AIで組んだ順路を壊さない。
  useEffect(() => {
    if (!entries) return;
    const sig = scheduleSignature(entries);
    if (scheduleSigRef.current === sig) return;
    scheduleSigRef.current = sig;
    setSlots(localSchedule(entries, new Date()));
    // 構造が変わったら以前のAI提案・メモは古くなるのでクリア
    setSuggestions([]);
    setPlanNotes(null);
  }, [entries]);

  // 旅程イベントは entries + slots から都度導出する（座標も entry から引き継ぐ）。
  const events = useMemo(() => buildEventsFromSchedule(entries ?? [], slots), [entries, slots]);

  // 地点テキスト（place / title）を座標へジオコーディングし、entries へ書き戻す。
  useEffect(() => {
    if (!entries) return;
    let cancelled = false;
    async function run() {
      const list = entries ?? [];
      const targets = list.filter((e) => !e.placeGeo);
      if (targets.length === 0) return;
      const unique = new Map<string, string>();
      targets.forEach((e) => unique.set(e.id, entryPlaceText(e)));

      const entriesGeo = await Promise.all(
        Array.from(unique.entries()).map(async ([id, text]) => {
          try {
            const res = await fetch(apiUrl("/api/geocode"), {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ query: text }),
            });
            const data = await res.json();
            return [id, (data.point as GeoPoint | null) ?? null] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      if (cancelled) return;
      const geoById = new Map(entriesGeo);
      if (![...geoById.values()].some(Boolean)) return;

      setEntries((prev) =>
        prev ? prev.map((e) => (!e.placeGeo && geoById.get(e.id) ? { ...e, placeGeo: geoById.get(e.id)! } : e)) : prev
      );
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [entries]);

  // ジオコーディング済みの隣接イベント間について、Google Directions API で実測の移動時間を取得しキャッシュする。
  const [transitCache, setTransitCache] = useState<Record<string, TransitEstimate>>({});
  const transitCacheRef = useRef(transitCache);
  useEffect(() => {
    transitCacheRef.current = transitCache;
  }, [transitCache]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const sorted = sortedGroupEvents(events);
      const pending: { key: string; origin: GeoPoint; destination: GeoPoint; mode: TransitEstimate["mode"] }[] = [];
      for (let i = 0; i < sorted.length - 1; i++) {
        const prev = sorted[i];
        const next = sorted[i + 1];
        const key = `${prev.id}:${next.id}`;
        if (transitCacheRef.current[key]) continue;
        const origin = lastSeedGeo(prev);
        const destination = firstSeedGeo(next);
        if (!origin || !destination) continue;
        const mode = guessMode(prev.placeTo ?? prev.title, next.placeFrom ?? next.title);
        if (mode === "air") continue; // Directions APIでは空路は扱わない
        pending.push({ key, origin, destination, mode });
      }
      if (pending.length === 0) return;

      const results = await Promise.all(
        pending.map(async (p) => {
          try {
            const res = await fetch(apiUrl("/api/directions"), {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ origin: p.origin, destination: p.destination, mode: p.mode }),
            });
            const data = await res.json();
            if (data.result) return [p.key, { mode: p.mode, durationMin: data.result.durationMin }] as const;
          } catch {
            // フォールバック（ヒューリスティック推定）に委ねる
          }
          return null;
        })
      );
      if (cancelled) return;
      const updates = results.filter((r): r is readonly [string, TransitEstimate] => r !== null);
      if (updates.length > 0) {
        setTransitCache((prev) => ({ ...prev, ...Object.fromEntries(updates) }));
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [events]);

  const transitEstimator = useMemo(() => createPrecomputedEstimator(transitCache), [transitCache]);
  const rail: RailItem[] = useMemo(() => buildRail(events, false, transitEstimator), [events, transitEstimator]);
  const dayOfState: DayOfState = useMemo(() => getDayOfState(rail, currentNodeKey), [rail, currentNodeKey]);
  const totals = useMemo(() => computePlanTotals(entries ?? []), [entries]);

  // 行き先を追加した時のハイライト演出
  const flashNewEvent = useCallback((entryId: string) => {
    const evId = `evt-${entryId}`;
    setJustAddedEventId(evId);
    setTimeout(() => setJustAddedEventId(null), 600);
  }, []);

  const addEntry = useCallback(
    (input: PlanEntryInput) => {
      const entry = inputToEntry(genId("entry"), input);
      if (!entry) return null;
      setEntries((prev) => [...(prev ?? []), entry]);
      flashNewEvent(entry.id);
      return entry;
    },
    [flashNewEvent]
  );

  const addSuggestion = useCallback(
    (s: SpotSuggestion) => {
      const entry = suggestionToEntry(genId("entry"), s);
      setEntries((prev) => [...(prev ?? []), entry]);
      setSuggestions((prev) => prev.filter((x) => x.title !== s.title));
      flashNewEvent(entry.id);
      return entry;
    },
    [flashNewEvent]
  );

  const updateEntry = useCallback((id: string, patch: Partial<PlanEntry>) => {
    setEntries((prev) =>
      prev
        ? prev.map((e) => {
            if (e.id !== id) return e;
            const next = { ...e, ...patch };
            // 場所テキストが変わったら座標を無効化し、再ジオコーディングさせる
            if (patch.place !== undefined || patch.title !== undefined) next.placeGeo = undefined;
            return next;
          })
        : prev
    );
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
  }, []);

  /** 予約メール本文を解析し、確定アンカーの行き先として取り込む（補助機能）。 */
  const importFromMail = useCallback(async (body: string, source: string): Promise<{ ok: boolean; message?: string }> => {
    let result: ParseApiResponse;
    try {
      const res = await fetch(apiUrl("/api/parse"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, source, referenceDate: new Date().toISOString() }),
      });
      result = (await res.json()) as ParseApiResponse;
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "ネットワークエラーが発生しました" };
    }

    if (result.kind === "events") {
      const imported = result.events.map((ev) => eventToPlanEntry(ev));
      setEntries((prev) => [...(prev ?? []), ...imported]);
      if (imported[0]) flashNewEvent(imported[0].id);
      return { ok: true };
    }
    if (result.kind === "skip") {
      return { ok: false, message: "予約情報が見つかりませんでした。手入力で追加してください。" };
    }
    return { ok: false, message: result.message };
  }, [flashNewEvent]);

  /** AIに旅程を組み直してもらう（並べ替え＋時刻割り当て＋おすすめ提案）。 */
  const composeWithAi = useCallback(async () => {
    const list = entries ?? [];
    if (list.length === 0) return;
    setComposing(true);
    setComposeError(null);
    try {
      const res = await fetch(apiUrl("/api/plan"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries: list, referenceDate: new Date().toISOString() }),
      });
      const data = (await res.json()) as PlanApiResponse;
      if (data.kind === "plan") {
        setSlots(data.schedule);
        // AIの順路を採用したので、この構造は「スケジュール済み」として記録し、ローカル再計算で上書きしない。
        scheduleSigRef.current = scheduleSignature(list);
        setSuggestions(data.suggestions);
        setPlanNotes(data.notes ?? null);
      } else {
        setComposeError(data.message);
      }
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : "旅程作成に失敗しました");
    } finally {
      setComposing(false);
    }
  }, [entries]);

  const togglePacking = useCallback((id: string) => {
    setPacking((prev) => prev.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p)));
  }, []);

  const addPacking = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setPacking((prev) => [...prev, { id: genId("pack"), label: trimmed, checked: false }]);
  }, []);

  const removePacking = useCallback((id: string) => {
    setPacking((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const recordArrival = useCallback((nodeKey: string, place: string) => {
    setCurrentNodeKey(nodeKey);
    setFlash({ visible: true, text: `${place} に到着\n到着を記録しました` });
    setTimeout(() => setFlash({ visible: false, text: "" }), 1700);
  }, []);

  // 実機のGPS（外部システム）の変化に反応して到着を自動記録する。
  /* eslint-disable react-hooks/set-state-in-effect -- GPS位置の変化という外部シグナルへの反応のため意図的 */
  const { location: liveLocation, permission: locationPermission } = useLiveLocation();
  const autoArrivedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!liveLocation) return;
    if (dayOfState.mode !== "move" && dayOfState.mode !== "free") return;
    const nextNode = dayOfState.nextNode;
    if (!nextNode.geo) return;
    if (autoArrivedKeyRef.current === nextNode.key) return;
    const distance = haversineMeters(liveLocation, nextNode.geo);
    if (distance <= ARRIVAL_THRESHOLD_METERS) {
      autoArrivedKeyRef.current = nextNode.key;
      recordArrival(nextNode.key, nextNode.place);
    }
  }, [liveLocation, dayOfState, recordArrival]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    entries,
    events,
    packing,
    tab,
    setTab,
    flash,
    justAddedEventId,
    now,
    rail,
    dayOfState,
    currentNodeKey,
    totals,
    suggestions,
    planNotes,
    composing,
    composeError,
    addEntry,
    addSuggestion,
    updateEntry,
    removeEntry,
    importFromMail,
    composeWithAi,
    togglePacking,
    addPacking,
    removePacking,
    recordArrival,
    liveLocation,
    locationPermission,
  };
}

export type AppState = ReturnType<typeof useAppState>;
