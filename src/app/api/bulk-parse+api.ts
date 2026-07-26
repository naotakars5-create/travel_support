import { guardRequest } from "@/lib/apiGuard";
import { TransportMode } from "@/lib/types";
import { stripJsonFence } from "@/lib/parsePrompt";
import { getLlmProvider } from "@/lib/llmProvider";

/**
 * 「まとめて追加」：自由文（箇条書き・話し言葉どちらでも）から行き先リストを読み取る。
 * 例:「大阪城、海遊館、道頓堀で夕食。2日目はUSJ」
 * → [{title:"大阪城",mode:"activity"},…,{title:"USJ",mode:"activity",day:2}]
 * 時刻・住所はここでは扱わない（住所・営業時間・定休日は登録後にPlace Detailsで自動補完される）。
 */

const SYSTEM_PROMPT = `あなたは旅行の行き先リストの読み取り係です。
ユーザーが書いた自由なメモ（箇条書き・読点区切り・話し言葉）から「行きたい場所」を抜き出します。

# ルール
- 出力は JSONオブジェクト1つのみ。説明・コードフェンスは付けない。
- スキーマ: { "entries": [ { "title": string, "mode": "activity"|"dining", "day": number|null, "stayMin": number|null } ] }
- "title" は施設名・地名をそのまま（「〜で夕食」なら店・エリア名だけを title に）。
- "mode" は食事の文脈（ランチ・夕食・カフェ等）なら "dining"、それ以外は "activity"。
- "day" は「2日目は〜」「初日に〜」のような指定があるときだけ数値。無ければ null。
- "stayMin" は「2時間くらい」等の明示があるときだけ分に換算。無ければ null。
- ホテル・宿・移動手段（新幹線・飛行機・レンタカー）は行き先ではないので含めない。
- 重複は1つにまとめる。実在が疑わしくても、書かれたものはそのまま抜き出す（勝手に補完しない）。`;

interface RawBulkEntry {
  title?: string;
  mode?: string;
  day?: number | null;
  stayMin?: number | null;
}

export interface BulkParsedEntry {
  title: string;
  mode: TransportMode;
  day?: number;
  stayMin?: number;
}

export type BulkParseResponse = { kind: "entries"; entries: BulkParsedEntry[] } | { kind: "error"; message: string };

export async function POST(request: Request): Promise<Response> {
  const denied = guardRequest(request, 10);
  if (denied) return denied;

  let payload: { text?: string; dayCount?: number };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ kind: "error", message: "リクエストの形式が不正です" } satisfies BulkParseResponse, { status: 400 });
  }

  const text = (payload.text ?? "").trim();
  const dayCount = typeof payload.dayCount === "number" && payload.dayCount > 0 ? Math.floor(payload.dayCount) : 1;
  if (!text) {
    return Response.json({ kind: "error", message: "テキストが空です" } satisfies BulkParseResponse, { status: 400 });
  }
  if (text.length > 4000) {
    return Response.json({ kind: "error", message: "テキストが長すぎます（4000文字まで）" } satisfies BulkParseResponse, { status: 400 });
  }

  try {
    const responseText = await getLlmProvider().complete({
      system: SYSTEM_PROMPT,
      user: `この旅行は${dayCount}日間です。次のメモから行き先を抜き出してください。\n-----\n${text}\n-----`,
    });

    let parsed: { entries?: RawBulkEntry[] };
    try {
      parsed = JSON.parse(stripJsonFence(responseText));
    } catch {
      return Response.json(
        { kind: "error", message: "読み取り結果を解釈できませんでした。もう一度お試しください" } satisfies BulkParseResponse,
        { status: 502 }
      );
    }

    const entries: BulkParsedEntry[] = (Array.isArray(parsed.entries) ? parsed.entries : [])
      .filter((e): e is RawBulkEntry & { title: string } => Boolean(e && typeof e.title === "string" && e.title.trim()))
      .map((e) => ({
        title: e.title.trim(),
        mode: (e.mode === "dining" ? "dining" : "activity") as TransportMode,
        day:
          typeof e.day === "number" && e.day >= 1
            ? Math.min(Math.floor(e.day), dayCount) // 存在しない日には割り当てない
            : undefined,
        stayMin: typeof e.stayMin === "number" && e.stayMin > 0 ? Math.round(e.stayMin) : undefined,
      }))
      .slice(0, 30); // 一括登録の上限（暴走防止）

    if (entries.length === 0) {
      return Response.json(
        { kind: "error", message: "行き先を読み取れませんでした。場所の名前を含めて書いてください" } satisfies BulkParseResponse,
        { status: 422 }
      );
    }
    return Response.json({ kind: "entries", entries } satisfies BulkParseResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return Response.json({ kind: "error", message: `読み取りに失敗しました: ${message}` } satisfies BulkParseResponse, { status: 502 });
  }
}
