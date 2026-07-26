import { Platform } from "react-native";
import { getApiBaseUrl } from "./apiBase";

/**
 * スポット写真（/api/place-photo プロキシ）のURLを組み立てる。
 * `<Image source={{ uri }} />` でそのまま読み込める。参照IDが無ければ null。
 *
 * Web の <Image> は相対URLを解決できないことがあるため、絶対URLにする
 * （経路地図の routeMapImageUrl と同じ理由）。
 */
export function placePhotoImageUrl(photoRef: string | undefined, width = 200): string | null {
  if (!photoRef) return null;
  let base = getApiBaseUrl();
  if (!base && Platform.OS === "web" && typeof window !== "undefined") {
    base = window.location.origin;
  }
  return `${base}/api/place-photo?ref=${encodeURIComponent(photoRef)}&w=${Math.round(width)}`;
}
