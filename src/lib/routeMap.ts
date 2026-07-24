import { Platform } from "react-native";
import { getApiBaseUrl } from "./apiBase";
import { GeoPoint } from "./types";

/**
 * 旅程の地点列から、経路地図プロキシ（/api/staticmap）のGET用URLを組み立てる。
 * <Image source={{ uri }} /> でそのまま読み込める。座標が1点も無ければ null。
 *
 * Web では getApiBaseUrl() が空文字（相対URL）を返すが、react-native-web の <Image> は
 * 相対URLを解決できないことがあるため、window.location.origin を足して絶対URLにする。
 */
export function routeMapImageUrl(points: GeoPoint[], width = 640, height = 320): string | null {
  const valid = points.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length === 0) return null;
  const pts = valid.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";");

  let base = getApiBaseUrl();
  if (!base && Platform.OS === "web" && typeof window !== "undefined") {
    base = window.location.origin;
  }
  const query = `pts=${encodeURIComponent(pts)}&w=${width}&h=${height}`;
  return `${base}/api/staticmap?${query}`;
}
