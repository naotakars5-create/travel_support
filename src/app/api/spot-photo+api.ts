import { guardRequest } from "@/lib/apiGuard";
import { findPlacePhoto, hasGoogleMapsKey } from "@/lib/googleMaps";

/**
 * スポット名から代表写真の参照IDを探す。
 * 行き先リストに追加されたスポットへ、写真を自動で付けるために使う
 * （オートコンプリート経由なら place-details が photoRef を返すが、
 * 手入力・AI生成・メール取り込みでは付かないので、ここで後追い解決する）。
 *
 * キー未設定・見つからない場合は photo:null。クライアントはそっと画像なしで出す。
 * Find Place はリクエストごとに課金されるため、同じ問い合わせは
 * プロセス内キャッシュで再利用する。
 */
const cache = new Map<string, { photoRef: string; attribution?: string } | null>();

export async function POST(request: Request): Promise<Response> {
  const denied = guardRequest(request, 90);
  if (denied) return denied;

  let payload: { query?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ photo: null });
  }

  const query = (payload.query ?? "").trim().slice(0, 200);
  if (!query || !hasGoogleMapsKey()) {
    return Response.json({ photo: null });
  }

  if (cache.has(query)) {
    return Response.json({ photo: cache.get(query) });
  }

  try {
    const photo = await findPlacePhoto(query);
    cache.set(query, photo);
    return Response.json({ photo });
  } catch {
    // 失敗はキャッシュしない（次回に再挑戦できるように）
    return Response.json({ photo: null });
  }
}
