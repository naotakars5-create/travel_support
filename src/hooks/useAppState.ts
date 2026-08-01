import { fetchWithTimeout } from "@/lib/http";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoPoint, isTransitMode, PackingItem, ParseApiResponse, PlanApiResponse, PlanEntry, ScheduleSlot, SpotSuggestion } from "@/lib/types";
import { loadState, saveState } from "@/lib/storage";
import { loadTrips, saveTrips, SavedTrip, MAX_TRIP_PHOTOS } from "@/lib/trips";
import { buildRail, firstSeedGeo, lastSeedGeo, RailItem, sortedGroupEvents } from "@/lib/itinerary";
import { getDayOfState, DayOfState } from "@/lib/dayof";
import {
  buildEventsFromSchedule,
  computePlanTotals,
  entryPlaceText,
  eventToPlanEntry,
  fillIntoGaps,
  stayWindows,
  inputToEntry,
  orderEntriesBySchedule,
  PlanEntryInput,
  scheduleSignature,
  sequentialSchedule,
  suggestionToEntry,
} from "@/lib/plan";
import { buildDefaultPacking } from "@/lib/packing";
import { DEFAULT_PROFILE, loadProfile, Profile, saveProfile } from "@/lib/profile";
import { buildShareUrl, readSharedPlanFromUrl, SHARE_PARAM, SHORT_PARAM } from "@/lib/share";
import { buildItineraryImageData, renderItineraryImage, shareImageBlob } from "@/lib/shareImage";
import { BaseMode, CarWindow, EdgeTravel, createPrecomputedEstimator, edgeKey, guessMode } from "@/lib/transit";
import { createSpotProvider, Spot } from "@/lib/spots";
import { dateForDay, dayOfIso, todayDateStr } from "@/lib/date";
import { apiUrl } from "@/lib/apiBase";
import { geoSpread, haversineMeters } from "@/lib/geo";
import { fetchCoverPhoto } from "@/lib/coverPhoto";
import { tripRegion } from "@/lib/region";
import { TripBrief } from "@/lib/tripBrief";
import { useLiveLocation } from "./useLiveLocation";

/** この距離（メートル）以内に近づいたら、GPSで到着を自動記録する。 */
const ARRIVAL_THRESHOLD_METERS = 120;

export type Tab = "trip" | "map" | "today" | "packing" | "shiori" | "profile";
/** 「旅」タブの中の見せ方。リスト（集める）とタイムライン（並んだ形を見る）。 */
export type TripView = "list" | "timeline";

interface FlashState {
  visible: boolean;
  text: string;
}

/**
 * 旅の名前が空のときの表示名。行き先が分かっていればそれを、無ければ日付から作る。
 * 「無題」ではなく、その人の旅として読める言葉にする。
 */
export function defaultTripName(destination: string, tripDate: string): string {
  const dest = destination.trim();
  if (dest) return `${dest}の旅`;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tripDate);
  if (m) return `${Number(m[2])}月${Number(m[3])}日からの旅`;
  return "名前のない旅";
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
  // 到着記録を行った時刻。予定時刻ベースの自動進行と手動記録の優先順位付けに使う。
  const [currentNodeSetAt, setCurrentNodeSetAt] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("trip");
  const [tripView, setTripView] = useState<TripView>("list");
  /** 旅タブを開きつつ見せ方も指定する（AI組み立て直後にタイムラインを見せる等）。 */
  const openTrip = useCallback((view: TripView = "list") => {
    setTripView(view);
    setTab("trip");
  }, []);
  const [flash, setFlash] = useState<FlashState>({ visible: false, text: "" });
  const [justAddedEventId, setJustAddedEventId] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  const [suggestions, setSuggestions] = useState<SpotSuggestion[]>([]);
  // AIで組み直す直前のスナップショット。「元に戻す」で復元する（次の組み直しで上書き）。
  const [composeBackup, setComposeBackup] = useState<{
    entries: PlanEntry[];
    slots: ScheduleSlot[];
    suggestions: SpotSuggestion[];
    planNotes: string | null;
  } | null>(null);
  const [planNotes, setPlanNotes] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  // 共有リンクで開かれた「閲覧のみ」状態か
  const [readOnly, setReadOnly] = useState(false);
  // 旅行日（YYYY-MM-DD）と基本の移動手段
  const [tripDate, setTripDateState] = useState<string>(() => todayDateStr());
  const [tripDayCount, setTripDayCountState] = useState<number>(1);
  const [baseMode, setBaseMode] = useState<BaseMode>("car");
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  // 保存した旅の履歴（後から呼び出せる）
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  // しおりから読み込んだ（＝編集中の）旅のID。保存時は新規追加ではなくこの旅を更新する。
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  // 実測の移動時間キャッシュ（`edgeKey` → 車/徒歩/公共交通の分数）。永続化して再取得を減らす。
  const [transitCache, setTransitCache] = useState<Record<string, EdgeTravel>>({});
  // 最後にAIで最適化した時点の「構造」署名。行き先が増減・変更されたら最適化を提案する。
  const [composedSig, setComposedSig] = useState<string | null>(null);
  // AIへのお願い（自由文）。「1日目はホテルの後は予定を入れない」等のニュアンスを毎回渡す。
  const [planRequest, setPlanRequest] = useState<string>("");
  // 「宿を取らない」と決めた泊（1始まり）。実家・車中泊・夜行バスなど、
  // 宿泊先の枠を閉じておきたい泊を覚えておく。
  const [lodgingSkipped, setLodgingSkipped] = useState<number[]>([]);
  // 旅の名前と行き先。画面の一番上に出し、しおり（＝旅の一覧）でもこの名前で並ぶ。
  const [tripName, setTripName] = useState<string>("");
  const [tripDestination, setTripDestination] = useState<string>("");

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

  // 初期化：AsyncStorageに保存済みなら復元。無ければ「まっさら」から始める
  // （デモの行き先を入れてしまうと、初回の人が他人の旅行を消すところから
  //  始めることになるため、あえて何も入れない）
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
      const shared = await readSharedPlanFromUrl();
      if (shared) {
        setEntries(shared.entries.filter((e) => (e.mode as string) !== "home"));
        setSlots(shared.slots);
        setPacking([]);
        setReadOnly(true);
        scheduleSigRef.current = scheduleSignature(shared.entries);
        return;
      }
      const persisted = await loadState();
      if (persisted) {
        // 自宅（出発地）機能は廃止したので、保存済みの自宅エントリは読み込み時に取り除く
        const migrated = persisted.entries.filter((e) => (e.mode as string) !== "home");
        // 保存済みの時刻順を「並び順」として引き継ぐ（手動並び替えの初期状態にする）
        const ordered = orderEntriesBySchedule(migrated, persisted.slots);
        setEntries(ordered);
        setSlots(persisted.slots);
        setPacking(persisted.packing);
        setCurrentNodeKey(persisted.currentNodeKey);
        setCurrentNodeSetAt(persisted.currentNodeSetAt ?? null);
        // 実測の移動時間キャッシュを復元（リロードのたびにDirections APIを叩き直さない）
        if (persisted.transitCache) setTransitCache(persisted.transitCache);
        if (persisted.tripDate) setTripDateState(persisted.tripDate);
        if (persisted.tripDayCount) setTripDayCountState(persisted.tripDayCount);
        if (persisted.baseMode) setBaseMode(persisted.baseMode);
        if (persisted.planRequest) setPlanRequest(persisted.planRequest);
        if (persisted.lodgingSkipped) setLodgingSkipped(persisted.lodgingSkipped);
        if (persisted.tripName) setTripName(persisted.tripName);
        if (persisted.tripDestination) setTripDestination(persisted.tripDestination);
        if (persisted.activeTripId) setActiveTripId(persisted.activeTripId);
        scheduleSigRef.current = scheduleSignature(ordered);
      } else {
        setEntries([]);
        setSlots([]);
        setPacking(buildDefaultPacking());
        scheduleSigRef.current = scheduleSignature([]);
      }
    })();
  }, []);

  // 保存失敗（容量不足・プライベートモード等）を一度だけユーザーに知らせるためのフラグ
  const saveFailureNotifiedRef = useRef(false);

  // 永続化（共有リンクの閲覧中は保存しない＝受け取った人の自分のプランを壊さない）
  useEffect(() => {
    if (!entries || readOnly) return;
    // 移動時間キャッシュは肥大しないよう新しい方から一定数だけ保存する
    const cacheEntries = Object.entries(transitCache);
    const trimmedCache = cacheEntries.length > 400 ? Object.fromEntries(cacheEntries.slice(-400)) : transitCache;
    const persistPromise = saveState({
      version: 3,
      tripName,
      tripDestination,
      activeTripId,
      entries,
      slots,
      currentNodeKey,
      currentNodeSetAt,
      packing,
      tripDate,
      tripDayCount,
      baseMode,
      transitCache: trimmedCache,
      planRequest,
      lodgingSkipped,
      savedAt: new Date().toISOString(),
    });
    void persistPromise.then((ok) => {
      if (ok) {
        saveFailureNotifiedRef.current = false;
        return;
      }
      // 黙って消えるのが最悪なので、失敗は一度だけ知らせる（成功が挟まればまた知らせる）
      if (saveFailureNotifiedRef.current) return;
      saveFailureNotifiedRef.current = true;
      setFlash({ visible: true, text: "端末への保存に失敗しました\n空き容量を確認してください（このままだと閉じた時に消えます）" });
      setTimeout(() => setFlash({ visible: false, text: "" }), 3200);
    });
  }, [
    entries,
    slots,
    currentNodeKey,
    currentNodeSetAt,
    packing,
    tripDate,
    tripDayCount,
    baseMode,
    transitCache,
    planRequest,
    lodgingSkipped,
    tripName,
    tripDestination,
    activeTripId,
    readOnly,
  ]);

  // 現在時刻の更新（当日画面のカウントダウン用）
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // オンライン状態（Webのみ）。圏外・機内モードで地図やAIが黙って失敗しないよう、バナーで知らせる。
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !("onLine" in navigator)) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- 外部状態（ブラウザのオンライン状態）の初期同期 */
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // 行き先の「構造」が変わったら（追加・削除・時刻/滞在/重要度/種別の変更）、ローカルで即座に再スケジュール。
  // 座標だけがジオコーディングで埋まった場合は署名が変わらないため、AIで組んだ順路を壊さない。
  useEffect(() => {
    if (!entries) return;
    const sig = scheduleSignature(entries);
    if (scheduleSigRef.current === sig) return;
    scheduleSigRef.current = sig;
    setSlots(sequentialSchedule(entries, localReferenceDate()));
    // 注: おすすめ（suggestions）は追加操作で消さない。次にAIで組み直した時に更新する。
  }, [entries]);

  // 旅程イベントは entries + slots から都度導出する（座標も entry から引き継ぐ）。
  const events = useMemo(() => buildEventsFromSchedule(entries ?? [], slots), [entries, slots]);

  // AIが「時間内に収まらない」と外した予定（スロットが無い行き先）。旅程画面の下部に表示する。
  const unplacedEntries = useMemo(() => {
    const placed = new Set(slots.map((s) => s.entryId));
    // レンタカーは期間の登録であって行き先ではないため「入らなかった予定」に出さない。
    return (entries ?? []).filter((e) => e.mode !== "rental" && !placed.has(e.id));
  }, [entries, slots]);

  // ジオコーディングに失敗した地点を少し待って再挑戦するためのカウンタ。
  // （サーバーのキー未設定・一時的な通信失敗のとき、以前はアプリを開き直すまで
  // 座標が欠けたままになり、動線マップの番号が一部だけになる原因だった）
  const [geoRetry, setGeoRetry] = useState(0);

  // 地点テキスト（place / title）を座標へジオコーディングし、entries へ書き戻す。
  useEffect(() => {
    if (!entries) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
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
            const res = await fetchWithTimeout(apiUrl("/api/geocode"), {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ query: t.text }),
            });
            const data = await res.json();
            return {
              ...t,
              point: (data.point as GeoPoint | null) ?? null,
              prefecture: (data.prefecture as string | undefined) ?? undefined,
            };
          } catch {
            return { ...t, point: null, prefecture: undefined };
          }
        })
      );
      if (cancelled) return;
      const hits = results.filter((r) => r.point);
      // 失敗が残っていたら、20秒おいて最大3回まで再挑戦する
      if (hits.length < results.length && geoRetry < 3) {
        retryTimer = setTimeout(() => setGeoRetry((n) => n + 1), 20000);
      }
      if (hits.length === 0) return;

      setEntries((prev) =>
        prev
          ? prev.map((e) => {
              const mine = hits.filter((h) => h.id === e.id);
              if (mine.length === 0) return e;
              const next = { ...e };
              for (const h of mine) {
                if (h.field === "place" && !next.placeGeo) next.placeGeo = h.point!;
                // 都道府県は市名入力（例「金沢」）でも正しく取れるので必ず控えておく
                if (h.field === "place" && h.prefecture && !next.prefecture) next.prefecture = h.prefecture;
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
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [entries, geoRetry]);

  // スポット写真の自動取得。photoRef の無い行き先（宿泊・食事・観光）について
  // 名前から代表写真を探し、entries へ書き戻す（行き先リスト・旅程の横に出る）。
  // オートコンプリート経由の追加は place-details が最初から photoRef を付けるので、
  // ここで拾うのは手入力・AI生成・メール取り込み・周辺スポット追加の分。
  const photoAttemptedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!entries) return;
    let cancelled = false;
    async function run() {
      const list = entries ?? [];
      const targets = list.filter((e) => {
        if (e.photoRef) return false;
        // 移動・レンタカーは「場所」ではないので対象外
        if (e.mode === "rental" || isTransitMode(e.mode)) return false;
        const key = `${e.id}:${entryPlaceText(e)}`;
        return !photoAttemptedRef.current.has(key);
      });
      if (targets.length === 0) return;
      for (const t of targets) photoAttemptedRef.current.add(`${t.id}:${entryPlaceText(t)}`);

      const results = await Promise.all(
        targets.map(async (e) => {
          try {
            const res = await fetchWithTimeout(apiUrl("/api/spot-photo"), {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ query: entryPlaceText(e) }),
            });
            const data = await res.json();
            const photo = data.photo as { photoRef: string; attribution?: string } | null;
            return { id: e.id, photo };
          } catch {
            return { id: e.id, photo: null };
          }
        })
      );
      if (cancelled) return;
      const hits = results.filter((r) => r.photo);
      if (hits.length === 0) return;

      setEntries((prev) =>
        prev
          ? prev.map((e) => {
              const hit = hits.find((h) => h.id === e.id);
              if (!hit?.photo || e.photoRef) return e;
              return { ...e, photoRef: hit.photo.photoRef, photoAttribution: hit.photo.attribution };
            })
          : prev
      );
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [entries]);

  // ジオコーディング済みの隣接イベント間の実測移動時間キャッシュ（下の effect が取得・追記する）。
  const transitCacheRef = useRef(transitCache);
  useEffect(() => {
    transitCacheRef.current = transitCache;
  }, [transitCache]);

  useEffect(() => {
    let cancelled = false;

    async function fetchDir(origin: GeoPoint, destination: GeoPoint, mode: "car" | "walk" | "rail"): Promise<number | null> {
      try {
        const res = await fetchWithTimeout(apiUrl("/api/directions"), {
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
        const key = edgeKey(prev, next);
        const cached = transitCacheRef.current[key];
        if (cached) continue;
        const origin = lastSeedGeo(prev);
        const destination = firstSeedGeo(next);
        if (!origin || !destination) continue;
        const mode = guessMode(prev.placeTo ?? prev.title, next.placeFrom ?? next.title);
        if (mode === "air") continue; // Directions APIでは空路は扱わない
        pending.push({ key, origin, destination });
      }
      if (pending.length === 0) return;

      // 各区間について車・徒歩（必要なら公共交通）の実測時間を取得する。
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

  // レンタカーを借りている期間（種別 rental の 借りる=departAt 〜 返す=arriveBy）。
  // この時間帯の移動は車、それ以外は徒歩/公共交通として計算される。
  const carWindows = useMemo<CarWindow[]>(
    () =>
      (entries ?? [])
        .filter((e) => e.mode === "rental" && e.departAt && e.arriveBy)
        .map((e) => ({ fromIso: e.departAt!, toIso: e.arriveBy! })),
    [entries]
  );
  const transitEstimator = useMemo(
    () => createPrecomputedEstimator(transitCache, baseMode, carWindows),
    [transitCache, baseMode, carWindows]
  );
  const rail: RailItem[] = useMemo(() => buildRail(events, false, transitEstimator), [events, transitEstimator]);
  // 「分」単位の現在時刻。秒ごとの再計算を避けつつ、予定時刻を過ぎたノードを自動で通過扱いにする。
  const nowMinuteIso = useMemo(() => {
    const d = new Date(now);
    d.setSeconds(0, 0);
    return d.toISOString();
  }, [now]);
  const dayOfState: DayOfState = useMemo(
    () => getDayOfState(rail, currentNodeKey, { now: new Date(nowMinuteIso), currentNodeSetAt }),
    [rail, currentNodeKey, nowMinuteIso, currentNodeSetAt]
  );
  const totals = useMemo(() => computePlanTotals(entries ?? []), [entries]);

  // 計画中の「この辺のおすすめ」：単一の基点ではなく、登録した行き先ぜんぶの重心から探す。
  // 1箇所の周りだけを見ると、旅の反対側にある行き先とは無関係な提案になってしまうため。
  const areaSpread = useMemo(() => {
    const list = entries ?? [];
    const points = list.filter((e) => e.mode !== "rental" && e.placeGeo).map((e) => e.placeGeo!);
    return geoSpread(points);
  }, [entries]);
  const areaRefGeo = areaSpread?.center ?? null;
  // 検索半径：行き先の広がりに合わせる（狭くても2km、広くても15kmまで）。
  const areaRadius = areaSpread ? Math.round(Math.min(15000, Math.max(2000, areaSpread.radiusMeters * 1.2))) : 2000;
  const areaRefKey = areaRefGeo ? `${areaRefGeo.lat.toFixed(3)},${areaRefGeo.lng.toFixed(3)}|${areaRadius}` : null;
  const [rawAreaSpots, setRawAreaSpots] = useState<Spot[]>([]);
  const [areaSuggestionsLoading, setAreaSuggestionsLoading] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- 外部API（周辺スポット）取得と基点消失時のクリアのため意図的 */
  useEffect(() => {
    if (!areaRefGeo || readOnly) {
      setRawAreaSpots([]);
      setAreaSuggestionsLoading(false);
      return;
    }
    let cancelled = false;
    setAreaSuggestionsLoading(true);
    createSpotProvider(true)
      .nearby(areaRefGeo.lat, areaRefGeo.lng, 120, false, areaRadius)
      .then((s) => {
        if (!cancelled) setRawAreaSpots(s);
      })
      .catch(() => {
        if (!cancelled) setRawAreaSpots([]);
      })
      .finally(() => {
        if (!cancelled) setAreaSuggestionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // 基点の座標が概ね変わった時だけ再取得（areaRefKey で丸め）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaRefKey, readOnly]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const areaSuggestions = useMemo<SpotSuggestion[]>(() => {
    const list = entries ?? [];
    const existing = new Set(list.map((e) => e.title));
    const existingGeo = list.filter((e) => e.placeGeo).map((e) => e.placeGeo!);
    return rawAreaSpots
      .filter((s) => !existing.has(s.name))
      // 既に登録した行き先とほぼ同じ場所（150m以内）は「別のおすすめ」にならないので外す
      .filter((s) => {
        if (s.lat == null || s.lng == null || existingGeo.length === 0) return true;
        const here = { lat: s.lat, lng: s.lng };
        return existingGeo.every((g) => haversineMeters(g, here) > 150);
      })
      // 旅の中心（全行き先の重心）に近い順＝どの行き先からも寄りやすい順に並べる
      .sort((a, b) => {
        if (!areaRefGeo) return 0;
        const d = (s: Spot) => (s.lat != null && s.lng != null ? haversineMeters(areaRefGeo, { lat: s.lat, lng: s.lng }) : Infinity);
        return d(a) - d(b);
      })
      .slice(0, 6)
      .map((s) => ({ title: s.name, area: s.address, note: s.category ?? s.note, mode: "activity" as const, stayMin: 60 }));
  }, [rawAreaSpots, entries, areaRefGeo]);

  // 組み上げた各行き先の到着予定時刻（entryId → ISO）。計画画面で「自動」の予定にも時刻を表示するため。
  const scheduleByEntry = useMemo(() => {
    const m = new Map<string, string>();
    // イベントIDは evt-{entryId}（自宅は evt-{entryId}-depart / -return）。
    // entryId へ戻し、最も早いイベント時刻を採用する。
    for (const ev of events) {
      const key = ev.id.replace(/^evt-/, "").replace(/-(depart|return)$/, "");
      if (!m.has(key)) m.set(key, ev.startAt);
    }
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

  /**
   * 「まとめて追加」：自由文をAIで行き先リストへ変換して一括登録する。
   * 住所・座標・営業時間・定休日は登録後に既存の自動補完（ジオコーディング等）が埋める。
   */
  const bulkAddFromText = useCallback(
    async (text: string): Promise<{ ok: boolean; count?: number; message?: string }> => {
      try {
        const res = await fetchWithTimeout(
          apiUrl("/api/bulk-parse"),
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text, dayCount: tripDayCount }),
          },
          45000 // LLM読み取り
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
          return { ok: false, message: body.message ?? body.error ?? `読み取りに失敗しました（${res.status}）` };
        }
        const data = (await res.json()) as
          | { kind: "entries"; entries: { title: string; mode: PlanEntry["mode"]; day?: number; stayMin?: number }[] }
          | { kind: "error"; message: string };
        if (data.kind !== "entries") return { ok: false, message: data.message };

        // 既に同名の行き先があるものは足さない（二重登録防止）
        const existing = new Set((entries ?? []).map((e) => e.title));
        const fresh = data.entries.filter((e) => !existing.has(e.title));
        const newEntries = fresh
          .map((e) =>
            inputToEntry(genId("entry"), {
              title: e.title,
              mode: e.mode,
              priority: "want",
              day: e.day,
              stayMin: e.stayMin,
            })
          )
          .filter((e): e is PlanEntry => e !== null);
        if (newEntries.length === 0) {
          return { ok: false, message: "すべて登録済みの行き先でした" };
        }
        setEntries((prev) => [...(prev ?? []), ...newEntries]);
        flashNewEvent(newEntries[0].id);
        setFlash({ visible: true, text: `${newEntries.length}件の行き先を追加しました\n住所・営業時間は自動で補完します` });
        setTimeout(() => setFlash({ visible: false, text: "" }), 2200);
        return { ok: true, count: newEntries.length };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "読み取りに失敗しました" };
      }
    },
    [entries, tripDayCount, flashNewEvent]
  );

  /**
   * 行き先ゼロの状態から、条件だけでAIに旅程を作ってもらう。
   * 返ってきた行き先で今のリストを置き換え、日数もその旅程に合わせる。
   */
  const generatePlanFromBrief = useCallback(
    async (brief: TripBrief): Promise<{ ok: boolean; message?: string }> => {
      try {
        const res = await fetchWithTimeout(
          apiUrl("/api/generate-plan"),
          { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(brief) },
          90000 // 旅程まるごとの生成は時間がかかる
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
          return { ok: false, message: body.message ?? body.error ?? `旅程を作成できませんでした（${res.status}）` };
        }
        const data = (await res.json()) as
          | { kind: "plan"; spots: { title: string; area?: string; day: number; mode: PlanEntry["mode"]; stayMin: number; note?: string }[]; notes?: string }
          | { kind: "error"; message: string };
        if (data.kind !== "plan") return { ok: false, message: data.message };

        const newEntries = data.spots
          .map((s) =>
            inputToEntry(genId("entry"), {
              title: s.title,
              place: s.area,
              mode: s.mode,
              priority: "want",
              day: s.day,
              stayMin: s.stayMin > 0 ? s.stayMin : undefined,
              detail: s.note,
            })
          )
          .filter((e): e is PlanEntry => e !== null);
        if (newEntries.length === 0) return { ok: false, message: "行き先を作成できませんでした" };

        // ゼロベース生成なので今の内容を置き換える。取り消せるようにスナップショットを残す。
        setComposeBackup({ entries: entries ?? [], slots, suggestions, planNotes });
        setEntries(newEntries);
        setTripDayCountState(brief.dayCount);
        setPlanNotes(data.notes ?? null);
        setSuggestions([]);
        setActiveTripId(null);
        scheduleSigRef.current = null; // next effect で時刻を組み直させる
        openTrip("list");
        setFlash({ visible: true, text: `${newEntries.length}件の行き先で旅程を作りました\n並び替え・追加は自由にできます` });
        setTimeout(() => setFlash({ visible: false, text: "" }), 2400);
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "旅程の作成に失敗しました" };
      }
    },
    [entries, slots, suggestions, planNotes, openTrip]
  );

  /** 地図や空き時間の提案で見つけたスポットを1件だけ行き先リストへ追加する。 */
  const addSpot = useCallback(
    (spot: Spot, opts?: { day?: number; stayMin?: number }) => {
      const entry = inputToEntry(genId("entry"), {
        title: spot.name,
        place: spot.address,
        placeGeo: spot.lat != null && spot.lng != null ? { lat: spot.lat, lng: spot.lng } : undefined,
        mode: "activity",
        priority: "want",
        stayMin: opts?.stayMin ?? 60,
        day: opts?.day,
      });
      if (!entry) return;
      setEntries((prev) => [...(prev ?? []), entry]);
      flashNewEvent(entry.id);
      setFlash({ visible: true, text: `「${spot.name}」を行き先に追加しました` });
      setTimeout(() => setFlash({ visible: false, text: "" }), 1700);
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
            // 場所テキストが変わったら座標を無効化し、再ジオコーディングさせる。
            // ただし新しい正確な座標（placeGeo）が渡された場合はそれを優先。
            if ((patch.place !== undefined || patch.title !== undefined) && patch.placeGeo === undefined) {
              next.placeGeo = undefined;
            }
            return next;
          })
        : prev
    );
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
  }, []);

  /**
   * 行き先の並び順を1つ上／下へ動かす（同じ日の中で入れ替え）。
   * dir < 0 で上（前）へ、dir > 0 で下（後ろ）へ。時刻は並び順から自動再計算される。
   */
  const moveEntry = useCallback((id: string, dir: -1 | 1) => {
    setEntries((prev) => {
      if (!prev) return prev;
      const idx = prev.findIndex((e) => e.id === id);
      if (idx < 0) return prev;
      const day = prev[idx].day ?? 1;
      // 同じ日の隣（指定方向・宿泊は除外）を探して入れ替える
      const sameDayReorderable = (e: PlanEntry) => (e.day ?? 1) === day && e.mode !== "stay" && e.mode !== "rental";
      let swapIdx = -1;
      if (dir < 0) {
        for (let i = idx - 1; i >= 0; i--) {
          if (sameDayReorderable(prev[i])) {
            swapIdx = i;
            break;
          }
        }
      } else {
        for (let i = idx + 1; i < prev.length; i++) {
          if (sameDayReorderable(prev[i])) {
            swapIdx = i;
            break;
          }
        }
      }
      if (swapIdx < 0) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  /** 行き先を同じ日の先頭（dir<0）／末尾（dir>0）へ一気に動かす（長押し操作用）。 */
  const moveEntryToEdge = useCallback((id: string, dir: -1 | 1) => {
    setEntries((prev) => {
      if (!prev) return prev;
      const idx = prev.findIndex((e) => e.id === id);
      if (idx < 0) return prev;
      const target = prev[idx];
      const day = target.day ?? 1;
      const rest = prev.filter((_, i) => i !== idx);
      const sameDayPositions = rest
        .map((e, i) => ({ e, i }))
        .filter((o) => (o.e.day ?? 1) === day && o.e.mode !== "stay" && o.e.mode !== "rental")
        .map((o) => o.i);
      if (sameDayPositions.length === 0) return prev;
      const insertAt = dir < 0 ? sameDayPositions[0] : sameDayPositions[sameDayPositions.length - 1] + 1;
      const next = [...rest];
      next.splice(insertAt, 0, target);
      return next;
    });
  }, []);

  /** 行き先を別の日（何日目）へ移動する。到着/出発/チェックアウトの日付も同じ日数だけずらす。 */
  const setEntryDay = useCallback((id: string, day: number) => {
    setEntries((prev) =>
      prev
        ? prev.map((e) => {
            if (e.id !== id) return e;
            const deltaDays = day - (e.day ?? 1);
            const shift = (iso?: string) => {
              if (!iso) return iso;
              const t = new Date(iso).getTime();
              if (Number.isNaN(t)) return iso;
              return new Date(t + deltaDays * 86400000).toISOString();
            };
            return {
              ...e,
              day,
              arriveBy: shift(e.arriveBy),
              departAt: shift(e.departAt),
              checkOut: shift(e.checkOut),
            };
          })
        : prev
    );
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
      const res = await fetchWithTimeout(apiUrl("/api/parse"), {
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

  /** 直前のAI組み直しを取り消し、組み直す前の旅程へ戻す。 */
  const undoCompose = useCallback(() => {
    setComposeBackup((backup) => {
      if (!backup) return null;
      setEntries(backup.entries);
      setSlots(backup.slots);
      setSuggestions(backup.suggestions);
      setPlanNotes(backup.planNotes);
      scheduleSigRef.current = scheduleSignature(backup.entries);
      // 戻した直後に「最適化しますか？」と即座に迫らない
      setComposedSig(scheduleSignature(backup.entries));
      setFlash({ visible: true, text: "AIで組む前の旅程に戻しました" });
      setTimeout(() => setFlash({ visible: false, text: "" }), 1700);
      return null;
    });
  }, []);

  /** AIに旅程を組み直してもらう（並べ替え＋時刻割り当て＋おすすめ提案）。 */
  const composeWithAi = useCallback(async () => {
    const list = entries ?? [];
    if (list.length === 0) return;
    setComposing(true);
    setComposeError(null);
    try {
      const tripStart = tripDateRef.current;
      const res = await fetchWithTimeout(
        apiUrl("/api/plan"),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            entries: list,
            referenceDate: `${tripStart}T09:00:00+09:00`,
            dayCount: tripDayCount,
            request: planRequest.trim() || undefined,
            baseMode,
          }),
        },
        90000 // AIの旅程作成は時間がかかる（永久に回り続けるよりは打ち切って伝える）
      );
      // ガードの応答（403/429）は {error} 形式で kind を持たない。
      // そのまま読むとエラー文が空欄になり、原因が分からなくなる。
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        setComposeError(body.message ?? body.error ?? `旅程を作成できませんでした（${res.status}）`);
        return;
      }
      const data = (await res.json()) as PlanApiResponse;
      if (data.kind === "plan") {
        // AIが時刻を付けた予定はその時刻をアンカーに採用。宿泊・時刻固定は必ず残す。
        const anchors = new Map(data.schedule.map((s) => [s.entryId, s.arriveAt]));
        const mustKeep = (e: PlanEntry) => e.mode === "stay" || Boolean(e.fixedTime);
        const orderedByAi = orderEntriesBySchedule(list, data.schedule);
        const included = orderedByAi.filter((e) => anchors.has(e.id) || mustKeep(e));
        const filledSlots = sequentialSchedule(included, localReferenceDate(), anchors);

        // AIが外した予定は捨てずに、空き時間へ入る限り詰め込む（びっちり埋める）。
        // それでも入らなかったものだけ「旅程に入らなかった予定」になる。
        // レンタカーは期間の登録なので、空き時間へ詰める対象にはしない。
        const leftovers = orderedByAi.filter((e) => e.mode !== "rental" && !anchors.has(e.id) && !mustKeep(e));
        const extra = fillIntoGaps(leftovers, filledSlots, localReferenceDate(), tripDayCount, {
          stayWindows: stayWindows(included),
        });
        const allSlots = [...filledSlots, ...extra].sort(
          (a, b) => new Date(a.arriveAt).getTime() - new Date(b.arriveAt).getTime()
        );

        // 最終スケジュールの時刻から「並び順」と「何日目」を更新する
        const slotById = new Map(allSlots.map((s) => [s.entryId, s]));
        const reordered = orderEntriesBySchedule(list, allSlots).map((e) => {
          const slot = slotById.get(e.id);
          if (!slot) return e;
          // 日数の範囲内へクランプ（万一AIの日付がずれても「存在しない日」へ書き戻さない）
          const day = Math.min(Math.max(1, dayOfIso(tripStart, slot.arriveAt)), tripDayCount);
          return { ...e, day };
        });
        const droppedCount = leftovers.length - extra.length;
        // 適用前の状態を残しておく（手で並べた旅程をボタン1つで失わないため）
        setComposeBackup({ entries: list, slots, suggestions, planNotes });
        setEntries(reordered);
        setSlots(allSlots);
        // AIの順路を採用したので、この構造は「スケジュール済み」として記録し、ローカル再計算で上書きしない。
        scheduleSigRef.current = scheduleSignature(reordered);
        setComposedSig(scheduleSignature(reordered));
        setSuggestions(data.suggestions);
        setPlanNotes(data.notes ?? null);
        // 反映が分かるように：旅程タブへ切り替え＋通知
        openTrip("timeline");
        setFlash({
          visible: true,
          text:
            droppedCount > 0
              ? `AIが旅程を組みました\n入りきらない予定が${droppedCount}件あります（旅程の下部）`
              : "AIが旅程を組みました\n旅程を確認してください",
        });
        setTimeout(() => setFlash({ visible: false, text: "" }), droppedCount > 0 ? 2600 : 1800);
      } else {
        setComposeError(data.message);
      }
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : "旅程作成に失敗しました");
    } finally {
      setComposing(false);
    }
  }, [entries, slots, suggestions, planNotes, tripDayCount, planRequest, baseMode, openTrip]);

  /**
   * その泊を「宿を取らない」にする／戻す。
   * 実家・車中泊・夜行バスなど、そもそも宿を取らない泊があるため、
   * 宿泊先の枠を閉じられないと消せない案内になってしまう。
   */
  const toggleLodgingSkip = useCallback((nth: number) => {
    setLodgingSkipped((prev) => (prev.includes(nth) ? prev.filter((n) => n !== nth) : [...prev, nth].sort((a, b) => a - b)));
  }, []);

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
  // 共有シートの状態。押した瞬間に開いてリンクを作り、送信・コピーは
  // シートの中のボタン（＝新しいユーザー操作）から行う。
  // ブラウザは「操作の直後」しか共有を許さないため、待ってから呼ぶと拒否される。
  const [shareState, setShareState] = useState<{ open: boolean; url: string | null; error: string | null }>({
    open: false,
    url: null,
    error: null,
  });

  const buildShareLink = useCallback(async () => {
    const list = entries ?? [];
    if (list.length === 0) {
      setShareState({ open: true, url: null, error: "共有する行き先がまだありません。" });
      return;
    }
    setShareState({ open: true, url: null, error: null });
    try {
      const url = await buildShareUrl(list, slots);
      setShareState({ open: true, url, error: null });
    } catch {
      setShareState({
        open: true,
        url: null,
        error: "共有リンクを作れませんでした。通信状況を確かめて、もう一度お試しください。",
      });
    }
  }, [entries, slots]);

  const shareCurrentPlan = useCallback(() => {
    void buildShareLink();
  }, [buildShareLink]);

  const closeShare = useCallback(() => setShareState({ open: false, url: null, error: null }), []);

  /**
   * 旅程を画像1枚にして共有する（アプリを使っていない相手向け）。
   * リンクを踏んでもらえない相手にも、そのまま読める形で渡せるようにする。
   */
  const shareItineraryImage = useCallback(async (): Promise<"shared" | "cancelled" | "downloaded" | "failed"> => {
    const list = entries ?? [];
    if (list.length === 0) return "failed";
    const title = tripName.trim() || defaultTripName(tripDestination, tripDateRef.current);
    const data = buildItineraryImageData(list, slots, tripDateRef.current, tripDayCount, title);
    const blob = await renderItineraryImage(data);
    if (!blob) return "failed";
    return shareImageBlob(blob, `${data.title}.png`, data.title);
  }, [entries, slots, tripDayCount, tripName, tripDestination]);

  /** 共有リンクで開いたプランを、自分用（編集可）として取り込む。 */
  const importSharedToOwn = useCallback(() => {
    setReadOnly(false);
    scheduleSigRef.current = scheduleSignature(entries ?? []);
    // 再読み込みで再び閲覧のみに戻らないよう、URLの共有パラメータを消す（Webのみ）
    if (typeof window !== "undefined" && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete(SHARE_PARAM);
      url.searchParams.delete(SHORT_PARAM);
      window.history.replaceState({}, "", url.toString());
    }
    setFlash({ visible: true, text: "自分のプランに保存しました\n編集できます" });
    setTimeout(() => setFlash({ visible: false, text: "" }), 1900);
  }, [entries]);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    void saveProfile(p);
  }, []);

  /**
   * 旅行の開始日を変更する。
   * 予定は絶対時刻（ISO）で保持しているため、開始日だけ変えると
   * 宿泊・時刻固定の予定が「古い日付」に取り残される。
   * ここで差分の日数ぶん全予定をまとめてスライドさせ、日付を必ず追従させる。
   */
  const setTripDate = useCallback((next: string) => {
    const prevDate = tripDateRef.current;
    setTripDateState(next);
    const a = new Date(`${prevDate}T00:00`);
    const b = new Date(`${next}T00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return;
    const deltaDays = Math.round((b.getTime() - a.getTime()) / 86400000);
    if (deltaDays === 0) return;
    setEntries((prev) => {
      if (!prev) return prev;
      const shift = (iso?: string) => {
        if (!iso) return iso;
        const t = new Date(iso).getTime();
        return Number.isNaN(t) ? iso : new Date(t + deltaDays * 86400000).toISOString();
      };
      return prev.map((e) => ({
        ...e,
        arriveBy: shift(e.arriveBy),
        departAt: shift(e.departAt),
        checkOut: shift(e.checkOut),
      }));
    });
  }, []);

  /**
   * 旅行日数を変更する。減らした場合、消えた日（day > n）の予定は最終日へ寄せる
   * （「幽霊予定」が残らないように）。
   */
  const setTripDayCount = useCallback((n: number) => {
    const days = Math.max(1, Math.floor(n));
    setTripDayCountState(days);
    setEntries((prev) => {
      if (!prev) return prev;
      return prev.map((e) => {
        const d = e.day ?? 1;
        if (d <= days) return e;
        const deltaDays = days - d;
        const shift = (iso?: string) => (iso ? new Date(new Date(iso).getTime() + deltaDays * 86400000).toISOString() : iso);
        return { ...e, day: days, arriveBy: shift(e.arriveBy), departAt: shift(e.departAt), checkOut: shift(e.checkOut) };
      });
    });
  }, []);

  // しおりの保存を実行し、失敗（容量オーバー等）したらユーザーに知らせる。
  const persistTrips = useCallback((next: SavedTrip[]) => {
    void saveTrips(next).then((ok) => {
      if (!ok) {
        setFlash({ visible: true, text: "保存に失敗しました\n端末の空き容量をご確認ください" });
        setTimeout(() => setFlash({ visible: false, text: "" }), 2600);
      }
    });
  }, []);

  /**
   * 現在の旅程を名前（＋表紙写真）を付けてしおり／履歴に保存する。
   * しおりから読み込んで編集中の旅（activeTripId）は「同じ旅の更新」として上書きし、
   * 写真・表紙を引き継ぐ（保存のたびに同じ旅が増殖しない）。
   */
  const saveCurrentTrip = useCallback(
    (name: string, coverPhoto?: string) => {
      const list = entries ?? [];
      if (list.length === 0) return;
      setSavedTrips((prev) => {
        const existing = activeTripId ? prev.find((t) => t.id === activeTripId) : undefined;
        const trip: SavedTrip = {
          id: existing?.id ?? genId("trip"),
          name: name.trim() || tripName.trim() || existing?.name || defaultTripName(tripDestination, tripDate),
          destination: tripDestination.trim() || existing?.destination,
          coverPhoto: coverPhoto ?? existing?.coverPhoto,
          photos: existing?.photos,
          savedAt: new Date().toISOString(),
          entries: list,
          slots,
          packing,
          tripDate,
          tripDayCount,
          baseMode,
          planRequest,
          lodgingSkipped,
        };
        const next = existing ? prev.map((t) => (t.id === existing.id ? trip : t)) : [trip, ...prev];
        persistTrips(next);
        setActiveTripId(trip.id);
        setFlash({ visible: true, text: existing ? `「${trip.name}」を更新しました` : `「${trip.name}」をしおりに保存しました` });
        setTimeout(() => setFlash({ visible: false, text: "" }), 1900);
        return next;
      });
    },
    [entries, slots, packing, tripDate, tripDayCount, baseMode, planRequest, lodgingSkipped, tripName, tripDestination, activeTripId, persistTrips]
  );

  /** しおりの表紙写真を更新する。 */
  const setTripCover = useCallback((id: string, coverPhoto?: string) => {
    setSavedTrips((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, coverPhoto } : t));
      persistTrips(next);
      return next;
    });
  }, [persistTrips]);

  /** しおりに思い出写真を追加する（最大30枚）。 */
  const addTripPhotos = useCallback((id: string, photos: string[]) => {
    setSavedTrips((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t;
        const current = t.photos ?? [];
        const merged = [...current, ...photos].slice(0, MAX_TRIP_PHOTOS);
        return { ...t, photos: merged };
      });
      persistTrips(next);
      return next;
    });
  }, [persistTrips]);

  /** しおりの思い出写真を1枚削除する。 */
  const removeTripPhoto = useCallback((id: string, index: number) => {
    setSavedTrips((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t;
        const photos = (t.photos ?? []).filter((_, i) => i !== index);
        return { ...t, photos };
      });
      persistTrips(next);
      return next;
    });
  }, [persistTrips]);

  /** 保存した旅を現在の旅程として読み込む（今の内容は上書きされる）。 */
  const loadTrip = useCallback((id: string) => {
    setSavedTrips((prev) => {
      const trip = prev.find((t) => t.id === id);
      if (!trip) return prev;
      setReadOnly(false);
      setEntries(trip.entries.filter((e) => (e.mode as string) !== "home"));
      setSlots(trip.slots);
      setPacking(trip.packing);
      setCurrentNodeKey(null);
      setTripDateState(trip.tripDate);
      setTripDayCountState(trip.tripDayCount);
      setBaseMode(trip.baseMode);
      setPlanRequest(trip.planRequest ?? "");
      setLodgingSkipped(trip.lodgingSkipped ?? []);
      setTripName(trip.name);
      setTripDestination(trip.destination ?? "");
      setSuggestions([]);
      setPlanNotes(null);
      setActiveTripId(trip.id);
      scheduleSigRef.current = scheduleSignature(trip.entries);
      openTrip("list");
      setFlash({ visible: true, text: `「${trip.name}」を読み込みました` });
      setTimeout(() => setFlash({ visible: false, text: "" }), 1700);
      return prev;
    });
  }, [openTrip]);

  /**
   * 今の旅を、しおり（＝旅の一覧）へ自動で保存し続ける。
   *
   * 「保存する」という操作を覚えなくていいようにするため。しおりが旅の一覧を
   * 兼ねるので、複数の旅を持つために新しい概念を増やさずに済む。
   * 中身が変わっていない時は書き込まない（写真ごと毎回書き直さないため）。
   */
  const autoSaveSigRef = useRef<string | null>(null);
  useEffect(() => {
    if (!entries || readOnly || entries.length === 0) return;
    const sig = JSON.stringify([
      entries.map((e) => [e.id, e.title, e.place, e.day, e.mode, e.priority, e.arriveBy, e.stayMin, e.cost]),
      slots.map((s) => [s.entryId, s.arriveAt, s.stayMin]),
      tripDate,
      tripDayCount,
      baseMode,
      planRequest,
      lodgingSkipped,
      tripName,
      tripDestination,
    ]);
    if (autoSaveSigRef.current === sig) return;
    const timer = setTimeout(() => {
      autoSaveSigRef.current = sig;
      setSavedTrips((prev) => {
        const existing = activeTripId ? prev.find((t) => t.id === activeTripId) : undefined;
        const id = existing?.id ?? genId("trip");
        const trip: SavedTrip = {
          ...existing,
          id,
          name: tripName.trim() || existing?.name || defaultTripName(tripDestination, tripDate),
          destination: tripDestination.trim() || existing?.destination,
          savedAt: new Date().toISOString(),
          entries,
          slots,
          packing,
          tripDate,
          tripDayCount,
          baseMode,
          planRequest,
          lodgingSkipped,
        };
        const next = existing ? prev.map((t) => (t.id === id ? trip : t)) : [trip, ...prev];
        persistTrips(next);
        if (!existing) setActiveTripId(id);
        return next;
      });
    }, 1500); // 入力のたびに書かないよう少し待つ
    return () => clearTimeout(timer);
  }, [
    entries,
    slots,
    packing,
    tripDate,
    tripDayCount,
    baseMode,
    planRequest,
    lodgingSkipped,
    tripName,
    tripDestination,
    activeTripId,
    readOnly,
    persistTrips,
  ]);

  /**
   * 新しい旅を始める（今の旅はしおりに残っているので消えない）。
   * 「保存しなきゃ」と身構えずに次の旅を作れるようにするための入口。
   */
  const startNewTrip = useCallback(() => {
    setReadOnly(false);
    setEntries([]);
    setSlots([]);
    setPacking(buildDefaultPacking());
    setCurrentNodeKey(null);
    setCurrentNodeSetAt(null);
    setSuggestions([]);
    setPlanNotes(null);
    setPlanRequest("");
    setComposeBackup(null);
    setComposedSig(null);
    setTripName("");
    setTripDestination("");
    setTripDayCountState(1);
    setTripDateState(todayDateStr());
    setActiveTripId(null);
    autoSaveSigRef.current = null;
    scheduleSigRef.current = scheduleSignature([]);
    openTrip("list");
  }, [openTrip]);

  /** 保存した旅を履歴から削除する。 */
  const deleteTrip = useCallback((id: string) => {
    setActiveTripId((cur) => (cur === id ? null : cur));
    setSavedTrips((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persistTrips(next);
      return next;
    });
  }, [persistTrips]);

  const recordArrival = useCallback((nodeKey: string, place: string) => {
    setCurrentNodeKey(nodeKey);
    setCurrentNodeSetAt(new Date().toISOString());
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

  // 行き先の構造が最後のAI最適化から変わっていて、最適化する価値があるか（旅程画面のチップに使う）。
  const suggestOptimize = useMemo(() => {
    if (!entries || readOnly || composing) return false;
    const spots = entries.filter((e) => e.mode !== "stay" && e.mode !== "rental");
    if (spots.length < 3) return false; // 少ないうちは並び替えで十分
    return composedSig !== scheduleSignature(entries);
  }, [entries, readOnly, composing, composedSig]);

  // しおりの表紙を自動で用意する。手動の表紙が無い旅について、行き先の住所から
  // 地域名（例: 香川県）を割り出し、その地域らしい風景写真を1回だけ取りに行く。
  useEffect(() => {
    if (readOnly) return;
    const target = savedTrips.find((t) => {
      if (t.coverPhoto || t.autoCover) return false;
      const region = tripRegion(t.entries.map((e) => e.place));
      // 一度探して見つからなかった地域は再挑戦しない（無料枠を無駄にしない）
      return Boolean(region) && t.autoCoverRegion !== region;
    });
    if (!target) return;
    const region = tripRegion(target.entries.map((e) => e.place));
    if (!region) return;
    let cancelled = false;
    void fetchCoverPhoto(region).then((photo) => {
      if (cancelled) return;
      setSavedTrips((prev) => {
        const next = prev.map((t) => (t.id === target.id ? { ...t, autoCover: photo ?? undefined, autoCoverRegion: region } : t));
        persistTrips(next);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [savedTrips, readOnly, persistTrips]);

  // 旅行が終わったか（最終日の翌日以降）。しおりへの保存を促すバナーに使う。
  const tripEnded = useMemo(() => {
    if (!entries || entries.length === 0 || readOnly) return false;
    const lastDay = new Date(`${dateForDay(tripDate, tripDayCount)}T23:59:59`);
    if (Number.isNaN(lastDay.getTime())) return false;
    return now.getTime() > lastDay.getTime();
    // now は毎秒更新だが、日付をまたぐ瞬間以外は値が変わらないので再計算コストは無視できる
  }, [entries, readOnly, tripDate, tripDayCount, now]);

  return {
    entries,
    events,
    packing,
    tab,
    setTab,
    tripView,
    setTripView,
    openTrip,
    flash,
    justAddedEventId,
    now,
    rail,
    unplacedEntries,
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
    setTripCover,
    addTripPhotos,
    removeTripPhoto,
    loadTrip,
    deleteTrip,
    startNewTrip,
    tripName,
    setTripName,
    tripDestination,
    setTripDestination,
    /** 旅の表示名（未入力なら行き先や日付から作る） */
    tripTitle: tripName.trim() || defaultTripName(tripDestination, tripDate),
    suggestions,
    areaSuggestions,
    areaSuggestionsLoading,
    hasGeoReference: Boolean(areaRefGeo),
    planNotes,
    composing,
    composeError,
    readOnly,
    shareCurrentPlan,
    shareState,
    retryShare: buildShareLink,
    closeShare,
    importSharedToOwn,
    shareItineraryImage,
    addEntry,
    addSpot,
    bulkAddFromText,
    generatePlanFromBrief,
    addSuggestions,
    updateEntry,
    editEntry,
    removeEntry,
    setEntryDay,
    moveEntry,
    moveEntryToEdge,
    importFromMail,
    composeWithAi,
    undoCompose,
    canUndoCompose: composeBackup !== null,
    tripEnded,
    activeTripId,
    planRequest,
    setPlanRequest,
    areaRefGeo,
    isOnline,
    suggestOptimize,
    lodgingSkipped,
    toggleLodgingSkip,
    togglePacking,
    addPacking,
    removePacking,
    recordArrival,
    liveLocation,
    locationPermission,
  };
}

export type AppState = ReturnType<typeof useAppState>;
