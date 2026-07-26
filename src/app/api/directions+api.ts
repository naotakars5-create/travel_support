import { guardRequest, LruCache } from "@/lib/apiGuard";
import { getDirections, hasGoogleMapsKey } from "@/lib/googleMaps";
import { TransportMode } from "@/lib/types";

interface DirectionsRequest {
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  mode?: TransportMode;
}

const cache = new LruCache<{ durationMin: number; distanceMeters: number } | null>(500);

export async function POST(request: Request): Promise<Response> {
  const denied = guardRequest(request, 120);
  if (denied) return denied;

  let payload: DirectionsRequest;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const { origin, destination, mode } = payload;
  if (!origin || !destination || !mode) {
    return Response.json({ error: "origin / destination / mode が必要です" }, { status: 400 });
  }

  if (!hasGoogleMapsKey()) {
    return Response.json({ error: "サーバーに GOOGLE_MAPS_API_KEY が設定されていません" }, { status: 500 });
  }

  const key = `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}|${mode}`;
  if (cache.has(key)) {
    return Response.json({ result: cache.get(key) });
  }

  try {
    const result = await getDirections(origin, destination, mode);
    cache.set(key, result);
    return Response.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    return Response.json({ error: `移動時間の取得に失敗しました: ${message}` }, { status: 502 });
  }
}
