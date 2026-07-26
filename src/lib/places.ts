import { fetchWithTimeout } from "./http";
import { apiUrl } from "./apiBase";

export interface PlacePrediction {
  description: string;
  mainText: string;
  secondaryText: string;
  placeId: string;
}

/** 場所の予測候補を取得する（/api/place-autocomplete 経由）。失敗時は空配列。 */
export async function fetchPlacePredictions(input: string): Promise<PlacePrediction[]> {
  try {
    const res = await fetchWithTimeout(apiUrl("/api/place-autocomplete"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.predictions ?? []) as PlacePrediction[];
  } catch {
    return [];
  }
}

export interface PlaceDetails {
  address?: string;
  geo?: { lat: number; lng: number };
  openFrom?: string;
  openTo?: string;
  weekdayText?: string[];
  /** 定休日（0=日 … 6=土）。不明なら undefined */
  closedDays?: number[];
}

/** place_id から詳細（番地までの住所・営業時間）を取得する（/api/place-details 経由）。失敗時は null。 */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  try {
    const res = await fetchWithTimeout(apiUrl("/api/place-details"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ placeId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.details ?? null) as PlaceDetails | null;
  } catch {
    return null;
  }
}
