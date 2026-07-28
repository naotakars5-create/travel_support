import { fetchWithTimeout } from "./http";
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

  const res = await fetchWithTimeout(url.toString(), undefined, 8000);
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

  const res = await fetchWithTimeout(url.toString(), undefined, 8000);
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

  const res = await fetchWithTimeout(url.toString(), undefined, 8000);
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
    .sort((a, b) => a.walkMin - b.walkMin)
    .slice(0, 15);
}

/** Places Photo の画像URL（サーバー専用・キーを含む）。 */
export function placePhotoUrl(photoRef: string, maxWidth: number): string {
  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("maxwidth", String(maxWidth));
  url.searchParams.set("photo_reference", photoRef);
  url.searchParams.set("key", apiKey());
  return url.toString();
}

export interface PlaceDetails {
  /** 番地まで含む整形済み住所 */
  address?: string;
  geo?: GeoPoint;
  /** 代表的な開店時刻 "HH:MM" */
  openFrom?: string;
  /** 代表的な閉店時刻 "HH:MM" */
  openTo?: string;
  /** 曜日別の営業時間テキスト（日本語） */
  weekdayText?: string[];
  /** 定休日（0=日 … 6=土）。営業時間データが無い場合は undefined（不明） */
  closedDays?: number[];
  /** 代表写真の参照ID（/api/place-photo に渡すと画像が返る） */
  photoRef?: string;
  /** 写真の提供元表示（Googleの規約で表示が必須） */
  photoAttribution?: string;
}

/**
 * opening_hours.periods から定休日（曜日）を導出する。
 * periods の open.day に一度も現れない曜日＝その曜日は営業しない＝定休日。
 * データが無い場合は「不明」として undefined を返す（休み扱いにしない）。
 */
export function closedDaysFromPeriods(periods: { open?: { day?: number; time?: string } }[]): number[] | undefined {
  if (periods.length === 0) return undefined;
  const openDays = new Set(periods.map((p) => p.open?.day).filter((d): d is number => typeof d === "number"));
  if (openDays.size === 0) return undefined;
  // 「24時間営業」は open.day=0, time="0000", close なしの1件だけ → 全曜日営業として扱う
  if (periods.length === 1 && periods[0].open?.time === "0000") return [];
  return [0, 1, 2, 3, 4, 5, 6].filter((d) => !openDays.has(d));
}

/** "0930" → "09:30" */
function hhmm(t: string | undefined): string | undefined {
  if (!t || !/^\d{4}$/.test(t)) return undefined;
  return `${t.slice(0, 2)}:${t.slice(2)}`;
}

/**
 * place_id から詳細（番地までの住所・座標・営業時間）を取得する（Place Details API）。
 * 営業時間は曜日で変わるため、代表として最も多い開閉時刻を openFrom/openTo に採用する。
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  // photos は Basic Data なので Place Details の料金内で取得できる（写真の実取得だけが別課金）。
  url.searchParams.set("fields", "formatted_address,geometry,opening_hours,name,photos");
  url.searchParams.set("language", "ja");
  url.searchParams.set("region", "jp");
  url.searchParams.set("key", apiKey());

  const res = await fetchWithTimeout(url.toString(), undefined, 8000);
  if (!res.ok) throw new Error(`Place Details API error ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK" || !data.result) return null;
  const r = data.result as {
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
    opening_hours?: { periods?: { open?: { day?: number; time?: string }; close?: { time?: string } }[]; weekday_text?: string[] };
    photos?: { photo_reference?: string; html_attributions?: string[] }[];
  };

  const details: PlaceDetails = {
    address: r.formatted_address,
    geo: r.geometry?.location ? { lat: r.geometry.location.lat, lng: r.geometry.location.lng } : undefined,
    weekdayText: r.opening_hours?.weekday_text,
  };

  // 代表的な開閉時刻：最頻の open.time / close.time を採用（曜日ごとの差は weekdayText で補える）。
  const periods = r.opening_hours?.periods ?? [];
  const opens = periods.map((p) => p.open?.time).filter((t): t is string => Boolean(t));
  const closes = periods.map((p) => p.close?.time).filter((t): t is string => Boolean(t));
  const mostCommon = (arr: string[]): string | undefined => {
    if (arr.length === 0) return undefined;
    const count = new Map<string, number>();
    for (const t of arr) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };
  details.openFrom = hhmm(mostCommon(opens));
  details.openTo = hhmm(mostCommon(closes));
  details.closedDays = closedDaysFromPeriods(periods);

  // 代表写真（1枚目）。参照IDだけ保存し、画像はサーバー経由で必要になった時に取得する。
  const photo = r.photos?.[0];
  if (photo?.photo_reference) {
    details.photoRef = photo.photo_reference;
    // html_attributions は <a href=...>名前</a> の形。表示用に名前だけ取り出す。
    const raw = photo.html_attributions?.[0];
    const name = raw ? raw.replace(/<[^>]*>/g, "").trim() : "";
    details.photoAttribution = name || undefined;
  }

  return details;
}

export interface PlacePrediction {
  description: string;
  mainText: string;
  secondaryText: string;
  placeId: string;
}

/** 入力中の文字から場所の予測候補を返す（Places Autocomplete API・日本国内）。 */
export async function placeAutocomplete(input: string): Promise<PlacePrediction[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("language", "ja");
  url.searchParams.set("components", "country:jp");
  url.searchParams.set("key", apiKey());

  const res = await fetchWithTimeout(url.toString(), undefined, 8000);
  if (!res.ok) throw new Error(`Places Autocomplete API error ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places Autocomplete status ${data.status}: ${data.error_message ?? ""}`);
  }
  const preds = (data.predictions ?? []) as {
    description: string;
    place_id: string;
    structured_formatting?: { main_text?: string; secondary_text?: string };
  }[];
  return preds.slice(0, 5).map((p) => ({
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? "",
    placeId: p.place_id,
  }));
}

/**
 * 中心とズームを指定した静的地図（Static Maps API）の画像URLを組み立てる。
 * 地図タブの「指で動かせる地図」で使う。経路の線は引かず、候補地点だけを打つ。
 */
export function staticAreaMapUrl(
  center: GeoPoint,
  zoom: number,
  width: number,
  height: number,
  markers: { p: GeoPoint; label?: string }[] = [],
  me?: GeoPoint | null
): string | null {
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("size", `${width}x${height}`);
  url.searchParams.set("scale", "2");
  url.searchParams.set("language", "ja");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("center", `${center.lat.toFixed(5)},${center.lng.toFixed(5)}`);
  url.searchParams.set("zoom", String(Math.max(1, Math.min(20, Math.round(zoom)))));

  for (const { p, label } of markers) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    // Static Maps のラベルは英数字1文字のみ。入らない番号は小さいマーカーにする。
    const usable = label && /^[0-9A-Za-z]$/.test(label) ? `label:${label}|` : "size:small|";
    url.searchParams.append("markers", `color:0x1A1A1A|${usable}${p.lat.toFixed(5)},${p.lng.toFixed(5)}`);
  }
  if (me && Number.isFinite(me.lat) && Number.isFinite(me.lng)) {
    url.searchParams.append("markers", `color:0xDD5967|${me.lat.toFixed(5)},${me.lng.toFixed(5)}`);
  }
  url.searchParams.set("key", apiKey());
  return url.toString();
}

/**
 * 旅程の全地点を結ぶ経路を描いた静的地図（Static Maps API）の画像URLを組み立てる。
 * APIキーはサーバー側にのみ埋め込む（クライアントへは露出させない）。
 */
export function staticRouteMapUrl(
  points: GeoPoint[],
  width: number,
  height: number,
  me?: GeoPoint | null,
  labels?: (string | undefined)[]
): string | null {
  if (points.length === 0 && !me) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("size", `${width}x${height}`);
  url.searchParams.set("scale", "2");
  url.searchParams.set("language", "ja");
  url.searchParams.set("maptype", "roadmap");

  // 同じ場所が続く場合（宿のチェックイン→翌朝出発など）は1点にまとめる。
  // 長さ0の線が重なって動線が読みづらくなるのを防ぐ。
  const stops: { p: GeoPoint; label: string }[] = [];
  points.forEach((p, i) => {
    const prev = stops[stops.length - 1]?.p;
    const same = prev && prev.lat.toFixed(5) === p.lat.toFixed(5) && prev.lng.toFixed(5) === p.lng.toFixed(5);
    if (same) return;
    stops.push({ p, label: labels?.[i] ?? String(i + 1) });
  });

  if (stops.length > 1) {
    // 訪問順に線を引く（＝その日の動線）
    const path = stops.map(({ p }) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");
    url.searchParams.append("path", `color:0xDD5967dd|weight:5|${path}`);
  }
  stops.forEach(({ p, label }, i) => {
    // Static Maps のラベルは英数字1文字のみ。10箇所目以降は数字が入らないので
    // ラベル無しの小さめマーカーにし、番号は本文側の一覧で確認してもらう。
    const usable = /^[0-9A-Za-z]$/.test(label) ? `label:${label}|` : "size:small|";
    // その日の最初の地点だけ塗りを変えて「ここから始まる」と分かるようにする
    const color = i === 0 ? "0xDD5967" : "0x1A1A1A";
    url.searchParams.append("markers", `color:${color}|${usable}${p.lat.toFixed(5)},${p.lng.toFixed(5)}`);
  });
  // 現在地は青いマーカーで表示（ラベルなし）
  if (me) {
    url.searchParams.append("markers", `color:0xDD5967|${me.lat.toFixed(5)},${me.lng.toFixed(5)}`);
    if (points.length === 0) url.searchParams.set("zoom", "15");
  }
  url.searchParams.set("key", apiKey());
  return url.toString();
}
