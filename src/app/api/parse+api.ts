import { guardRequest, LruCache } from "@/lib/apiGuard";
import { createHash, randomUUID } from "crypto";
import { ParsedEvent, ParseApiResponse, TransportMode } from "@/lib/types";
import { PARSE_SYSTEM_PROMPT, buildParseUserMessage, stripJsonFence } from "@/lib/parsePrompt";
import { getLlmProvider } from "@/lib/llmProvider";

const VALID_MODES: TransportMode[] = ["air", "rail", "bus", "walk", "car", "stay", "dining", "activity"];

// 同一メール本文の再解析を避けるためのプロセスローカルキャッシュ（APIコスト対策）。
const parseCache = new LruCache<ParseApiResponse>(200);

function cacheKey(body: string, sourceHint?: string): string {
  return createHash("sha256").update(`${sourceHint ?? ""} ${body}`).digest("hex");
}

interface RawEvent {
  mode?: string;
  title?: string;
  startAt?: string;
  endAt?: string | null;
  placeFrom?: string | null;
  placeTo?: string | null;
  detail?: string | null;
  reservationNo?: string | null;
  price?: number | null;
  source?: string;
  fields?: { key?: string; value?: string }[];
  confidence?: number;
}

function normalizeEvent(raw: RawEvent, fallbackSource: string | undefined): ParsedEvent | null {
  if (!raw || typeof raw.title !== "string" || typeof raw.startAt !== "string") return null;
  const startDate = new Date(raw.startAt);
  if (Number.isNaN(startDate.getTime())) return null;

  const mode = VALID_MODES.includes(raw.mode as TransportMode) ? (raw.mode as TransportMode) : "activity";
  const endAt = raw.endAt && !Number.isNaN(new Date(raw.endAt).getTime()) ? raw.endAt : undefined;

  return {
    id: randomUUID(),
    mode,
    title: raw.title,
    startAt: startDate.toISOString(),
    endAt: endAt ? new Date(endAt).toISOString() : undefined,
    placeFrom: raw.placeFrom ?? undefined,
    placeTo: raw.placeTo ?? undefined,
    detail: raw.detail ?? undefined,
    reservationNo: raw.reservationNo ?? undefined,
    price: typeof raw.price === "number" ? raw.price : undefined,
    source: raw.source || fallbackSource || "不明",
    fields: Array.isArray(raw.fields)
      ? raw.fields
          .filter((f) => f && typeof f.key === "string" && typeof f.value === "string")
          .map((f) => ({ key: f.key as string, value: f.value as string }))
      : [],
    confidence: typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0.5,
  };
}

export async function POST(request: Request): Promise<Response> {
  const denied = guardRequest(request, 6);
  if (denied) return denied;

  let payload: { body?: string; source?: string; referenceDate?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ kind: "error", message: "リクエストの形式が不正です" } satisfies ParseApiResponse, { status: 400 });
  }

  const body = (payload.body ?? "").trim();
  const sourceHint = payload.source?.trim() || undefined;
  const referenceDateIso = payload.referenceDate || new Date().toISOString();

  if (!body) {
    return Response.json({ kind: "error", message: "メール本文が空です" } satisfies ParseApiResponse, { status: 400 });
  }

  const key = cacheKey(body, sourceHint);
  const cached = parseCache.get(key);
  if (cached) {
    return Response.json(cached);
  }

  const provider = getLlmProvider();

  try {
    const responseText = await provider.complete({
      system: PARSE_SYSTEM_PROMPT,
      user: buildParseUserMessage({ body, referenceDateIso, sourceHint }),
    });

    const jsonText = stripJsonFence(responseText);
    let parsed: { skip?: boolean; events?: RawEvent[] };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return Response.json(
        { kind: "error", message: "モデル応答をJSONとして解釈できませんでした" } satisfies ParseApiResponse,
        { status: 502 }
      );
    }

    let result: ParseApiResponse;
    if (parsed.skip) {
      result = { kind: "skip" };
    } else {
      const events = (parsed.events ?? [])
        .map((e) => normalizeEvent(e, sourceHint))
        .filter((e): e is ParsedEvent => e !== null);
      if (events.length === 0) {
        result = { kind: "error", message: "予約情報を抽出できませんでした。手入力をご利用ください。" };
      } else {
        result = { kind: "events", events };
      }
    }

    parseCache.set(key, result);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    return Response.json(
      { kind: "error", message: `解析中にエラーが発生しました: ${message}` } satisfies ParseApiResponse,
      { status: 502 }
    );
  }
}
