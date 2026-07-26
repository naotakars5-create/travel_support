import { guardRequest } from "@/lib/apiGuard";
import { getSharedPlan, hasShareStore, isValidShareId, putSharedPlan } from "@/lib/shareStore";

/**
 * 共有リンクの短縮。
 * POST { payload } → { id }        旅程本体を預けて短いIDを発行する
 * GET  ?id=xxxx    → { payload }   IDから旅程本体を返す
 *
 * 保存先（KV）が未設定なら 503 を返し、クライアントは従来のURL埋め込み方式へ戻る。
 */

export async function POST(request: Request): Promise<Response> {
  const denied = guardRequest(request, 20);
  if (denied) return denied;

  if (!hasShareStore()) {
    return Response.json({ error: "共有リンクの保存先が設定されていません" }, { status: 503 });
  }

  let payload: { payload?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const body = typeof payload.payload === "string" ? payload.payload : "";
  if (!body) return Response.json({ error: "プランが空です" }, { status: 400 });

  const id = await putSharedPlan(body);
  if (!id) return Response.json({ error: "共有リンクを発行できませんでした" }, { status: 502 });
  return Response.json({ id });
}

export async function GET(request: Request): Promise<Response> {
  const denied = guardRequest(request, 60);
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!isValidShareId(id)) return Response.json({ error: "リンクの形式が不正です" }, { status: 400 });

  const stored = await getSharedPlan(id);
  if (!stored) {
    return Response.json({ error: "この共有リンクは見つかりませんでした（期限切れの可能性があります）" }, { status: 404 });
  }
  return Response.json({ payload: stored });
}
