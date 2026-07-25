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
export function routeMapImageUrl(
  points: GeoPoint[],
  me?: GeoPoint | null,
  labels?: (string | undefined)[],
  width = 640,
  height = 320
): string | null {
  const validIdx = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const hasMe = Boolean(me && Number.isFinite(me.lat) && Number.isFinite(me.lng));
  if (validIdx.length === 0 && !hasMe) return null;
  const pts = validIdx
    .map(({ p, i }) => {
      const label = labels?.[i];
      return label ? `${p.lat.toFixed(5)},${p.lng.toFixed(5)},${label}` : `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    })
    .join(";");

  let base = getApiBaseUrl();
  if (!base && Platform.OS === "web" && typeof window !== "undefined") {
    base = window.location.origin;
  }
  const params = [`pts=${encodeURIComponent(pts)}`, `w=${width}`, `h=${height}`];
  if (hasMe) params.push(`me=${me!.lat.toFixed(5)},${me!.lng.toFixed(5)}`);
  return `${base}/api/staticmap?${params.join("&")}`;
}
