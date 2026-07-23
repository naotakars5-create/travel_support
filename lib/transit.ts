import { ParsedEvent, TransportMode } from "./types";

export interface TransitEstimate {
  mode: TransportMode;
  durationMin: number;
}

/**
 * 2地点間の移動手段・所要時間を見積もるインターフェース。
 * 現在は簡易ヒューリスティック実装。将来 Google Maps Directions API に差し替える。
 *
 * durationMin はその区間に実際に必要な移動時間の見積もり。
 * ノード間の空き時間（interval）がこれを下回る場合は「間に合わない」矛盾として扱われる。
 */
export interface TransitEstimator {
  estimate(from: ParsedEvent, to: ParsedEvent): TransitEstimate;
}

const AIRPORT_RE = /空港|エアポート|Terminal|第[1-9１-９]/;
const STATION_RE = /駅|Station/;

function guessMode(fromPlace: string | undefined, toPlace: string | undefined): TransportMode {
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
