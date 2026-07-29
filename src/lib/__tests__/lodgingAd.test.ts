import { lodgingAd, lodgingPrefecture, lodgingSearchUrl, needsLodging } from "../lodgingAd";
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

describe("lodgingPrefecture", () => {
  it("行き先の住所から都道府県を取り、楽天の地域コードに変換する", () => {
    const entries = [entry({ place: "香川県高松市栗林町1-20-16" })];
    expect(lodgingPrefecture(entries, "高松・小豆島めぐり")).toEqual({ name: "香川県", code: "kagawa" });
  });

  it("住所が無ければ行き先の自由文から都道府県を拾う", () => {
    expect(lodgingPrefecture([entry()], "香川県 高松・小豆島")).toEqual({ name: "香川県", code: "kagawa" });
  });

  it("都道府県が特定できなければ null（自由文を投げると別の県へ送ってしまうため）", () => {
    expect(lodgingPrefecture([entry()], "高松のあたり")).toBeNull();
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

  it("都道府県が特定できなければ出さない（別の県へ送るより出さないほうがまし）", () => {
    expect(
      lodgingAd({
        entries: [entry({ place: undefined })],
        destination: "海の見えるところ",
        tripDate: "2026-08-10",
        tripDayCount: 3,
        now,
        affiliateId: AFFILIATE,
      })
    ).toBeNull();
  });
});
