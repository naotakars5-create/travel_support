import { prefectureOf, tripRegion } from "../region";

describe("prefectureOf", () => {
  it("住所から都道府県を取り出す", () => {
    expect(prefectureOf("香川県高松市栗林町1-20-16")).toBe("香川県");
    expect(prefectureOf("大阪府大阪市北区中之島4-3-1")).toBe("大阪府");
    expect(prefectureOf("京都府京都市東山区")).toBe("京都府");
    expect(prefectureOf("東京都新宿区西新宿2-8-1")).toBe("東京都");
    expect(prefectureOf("北海道札幌市中央区")).toBe("北海道");
    expect(prefectureOf("神奈川県横浜市西区")).toBe("神奈川県");
  });

  it("都道府県が無ければ null", () => {
    expect(prefectureOf("栗林公園")).toBeNull();
    expect(prefectureOf(undefined)).toBeNull();
    expect(prefectureOf("")).toBeNull();
  });
});

describe("tripRegion", () => {
  it("いちばん多い都道府県を旅の地域とする", () => {
    expect(
      tripRegion(["香川県高松市…", "香川県丸亀市…", "岡山県倉敷市…"])
    ).toBe("香川県");
  });

  it("住所が1つも無ければ null", () => {
    expect(tripRegion([undefined, "栗林公園"])).toBeNull();
    expect(tripRegion([])).toBeNull();
  });
});
