import { TransportMode } from "./types";
import { COLORS } from "./palette";

export const MODE_LABEL: Record<TransportMode, string> = {
  air: "空路",
  rail: "鉄道",
  bus: "バス",
  walk: "徒歩",
  car: "車",
  stay: "宿泊",
  dining: "食事",
  activity: "観光",
  rental: "レンタカー",
};

// 移動・種別の線色はすべて補助色（ink-muted）に統一。
// 有彩色（ローズ/コーラル）は「今・進行中」「完了」専用のため、ここでは使わない。
export const MODE_COLOR: Record<TransportMode, string> = {
  air: COLORS.muted,
  rail: COLORS.muted,
  bus: COLORS.muted,
  walk: COLORS.muted,
  car: COLORS.muted,
  stay: COLORS.muted,
  dining: COLORS.muted,
  activity: COLORS.muted,
  rental: COLORS.muted,
};

export const MODE_DASHED: Partial<Record<TransportMode, boolean>> = {
  walk: true,
};
