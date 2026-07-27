import { guardRequest } from "@/lib/apiGuard";
import { getPlaceDetails, hasGoogleMapsKey } from "@/lib/googleMaps";

/**
 * place_id から詳細（番地までの住所・座標・営業時間）を返す。
 * キー未設定・エラー時は details:null を返し、フォームは手入力にフォールバックできる。
 */
export async function POST(request: Request): Promise<Response> {
  const denied = guardRequest(request, 90);
  if (denied) return denied;

  let payload: { placeId?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ details: null });
  }

  const placeId = (payload.placeId ?? "").trim();
  if (!placeId || !hasGoogleMapsKey()) {
    return Response.json({ details: null });
  }

  try {
    const details = await getPlaceDetails(placeId);
    return Response.json({ details });
  } catch {
    return Response.json({ details: null });
  }
}
