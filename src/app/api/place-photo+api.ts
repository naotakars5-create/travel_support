import { guardRequest } from "@/lib/apiGuard";
import { hasGoogleMapsKey, placePhotoUrl } from "@/lib/googleMaps";

/**
 * Places の写真を中継するプロキシ（APIキーをクライアントへ出さないため）。
 * `<Image source={{ uri }} />` から直接GETできるようにクエリで受け取る。
 * ref=photo_reference / w=横幅
 *
 * 画像は変わらないので長めにキャッシュさせ、同じ写真を何度も取りに行かない
 * （Places Photo はリクエストごとに課金されるため）。
 */
export async function GET(request: Request): Promise<Response> {
  const denied = guardRequest(request, 120);
  if (denied) return denied;

  const url = new URL(request.url);
  const ref = url.searchParams.get("ref") ?? "";
  const wRaw = url.searchParams.get("w");
  const width = Math.max(100, Math.min(800, wRaw ? parseInt(wRaw, 10) || 400 : 400));

  // photo_reference は長い英数字。想定外の文字列で外部へ投げない。
  if (!ref || ref.length > 1000 || !/^[A-Za-z0-9_\-=]+$/.test(ref)) {
    return new Response("bad ref", { status: 400 });
  }
  if (!hasGoogleMapsKey()) return new Response("no key", { status: 404 });

  try {
    // Places Photo は 302 で実体へ飛ぶ。追跡して画像バイト列を返す。
    const res = await fetch(placePhotoUrl(ref, width), { redirect: "follow" });
    if (!res.ok) return new Response("upstream error", { status: 502 });
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": res.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new Response("fetch failed", { status: 502 });
  }
}
