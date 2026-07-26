import { geoSpread, haversineMeters } from "../geo";

describe("geoSpread", () => {
  it("1点なら重心はその点・半径0", () => {
    const s = geoSpread([{ lat: 34.7, lng: 135.5 }])!;
    expect(s.center.lat).toBeCloseTo(34.7, 5);
    expect(s.radiusMeters).toBe(0);
  });

  it("複数点なら重心は真ん中・半径は最も遠い点まで", () => {
    const s = geoSpread([
      { lat: 34.6, lng: 135.4 },
      { lat: 34.8, lng: 135.6 },
    ])!;
    expect(s.center.lat).toBeCloseTo(34.7, 5);
    expect(s.center.lng).toBeCloseTo(135.5, 5);
    // 2点の中点から各点までは同じ距離
    const d = haversineMeters(s.center, { lat: 34.6, lng: 135.4 });
    expect(s.radiusMeters).toBeCloseTo(d, 0);
    expect(s.radiusMeters).toBeGreaterThan(10000);
  });

  it("片寄った点群でも全部を含む半径になる", () => {
    const pts = [
      { lat: 34.69, lng: 135.5 },
      { lat: 34.7, lng: 135.51 },
      { lat: 34.99, lng: 135.76 }, // 京都まで離れた1点
    ];
    const s = geoSpread(pts)!;
    for (const p of pts) {
      expect(haversineMeters(s.center, p)).toBeLessThanOrEqual(s.radiusMeters + 1);
    }
  });

  it("座標が無ければ null / 壊れた値は無視", () => {
    expect(geoSpread([])).toBeNull();
    expect(geoSpread([{ lat: NaN, lng: 135.5 }])).toBeNull();
  });
});
