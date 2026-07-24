import { ParsedEvent, TransportMode } from "./types";

/** 旅行全体の「基本の移動手段」。当日の出発カウントダウン等の計算に使う。 */
export type BaseMode = "car" | "walk";

/** 1区間の実測移動時間（分）。車・徒歩の両方を保持する。 */
export interface EdgeTravel {
  driving?: number;
  walking?: number;
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
};

export const heuristicTransitEstimator: TransitEstimator = {
  estimate(from, to) {
    const mode = guessMode(from.placeTo ?? from.title, to.placeFrom ?? to.title);
    return { mode, durationMin: DEFAULT_DURATION_BY_MODE[mode] };
  },
};

/**
 * event-id ペア（`${from.id}:${to.id}`）をキーに、事前計算済みの実測値（Directions API 由来・車/徒歩）を返す。
 * baseMode に応じて所要時間を選び、driving/walking の両方も添える。
 * キャッシュに無い区間はヒューリスティックにフォールバックする（取得中・API未設定・air区間など）。
 */
export function createPrecomputedEstimator(cache: Record<string, EdgeTravel>, baseMode: BaseMode = "car"): TransitEstimator {
  return {
    estimate(from, to) {
      const t = cache[`${from.id}:${to.id}`];
      if (t && (t.driving != null || t.walking != null)) {
        const chosen = baseMode === "car" ? t.driving ?? t.walking : t.walking ?? t.driving;
        const mode: TransportMode = baseMode === "car" ? "car" : "walk";
        return { mode, durationMin: chosen ?? 0, driving: t.driving, walking: t.walking };
      }
      return heuristicTransitEstimator.estimate(from, to);
    },
  };
}
