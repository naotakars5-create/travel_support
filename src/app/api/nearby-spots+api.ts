import { guardRequest, LruCache } from "@/lib/apiGuard";
import { nearbyTouristSpots, hasGoogleMapsKey } from "@/lib/googleMaps";

interface NearbyRequest {
  lat?: number;
  lng?: number;
  freeMinutes?: number;
  /** 雨天時は屋内スポットを優先する */
  preferIndoor?: boolean;
  /** 明示的な検索半径（メートル）。計画画面では「行き先全体の広がり」から渡す */
  radiusMeters?: number;
}

const cache = new LruCache<Awaited<ReturnType<typeof nearbyTouristSpots>>>(300);

// 空き時間の半分程度で往復できる範囲を検索半径の目安にする（徒歩 80m/分）。
function radiusForFreeMinutes(freeMinutes: number): number {
  const walkMin = Math.min(30, Math.max(5, freeMinutes / 3));
  return Math.round(walkMin * 80);
}

export async function POST(request: Request): Promise<Response> {
  const denied = guardRequest(request, 30);
  if (denied) return denied;

  let payload: NearbyRequest;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const { lat, lng, freeMinutes, preferIndoor, radiusMeters } = payload;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return Response.json({ error: "lat / lng が必要です" }, { status: 400 });
  }

  if (!hasGoogleMapsKey()) {
    return Response.json({ error: "サーバーに GOOGLE_MAPS_API_KEY が設定されていません" }, { status: 500 });
  }

  // 明示指定があればそれを使う（旅全体の広がりに合わせた検索）。無ければ空き時間から算出。
  const radius =
    typeof radiusMeters === "number" && radiusMeters > 0
      ? Math.round(Math.min(50000, Math.max(200, radiusMeters)))
      : radiusForFreeMinutes(freeMinutes ?? 60);
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}|${radius}|${preferIndoor ? "in" : "out"}`;
  if (cache.has(key)) {
    return Response.json({ spots: cache.get(key) });
  }

  try {
    const spots = await nearbyTouristSpots({ lat, lng }, radius, Boolean(preferIndoor));
    cache.set(key, spots);
    return Response.json({ spots });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    return Response.json({ error: `周辺スポットの取得に失敗しました: ${message}` }, { status: 502 });
  }
}
