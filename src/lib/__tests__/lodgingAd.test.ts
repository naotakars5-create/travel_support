import { lodgingNights, lodgingPrefecture, lodgingProgress, lodgingSearchUrl, nightIndexOf } from "../lodgingAd";
import { PlanEntry } from "../types";

const AFFILIATE = "1a2b3c4d.5e6f7g8h";

function entry(over: Partial<PlanEntry> = {}): PlanEntry {
  return {
    id: "e1",
    title: "栗林公園",
    mode: "activity",
    priority: "want",
    source: "手入力",
    ...over,
  };
}

/** 香川県の宿（n泊目のチェックイン日を指定する） */
function stay(nth: number, tripDate: string, over: Partial<PlanEntry> = {}): PlanEntry {
  const d = new Date(`${tripDate}T00:00`);
  d.setDate(d.getDate() + (nth - 1));
  return entry({ id: `stay-${nth}`, title: `${nth}泊目のホテル`, mode: "stay", arriveBy: `${d.toISOString().slice(0, 10)}T15:00:00`, ...over });
}

const KAGAWA = [entry({ place: "香川県高松市栗林町1-20-16" })];

describe("lodgingPrefecture", () => {
  it("行き先の住所から都道府県を取り、楽天の地域コードに変換する", () => {
    expect(lodgingPrefecture(KAGAWA, "高松・小豆島めぐり")).toEqual({ name: "香川県", code: "kagawa" });
  });

  it("住所が無ければ行き先の自由文から都道府県を拾う", () => {
    expect(lodgingPrefecture([entry()], "香川県 高松・小豆島")).toEqual({ name: "香川県", code: "kagawa" });
  });

  it("都道府県が特定できなければ null（自由文を投げると別の県へ送ってしまうため）", () => {
    expect(lodgingPrefecture([entry()], "海の見えるところ")).toBeNull();
    expect(lodgingPrefecture([entry()], "   ")).toBeNull();
  });

  it("都・道・府も変換できる", () => {
    expect(lodgingPrefecture([entry({ place: "東京都千代田区" })], "")?.code).toBe("tokyo");
    expect(lodgingPrefecture([entry({ place: "北海道札幌市" })], "")?.code).toBe("hokkaido");
    expect(lodgingPrefecture([entry({ place: "京都府京都市" })], "")?.code).toBe("kyoto");
    expect(lodgingPrefecture([entry({ place: "大阪府大阪市" })], "")?.code).toBe("osaka");
  });
});

describe("lodgingSearchUrl", () => {
  const base = { prefCode: "kagawa", checkIn: "2026-08-10", checkOut: "2026-08-12" };

  it("アフィリエイトID未設定なら null（設定しなくてもアプリが成立する）", () => {
    expect(lodgingSearchUrl(base, "")).toBeNull();
  });

  it("アフィリエイトのラッパー経由になる", () => {
    const url = lodgingSearchUrl(base, AFFILIATE)!;
    expect(url.startsWith(`https://hb.afl.rakuten.co.jp/hgc/${encodeURIComponent(AFFILIATE)}/?pc=`)).toBe(true);
  });

  it("エンドポイントは searchVacant（yado/japan だと日付もエリアも無視される）", () => {
    const target = decodeURIComponent(lodgingSearchUrl(base, AFFILIATE)!.split("?pc=")[1]);
    expect(target.startsWith("https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?")).toBe(true);
  });

  it("エリアと日付が実際のパラメータ名で載る", () => {
    const target = decodeURIComponent(lodgingSearchUrl(base, AFFILIATE)!.split("?pc=")[1]);
    expect(target).toContain("f_dai=japan");
    expect(target).toContain("f_chu=kagawa");
    expect(target).toContain("f_nen1=2026");
    expect(target).toContain("f_tuki1=8");
    expect(target).toContain("f_hi1=10");
    expect(target).toContain("f_nen2=2026");
    expect(target).toContain("f_tuki2=8");
    expect(target).toContain("f_hi2=12");
  });

  it("料金の上限は渡さない（渡すとその額を超える宿が結果から消える）", () => {
    const target = decodeURIComponent(lodgingSearchUrl(base, AFFILIATE)!.split("?pc=")[1]);
    expect(target).not.toContain("f_kin=");
  });

  it("日付の形式が違えば null", () => {
    expect(lodgingSearchUrl({ ...base, checkIn: "2026/08/10" }, AFFILIATE)).toBeNull();
    expect(lodgingSearchUrl({ ...base, prefCode: " " }, AFFILIATE)).toBeNull();
  });
});

describe("nightIndexOf", () => {
  it("チェックイン日から何泊目かを求める", () => {
    expect(nightIndexOf(stay(2, "2026-08-10"), "2026-08-10", 2)).toBe(2);
  });

  it("宿以外は対象外", () => {
    expect(nightIndexOf(entry(), "2026-08-10", 2)).toBeNull();
  });

  it("泊数の範囲外なら null（日数を減らしたあとの宿が枠に居座らない）", () => {
    expect(nightIndexOf(stay(3, "2026-08-10"), "2026-08-10", 2)).toBeNull();
  });
});

describe("lodgingNights", () => {
  const now = new Date("2026-08-01T10:00:00");
  const common = { destination: "高松", tripDate: "2026-08-10", now, affiliateId: AFFILIATE };

  it("3日間なら2泊ぶんの枠ができる", () => {
    const nights = lodgingNights({ ...common, entries: KAGAWA, tripDayCount: 3 });
    expect(nights.map((n) => [n.nth, n.checkIn, n.checkOut])).toEqual([
      [1, "2026-08-10", "2026-08-11"],
      [2, "2026-08-11", "2026-08-12"],
    ]);
  });

  it("日帰りは枠ごと出ない", () => {
    expect(lodgingNights({ ...common, entries: KAGAWA, tripDayCount: 1 })).toEqual([]);
  });

  it("各泊のリンクは、その1泊ぶんの日付で検索する", () => {
    const nights = lodgingNights({ ...common, entries: KAGAWA, tripDayCount: 3 });
    const target = decodeURIComponent(nights[1].searchUrl!.split("?pc=")[1]);
    expect(target).toContain("f_hi1=11"); // 2泊目のチェックインは 8/11
    expect(target).toContain("f_hi2=12");
  });

  it("宿が入っている泊にはリンクを出さない", () => {
    const entries = [...KAGAWA, stay(1, "2026-08-10")];
    const nights = lodgingNights({ ...common, entries, tripDayCount: 3 });
    expect(nights[0].entry?.title).toBe("1泊目のホテル");
    expect(nights[0].searchUrl).toBeNull();
    expect(nights[1].searchUrl).not.toBeNull();
  });

  it("「宿を取らない」と決めた泊にはリンクを出さない", () => {
    const nights = lodgingNights({ ...common, entries: KAGAWA, tripDayCount: 3, skipped: [1] });
    expect(nights[0].skipped).toBe(true);
    expect(nights[0].searchUrl).toBeNull();
    expect(nights[1].searchUrl).not.toBeNull();
  });

  it("過ぎた泊にはリンクを出さない（記録としては残す）", () => {
    const during = new Date("2026-08-12T10:00:00");
    const nights = lodgingNights({ ...common, entries: KAGAWA, tripDayCount: 3, now: during });
    expect(nights[0].past).toBe(true);
    expect(nights[0].searchUrl).toBeNull();
  });

  it("今夜の泊に印が付く（旅行中の「今夜の宿がまだ」を拾う）", () => {
    const during = new Date("2026-08-11T18:00:00");
    const nights = lodgingNights({ ...common, entries: KAGAWA, tripDayCount: 3, now: during });
    expect(nights[1].tonight).toBe(true);
    expect(nights[1].searchUrl).not.toBeNull(); // 旅行中でも今夜の宿は探せる
  });

  it("都道府県が特定できなければリンクは出ないが、枠自体は残る", () => {
    const nights = lodgingNights({ ...common, entries: [entry()], destination: "海の見えるところ", tripDayCount: 3 });
    expect(nights).toHaveLength(2);
    expect(nights.every((n) => n.searchUrl === null)).toBe(true);
  });

  it("アフィリエイトID未設定でも枠は残る（宿の管理はアプリの機能なので消さない）", () => {
    const nights = lodgingNights({ ...common, entries: KAGAWA, tripDayCount: 3, affiliateId: "" });
    expect(nights).toHaveLength(2);
    expect(nights.every((n) => n.searchUrl === null)).toBe(true);
  });
});

describe("lodgingProgress", () => {
  const now = new Date("2026-08-01T10:00:00");
  const common = { destination: "高松", tripDate: "2026-08-10", now, affiliateId: AFFILIATE, tripDayCount: 3 };

  it("宿が入った泊と「取らない」と決めた泊を、どちらも決定として数える", () => {
    expect(lodgingProgress(lodgingNights({ ...common, entries: KAGAWA }))).toEqual({ done: 0, total: 2 });
    expect(lodgingProgress(lodgingNights({ ...common, entries: [...KAGAWA, stay(1, "2026-08-10")] }))).toEqual({ done: 1, total: 2 });
    expect(lodgingProgress(lodgingNights({ ...common, entries: KAGAWA, skipped: [1, 2] }))).toEqual({ done: 2, total: 2 });
  });
});
