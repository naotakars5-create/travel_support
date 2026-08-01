import { prefectureFromArea, prefectureOf, resolvePrefecture, tripRegion } from "../region";

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

describe("prefectureFromArea / resolvePrefecture", () => {
  it("市名から都道府県を推定する（旅の行き先は市名で書くのが普通）", () => {
    expect(prefectureFromArea("金沢")).toBe("石川県");
    expect(prefectureFromArea("高松")).toBe("香川県");
    expect(prefectureFromArea("箱根")).toBe("神奈川県");
    expect(prefectureFromArea("由布院")).toBe("大分県");
  });

  it("都道府県の略称（県・都・府なし）も読める", () => {
    expect(prefectureFromArea("香川")).toBe("香川県");
    expect(prefectureFromArea("東京")).toBe("東京都");
    expect(prefectureFromArea("大阪")).toBe("大阪府");
    expect(prefectureFromArea("北海道")).toBe("北海道");
  });

  it("長い地名が短い地名より先に当たる", () => {
    expect(prefectureFromArea("河口湖")).toBe("山梨県");
    expect(prefectureFromArea("黒川温泉")).toBe("熊本県");
    expect(prefectureFromArea("熊野古道")).toBe("和歌山県");
  });

  it("知らない地名は null（外して別の県の宿を出すより出さないほうがよい）", () => {
    expect(prefectureFromArea("海の見えるところ")).toBeNull();
    expect(prefectureFromArea("")).toBeNull();
    expect(prefectureFromArea(undefined)).toBeNull();
  });

  it("resolvePrefecture は住所の都道府県名を市名の推定より優先する", () => {
    expect(resolvePrefecture(["金沢", "香川県高松市"])).toBe("香川県");
    expect(resolvePrefecture(["金沢", "兼六園"])).toBe("石川県");
    expect(resolvePrefecture(["どこか"])).toBeNull();
  });
});
