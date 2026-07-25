import { GeoPoint, TransportMode } from "./types";
import { RailLeg } from "./itinerary";

/** Googleマップの地点表現。座標があれば座標を優先（同名の店を取り違えないため）。 */
function point(place: string | undefined, geo: GeoPoint | undefined): string | null {
  if (geo) return `${geo.lat},${geo.lng}`;
  const t = place?.trim();
  return t ? t : null;
}

/** アプリの移動手段 → Googleマップの travelmode。 */
const TRAVEL_MODE: Partial<Record<TransportMode, string>> = {
  car: "driving",
  walk: "walking",
  rail: "transit",
  bus: "transit",
};

/**
 * 1区間の経路をGoogleマップで開くURL。
 * 日本の電車・バスの乗換や時刻表はDirections APIで取得できないため、
 * 本家のGoogleマップへ渡して正確なルート・時刻を確認してもらう。
 */
export function directionsUrl(leg: RailLeg | undefined, mode: TransportMode): string | null {
  if (!leg) return null;
  const origin = point(leg.fromPlace, leg.fromGeo);
  const destination = point(leg.toPlace, leg.toGeo);
  if (!origin || !destination) return null;
  const travelmode = TRAVEL_MODE[mode] ?? "transit";
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(
    destination
  )}&travelmode=${travelmode}`;
}
