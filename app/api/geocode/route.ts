import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress, hasGoogleMapsKey } from "@/lib/googleMaps";

export const runtime = "nodejs";

const cache = new Map<string, { lat: number; lng: number } | null>();

export async function POST(req: NextRequest) {
  let payload: { query?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const query = (payload.query ?? "").trim();
  if (!query) return NextResponse.json({ error: "住所・場所名が空です" }, { status: 400 });

  if (!hasGoogleMapsKey()) {
    return NextResponse.json({ error: "サーバーに GOOGLE_MAPS_API_KEY が設定されていません" }, { status: 500 });
  }

  if (cache.has(query)) {
    return NextResponse.json({ point: cache.get(query) });
  }

  try {
    const point = await geocodeAddress(query);
    cache.set(query, point);
    return NextResponse.json({ point });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    return NextResponse.json({ error: `ジオコーディングに失敗しました: ${message}` }, { status: 502 });
  }
}
