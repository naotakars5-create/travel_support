import { GeoPoint, ParsedEvent, TransportMode } from "./types";
import { haversineMeters } from "./geo";

/**
 * 旅行全体の車の使い方。
 * - "car": 旅行中ずっと車（マイカー等）
 * - "walk": 基本は徒歩・電車。レンタカーを登録した期間だけ車になる
 */
export type BaseMode = "car" | "walk";

/** レンタカーを借りている期間（この間の移動は車で計算する）。 */
export interface CarWindow {
  /** 借りる日時（ISO） */
  fromIso: string;
  /** 返す日時（ISO） */
  toIso: string;
}

/** その時刻がレンタカー期間内か。 */
export function isWithinCarWindow(iso: string | undefined, windows: CarWindow[]): boolean {
  if (!iso || windows.length === 0) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return windows.some((w) => {
    const a = new Date(w.fromIso).getTime();
    const b = new Date(w.toIso).getTime();
    return !Number.isNaN(a) && !Number.isNaN(b) && t >= a && t <= b;
  });
}

/** 1区間の実測移動時間（分）。車・徒歩（必要なら公共交通）を保持する。 */
export interface EdgeTravel {
  driving?: number;
  walking?: number;
  /** 公共交通（電車・バス）の実測時間（分）。日本ではDirections APIが返さないため通常は未設定。 */
  transit?: number;
}

export interface TransitEstimate {
  mode: TransportMode;
  durationMin: number;
  /** 実測の車・徒歩時間（分・取得できた場合）。両方表示に使う。 */
  driving?: number;
  walking?: number;
}

/**
 * 2地点間の移動手段・所要時間を見積もるインターフェース。
 * durationMin はその区間に実際に必要な移動時間の見積もり。
 * ノード間の空き時間（interval）がこれを下回る場合は「間に合わない」矛盾として扱われる。
 */
export interface TransitEstimator {
  estimate(from: ParsedEvent, to: ParsedEvent): TransitEstimate;
}

const AIRPORT_RE = /空港|エアポート|Terminal|第[1-9１-９]/;
const STATION_RE = /駅|Station/;

export function guessMode(fromPlace: string | undefined, toPlace: string | undefined): TransportMode {
  const a = fromPlace ?? "";
  const b = toPlace ?? "";
  if (AIRPORT_RE.test(a) || AIRPORT_RE.test(b)) return "bus";
  if (STATION_RE.test(a) || STATION_RE.test(b)) return "rail";
  return "walk";
}

const DEFAULT_DURATION_BY_MODE: Record<TransportMode, number> = {
  air: 90,
  rail: 15,
  bus: 25,
  walk: 8,
  car: 20,
  stay: 5,
  dining: 5,
  activity: 5,
  rental: 0,
};

export const heuristicTransitEstimator: TransitEstimator = {
  estimate(from, to) {
    const mode = guessMode(from.placeTo ?? from.title, to.placeFrom ?? to.title);
    return { mode, durationMin: DEFAULT_DURATION_BY_MODE[mode] };
  },
};

// 距離ベースの所要時間換算（実測が取れない/0の時のフォールバック）。
const WALK_METERS_PER_MIN = 80; // 約4.8km/h
const DRIVE_METERS_PER_MIN = 350; // 市街地の平均 約21km/h（信号・渋滞込み）

/** イベントの到着側座標（次区間の起点）。 */
function endGeoOf(ev: ParsedEvent): GeoPoint | undefined {
  return ev.placeToGeo ?? ev.placeFromGeo;
}
/** イベントの出発側座標（前区間の終点）。 */
function startGeoOf(ev: ParsedEvent): GeoPoint | undefined {
  return ev.placeFromGeo ?? ev.placeToGeo;
}

/** 2地点の座標から、車・徒歩の所要時間（分）を直線距離ベースで見積もる。座標が無ければ空。 */
function distanceEstimate(from: ParsedEvent, to: ParsedEvent): { driving?: number; walking?: number } {
  const a = endGeoOf(from);
  const b = startGeoOf(to);
  if (!a || !b) return {};
  const meters = haversineMeters(a, b);
  if (!Number.isFinite(meters) || meters <= 0) return {};
  return {
    driving: Math.max(1, Math.round(meters / DRIVE_METERS_PER_MIN)),
    walking: Math.max(1, Math.round(meters / WALK_METERS_PER_MIN)),
  };
}

/**
 * 区間キャッシュのキー。イベントIDに加えて丸めた座標を含める。
 * 住所を直して座標が変わったら別キーになり、古い移動時間を返し続けない。
 */
export function edgeKey(from: ParsedEvent, to: ParsedEvent): string {
  const g = (p: GeoPoint | undefined) => (p ? `${p.lat.toFixed(4)},${p.lng.toFixed(4)}` : "?");
  return `${from.id}@${g(endGeoOf(from))}:${to.id}@${g(startGeoOf(to))}`;
}

/** 正の値を優先して返す（実測が0や欠損なら距離ベースにフォールバック）。 */
function pickPositive(measured: number | undefined, fallback: number | undefined): number | undefined {
  if (typeof measured === "number" && measured > 0) return measured;
  if (typeof fallback === "number" && fallback > 0) return fallback;
  return undefined;
}

/**
 * event-id ペア（`${from.id}:${to.id}`）をキーに、事前計算済みの実測値（Directions API 由来・車/徒歩）を返す。
 * baseMode に応じて所要時間を選び、driving/walking の両方も添える。
 * キャッシュに無い区間はヒューリスティックにフォールバックする（取得中・API未設定・air区間など）。
 */
export function createPrecomputedEstimator(
  cache: Record<string, EdgeTravel>,
  baseMode: BaseMode = "car",
  /** レンタカーを借りている期間。この間の区間は車で計算する */
  carWindows: CarWindow[] = []
): TransitEstimator {
  return {
    estimate(from, to) {
      const t = cache[edgeKey(from, to)];
      const dist = distanceEstimate(from, to);
      // 実測（Directions）を優先し、0や欠損なら距離ベースへフォールバック（0分表示を防ぐ）。
      const driving = pickPositive(t?.driving, dist.driving);
      const walking = pickPositive(t?.walking, dist.walking);

      // 「ずっと車（マイカー）」か、レンタカーを借りている時間帯なら車。
      // それ以外は近ければ徒歩、離れていれば電車・バスとして見積もる。
      const hasCar = baseMode === "car" || isWithinCarWindow(from.endAt ?? from.startAt, carWindows);
      if (driving != null || walking != null) {
        if (hasCar) {
          return { mode: "car", durationMin: driving ?? walking ?? 0, driving, walking };
        }
        // 徒歩15分以内なら徒歩、それ以上は電車・バス扱い（日本の公共交通ルートはAPIで取得できないため概算）
        if (walking != null && walking <= 15) {
          return { mode: "walk", durationMin: walking, driving, walking };
        }
        const transitMin = pickPositive(t?.transit, undefined) ?? Math.round((driving ?? walking ?? 0) * 1.4);
        return { mode: "rail", durationMin: transitMin, driving, walking };
      }
      return heuristicTransitEstimator.estimate(from, to);
    },
  };
}
