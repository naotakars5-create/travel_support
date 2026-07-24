import { PackingItem } from "./types";

/** 初回に用意する持ち物チェックリストの雛形。 */
const DEFAULT_LABELS = [
  "スマートフォン充電器",
  "モバイルバッテリー",
  "財布・現金",
  "健康保険証・身分証",
  "常備薬",
  "着替え",
  "洗面用具",
  "折りたたみ傘",
];

export function buildDefaultPacking(): PackingItem[] {
  return DEFAULT_LABELS.map((label, i) => ({ id: `pack-${i}`, label, checked: false }));
}

export function packingProgress(items: PackingItem[]): { done: number; total: number } {
  return { done: items.filter((i) => i.checked).length, total: items.length };
}
