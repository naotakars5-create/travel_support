import { guardRequest } from "@/lib/apiGuard";
import { TransportMode } from "@/lib/types";
import { stripJsonFence } from "@/lib/parsePrompt";
import { getLlmProvider } from "@/lib/llmProvider";
import { companionLabel, purposeLabels, TripBrief, Companion, Purpose } from "@/lib/tripBrief";

/**
 * 行き先が1件も無い状態から、旅程をまるごと提案する。
 * ユーザーは「どこへ・何日・誰と・何人・何をしたいか」だけを選ぶ。
 * ここで返すのは行き先の候補リストで、時刻の割り当ては
 * 既存の /api/plan（AIで順番を最適化）とローカル計算に任せる。
 */

const SYSTEM_PROMPT = `あなたは日本の旅行プランナーです。旅の条件から、実在する行き先を選んで日ごとに割り振ります。

# ルール
- 出力は JSONオブジェクト1つのみ。説明・コードフェンスは付けない。
- スキーマ:
  { "spots": [ { "title": string, "area": string, "day": number, "mode": "activity"|"dining"|"stay", "stayMin": number, "note": string } ], "notes": string }
- **必ず実在する施設・店舗・名所だけを挙げる。** 実在が怪しいものは入れない。
- "title" は検索でそのまま見つかる正式名称（例: 「栗林公園」「金刀比羅宮」）。地名だけの曖昧な項目にしない。
- "area" は市区町村レベルの場所（例: 「高松市」）。
- "day" は1日目から順に。指定された日数を超えない。
- **地理的にまとまりのある回り方にする。** 同じエリアの行き先を同じ日にまとめ、日をまたいで往復させない。
- 1日あたり4〜6件（食事を含む）。詰め込みすぎない。
- **昼食・夕食を各日に1件ずつ入れる**（mode: "dining"）。その土地らしい店を選ぶ。
- 宿泊が必要な日数（2日以上）なら、各泊に宿泊先候補を1件入れる（mode: "stay"）。
- "stayMin" は現実的な滞在時間（観光60〜120分、食事60〜90分、宿泊は0でよい）。
- "note" はひとことの推し文（20〜40字）。
- 同伴者・人数・目的に合った行き先を選ぶ（子連れなら移動を短く、カップルなら夜景など）。
- "notes" は全体の組み方メモ（40〜80字）。`;

interface RawSpot {
  title?: string;
  area?: string;
  day?: number;
  mode?: string;
  stayMin?: number;
  note?: string;
}

export interface GeneratedSpot {
  title: string;
  area?: string;
  day: number;
  mode: TransportMode;
  stayMin: number;
  note?: string;
}

export type GeneratePlanResponse =
  | { kind: "plan"; spots: GeneratedSpot[]; notes?: string }
  | { kind: "error"; message: string };

const VALID_MODES = new Set<TransportMode>(["activity", "dining", "stay"]);

export async function POST(request: Request): Promise<Response> {
  const denied = guardRequest(request, 6);
  if (denied) return denied;

  let payload: Partial<TripBrief>;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ kind: "error", message: "リクエストの形式が不正です" } satisfies GeneratePlanResponse, { status: 400 });
  }

  const destination = (payload.destination ?? "").trim().slice(0, 100);
  if (!destination) {
    return Response.json({ kind: "error", message: "行き先を入力してください" } satisfies GeneratePlanResponse, { status: 400 });
  }
  const dayCount = Math.min(7, Math.max(1, Math.floor(payload.dayCount ?? 1)));
  const headcount = Math.min(20, Math.max(1, Math.floor(payload.headcount ?? 1)));
  const companion = (payload.companion ?? "solo") as Companion;
  const purposes = Array.isArray(payload.purposes) ? (payload.purposes.slice(0, 10) as Purpose[]) : [];
  const freeText = typeof payload.freeText === "string" ? payload.freeText.slice(0, 500) : "";

  const user = [
    `行き先: ${destination}`,
    `日数: ${dayCount}日`,
    `同伴者: ${companionLabel(companion)}（${headcount}人）`,
    purposes.length > 0 ? `旅の目的: ${purposeLabels(purposes).join("・")}` : "旅の目的: 指定なし（定番を中心に）",
    freeText ? `そのほかの希望: ${freeText}` : null,
    "",
    `${destination} で ${dayCount}日間の旅程を組んでください。指定のJSONスキーマのみを出力してください。`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const responseText = await getLlmProvider().complete({ system: SYSTEM_PROMPT, user });

    let parsed: { spots?: RawSpot[]; notes?: string };
    try {
      parsed = JSON.parse(stripJsonFence(responseText));
    } catch {
      return Response.json(
        { kind: "error", message: "提案を解釈できませんでした。もう一度お試しください" } satisfies GeneratePlanResponse,
        { status: 502 }
      );
    }

    const spots: GeneratedSpot[] = (Array.isArray(parsed.spots) ? parsed.spots : [])
      .filter((s): s is RawSpot & { title: string } => Boolean(s && typeof s.title === "string" && s.title.trim()))
      .map((s) => {
        const mode = (VALID_MODES.has(s.mode as TransportMode) ? s.mode : "activity") as TransportMode;
        return {
          title: s.title.trim(),
          area: typeof s.area === "string" && s.area.trim() ? s.area.trim() : undefined,
          day: Math.min(dayCount, Math.max(1, Math.floor(s.day ?? 1))),
          mode,
          stayMin: typeof s.stayMin === "number" && s.stayMin > 0 ? Math.round(s.stayMin) : mode === "stay" ? 0 : 60,
          note: typeof s.note === "string" && s.note.trim() ? s.note.trim() : undefined,
        };
      })
      .slice(0, 40);

    if (spots.length === 0) {
      return Response.json(
        { kind: "error", message: "行き先を提案できませんでした。行き先の書き方を変えてお試しください" } satisfies GeneratePlanResponse,
        { status: 422 }
      );
    }
    return Response.json({ kind: "plan", spots, notes: typeof parsed.notes === "string" ? parsed.notes : undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return Response.json({ kind: "error", message: `提案の作成に失敗しました: ${message}` } satisfies GeneratePlanResponse, { status: 502 });
  }
}
