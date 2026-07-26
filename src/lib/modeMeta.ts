import { TransportMode } from "./types";

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
// 有彩色（テラコッタ/マスタード）は「今・進行中」「完了」専用のため、ここでは使わない。
export const MODE_COLOR: Record<TransportMode, string> = {
  air: "#6E675C",
  rail: "#6E675C",
  bus: "#6E675C",
  walk: "#6E675C",
  car: "#6E675C",
  stay: "#6E675C",
  dining: "#6E675C",
  activity: "#6E675C",
  rental: "#6E675C",
};

export const MODE_DASHED: Partial<Record<TransportMode, boolean>> = {
  walk: true,
};
