import { GeoPoint } from "./types";

/** 2地点間の直線距離（メートル）。サーバー・クライアント両方から使う純粋関数。 */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** 旅の広がりを表す中心と半径。周辺スポットを「旅全体」から探すために使う。 */
export interface GeoSpread {
  center: GeoPoint;
  /** 中心から最も遠い地点までの距離（メートル） */
  radiusMeters: number;
}

/**
 * 地点群の重心と広がりを求める。
 * 1点だけなら半径0。行き先が散らばっているほど半径が大きくなる。
 */
export function geoSpread(points: GeoPoint[]): GeoSpread | null {
  const valid = points.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length === 0) return null;
  const center = {
    lat: valid.reduce((n, p) => n + p.lat, 0) / valid.length,
    lng: valid.reduce((n, p) => n + p.lng, 0) / valid.length,
  };
  const radiusMeters = valid.reduce((max, p) => Math.max(max, haversineMeters(center, p)), 0);
  return { center, radiusMeters };
}
