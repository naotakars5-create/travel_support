import { GeoPoint, TransportMode } from "./types";
import { haversineMeters } from "./geo";

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

export interface PlaceResult {
  name: string;
  note: string;
  lat: number;
  lng: number;
  walkMin: number;
  /** 住所（Places の vicinity） */
  address?: string;
  /** 種別のかんたんな概要（日本語） */
  category?: string;
}

const WALK_METERS_PER_MIN = 80;

/** Places の types 配列を、日本語の短い概要ラベルに変換する。 */
const PLACE_TYPE_LABEL_JA: Record<string, string> = {
  museum: "美術館・博物館",
  art_gallery: "美術館・ギャラリー",
  aquarium: "水族館",
  zoo: "動物園",
  park: "公園",
  amusement_park: "遊園地・テーマパーク",
  tourist_attraction: "観光スポット",
  place_of_worship: "寺社・教会",
  church: "教会",
  hindu_temple: "寺院",
  library: "図書館",
  book_store: "書店",
  shopping_mall: "ショッピングモール",
  department_store: "百貨店",
  restaurant: "レストラン",
  cafe: "カフェ",
  bakery: "ベーカリー",
  bar: "バー",
  spa: "スパ・温浴",
  stadium: "スタジアム",
  movie_theater: "映画館",
  night_club: "ナイトスポット",
  point_of_interest: "見どころ",
};

function categoryFromTypes(types: string[] | undefined): string | undefined {
  if (!types) return undefined;
  for (const t of types) {
    if (PLACE_TYPE_LABEL_JA[t]) return PLACE_TYPE_LABEL_JA[t];
  }
  return undefined;
}

/** 雨天時に優先する屋内スポットの Places タイプ。 */
const INDOOR_PLACE_TYPE = "museum";

/** 周辺の観光スポットを検索する（Places Nearby Search API）。preferIndoor=true で雨天向けに屋内施設を優先。 */
export async function nearbyTouristSpots(origin: GeoPoint, radiusMeters: number, preferIndoor = false): Promise<PlaceResult[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${origin.lat},${origin.lng}`);
  url.searchParams.set("radius", String(radiusMeters));
  url.searchParams.set("type", preferIndoor ? INDOOR_PLACE_TYPE : "tourist_attraction");
  url.searchParams.set("language", "ja");
  url.searchParams.set("key", apiKey());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Places API error ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places API status ${data.status}: ${data.error_message ?? ""}`);
  }

  const results = (data.results ?? []) as {
    name: string;
    geometry?: { location?: { lat: number; lng: number } };
    types?: string[];
    rating?: number;
    vicinity?: string;
  }[];

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
        address: r.vicinity,
        category: categoryFromTypes(r.types),
      };
    })
    .sort((a, b) => a.walkMin - b.walkMin);
}

/**
 * 旅程の全地点を結ぶ経路を描いた静的地図（Static Maps API）の画像URLを組み立てる。
 * APIキーはサーバー側にのみ埋め込む（クライアントへは露出させない）。
 */
export function staticRouteMapUrl(points: GeoPoint[], width: number, height: number, me?: GeoPoint | null): string | null {
  if (points.length === 0 && !me) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("size", `${width}x${height}`);
  url.searchParams.set("scale", "2");
  url.searchParams.set("language", "ja");
  url.searchParams.set("maptype", "roadmap");

  if (points.length > 1) {
    const path = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");
    url.searchParams.append("path", `color:0xc2492dcc|weight:4|${path}`);
  }
  points.forEach((p, i) => {
    const label = points.length <= 9 ? String(i + 1) : "";
    url.searchParams.append("markers", `color:0x2a2622|label:${label}|${p.lat.toFixed(5)},${p.lng.toFixed(5)}`);
  });
  // 現在地は青いマーカーで表示（ラベルなし）
  if (me) {
    url.searchParams.append("markers", `color:0x1a73e8|${me.lat.toFixed(5)},${me.lng.toFixed(5)}`);
    if (points.length === 0) url.searchParams.set("zoom", "15");
  }
  url.searchParams.set("key", apiKey());
  return url.toString();
}
