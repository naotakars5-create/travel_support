import { lodgingAd, lodgingKeyword, lodgingSearchUrl, needsLodging } from "../lodgingAd";
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

describe("needsLodging", () => {
  const now = new Date("2026-08-01T10:00:00");

  it("日帰りには出さない", () => {
    expect(needsLodging([entry()], 1, "2026-08-10", now)).toBe(false);
  });

  it("泊まりで宿が無ければ出す", () => {
    expect(needsLodging([entry()], 2, "2026-08-10", now)).toBe(true);
  });

  it("宿が1件でも入っていれば出さない", () => {
    const entries = [entry(), entry({ id: "e2", title: "ホテル", mode: "stay" })];
    expect(needsLodging(entries, 3, "2026-08-10", now)).toBe(false);
  });

  it("旅行が始まったら出さない（今から宿を勧めても遅い）", () => {
    const during = new Date("2026-08-11T10:00:00");
    expect(needsLodging([entry()], 3, "2026-08-10", during)).toBe(false);
  });

  it("旅行が終わっていれば出さない", () => {
    const after = new Date("2026-08-20T10:00:00");
    expect(needsLodging([entry()], 3, "2026-08-10", after)).toBe(false);
  });
});

describe("lodgingKeyword", () => {
  it("行き先の住所から都道府県が取れればそれを使う", () => {
    const entries = [entry({ place: "香川県高松市栗林町1-20-16" })];
    expect(lodgingKeyword(entries, "高松・小豆島めぐり")).toBe("香川県");
  });

  it("住所が無ければ行き先の自由文にフォールバックする", () => {
    expect(lodgingKeyword([entry()], "香川県 高松")).toBe("香川県 高松");
  });

  it("どちらも無ければ null（＝枠を出さない）", () => {
    expect(lodgingKeyword([entry()], "   ")).toBeNull();
  });
});

describe("lodgingSearchUrl", () => {
  const base = { keyword: "香川県", checkIn: "2026-08-10", checkOut: "2026-08-12" };

  it("アフィリエイトID未設定なら null（設定しなくてもアプリが成立する）", () => {
    expect(lodgingSearchUrl(base, "")).toBeNull();
  });

  it("アフィリエイトのラッパー経由になる", () => {
    const url = lodgingSearchUrl(base, AFFILIATE)!;
    expect(url.startsWith(`https://hb.afl.rakuten.co.jp/hgc/${encodeURIComponent(AFFILIATE)}/?pc=`)).toBe(true);
  });

  it("チェックイン・チェックアウトの日付が遷移先に載る", () => {
    const url = lodgingSearchUrl(base, AFFILIATE)!;
    const target = decodeURIComponent(url.split("?pc=")[1]);
    expect(target).toContain("f_nen1=2026");
    expect(target).toContain("f_tuki1=8");
    expect(target).toContain("f_hi1=10");
    expect(target).toContain("f_nen2=2026");
    expect(target).toContain("f_tuki2=8");
    expect(target).toContain("f_hi2=12");
    expect(target).toContain(`f_query=${encodeURIComponent("香川県")}`);
  });

  it("日付の形式が違えば null", () => {
    expect(lodgingSearchUrl({ ...base, checkIn: "2026/08/10" }, AFFILIATE)).toBeNull();
    expect(lodgingSearchUrl({ ...base, keyword: " " }, AFFILIATE)).toBeNull();
  });
});

describe("lodgingAd", () => {
  const now = new Date("2026-08-01T10:00:00");
  const entries = [entry({ place: "香川県高松市栗林町1-20-16" })];

  it("2泊3日ならチェックアウトは最終日・泊数は2", () => {
    const ad = lodgingAd({
      entries,
      destination: "高松",
      tripDate: "2026-08-10",
      tripDayCount: 3,
      now,
      affiliateId: AFFILIATE,
    })!;
    expect(ad.checkIn).toBe("2026-08-10");
    expect(ad.checkOut).toBe("2026-08-12");
    expect(ad.nights).toBe(2);
    expect(ad.keyword).toBe("香川県");
    expect(ad.rangeLabel).toContain("2泊");
  });

  it("条件を満たさなければ null", () => {
    const common = { entries, destination: "高松", tripDate: "2026-08-10", now, affiliateId: AFFILIATE };
    expect(lodgingAd({ ...common, tripDayCount: 1 })).toBeNull();
  });

  it("アフィリエイトID未設定なら null", () => {
    expect(
      lodgingAd({ entries, destination: "高松", tripDate: "2026-08-10", tripDayCount: 3, now, affiliateId: "" })
    ).toBeNull();
  });
});
