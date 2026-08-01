import { guardRequest, LruCache } from "@/lib/apiGuard";
import { GeocodeResult, geocodeAddress, hasGoogleMapsKey } from "@/lib/googleMaps";

const cache = new LruCache<GeocodeResult | null>(1000);

export async function POST(request: Request): Promise<Response> {
  const denied = guardRequest(request, 150);
  if (denied) return denied;

  let payload: { query?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const query = (payload.query ?? "").trim();
  if (!query) return Response.json({ error: "住所・場所名が空です" }, { status: 400 });

  if (!hasGoogleMapsKey()) {
    return Response.json({ error: "サーバーに GOOGLE_MAPS_API_KEY が設定されていません" }, { status: 500 });
  }

  if (cache.has(query)) {
    const hit = cache.get(query);
    return Response.json({ point: hit?.point ?? null, prefecture: hit?.prefecture });
  }

  try {
    const result = await geocodeAddress(query);
    cache.set(query, result);
    return Response.json({ point: result?.point ?? null, prefecture: result?.prefecture });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    return Response.json({ error: `ジオコーディングに失敗しました: ${message}` }, { status: 502 });
  }
}
