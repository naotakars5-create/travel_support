import { PlanEntry } from "./types";
import { addMinutes } from "./date";

/**
 * 初回起動時のデモ用シード行き先。
 * 「自分で行き先を追加していく」体験を最初から見せるため、大阪の1日プランを数件用意する。
 * 時刻は「今」を基準に相対生成し、いつ開いても当日画面（次の移動・空き時間）の演出が成立するようにしている。
 */
export function buildSeedEntries(now: Date): PlanEntry[] {
  const lunch = addMinutes(now, 60); // 1時間後にランチ予約（固定アンカー）
  const hotel = addMinutes(now, 9 * 60); // 夜にチェックイン

  return [
    {
      id: "seed-museum",
      title: "中之島美術館",
      place: "大阪府大阪市北区中之島4-3-1",
      mode: "activity",
      priority: "want",
      stayMin: 90,
      source: "手入力",
      detail: "企画展を鑑賞",
    },
    {
      id: "seed-lunch",
      title: "本湖月（昼食）",
      place: "大阪府大阪市中央区宗右衛門町",
      mode: "dining",
      priority: "must",
      stayMin: 60,
      arriveBy: lunch.toISOString(),
      fixedTime: true,
      cost: 8000,
      source: "一休.com",
      detail: "昼食コース「花」· 個室2名",
    },
    {
      id: "seed-tsutenkaku",
      title: "通天閣",
      place: "大阪府大阪市浪速区恵美須東1-18-6",
      mode: "activity",
      priority: "optional",
      stayMin: 45,
      cost: 1200,
      source: "手入力",
    },
    {
      id: "seed-dotonbori",
      title: "道頓堀 散策",
      place: "大阪府大阪市中央区道頓堀1丁目",
      mode: "activity",
      priority: "want",
      stayMin: 60,
      source: "手入力",
    },
    {
      id: "seed-hotel",
      title: "ホテル日航大阪",
      place: "大阪府大阪市中央区西心斎橋1-3-3",
      mode: "stay",
      priority: "must",
      stayMin: 30,
      arriveBy: hotel.toISOString(),
      fixedTime: true,
      cost: 18700,
      source: "ホテル日航大阪",
      detail: "スタンダードダブル（朝食付き）",
    },
  ];
}
