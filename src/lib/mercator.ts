import { GeoPoint } from "./types";

/**
 * Web メルカトル（Google マップと同じ投影）のピクセル⇔緯度経度変換。
 *
 * 静止画の地図（Static Maps）をアプリの中で指でずらせるようにするために使う。
 * ズーム z では世界全体が 256 * 2^z ピクセル四方に収まる、という前提だけで成り立つ。
 */

const TILE = 256;
/** メルカトル図法で表現できる緯度の限界 */
const MAX_LAT = 85.05112878;

export const MIN_ZOOM = 3;
export const MAX_ZOOM = 18;

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(zoom)));
}

function clampLat(lat: number): number {
  return Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
}

function normalizeLng(lng: number): number {
  let v = lng;
  while (v > 180) v -= 360;
  while (v < -180) v += 360;
  return v;
}

/** ズーム z における世界地図の一辺のピクセル数。 */
export function worldSize(zoom: number): number {
  return TILE * Math.pow(2, zoom);
}

/** 緯度経度 → 世界ピクセル座標。 */
export function latLngToWorld(p: GeoPoint, zoom: number): { x: number; y: number } {
  const size = worldSize(zoom);
  const x = ((normalizeLng(p.lng) + 180) / 360) * size;
  const sin = Math.sin((clampLat(p.lat) * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size;
  return { x, y };
}

/** 世界ピクセル座標 → 緯度経度。 */
export function worldToLatLng(x: number, y: number, zoom: number): GeoPoint {
  const size = worldSize(zoom);
  const lng = normalizeLng((x / size) * 360 - 180);
  const n = Math.PI * (1 - 2 * (y / size));
  const lat = clampLat((180 / Math.PI) * Math.atan(Math.sinh(n)));
  return { lat, lng };
}

/**
 * 指で dx, dy ピクセルだけ地図を動かした後の中心。
 * 地図を右へ引っ張る（dx > 0）と、見えている中心は西＝左へ動く。
 */
export function panCenter(center: GeoPoint, zoom: number, dxPx: number, dyPx: number): GeoPoint {
  const w = latLngToWorld(center, zoom);
  return worldToLatLng(w.x - dxPx, w.y - dyPx, zoom);
}

/** その緯度・ズームでの 1ピクセルあたりのメートル数。 */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((clampLat(lat) * Math.PI) / 180)) / Math.pow(2, zoom);
}

/** 今表示している範囲がだいたい覆う半径（メートル）。周辺検索の半径に使う。 */
export function viewRadiusMeters(center: GeoPoint, zoom: number, widthPx: number, heightPx: number): number {
  const mpp = metersPerPixel(center.lat, zoom);
  const shorter = Math.max(1, Math.min(widthPx, heightPx));
  return Math.round((mpp * shorter) / 2);
}

/** 地点が今の表示範囲（中心・ズーム・画面サイズ）の中に入っているか。 */
export function isWithinView(
  p: GeoPoint,
  center: GeoPoint,
  zoom: number,
  widthPx: number,
  heightPx: number
): boolean {
  const c = latLngToWorld(center, zoom);
  const w = latLngToWorld(p, zoom);
  return Math.abs(w.x - c.x) <= widthPx / 2 && Math.abs(w.y - c.y) <= heightPx / 2;
}
