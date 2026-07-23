import { geocodeAddress, hasGoogleMapsKey } from "@/lib/googleMaps";

const cache = new Map<string, { lat: number; lng: number } | null>();

export async function POST(request: Request): Promise<Response> {
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
    return Response.json({ point: cache.get(query) });
  }

  try {
    const point = await geocodeAddress(query);
    cache.set(query, point);
    return Response.json({ point });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    return Response.json({ error: `ジオコーディングに失敗しました: ${message}` }, { status: 502 });
  }
}
