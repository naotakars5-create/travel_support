import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoPoint, MailItem, ParseApiResponse } from "@/lib/types";
import { buildSeedMails } from "@/lib/seedMails";
import { loadState, saveState } from "@/lib/storage";
import { buildRail, firstSeedGeo, lastSeedGeo, railNodes, RailItem, sortedGroupEvents } from "@/lib/itinerary";
import { getDayOfState, DayOfState } from "@/lib/dayof";
import { ManualEventInput, manualInputToEvent } from "@/lib/manualEntry";
import { TransitEstimate, createPrecomputedEstimator, guessMode } from "@/lib/transit";
import { apiUrl } from "@/lib/apiBase";

export type Tab = "inbox" | "itin" | "today";

interface FlashState {
  visible: boolean;
  text: string;
}

function genId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useAppState() {
  const [mails, setMails] = useState<MailItem[] | null>(null);
  const [currentNodeKey, setCurrentNodeKey] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("inbox");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashState>({ visible: false, text: "" });
  const [justAddedEventId, setJustAddedEventId] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  const initializedRef = useRef(false);
  const autoSeedInitRef = useRef<MailItem[] | null>(null);

  // 初期化：AsyncStorageに保存済みなら復元、無ければシードメールを生成
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void (async () => {
      const persisted = await loadState();
      if (persisted) {
        setMails(persisted.mails);
        setCurrentNodeKey(persisted.currentNodeKey);
      } else {
        const seeded = buildSeedMails(new Date());
        setMails(seeded);
        autoSeedInitRef.current = seeded;
      }
    })();
  }, []);

  // 永続化
  useEffect(() => {
    if (!mails) return;
    void saveState({ version: 1, mails, currentNodeKey, seedGeneratedAt: new Date().toISOString() });
  }, [mails, currentNodeKey]);

  // 現在時刻の更新（当日画面のカウントダウン用）
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const parseMail = useCallback(async (mail: MailItem, opts?: { isInitialSeed?: boolean }) => {
    setMails((prev) => (prev ? prev.map((m) => (m.id === mail.id ? { ...m, status: "parsing" as const } : m)) : prev));

    let result: ParseApiResponse;
    try {
      const res = await fetch(apiUrl("/api/parse"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: mail.body, source: mail.source, referenceDate: new Date().toISOString() }),
      });
      result = (await res.json()) as ParseApiResponse;
    } catch (err) {
      result = { kind: "error", message: err instanceof Error ? err.message : "ネットワークエラーが発生しました" };
    }

    if (result.kind === "events") {
      setMails((prev) =>
        prev ? prev.map((m) => (m.id === mail.id ? { ...m, status: "done" as const, events: result.events, errorMessage: undefined } : m)) : prev
      );
      const firstId = result.events[0]?.id ?? null;
      setJustAddedEventId(firstId);
      setTimeout(() => setJustAddedEventId(null), 600);

      if (opts?.isInitialSeed) {
        setCurrentNodeKey((prevKey) => {
          if (prevKey !== null) return prevKey;
          const rail = buildRail(result.kind === "events" ? result.events : [], false);
          const nodes = railNodes(rail);
          const arrival = nodes[nodes.length - 1] ?? nodes[0];
          return arrival ? arrival.key : prevKey;
        });
      }
    } else if (result.kind === "skip") {
      setMails((prev) => (prev ? prev.map((m) => (m.id === mail.id ? { ...m, status: "skip" as const, events: [] } : m)) : prev));
    } else {
      setMails((prev) =>
        prev ? prev.map((m) => (m.id === mail.id ? { ...m, status: "error" as const, errorMessage: result.kind === "error" ? result.message : "解析に失敗しました" } : m)) : prev
      );
    }
  }, []);

  // 初回シード後：JAL・一休・週末特集は自動解析（ホテルだけ「未解析」で残す＝受信箱の起点デモ）
  useEffect(() => {
    const seeded = autoSeedInitRef.current;
    if (!seeded) return;
    autoSeedInitRef.current = null;
    const jal = seeded.find((m) => m.id === "jal");
    const ikyu = seeded.find((m) => m.id === "ikyu");
    const promo = seeded.find((m) => m.id === "promo");
    if (jal) void parseMail(jal, { isInitialSeed: true });
    if (ikyu) void parseMail(ikyu);
    if (promo) void parseMail(promo);
  }, [mails, parseMail]);

  const events = useMemo(() => (mails ?? []).filter((m) => m.status === "done").flatMap((m) => m.events), [mails]);
  const hasPendingReservation = useMemo(
    () => (mails ?? []).some((m) => m.status === "new" || m.status === "parsing" || m.status === "error"),
    [mails]
  );

  // 地点テキスト（placeFrom/placeTo/title）を座標へジオコーディングし、mails内のイベントへ書き戻す。
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const toGeocode = new Map<string, string>();
      events.forEach((ev) => {
        if (ev.placeFrom && !ev.placeFromGeo) toGeocode.set(ev.placeFrom, ev.placeFrom);
        if (ev.placeTo && !ev.placeToGeo) toGeocode.set(ev.placeTo, ev.placeTo);
        if (!ev.placeFrom && !ev.placeTo && !ev.placeToGeo) toGeocode.set(ev.title, ev.title);
      });
      if (toGeocode.size === 0) return;

      const entries = await Promise.all(
        Array.from(toGeocode.values()).map(async (text) => {
          try {
            const res = await fetch(apiUrl("/api/geocode"), {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ query: text }),
            });
            const data = await res.json();
            return [text, (data.point as GeoPoint | null) ?? null] as const;
          } catch {
            return [text, null] as const;
          }
        })
      );
      if (cancelled) return;
      const geoByText = new Map(entries);
      if (![...geoByText.values()].some(Boolean)) return;

      setMails((prev) =>
        prev
          ? prev.map((m) => ({
              ...m,
              events: m.events.map((ev) => {
                const fromGeo = ev.placeFrom && !ev.placeFromGeo ? geoByText.get(ev.placeFrom) : null;
                const toGeo = ev.placeTo && !ev.placeToGeo ? geoByText.get(ev.placeTo) : null;
                const titleGeo = !ev.placeFrom && !ev.placeTo && !ev.placeToGeo ? geoByText.get(ev.title) : null;
                if (!fromGeo && !toGeo && !titleGeo) return ev;
                return {
                  ...ev,
                  placeFromGeo: fromGeo ?? ev.placeFromGeo,
                  placeToGeo: toGeo ?? titleGeo ?? ev.placeToGeo,
                };
              }),
            }))
          : prev
      );
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [events]);

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
  const rail: RailItem[] = useMemo(
    () => buildRail(events, hasPendingReservation, transitEstimator),
    [events, hasPendingReservation, transitEstimator]
  );
  const dayOfState: DayOfState = useMemo(() => getDayOfState(rail, currentNodeKey), [rail, currentNodeKey]);

  const openSheet = useCallback((id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const addPastedMail = useCallback((body: string, source: string) => {
    const mail: MailItem = {
      id: genId("mail"),
      source: source.trim() || "貼り付けメール",
      subject: body.trim().slice(0, 40) || "（本文なし）",
      body: body.trim(),
      status: "new",
      events: [],
    };
    setMails((prev) => [...(prev ?? []), mail]);
    return mail;
  }, []);

  const addManualEvent = useCallback((mailId: string, input: ManualEventInput) => {
    const event = manualInputToEvent(genId("evt"), input);
    if (!event) return false;
    setMails((prev) =>
      prev
        ? prev.map((m) => (m.id === mailId ? { ...m, status: "done" as const, manual: true, events: [event], errorMessage: undefined } : m))
        : prev
    );
    return true;
  }, []);

  /** メール解析を介さず、住所・時刻の直接入力だけで旅程に予定を追加する。 */
  const addManualMail = useCallback((input: ManualEventInput) => {
    const event = manualInputToEvent(genId("evt"), input);
    if (!event) return null;
    const mail: MailItem = {
      id: genId("mail"),
      source: "手入力",
      subject: event.title,
      body: "",
      status: "done",
      manual: true,
      events: [event],
    };
    setMails((prev) => [...(prev ?? []), mail]);
    return mail;
  }, []);

  const recordArrival = useCallback((nodeKey: string, place: string) => {
    setCurrentNodeKey(nodeKey);
    setFlash({ visible: true, text: `${place} に到着\n到着を記録しました` });
    setTimeout(() => setFlash({ visible: false, text: "" }), 1700);
  }, []);

  return {
    mails,
    tab,
    setTab,
    sheetOpen,
    selectedId,
    openSheet,
    closeSheet,
    flash,
    justAddedEventId,
    now,
    events,
    hasPendingReservation,
    rail,
    dayOfState,
    currentNodeKey,
    parseMail,
    addPastedMail,
    addManualEvent,
    addManualMail,
    recordArrival,
  };
}

export type AppState = ReturnType<typeof useAppState>;
