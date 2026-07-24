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
    const res = await fetch(apiUrl("/api/place-autocomplete"), {
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
