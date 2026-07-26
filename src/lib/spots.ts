import { fetchWithTimeout } from "./http";
import { apiUrl } from "./apiBase";

export interface Spot {
  name: string;
  note: string;
  walkMin: number;
  /** 住所（Google Places の vicinity 由来。取得できた場合） */
  address?: string;
  /** 種別のかんたんな概要（例: 美術館・博物館）。取得できた場合 */
  category?: string;
  /** 座標（タップで地図に飛ぶために使う） */
  lat?: number;
  lng?: number;
}

/**
 * 空き時間に寄れる周辺スポットを取得するインターフェース。
 */
export interface SpotProvider {
  /** @param radiusMeters 明示的な検索半径。未指定なら freeMinutes から算出する。 */
  nearby(lat: number, lng: number, freeMinutes: number, preferIndoor?: boolean, radiusMeters?: number): Promise<Spot[]>;
}

const FIXED_SPOTS: Spot[] = [
  { name: "中之島公園", note: "バラ園 · 屋外", walkMin: 3 },
  { name: "中之島美術館", note: "企画展 開催中", walkMin: 4 },
  { name: "適塾", note: "重要文化財", walkMin: 7 },
];

const FIXED_INDOOR_SPOTS: Spot[] = [
  { name: "中之島美術館", note: "屋内 · 企画展", walkMin: 4 },
  { name: "こども本の森 中之島", note: "屋内 · 図書施設", walkMin: 5 },
  { name: "大阪市立科学館", note: "屋内 · 雨でも快適", walkMin: 9 },
];

/** 固定データ実装。座標が無い場合や API キー未設定時のフォールバックに使う。 */
export const fixedSpotProvider: SpotProvider = {
  async nearby(_lat, _lng, freeMinutes, preferIndoor) {
    const base = preferIndoor ? FIXED_INDOOR_SPOTS : FIXED_SPOTS;
    return base.filter((s) => s.walkMin * 2 <= freeMinutes || freeMinutes >= 30);
  },
};

/** Google Places API（/api/nearby-spots 経由）で実際の周辺観光スポットを取得する実装。 */
export const googlePlacesSpotProvider: SpotProvider = {
  async nearby(lat, lng, freeMinutes, preferIndoor, radiusMeters) {
    const res = await fetchWithTimeout(apiUrl("/api/nearby-spots"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat, lng, freeMinutes, preferIndoor: Boolean(preferIndoor), radiusMeters }),
    });
    if (!res.ok) throw new Error(`nearby-spots API error ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const spots: { name: string; note: string; walkMin: number; address?: string; category?: string; lat?: number; lng?: number }[] = data.spots ?? [];
    return spots.map((s) => ({ name: s.name, note: s.note, walkMin: s.walkMin, address: s.address, category: s.category, lat: s.lat, lng: s.lng }));
  },
};

/**
 * 座標があれば Google Places、無ければ固定データにフォールバックする実装。
 * Places 呼び出しが失敗した場合も固定データにフォールバックする。
 */
export function createSpotProvider(hasCoordinates: boolean): SpotProvider {
  if (!hasCoordinates) return fixedSpotProvider;
  return {
    async nearby(lat, lng, freeMinutes, preferIndoor) {
      try {
        const spots = await googlePlacesSpotProvider.nearby(lat, lng, freeMinutes, preferIndoor);
        if (spots.length > 0) return spots;
        return fixedSpotProvider.nearby(lat, lng, freeMinutes, preferIndoor);
      } catch {
        return fixedSpotProvider.nearby(lat, lng, freeMinutes, preferIndoor);
      }
    },
  };
}
