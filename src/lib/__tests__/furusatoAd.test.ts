import { furusatoAd, furusatoSearchUrl, isLastTripDay, isYearEndSeason } from "../furusatoAd";
import { LodgingPrefecture } from "../lodgingAd";

const AFFILIATE = "1a2b3c4d.5e6f7g8h";
const ISHIKAWA: LodgingPrefecture = { name: "石川県", code: "ishikawa" };

describe("isYearEndSeason", () => {
  it("10〜12月は締切が近い（文言を強める）", () => {
    expect(isYearEndSeason(new Date("2026-10-01T10:00:00"))).toBe(true);
    expect(isYearEndSeason(new Date("2026-12-31T10:00:00"))).toBe(true);
  });

  it("それ以外の時期は急かさない", () => {
    expect(isYearEndSeason(new Date("2026-01-15T10:00:00"))).toBe(false);
    expect(isYearEndSeason(new Date("2026-08-02T10:00:00"))).toBe(false);
    expect(isYearEndSeason(new Date("2026-09-30T10:00:00"))).toBe(false);
  });
});

describe("furusatoSearchUrl", () => {
  it("アフィリエイトID未設定なら null（設定しなくてもアプリが成立する）", () => {
    expect(furusatoSearchUrl("ishikawa", "")).toBeNull();
  });

  it("都道府県コードが空なら null", () => {
    expect(furusatoSearchUrl("  ", AFFILIATE)).toBeNull();
  });

  it("アフィリエイトのラッパー経由になる", () => {
    const url = furusatoSearchUrl("ishikawa", AFFILIATE)!;
    expect(url.startsWith(`https://hb.afl.rakuten.co.jp/hgc/${encodeURIComponent(AFFILIATE)}/?pc=`)).toBe(true);
  });

  it("都道府県が遷移先に載る", () => {
    const target = decodeURIComponent(furusatoSearchUrl("ishikawa", AFFILIATE)!.split("?pc=")[1]);
    expect(target).toContain("ishikawa");
  });
});

describe("furusatoAd", () => {
  const base = { prefecture: ISHIKAWA, affiliateId: AFFILIATE };

  it("都道府県が分からなければ出さない", () => {
    expect(furusatoAd({ ...base, prefecture: null, now: new Date("2026-08-02T10:00:00") })).toBeNull();
  });

  it("アフィリエイトID未設定なら出さない", () => {
    expect(furusatoAd({ ...base, affiliateId: "", now: new Date("2026-08-02T10:00:00") })).toBeNull();
  });

  it("年末は締切を前に出す", () => {
    const ad = furusatoAd({ ...base, now: new Date("2026-11-10T10:00:00") })!;
    expect(ad.headline).toContain("今年のふるさと納税");
  });

  it("年末以外は急かさない", () => {
    const ad = furusatoAd({ ...base, now: new Date("2026-08-02T10:00:00") })!;
    expect(ad.headline).not.toContain("今年のふるさと納税");
    expect(ad.headline).toContain("石川県");
  });

  it("当日画面（最終日）としおりで補足を変える", () => {
    const now = new Date("2026-08-02T10:00:00");
    expect(furusatoAd({ ...base, now, onTripLastDay: true })!.sub).toContain("旅の記憶");
    expect(furusatoAd({ ...base, now })!.sub).toContain("旅先の味");
  });

  it("税額・控除の話は書かない（限度額は人によって違うため）", () => {
    for (const now of [new Date("2026-08-02T10:00:00"), new Date("2026-11-10T10:00:00")]) {
      const ad = furusatoAd({ ...base, now, onTripLastDay: true })!;
      const text = `${ad.headline} ${ad.sub} ${ad.actionLabel}`;
      expect(text).not.toContain("2,000円");
      expect(text).not.toContain("実質");
      expect(text).not.toContain("控除");
    }
  });
});

describe("isLastTripDay", () => {
  const D = "2026-09-08"; // 3日間なら 9/8・9/9・9/10

  it("最終日だけ true", () => {
    expect(isLastTripDay(D, 3, new Date("2026-09-10T18:00:00"))).toBe(true);
  });

  it("初日・中日は false（旅の途中に締めくくりを出さない）", () => {
    expect(isLastTripDay(D, 3, new Date("2026-09-08T18:00:00"))).toBe(false);
    expect(isLastTripDay(D, 3, new Date("2026-09-09T18:00:00"))).toBe(false);
  });

  it("旅行前・旅行後は false", () => {
    expect(isLastTripDay(D, 3, new Date("2026-09-01T10:00:00"))).toBe(false);
    expect(isLastTripDay(D, 3, new Date("2026-09-11T10:00:00"))).toBe(false);
  });

  it("日帰りは初日が最終日", () => {
    expect(isLastTripDay(D, 1, new Date("2026-09-08T18:00:00"))).toBe(true);
  });
});
