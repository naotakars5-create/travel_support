/**
 * ゼロから旅程を作ってもらうときの「旅の条件」。
 * 行き先すら決まっていない状態から、AIに丸ごと組んでもらうために使う。
 */

export type Companion = "solo" | "couple" | "friends" | "family" | "colleagues";

export const COMPANION_OPTIONS: { value: Companion; label: string }[] = [
  { value: "solo", label: "ひとり" },
  { value: "couple", label: "カップル・夫婦" },
  { value: "friends", label: "友人" },
  { value: "family", label: "家族" },
  { value: "colleagues", label: "同僚・仕事仲間" },
];

export type Purpose =
  | "gourmet"
  | "sightseeing"
  | "nature"
  | "onsen"
  | "shopping"
  | "activity"
  | "culture"
  | "photogenic"
  | "kids"
  | "nightlife";

export const PURPOSE_OPTIONS: { value: Purpose; label: string }[] = [
  { value: "gourmet", label: "グルメ" },
  { value: "sightseeing", label: "観光" },
  { value: "nature", label: "自然" },
  { value: "onsen", label: "温泉" },
  { value: "shopping", label: "ショッピング" },
  { value: "activity", label: "アクティビティ" },
  { value: "culture", label: "文化・歴史" },
  { value: "photogenic", label: "写真映え" },
  { value: "kids", label: "子連れ" },
  { value: "nightlife", label: "夜遊び" },
];

export interface TripBrief {
  /** 行き先（例: 香川県 / 高松・小豆島） */
  destination: string;
  /** 日数 */
  dayCount: number;
  companion: Companion;
  /** 人数 */
  headcount: number;
  purposes: Purpose[];
  /** 自由記述（任意） */
  freeText?: string;
}

export function companionLabel(c: Companion): string {
  return COMPANION_OPTIONS.find((o) => o.value === c)?.label ?? "ひとり";
}

export function purposeLabels(list: Purpose[]): string[] {
  return list.map((p) => PURPOSE_OPTIONS.find((o) => o.value === p)?.label ?? p);
}
