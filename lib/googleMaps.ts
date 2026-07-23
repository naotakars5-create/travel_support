import { GeoPoint, TransportMode } from "./types";

export function hasGoogleMapsKey(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

function apiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  return key;
}

/** 住所・場所名を座標に変換する（Geocoding API）。 */
export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("language", "ja");
  url.searchParams.set("region", "jp");
  url.searchParams.set("key", apiKey());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Geocoding API error ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.length) return null;
  const loc = data.results[0].geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat, lng: loc.lng };
}

const DIRECTIONS_MODE: Partial<Record<TransportMode, string>> = {
  car: "driving",
  walk: "walking",
  rail: "transit",
  bus: "transit",
};

export interface DirectionsResult {
  durationMin: number;
  distanceMeters: number;
}

/** 2地点間の移動時間を計算する（Directions API）。air（空路）は対象外。 */
export async function getDirections(origin: GeoPoint, destination: GeoPoint, mode: TransportMode): Promise<DirectionsResult | null> {
  const travelMode = DIRECTIONS_MODE[mode];
  if (!travelMode) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", `${destination.lat},${destination.lng}`);
  url.searchParams.set("mode", travelMode);
  url.searchParams.set("language", "ja");
  url.searchParams.set("region", "jp");
  url.searchParams.set("key", apiKey());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Directions API error ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK" || !data.routes?.length) return null;
  const leg = data.routes[0].legs?.[0];
  if (!leg) return null;
  return {
    durationMin: Math.round(leg.duration.value / 60),
    distanceMeters: leg.distance.value,
  };
}

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export interface PlaceResult {
  name: string;
  note: string;
  lat: number;
  lng: number;
  walkMin: number;
}

const WALK_METERS_PER_MIN = 80;

/** 周辺の観光スポットを検索する（Places Nearby Search API）。 */
export async function nearbyTouristSpots(origin: GeoPoint, radiusMeters: number): Promise<PlaceResult[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${origin.lat},${origin.lng}`);
  url.searchParams.set("radius", String(radiusMeters));
  url.searchParams.set("type", "tourist_attraction");
  url.searchParams.set("language", "ja");
  url.searchParams.set("key", apiKey());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Places API error ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places API status ${data.status}: ${data.error_message ?? ""}`);
  }

  const results = (data.results ?? []) as Array<{
    name: string;
    geometry?: { location?: { lat: number; lng: number } };
    types?: string[];
    rating?: number;
  }>;

  return results
    .filter((r) => r.geometry?.location)
    .map((r) => {
      const loc = r.geometry!.location!;
      const distance = haversineMeters(origin, { lat: loc.lat, lng: loc.lng });
      return {
        name: r.name,
        note: typeof r.rating === "number" ? `評価 ${r.rating.toFixed(1)}` : "観光スポット",
        lat: loc.lat,
        lng: loc.lng,
        walkMin: Math.max(1, Math.round(distance / WALK_METERS_PER_MIN)),
      };
    })
    .sort((a, b) => a.walkMin - b.walkMin);
}
