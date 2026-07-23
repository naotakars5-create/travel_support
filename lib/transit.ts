import { ParsedEvent, TransportMode } from "./types";

export interface TransitEstimate {
  mode: TransportMode;
  durationMin: number;
}

/**
 * 2地点間の移動手段・所要時間を見積もるインターフェース。
 * 現在は簡易ヒューリスティック実装。将来 Google Maps Directions API に差し替える。
 */
export interface TransitEstimator {
  /** 前後のノード間の空き時間全体を移動に充てる場合の見積もり（空き時間 < 60分のケース）。 */
  estimateFullInterval(from: ParsedEvent, to: ParsedEvent, intervalMin: number): TransitEstimate;
  /** 空き時間の直前に必要な「出発準備」移動時間の見積もり（空き時間 >= 60分のケース）。 */
  estimateLeadTime(from: ParsedEvent, to: ParsedEvent): TransitEstimate;
  /**
   * この区間に最低限必要な移動時間（分）。見積もりが利用可能な時間を超える場合は矛盾として扱う。
   * 既定実装では未対応（null）。Google Maps Directions API 版で実装する。
   */
  estimateRequiredMin(from: ParsedEvent, to: ParsedEvent): number | null;
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

const LEAD_TIME_BY_MODE: Record<TransportMode, number> = {
  air: 90,
  rail: 15,
  bus: 20,
  walk: 8,
  car: 15,
  stay: 5,
  dining: 5,
  activity: 5,
};

export const heuristicTransitEstimator: TransitEstimator = {
  estimateFullInterval(from, to, intervalMin) {
    const mode = guessMode(from.placeTo ?? from.title, to.placeFrom ?? to.title);
    return { mode, durationMin: Math.max(1, intervalMin) };
  },
  estimateLeadTime(from, to) {
    const mode = guessMode(from.placeTo ?? from.title, to.placeFrom ?? to.title);
    return { mode, durationMin: LEAD_TIME_BY_MODE[mode] };
  },
  estimateRequiredMin() {
    return null;
  },
};
