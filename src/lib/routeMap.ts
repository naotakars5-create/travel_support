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
/** getApiBaseUrl() が相対（Web）でも <Image> が読める絶対URLにする。 */
function imageBase(): string {
  const base = getApiBaseUrl();
  if (!base && Platform.OS === "web" && typeof window !== "undefined") return window.location.origin;
  return base;
}

/**
 * 中心とズームを指定した地図画像のURL（/api/staticmap のプロキシ）。
 * 地図タブで指を動かした位置をそのまま描くために使う。
 */
export function areaMapImageUrl(
  center: GeoPoint,
  zoom: number,
  markers: { p: GeoPoint; label?: string }[] = [],
  me?: GeoPoint | null,
  width = 640,
  height = 640
): string | null {
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return null;
  const pts = markers
    .filter(({ p }) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map(({ p, label }) =>
      label ? `${p.lat.toFixed(5)},${p.lng.toFixed(5)},${label}` : `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`
    )
    .join(";");
  const params = [
    `c=${center.lat.toFixed(5)},${center.lng.toFixed(5)}`,
    `z=${Math.round(zoom)}`,
    `w=${width}`,
    `h=${height}`,
  ];
  if (pts) params.push(`pts=${encodeURIComponent(pts)}`);
  if (me && Number.isFinite(me.lat) && Number.isFinite(me.lng)) {
    params.push(`me=${me.lat.toFixed(5)},${me.lng.toFixed(5)}`);
  }
  return `${imageBase()}/api/staticmap?${params.join("&")}`;
}

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

  const base = imageBase();
  const params = [`pts=${encodeURIComponent(pts)}`, `w=${width}`, `h=${height}`];
  if (hasMe) params.push(`me=${me!.lat.toFixed(5)},${me!.lng.toFixed(5)}`);
  return `${base}/api/staticmap?${params.join("&")}`;
}
