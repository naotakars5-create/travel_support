import { PlanApiResponse, PlanEntry, ScheduleSlot, SpotSuggestion, TransportMode } from "@/lib/types";
import { PLAN_SYSTEM_PROMPT, buildPlanUserMessage } from "@/lib/planPrompt";
import { stripJsonFence } from "@/lib/parsePrompt";
import { getLlmProvider } from "@/lib/llmProvider";

const VALID_MODES: TransportMode[] = ["air", "rail", "bus", "walk", "car", "stay", "dining", "activity"];

interface RawSlot {
  entryId?: string;
  arriveAt?: string;
  stayMin?: number;
}

interface RawSuggestion {
  title?: string;
  area?: string;
  note?: string;
  mode?: string;
  stayMin?: number;
}

/**
 * モデルが返す時刻を ISO へ正規化する。オフセット（+09:00 / Z）が無い時刻は
 * 日本時間として解釈する。サーバー（UTC）で素直に new Date すると9時間ずれ、
 * 1日目の予定が2日目に化けてしまうため、ここで必ず補正する。
 */
function parseJstIso(raw: string): Date | null {
  const s = raw.trim();
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(s);
  const d = new Date(hasOffset ? s : `${s}+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeSchedule(raw: RawSlot[] | undefined, validIds: Set<string>): ScheduleSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s): ScheduleSlot | null => {
      if (!s || typeof s.entryId !== "string" || !validIds.has(s.entryId)) return null;
      if (typeof s.arriveAt !== "string") return null;
      const d = parseJstIso(s.arriveAt);
      if (!d) return null;
      const stay = typeof s.stayMin === "number" && s.stayMin >= 0 ? Math.round(s.stayMin) : 0;
      return { entryId: s.entryId, arriveAt: d.toISOString(), stayMin: stay };
    })
    .filter((s): s is ScheduleSlot => s !== null)
    .sort((a, b) => new Date(a.arriveAt).getTime() - new Date(b.arriveAt).getTime());
}

function normalizeSuggestions(raw: RawSuggestion[] | undefined): SpotSuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s): SpotSuggestion | null => {
      if (!s || typeof s.title !== "string" || !s.title.trim()) return null;
      const mode = VALID_MODES.includes(s.mode as TransportMode) ? (s.mode as TransportMode) : "activity";
      return {
        title: s.title.trim(),
        area: typeof s.area === "string" ? s.area : undefined,
        note: typeof s.note === "string" ? s.note : undefined,
        mode,
        stayMin: typeof s.stayMin === "number" ? Math.round(s.stayMin) : undefined,
      };
    })
    .filter((s): s is SpotSuggestion => s !== null)
    .slice(0, 4);
}

export async function POST(request: Request): Promise<Response> {
  let payload: { entries?: PlanEntry[]; referenceDate?: string; dayCount?: number };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ kind: "error", message: "リクエストの形式が不正です" } satisfies PlanApiResponse, { status: 400 });
  }

  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const referenceDateIso = payload.referenceDate || new Date().toISOString();
  const dayCount = typeof payload.dayCount === "number" && payload.dayCount > 0 ? Math.floor(payload.dayCount) : 1;

  if (entries.length === 0) {
    return Response.json({ kind: "error", message: "行き先がありません" } satisfies PlanApiResponse, { status: 400 });
  }

  const provider = getLlmProvider();
  const validIds = new Set(entries.map((e) => e.id));

  try {
    const responseText = await provider.complete({
      system: PLAN_SYSTEM_PROMPT,
      user: buildPlanUserMessage({ entries, referenceDateIso, dayCount }),
    });

    let parsed: { schedule?: RawSlot[]; suggestions?: RawSuggestion[]; notes?: string };
    try {
      parsed = JSON.parse(stripJsonFence(responseText));
    } catch {
      return Response.json(
        { kind: "error", message: "モデル応答をJSONとして解釈できませんでした" } satisfies PlanApiResponse,
        { status: 502 }
      );
    }

    const schedule = normalizeSchedule(parsed.schedule, validIds);
    if (schedule.length === 0) {
      return Response.json(
        { kind: "error", message: "旅程を組み立てられませんでした" } satisfies PlanApiResponse,
        { status: 502 }
      );
    }

    const result: PlanApiResponse = {
      kind: "plan",
      schedule,
      suggestions: normalizeSuggestions(parsed.suggestions),
      notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
    };
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    return Response.json(
      { kind: "error", message: `旅程作成中にエラーが発生しました: ${message}` } satisfies PlanApiResponse,
      { status: 502 }
    );
  }
}
