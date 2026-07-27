import { guardRequest } from "@/lib/apiGuard";
import { GeoPoint } from "@/lib/types";
import { hasGoogleMapsKey, staticAreaMapUrl, staticRouteMapUrl } from "@/lib/googleMaps";

/**
 * 旅程の全地点を結ぶ経路地図（Static Maps API）の画像を返すプロキシ。
 * APIキーをクライアントに露出させないため、サーバー側で画像バイト列を取得して中継する。
 * points はクエリ `pts=lat,lng;lat,lng;...` で受け取る（<Image> から GET できるようにするため）。
 */
export async function GET(request: Request): Promise<Response> {
  const denied = guardRequest(request, 60);
  if (denied) return denied;

  const url = new URL(request.url);
  const ptsParam = url.searchParams.get("pts") ?? "";
  const width = clampInt(url.searchParams.get("w"), 640, 100, 640);
  const height = clampInt(url.searchParams.get("h"), 320, 100, 640);

  // pts=lat,lng[,label];... （label は行き先の通し番号・任意）
  const parsed = ptsParam
    .split(";")
    .map((triple) => triple.split(","))
    .map(([lat, lng, label]) => ({ lat: Number(lat), lng: Number(lng), label: label || undefined }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const points: GeoPoint[] = parsed.map((p) => ({ lat: p.lat, lng: p.lng }));
  const labels = parsed.map((p) => p.label);

  // 現在地（任意）: me=lat,lng
  const meParam = url.searchParams.get("me");
  let me: GeoPoint | null = null;
  if (meParam) {
    const [mlat, mlng] = meParam.split(",").map(Number);
    if (Number.isFinite(mlat) && Number.isFinite(mlng)) me = { lat: mlat, lng: mlng };
  }

  // c=lat,lng&z=14 が付いていれば「中心とズームを指定した地図」（地図タブの操作用）。
  // 経路の線は引かず、指定の中心をそのまま使うので、指でずらした位置を正確に再現できる。
  const centerParam = url.searchParams.get("c");
  let center: GeoPoint | null = null;
  if (centerParam) {
    const [clat, clng] = centerParam.split(",").map(Number);
    if (Number.isFinite(clat) && Number.isFinite(clng)) center = { lat: clat, lng: clng };
  }

  if (points.length === 0 && !me && !center) {
    return new Response("no points", { status: 400 });
  }
  if (!hasGoogleMapsKey()) {
    return new Response("no key", { status: 404 });
  }

  const mapUrl = center
    ? staticAreaMapUrl(
        center,
        clampInt(url.searchParams.get("z"), 13, 1, 20),
        width,
        height,
        points.map((p, i) => ({ p, label: labels[i] })),
        me
      )
    : staticRouteMapUrl(points, width, height, me, labels);
  if (!mapUrl) return new Response("no map", { status: 400 });

  try {
    const res = await fetch(mapUrl);
    if (!res.ok) return new Response("upstream error", { status: 502 });
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": res.headers.get("content-type") ?? "image/png",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("fetch failed", { status: 502 });
  }
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
