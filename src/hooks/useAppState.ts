import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoPoint, isTransitMode, PackingItem, ParseApiResponse, PlanApiResponse, PlanEntry, ScheduleSlot, SpotSuggestion } from "@/lib/types";
import { buildSeedEntries } from "@/lib/seedEntries";
import { loadState, saveState } from "@/lib/storage";
import { loadTrips, saveTrips, SavedTrip } from "@/lib/trips";
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
import { DEFAULT_PROFILE, loadProfile, Profile, saveProfile } from "@/lib/profile";
import { buildShareUrl, readSharedPlanFromUrl, sharePlanLink, SHARE_PARAM } from "@/lib/share";
import { BaseMode, EdgeTravel, createPrecomputedEstimator, guessMode } from "@/lib/transit";
import { todayDateStr } from "@/lib/date";
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
  // 共有リンクで開かれた「閲覧のみ」状態か
  const [readOnly, setReadOnly] = useState(false);
  // 旅行日（YYYY-MM-DD）と基本の移動手段
  const [tripDate, setTripDate] = useState<string>(() => todayDateStr());
  const [tripDayCount, setTripDayCount] = useState<number>(1);
  const [baseMode, setBaseMode] = useState<BaseMode>("car");
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  // 保存した旅の履歴（後から呼び出せる）
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);

  const initializedRef = useRef(false);
  // 「構造」が既にスケジュール済みかを追跡し、座標だけ埋まった時の不要な再ローカル化を防ぐ。
  const scheduleSigRef = useRef<string | null>(null);
  // ローカル自動配置の基準（旅行初日の朝）を参照するための ref。
  const tripDateRef = useRef(tripDate);
  useEffect(() => {
    tripDateRef.current = tripDate;
  }, [tripDate]);
  const localReferenceDate = () => {
    const d = new Date(`${tripDateRef.current}T09:00:00`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };

  // 初期化：AsyncStorageに保存済みなら復元、無ければシード行き先を生成
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void (async () => {
      // プロフィール（名前・アイコン）は共有/通常どちらでも自分のものを読み込む
      const savedProfile = await loadProfile();
      if (savedProfile) setProfileState(savedProfile);

      // 保存済みの旅の履歴を読み込む
      setSavedTrips(await loadTrips());

      // 共有リンクで開かれた場合は、URLのプランを「閲覧のみ」で読み込む（保存済みは上書きしない）
      const shared = readSharedPlanFromUrl();
      if (shared) {
        setEntries(shared.entries);
        setSlots(shared.slots);
        setPacking([]);
        setReadOnly(true);
        scheduleSigRef.current = scheduleSignature(shared.entries);
        return;
      }
      const persisted = await loadState();
      if (persisted) {
        setEntries(persisted.entries);
        setSlots(persisted.slots);
        setPacking(persisted.packing);
        setCurrentNodeKey(persisted.currentNodeKey);
        if (persisted.tripDate) setTripDate(persisted.tripDate);
        if (persisted.tripDayCount) setTripDayCount(persisted.tripDayCount);
        if (persisted.baseMode) setBaseMode(persisted.baseMode);
        scheduleSigRef.current = scheduleSignature(persisted.entries);
      } else {
        const seeded = buildSeedEntries(new Date());
        setEntries(seeded);
        setSlots(localSchedule(seeded, localReferenceDate()));
        setPacking(buildDefaultPacking());
        scheduleSigRef.current = scheduleSignature(seeded);
      }
    })();
  }, []);

  // 永続化（共有リンクの閲覧中は保存しない＝受け取った人の自分のプランを壊さない）
  useEffect(() => {
    if (!entries || readOnly) return;
    void saveState({ version: 2, entries, slots, currentNodeKey, packing, tripDate, tripDayCount, baseMode, savedAt: new Date().toISOString() });
  }, [entries, slots, currentNodeKey, packing, tripDate, tripDayCount, baseMode, readOnly]);

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
    setSlots(localSchedule(entries, localReferenceDate()));
    // 注: おすすめ（suggestions）は追加操作で消さない。次にAIで組み直した時に更新する。
  }, [entries]);

  // 旅程イベントは entries + slots から都度導出する（座標も entry から引き継ぐ）。
  const events = useMemo(() => buildEventsFromSchedule(entries ?? [], slots), [entries, slots]);

  // 地点テキスト（place / title）を座標へジオコーディングし、entries へ書き戻す。
  useEffect(() => {
    if (!entries) return;
    let cancelled = false;
    async function run() {
      const list = entries ?? [];
      // ジオコーディング対象を (entryId, フィールド, テキスト) で洗い出す。
      // 移動系は出発地/到着地の両方、それ以外は place（住所/名前）。
      type Field = "place" | "from" | "to";
      const targets: { id: string; field: Field; text: string }[] = [];
      for (const e of list) {
        if (isTransitMode(e.mode) && (e.placeFrom || e.placeTo)) {
          if (e.placeFrom && !e.placeFromGeo) targets.push({ id: e.id, field: "from", text: e.placeFrom });
          if (e.placeTo && !e.placeToGeo) targets.push({ id: e.id, field: "to", text: e.placeTo });
        } else if (!e.placeGeo) {
          targets.push({ id: e.id, field: "place", text: entryPlaceText(e) });
        }
      }
      if (targets.length === 0) return;

      const results = await Promise.all(
        targets.map(async (t) => {
          try {
            const res = await fetch(apiUrl("/api/geocode"), {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ query: t.text }),
            });
            const data = await res.json();
            return { ...t, point: (data.point as GeoPoint | null) ?? null };
          } catch {
            return { ...t, point: null };
          }
        })
      );
      if (cancelled) return;
      const hits = results.filter((r) => r.point);
      if (hits.length === 0) return;

      setEntries((prev) =>
        prev
          ? prev.map((e) => {
              const mine = hits.filter((h) => h.id === e.id);
              if (mine.length === 0) return e;
              const next = { ...e };
              for (const h of mine) {
                if (h.field === "place" && !next.placeGeo) next.placeGeo = h.point!;
                if (h.field === "from" && !next.placeFromGeo) next.placeFromGeo = h.point!;
                if (h.field === "to" && !next.placeToGeo) next.placeToGeo = h.point!;
              }
              return next;
            })
          : prev
      );
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [entries]);

  // ジオコーディング済みの隣接イベント間について、Google Directions API で実測の移動時間を取得しキャッシュする。
  const [transitCache, setTransitCache] = useState<Record<string, EdgeTravel>>({});
  const transitCacheRef = useRef(transitCache);
  useEffect(() => {
    transitCacheRef.current = transitCache;
  }, [transitCache]);

  useEffect(() => {
    let cancelled = false;

    async function fetchDir(origin: GeoPoint, destination: GeoPoint, mode: "car" | "walk"): Promise<number | null> {
      try {
        const res = await fetch(apiUrl("/api/directions"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ origin, destination, mode }),
        });
        const data = await res.json();
        if (data.result) return data.result.durationMin as number;
      } catch {
        // フォールバックに委ねる
      }
      return null;
    }

    async function run() {
      const sorted = sortedGroupEvents(events);
      const pending: { key: string; origin: GeoPoint; destination: GeoPoint }[] = [];
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
        pending.push({ key, origin, destination });
      }
      if (pending.length === 0) return;

      // 各区間について車・徒歩の両方の実測時間を取得する。
      const results = await Promise.all(
        pending.map(async (p) => {
          const [driving, walking] = await Promise.all([
            fetchDir(p.origin, p.destination, "car"),
            fetchDir(p.origin, p.destination, "walk"),
          ]);
          const travel: EdgeTravel = {};
          if (driving != null) travel.driving = driving;
          if (walking != null) travel.walking = walking;
          if (travel.driving == null && travel.walking == null) return null;
          return [p.key, travel] as const;
        })
      );
      if (cancelled) return;
      const updates = results.filter((r): r is readonly [string, EdgeTravel] => r !== null);
      if (updates.length > 0) {
        setTransitCache((prev) => ({ ...prev, ...Object.fromEntries(updates) }));
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [events]);

  const transitEstimator = useMemo(() => createPrecomputedEstimator(transitCache, baseMode), [transitCache, baseMode]);
  const rail: RailItem[] = useMemo(() => buildRail(events, false, transitEstimator), [events, transitEstimator]);
  const dayOfState: DayOfState = useMemo(() => getDayOfState(rail, currentNodeKey), [rail, currentNodeKey]);
  const totals = useMemo(() => computePlanTotals(entries ?? []), [entries]);

  // 組み上げた各行き先の到着予定時刻（entryId → ISO）。計画画面で「自動」の予定にも時刻を表示するため。
  const scheduleByEntry = useMemo(() => {
    const m = new Map<string, string>();
    for (const ev of events) m.set(ev.id.replace(/^evt-/, ""), ev.startAt);
    return m;
  }, [events]);

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

  /** おすすめスポットを複数まとめて行き先リストへ追加する（選択したものを一気に）。 */
  const addSuggestions = useCallback(
    (list: SpotSuggestion[]) => {
      if (list.length === 0) return;
      const titles = new Set(list.map((s) => s.title));
      const newEntries = list.map((s) => suggestionToEntry(genId("entry"), s));
      setEntries((prev) => [...(prev ?? []), ...newEntries]);
      setSuggestions((prev) => prev.filter((x) => !titles.has(x.title)));
      if (newEntries[0]) flashNewEvent(newEntries[0].id);
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

  /** 追加済みの行き先を、フォーム入力の内容で上書き更新する（再編集）。 */
  const editEntry = useCallback(
    (id: string, input: PlanEntryInput) => {
      const full = inputToEntry("_", input);
      if (!full) return;
      // id と source は既存を維持し、それ以外を差し替える
      const { id: _id, source: _source, ...patch } = full;
      updateEntry(id, patch);
    },
    [updateEntry]
  );

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
        // 反映が分かるように：旅程タブへ切り替え＋通知
        setTab("itin");
        setFlash({ visible: true, text: "AIが旅程を組みました\n旅程を確認してください" });
        setTimeout(() => setFlash({ visible: false, text: "" }), 1800);
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

  /** 現在のプランの共有リンクを発行して送る（LINE等）／コピーする。 */
  const shareCurrentPlan = useCallback(async () => {
    const list = entries ?? [];
    if (list.length === 0) return;
    const url = buildShareUrl(list, slots);
    const result = await sharePlanLink(url);
    if (result === "copied") {
      setFlash({ visible: true, text: "共有リンクをコピーしました\nLINEなどに貼り付けて送れます" });
      setTimeout(() => setFlash({ visible: false, text: "" }), 2000);
    } else if (result === "failed") {
      setFlash({ visible: true, text: "共有リンクの発行に失敗しました" });
      setTimeout(() => setFlash({ visible: false, text: "" }), 1700);
    }
  }, [entries, slots]);

  /** 共有リンクで開いたプランを、自分用（編集可）として取り込む。 */
  const importSharedToOwn = useCallback(() => {
    setReadOnly(false);
    scheduleSigRef.current = scheduleSignature(entries ?? []);
    // 再読み込みで再び閲覧のみに戻らないよう、URLの共有パラメータを消す（Webのみ）
    if (typeof window !== "undefined" && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete(SHARE_PARAM);
      window.history.replaceState({}, "", url.toString());
    }
    setFlash({ visible: true, text: "自分のプランに保存しました\n編集できます" });
    setTimeout(() => setFlash({ visible: false, text: "" }), 1900);
  }, [entries]);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    void saveProfile(p);
  }, []);

  /** 現在の旅程を名前を付けて履歴に保存する。 */
  const saveCurrentTrip = useCallback(
    (name: string) => {
      const list = entries ?? [];
      if (list.length === 0) return;
      const trip: SavedTrip = {
        id: genId("trip"),
        name: name.trim() || `${tripDate} の旅`,
        savedAt: new Date().toISOString(),
        entries: list,
        slots,
        packing,
        tripDate,
        tripDayCount,
        baseMode,
      };
      setSavedTrips((prev) => {
        const next = [trip, ...prev];
        void saveTrips(next);
        return next;
      });
      setFlash({ visible: true, text: `「${trip.name}」を保存しました\n履歴からいつでも呼び出せます` });
      setTimeout(() => setFlash({ visible: false, text: "" }), 1900);
    },
    [entries, slots, packing, tripDate, tripDayCount, baseMode]
  );

  /** 保存した旅を現在の旅程として読み込む（今の内容は上書きされる）。 */
  const loadTrip = useCallback((id: string) => {
    setSavedTrips((prev) => {
      const trip = prev.find((t) => t.id === id);
      if (!trip) return prev;
      setReadOnly(false);
      setEntries(trip.entries);
      setSlots(trip.slots);
      setPacking(trip.packing);
      setCurrentNodeKey(null);
      setTripDate(trip.tripDate);
      setTripDayCount(trip.tripDayCount);
      setBaseMode(trip.baseMode);
      setSuggestions([]);
      setPlanNotes(null);
      scheduleSigRef.current = scheduleSignature(trip.entries);
      setTab("plan");
      setFlash({ visible: true, text: `「${trip.name}」を読み込みました` });
      setTimeout(() => setFlash({ visible: false, text: "" }), 1700);
      return prev;
    });
  }, []);

  /** 保存した旅を履歴から削除する。 */
  const deleteTrip = useCallback((id: string) => {
    setSavedTrips((prev) => {
      const next = prev.filter((t) => t.id !== id);
      void saveTrips(next);
      return next;
    });
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
    scheduleByEntry,
    tripDate,
    setTripDate,
    tripDayCount,
    setTripDayCount,
    baseMode,
    setBaseMode,
    profile,
    setProfile,
    savedTrips,
    saveCurrentTrip,
    loadTrip,
    deleteTrip,
    suggestions,
    planNotes,
    composing,
    composeError,
    readOnly,
    shareCurrentPlan,
    importSharedToOwn,
    addEntry,
    addSuggestions,
    updateEntry,
    editEntry,
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
