import { NextRequest, NextResponse } from "next/server";
import { getDirections, hasGoogleMapsKey } from "@/lib/googleMaps";
import { TransportMode } from "@/lib/types";

export const runtime = "nodejs";

interface DirectionsRequest {
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  mode?: TransportMode;
}

const cache = new Map<string, { durationMin: number; distanceMeters: number } | null>();

export async function POST(req: NextRequest) {
  let payload: DirectionsRequest;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const { origin, destination, mode } = payload;
  if (!origin || !destination || !mode) {
    return NextResponse.json({ error: "origin / destination / mode が必要です" }, { status: 400 });
  }

  if (!hasGoogleMapsKey()) {
    return NextResponse.json({ error: "サーバーに GOOGLE_MAPS_API_KEY が設定されていません" }, { status: 500 });
  }

  const key = `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}|${mode}`;
  if (cache.has(key)) {
    return NextResponse.json({ result: cache.get(key) });
  }

  try {
    const result = await getDirections(origin, destination, mode);
    cache.set(key, result);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    return NextResponse.json({ error: `移動時間の取得に失敗しました: ${message}` }, { status: 502 });
  }
}
