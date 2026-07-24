import { getApiBaseUrl } from "./apiBase";
import { GeoPoint } from "./types";

/**
 * 旅程の地点列から、経路地図プロキシ（/api/staticmap）のGET用URLを組み立てる。
 * <Image source={{ uri }} /> でそのまま読み込める。座標が1点も無ければ null。
 */
export function routeMapImageUrl(points: GeoPoint[], width = 640, height = 320): string | null {
  const valid = points.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length === 0) return null;
  const pts = valid.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";");
  const base = getApiBaseUrl();
  const query = `pts=${encodeURIComponent(pts)}&w=${width}&h=${height}`;
  return `${base}/api/staticmap?${query}`;
}
