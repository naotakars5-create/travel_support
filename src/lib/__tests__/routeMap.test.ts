import { areaMapImageUrl, routeMapImageUrl } from "../routeMap";

describe("areaMapImageUrl", () => {
  it("中心とズームを指定した画像URLを組み立てる", () => {
    const uri = areaMapImageUrl({ lat: 34.6873, lng: 135.5259 }, 14);
    expect(uri).toContain("/api/staticmap?");
    expect(uri).toContain("c=34.68730,135.52590");
    expect(uri).toContain("z=14");
  });

  it("候補のピンは番号付きで載せる", () => {
    const uri = areaMapImageUrl({ lat: 34.7, lng: 135.5 }, 13, [{ p: { lat: 34.71, lng: 135.51 }, label: "1" }]);
    expect(uri).toContain(encodeURIComponent("34.71000,135.51000,1"));
  });

  it("壊れたピンは落とし、地図自体は出す", () => {
    const uri = areaMapImageUrl({ lat: 34.7, lng: 135.5 }, 13, [{ p: { lat: NaN, lng: 135.5 } }]);
    expect(uri).toContain("c=34.70000,135.50000");
    expect(uri).not.toContain("pts=");
  });

  it("中心が壊れていれば null", () => {
    expect(areaMapImageUrl({ lat: NaN, lng: 135.5 }, 13)).toBeNull();
  });
});

describe("routeMapImageUrl", () => {
  it("座標があれば画像URLを組み立てる（ラベル付き）", () => {
    const uri = routeMapImageUrl([{ lat: 34.6873, lng: 135.5259 }], null, ["1"]);
    expect(uri).toContain("/api/staticmap?");
    expect(uri).toContain("pts=");
    expect(uri).toContain(encodeURIComponent("34.68730,135.52590,1"));
  });

  it("座標が1点も無ければ null（呼び出し側は地点名リンクへ切り替える）", () => {
    expect(routeMapImageUrl([], null)).toBeNull();
  });

  it("現在地だけでも地図は出せる", () => {
    expect(routeMapImageUrl([], { lat: 34.7, lng: 135.5 })).toContain("me=34.70000,135.50000");
  });

  it("壊れた座標は除外する", () => {
    expect(routeMapImageUrl([{ lat: NaN, lng: 135.5 }], null)).toBeNull();
  });
});
