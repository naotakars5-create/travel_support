import { routeMapImageUrl } from "../routeMap";

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
