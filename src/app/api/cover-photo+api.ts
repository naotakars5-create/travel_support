import { guardRequest, LruCache } from "@/lib/apiGuard";
import { fetchWithTimeout } from "@/lib/http";

/**
 * しおりの表紙にする「その地域らしい風景写真」を返す（Unsplash）。
 * 例: q=香川県 → 香川の風景写真1枚のURLと撮影者クレジット。
 *
 * UNSPLASH_ACCESS_KEY が未設定なら 503 を返し、クライアントは
 * 既定の表紙イラストへフォールバックする（アプリは問題なく動く）。
 */

export interface CoverPhoto {
  url: string;
  /** 撮影者名（Unsplashの規約で表示が必要） */
  credit: string;
  /** 撮影者ページへのリンク（同上） */
  creditUrl: string;
}

// 同じ地域を何度も問い合わせない（Unsplashの無料枠は 50req/時のため節約が要る）
const cache = new LruCache<CoverPhoto | null>(200);

function accessKey(): string | undefined {
  return process.env.UNSPLASH_ACCESS_KEY || undefined;
}

export async function GET(request: Request): Promise<Response> {
  const denied = guardRequest(request, 30);
  if (denied) return denied;

  const key = accessKey();
  if (!key) return Response.json({ error: "UNSPLASH_ACCESS_KEY が未設定です" }, { status: 503 });

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (!q) return Response.json({ error: "地域名が空です" }, { status: 400 });

  const cached = cache.get(q);
  if (cached !== undefined) {
    return cached
      ? Response.json({ photo: cached })
      : Response.json({ error: "写真が見つかりませんでした" }, { status: 404 });
  }

  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    // 「香川県」だけだと人物写真が混ざるので、風景寄りの語を足して精度を上げる
    url.searchParams.set("query", `${q} japan landscape`);
    url.searchParams.set("per_page", "10");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");

    const res = await fetchWithTimeout(url.toString(), { headers: { Authorization: `Client-ID ${key}` } }, 8000);
    if (!res.ok) return Response.json({ error: "写真の取得に失敗しました" }, { status: 502 });
    const data = (await res.json()) as {
      results?: { urls?: { regular?: string }; user?: { name?: string; links?: { html?: string } } }[];
    };

    const hit = (data.results ?? []).find((r) => r.urls?.regular);
    if (!hit) {
      cache.set(q, null);
      return Response.json({ error: "写真が見つかりませんでした" }, { status: 404 });
    }
    const photo: CoverPhoto = {
      url: hit.urls!.regular!,
      credit: hit.user?.name ?? "Unsplash",
      creditUrl: hit.user?.links?.html ?? "https://unsplash.com",
    };
    cache.set(q, photo);
    return Response.json({ photo });
  } catch {
    return Response.json({ error: "写真の取得に失敗しました" }, { status: 502 });
  }
}
