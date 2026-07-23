import { apiUrl } from "./apiBase";

export interface Spot {
  name: string;
  note: string;
  walkMin: number;
}

/**
 * 空き時間に寄れる周辺スポットを取得するインターフェース。
 */
export interface SpotProvider {
  nearby(lat: number, lng: number, freeMinutes: number): Promise<Spot[]>;
}

const FIXED_SPOTS: Spot[] = [
  { name: "中之島公園", note: "バラ園 · 屋外", walkMin: 3 },
  { name: "中之島美術館", note: "企画展 開催中", walkMin: 4 },
  { name: "適塾", note: "重要文化財", walkMin: 7 },
];

/** 固定データ実装。座標が無い場合や API キー未設定時のフォールバックに使う。 */
export const fixedSpotProvider: SpotProvider = {
  async nearby(_lat, _lng, freeMinutes) {
    return FIXED_SPOTS.filter((s) => s.walkMin * 2 <= freeMinutes || freeMinutes >= 30);
  },
};

/** Google Places API（/api/nearby-spots 経由）で実際の周辺観光スポットを取得する実装。 */
export const googlePlacesSpotProvider: SpotProvider = {
  async nearby(lat, lng, freeMinutes) {
    const res = await fetch(apiUrl("/api/nearby-spots"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat, lng, freeMinutes }),
    });
    if (!res.ok) throw new Error(`nearby-spots API error ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const spots: { name: string; note: string; walkMin: number }[] = data.spots ?? [];
    return spots.map((s) => ({ name: s.name, note: s.note, walkMin: s.walkMin }));
  },
};

/**
 * 座標があれば Google Places、無ければ固定データにフォールバックする実装。
 * Places 呼び出しが失敗した場合も固定データにフォールバックする。
 */
export function createSpotProvider(hasCoordinates: boolean): SpotProvider {
  if (!hasCoordinates) return fixedSpotProvider;
  return {
    async nearby(lat, lng, freeMinutes) {
      try {
        const spots = await googlePlacesSpotProvider.nearby(lat, lng, freeMinutes);
        if (spots.length > 0) return spots;
        return fixedSpotProvider.nearby(lat, lng, freeMinutes);
      } catch {
        return fixedSpotProvider.nearby(lat, lng, freeMinutes);
      }
    },
  };
}
