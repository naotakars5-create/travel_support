import { needsRental, rentalAd, rentalArea, rentalSearchUrl } from "../rentalAd";
import { PlanEntry } from "../types";

const AFFILIATE = "1a2b3c4d.5e6f7g8h";

function entry(over: Partial<PlanEntry> = {}): PlanEntry {
  return { id: "e1", title: "兼六園", mode: "activity", priority: "want", source: "手入力", ...over };
}

const rental = entry({ id: "r1", title: "レンタカー", mode: "rental" });

describe("needsRental", () => {
  const now = new Date("2026-08-01T10:00:00");

  it("徒歩・電車が基本の旅で、レンタカー未登録なら出す", () => {
    expect(needsRental([entry()], "walk", "2026-09-08", 3, now)).toBe(true);
  });

  it("マイカーの旅には出さない（baseMode:car は「ずっと車」＝自分の車）", () => {
    expect(needsRental([entry()], "car", "2026-09-08", 3, now)).toBe(false);
  });

  it("レンタカーが登録済みなら出さない", () => {
    expect(needsRental([entry(), rental], "walk", "2026-09-08", 3, now)).toBe(false);
  });

  it("旅行中も出す（やっぱり車が要る、はある）", () => {
    const during = new Date("2026-09-09T10:00:00");
    expect(needsRental([entry()], "walk", "2026-09-08", 3, during)).toBe(true);
  });

  it("旅行が終わっていれば出さない", () => {
    const after = new Date("2026-09-20T10:00:00");
    expect(needsRental([entry()], "walk", "2026-09-08", 3, after)).toBe(false);
  });

  it("日帰りでも出す（レンタカーは泊まりに限らない）", () => {
    expect(needsRental([entry()], "walk", "2026-09-08", 1, now)).toBe(true);
  });
});

describe("rentalSearchUrl", () => {
  const base = { prefCode: "ishikawa", areaCode: "kanazawa", pickUp: "2026-09-08", dropOff: "2026-09-10" };

  it("アフィリエイトID未設定なら null", () => {
    expect(rentalSearchUrl(base, "")).toBeNull();
  });

  it("アフィリエイトのラッパー経由になる", () => {
    const url = rentalSearchUrl(base, AFFILIATE)!;
    expect(url.startsWith(`https://hb.afl.rakuten.co.jp/hgc/${encodeURIComponent(AFFILIATE)}/?pc=`)).toBe(true);
  });

  it("宿とは別サイト（cars.travel.rakuten.co.jp/cars/rcf010a.do）へ飛ぶ", () => {
    const target = decodeURIComponent(rentalSearchUrl(base, AFFILIATE)!.split("?pc=")[1]);
    // travel.rakuten.co.jp/cars/search/ は 404（実地確認済み）
    expect(target.startsWith("https://cars.travel.rakuten.co.jp/cars/rcf010a.do?")).toBe(true);
  });

  it("エリアと日付が実際のパラメータ名で載る", () => {
    const target = decodeURIComponent(rentalSearchUrl(base, AFFILIATE)!.split("?pc=")[1]);
    expect(target).toContain("gmarea=ishikawa");
    expect(target).toContain("gdatey=2026");
    expect(target).toContain("gdatem=09");
    expect(target).toContain("gdated=08");
    expect(target).toContain("bdatey=2026");
    expect(target).toContain("bdatem=09");
    expect(target).toContain("bdated=10");
  });

  it("小エリアは必須（空にすると楽天側が「入力パラメータが不正です」になる）", () => {
    const target = decodeURIComponent(rentalSearchUrl(base, AFFILIATE)!.split("?pc=")[1]);
    expect(target).toContain("gsarea=kanazawa");
    expect(rentalSearchUrl({ ...base, areaCode: "" }, AFFILIATE)).toBeNull();
  });

  it("日付の形式が違えば null", () => {
    expect(rentalSearchUrl({ ...base, pickUp: "2026/09/08" }, AFFILIATE)).toBeNull();
    expect(rentalSearchUrl({ ...base, prefCode: " " }, AFFILIATE)).toBeNull();
  });
});

describe("rentalAd", () => {
  const now = new Date("2026-08-01T10:00:00");
  const common = {
    entries: [entry()],
    baseMode: "walk" as const,
    tripDate: "2026-09-08",
    tripDayCount: 3,
    now,
    destination: "金沢",
    affiliateId: AFFILIATE,
  };

  it("借りる日は初日、返す日は最終日", () => {
    const ad = rentalAd(common)!;
    expect(ad.pickUp).toBe("2026-09-08");
    expect(ad.dropOff).toBe("2026-09-10");
    expect(ad.areaName).toBe("金沢");
  });

  it("エリアコードを持たない行き先では出さない（推測で送るとエラー画面になる）", () => {
    expect(rentalAd({ ...common, destination: "どこか知らない町", entries: [entry()] })).toBeNull();
  });

  it("アフィリエイトID未設定なら出さない", () => {
    expect(rentalAd({ ...common, affiliateId: "" })).toBeNull();
  });

  it("マイカーの旅には出さない", () => {
    expect(rentalAd({ ...common, baseMode: "car" })).toBeNull();
  });

  it("日帰りなら借り返しが同日になる", () => {
    const ad = rentalAd({ ...common, tripDayCount: 1 })!;
    expect(ad.pickUp).toBe(ad.dropOff);
    expect(ad.rangeLabel).not.toContain("→");
  });
});

describe("rentalArea", () => {
  it("表に載っている地名を引ける", () => {
    expect(rentalArea(["金沢"])).toEqual({ label: "金沢", pref: "ishikawa", area: "kanazawa", verified: true });
    expect(rentalArea(["帯広"])).toEqual({ label: "帯広", pref: "hokkaido", area: "obihiro", verified: true });
    expect(rentalArea(["金沢の旅"])).not.toBeNull();
  });

  it("エリアコードは都道府県とセットで正しく引ける", () => {
    expect(rentalArea(["那覇"])).toEqual({ label: "那覇", pref: "okinawa", area: "naha" });
    expect(rentalArea(["高松"])).toEqual({ label: "高松", pref: "kagawa", area: "takamatsu", verified: true });
  });

  it("表に無い地名は null（推測でコードを作らない）", () => {
    expect(rentalArea(["知らない町"])).toBeNull();
    expect(rentalArea([undefined, "", "   "])).toBeNull();
  });
});

describe("ボタンの文言と検索結果を一致させる", () => {
  const common = {
    entries: [{ id: "e1", title: "観光", mode: "activity" as const, priority: "want" as const, source: "手入力" }],
    baseMode: "walk" as const,
    tripDate: "2026-09-08",
    tripDayCount: 3,
    now: new Date("2026-08-01T10:00:00"),
    affiliateId: AFFILIATE,
  };

  it("裏取り済みのエリアは市区名を出す", () => {
    expect(rentalAd({ ...common, destination: "金沢" })!.areaName).toBe("金沢");
    expect(rentalAd({ ...common, destination: "札幌" })!.areaName).toBe("札幌");
    expect(rentalAd({ ...common, destination: "高松" })!.areaName).toBe("高松");
  });

  it("未確認のエリアは県名を出す（市区は無視されて県全体の検索になるため）", () => {
    // 那覇・名古屋は gsarea が効かず県全体の検索になることを実地確認済み
    expect(rentalAd({ ...common, destination: "那覇" })!.areaName).toBe("沖縄県");
    expect(rentalAd({ ...common, destination: "名古屋" })!.areaName).toBe("愛知県");
  });

  it("エリアコード自体は常に送る（空にすると楽天側が入力エラーになる）", () => {
    const target = decodeURIComponent(rentalAd({ ...common, destination: "那覇" })!.url.split("?pc=")[1]);
    expect(target).toContain("gsarea=naha");
    expect(target).toContain("gmarea=okinawa");
  });
});
