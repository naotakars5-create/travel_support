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
  home: "自宅",
};

export const MODE_COLOR: Record<TransportMode, string> = {
  air: "#4d5b7c",
  rail: "#4f7a5b",
  bus: "#a8804a",
  walk: "#9a9384",
  car: "#a8804a",
  stay: "#4f7a5b",
  dining: "#4f7a5b",
  activity: "#4f7a5b",
  home: "#7c5b4d",
};

export const MODE_DASHED: Partial<Record<TransportMode, boolean>> = {
  walk: true,
};
