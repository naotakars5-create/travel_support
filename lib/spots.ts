export interface Spot {
  name: string;
  note: string;
  walkMin: number;
}

/**
 * 空き時間に寄れる周辺スポットを取得するインターフェース。
 * 現在は固定データ実装。将来 Google Places API 版に差し替える。
 */
export interface SpotProvider {
  nearby(lat: number, lng: number, freeMinutes: number): Promise<Spot[]>;
}

const FIXED_SPOTS: Spot[] = [
  { name: "中之島公園", note: "バラ園 · 屋外", walkMin: 3 },
  { name: "中之島美術館", note: "企画展 開催中", walkMin: 4 },
  { name: "適塾", note: "重要文化財", walkMin: 7 },
];

export const fixedSpotProvider: SpotProvider = {
  async nearby(_lat, _lng, freeMinutes) {
    return FIXED_SPOTS.filter((s) => s.walkMin * 2 <= freeMinutes || freeMinutes >= 30);
  },
};
