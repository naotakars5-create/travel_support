import {
  clampZoom,
  isWithinView,
  latLngToWorld,
  metersPerPixel,
  panCenter,
  viewRadiusMeters,
  worldSize,
  worldToLatLng,
} from "../mercator";

describe("mercator", () => {
  it("ズーム0では世界が256px四方", () => {
    expect(worldSize(0)).toBe(256);
    expect(worldSize(13)).toBe(256 * 8192);
  });

  it("緯度経度→ピクセル→緯度経度で元に戻る", () => {
    const p = { lat: 35.6812, lng: 139.7671 }; // 東京駅
    const w = latLngToWorld(p, 15);
    const back = worldToLatLng(w.x, w.y, 15);
    expect(back.lat).toBeCloseTo(p.lat, 6);
    expect(back.lng).toBeCloseTo(p.lng, 6);
  });

  it("赤道・本初子午線は世界の中心", () => {
    const w = latLngToWorld({ lat: 0, lng: 0 }, 0);
    expect(w.x).toBeCloseTo(128, 6);
    expect(w.y).toBeCloseTo(128, 6);
  });

  it("地図を右へ引くと中心は西（経度が小さい方）へ動く", () => {
    const center = { lat: 35.68, lng: 139.77 };
    const next = panCenter(center, 14, 100, 0);
    expect(next.lng).toBeLessThan(center.lng);
    expect(next.lat).toBeCloseTo(center.lat, 6);
  });

  it("地図を下へ引くと中心は北（緯度が大きい方）へ動く", () => {
    const center = { lat: 35.68, lng: 139.77 };
    const next = panCenter(center, 14, 0, 100);
    expect(next.lat).toBeGreaterThan(center.lat);
  });

  it("ドラッグ量ぶんだけ動き、戻すと元の位置に帰る", () => {
    const center = { lat: 35.68, lng: 139.77 };
    const moved = panCenter(center, 16, 120, -80);
    const back = panCenter(moved, 16, -120, 80);
    expect(back.lat).toBeCloseTo(center.lat, 6);
    expect(back.lng).toBeCloseTo(center.lng, 6);
  });

  it("ズームが1段上がると1pxあたりの距離は半分になる", () => {
    const a = metersPerPixel(35.68, 13);
    const b = metersPerPixel(35.68, 14);
    expect(b).toBeCloseTo(a / 2, 6);
  });

  it("表示半径は短い辺の半分ぶん", () => {
    const center = { lat: 35.68, lng: 139.77 };
    const r = viewRadiusMeters(center, 14, 400, 600);
    expect(r).toBeCloseTo((metersPerPixel(35.68, 14) * 400) / 2, 0);
  });

  it("表示範囲の内外を判定できる", () => {
    const center = { lat: 35.68, lng: 139.77 };
    const near = panCenter(center, 14, 50, 50);
    const far = panCenter(center, 14, 5000, 0);
    expect(isWithinView(near, center, 14, 400, 600)).toBe(true);
    expect(isWithinView(far, center, 14, 400, 600)).toBe(false);
  });

  it("ズームは扱える範囲に丸められる", () => {
    expect(clampZoom(0)).toBe(3);
    expect(clampZoom(99)).toBe(18);
    expect(clampZoom(13.4)).toBe(13);
  });
});
