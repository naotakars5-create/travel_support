import { guardRequest } from "@/lib/apiGuard";
import { hasGoogleMapsKey, placeAutocomplete } from "@/lib/googleMaps";

/**
 * 観光地名などの入力から住所つき候補を返す（Places Autocomplete）。
 * キー未設定・エラー時は空配列を返し、フォームは通常どおり手入力できる。
 */
export async function POST(request: Request): Promise<Response> {
  const denied = guardRequest(request, 60);
  if (denied) return denied;

  let payload: { input?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ predictions: [] });
  }

  const input = (payload.input ?? "").trim();
  if (input.length < 2 || !hasGoogleMapsKey()) {
    return Response.json({ predictions: [] });
  }

  try {
    const predictions = await placeAutocomplete(input);
    return Response.json({ predictions });
  } catch {
    return Response.json({ predictions: [] });
  }
}
