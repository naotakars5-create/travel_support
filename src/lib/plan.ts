import { ParsedEvent, PlanEntry, Priority, ScheduleSlot, SpotSuggestion, TransportMode } from "./types";

export const PRIORITY_META: Record<Priority, { label: string; short: string; weight: number }> = {
  must: { label: "必ず行く", short: "必須", weight: 0 },
  want: { label: "できれば", short: "希望", weight: 1 },
  optional: { label: "時間が余れば", short: "任意", weight: 2 },
};

export const PRIORITY_ORDER: Priority[] = ["must", "want", "optional"];

/** mode ごとの既定滞在時間（分）。ユーザー未指定時のフォールバック。 */
const DEFAULT_STAY_MIN: Record<TransportMode, number> = {
  air: 0,
  rail: 0,
  bus: 0,
  walk: 0,
  car: 0,
  stay: 30,
  dining: 60,
  activity: 60,
};

/** 立ち寄り間の移動に確保する既定バッファ（分）。実測は Directions API 側で補正される。 */
const TRAVEL_BUFFER_MIN = 20;

export function effectiveStayMin(entry: PlanEntry): number {
  if (typeof entry.stayMin === "number" && entry.stayMin > 0) return entry.stayMin;
  return DEFAULT_STAY_MIN[entry.mode] ?? 45;
}

/** ジオコーディング等に使う地点テキスト（住所優先、無ければ行き先名）。 */
export function entryPlaceText(entry: PlanEntry): string {
  return (entry.place && entry.place.trim()) || entry.title.trim();
}

function priorityWeight(p: Priority): number {
  return PRIORITY_META[p].weight;
}

/**
 * AIを使わずに、行き先リストから到着時刻順のスケジュールを組む（ローカル・ヒューリスティック）。
 * - 到着目安（arriveBy）が指定された予定を時刻順のアンカーにする
 * - 目安が無い予定は重要度順に前詰めで挟み込む
 * - 各予定に滞在時間＋移動バッファを足しながら時刻を単調増加で割り当てる
 * APIキーが無い環境でも即座に旅程が成立するための土台。
 */
export function localSchedule(entries: PlanEntry[], referenceDate: Date): ScheduleSlot[] {
  if (entries.length === 0) return [];

  // arriveBy を持つものを時刻順、持たないものを重要度順に。両者を安定した並びに統合する。
  const withTime = entries
    .filter((e) => e.arriveBy)
    .sort((a, b) => new Date(a.arriveBy!).getTime() - new Date(b.arriveBy!).getTime());
  const withoutTime = entries
    .filter((e) => !e.arriveBy)
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));

  // 目安時刻が無い予定は、最初のアンカー以降に順番に差し込む（アンカーが無ければ全て後段）。
  const ordered: PlanEntry[] = [];
  const anchorQueue = [...withTime];
  const looseQueue = [...withoutTime];
  if (anchorQueue.length === 0) {
    ordered.push(...looseQueue);
  } else {
    ordered.push(anchorQueue.shift()!);
    while (anchorQueue.length > 0) {
      // アンカー間に loose を1つずつ挟む（時間に余裕がある想定の素朴な配分）
      if (looseQueue.length > 0) ordered.push(looseQueue.shift()!);
      ordered.push(anchorQueue.shift()!);
    }
    ordered.push(...looseQueue);
  }

  const startBase = withTime[0] ? new Date(withTime[0].arriveBy!) : referenceDate;
  let cursor = startBase.getTime();
  const slots: ScheduleSlot[] = [];
  for (const entry of ordered) {
    const anchor = entry.arriveBy ? new Date(entry.arriveBy).getTime() : null;
    const arrive = anchor !== null ? Math.max(cursor, anchor) : cursor;
    const stay = effectiveStayMin(entry);
    slots.push({ entryId: entry.id, arriveAt: new Date(arrive).toISOString(), stayMin: stay });
    cursor = arrive + (stay + TRAVEL_BUFFER_MIN) * 60000;
  }
  return slots;
}

/**
 * スケジュール（ローカル or AI 由来）と行き先リストから、路線図パイプライン（buildRail）が
 * 受け取る ParsedEvent 列を生成する。各予定は1つの地点イベントになり、移動辺・空き時間は
 * buildRail が前後関係から自動生成する。座標は entry から引き継ぐ（再ジオコーディング不要）。
 */
export function buildEventsFromSchedule(entries: PlanEntry[], slots: ScheduleSlot[]): ParsedEvent[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const events: ParsedEvent[] = [];
  for (const slot of slots) {
    const entry = byId.get(slot.entryId);
    if (!entry) continue;
    const start = new Date(slot.arriveAt);
    if (Number.isNaN(start.getTime())) continue;
    const stay = slot.stayMin > 0 ? slot.stayMin : effectiveStayMin(entry);
    const end = new Date(start.getTime() + stay * 60000);
    events.push({
      id: `evt-${entry.id}`,
      mode: entry.mode,
      title: entry.title,
      startAt: start.toISOString(),
      endAt: stay > 0 ? end.toISOString() : undefined,
      placeTo: entryPlaceText(entry),
      placeToGeo: entry.placeGeo,
      detail: entry.detail,
      price: entry.cost,
      source: entry.source,
      fields: [],
      confidence: 1,
    });
  }
  return events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

/** ローカル・ヒューリスティックだけで entries を旅程イベントへ変換する簡便関数。 */
export function composeLocally(entries: PlanEntry[], referenceDate: Date): ParsedEvent[] {
  return buildEventsFromSchedule(entries, localSchedule(entries, referenceDate));
}

/** 予約メール解析で得た ParsedEvent を、確定アンカーの PlanEntry へ変換する。 */
export function eventToPlanEntry(event: ParsedEvent): PlanEntry {
  const durationMin =
    event.endAt && event.endAt !== event.startAt
      ? Math.max(0, Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60000))
      : undefined;
  return {
    id: `entry-${event.id}`,
    title: event.title,
    place: event.placeTo ?? event.placeFrom,
    placeGeo: event.placeToGeo ?? event.placeFromGeo,
    mode: event.mode,
    priority: "must",
    stayMin: durationMin,
    arriveBy: event.startAt,
    fixedTime: true,
    cost: event.price,
    detail: event.detail,
    source: event.source || "メール",
  };
}

/** フォーム入力から PlanEntry を作るための素データ。 */
export interface PlanEntryInput {
  title: string;
  place?: string;
  mode: TransportMode;
  priority: Priority;
  stayMin?: number;
  /** ISO8601 */
  arriveBy?: string;
  fixedTime?: boolean;
  cost?: number;
  detail?: string;
}

export function inputToEntry(id: string, input: PlanEntryInput): PlanEntry | null {
  if (!input.title.trim()) return null;
  return {
    id,
    title: input.title.trim(),
    place: input.place?.trim() || undefined,
    mode: input.mode,
    priority: input.priority,
    stayMin: typeof input.stayMin === "number" && input.stayMin > 0 ? input.stayMin : undefined,
    arriveBy: input.arriveBy || undefined,
    fixedTime: input.fixedTime,
    cost: typeof input.cost === "number" && input.cost > 0 ? input.cost : undefined,
    detail: input.detail?.trim() || undefined,
    source: "手入力",
  };
}

/** AIのおすすめスポットを、行き先リストに足せる PlanEntry へ変換する。 */
export function suggestionToEntry(id: string, s: SpotSuggestion): PlanEntry {
  return {
    id,
    title: s.title,
    place: s.area,
    mode: s.mode ?? "activity",
    priority: "optional",
    stayMin: s.stayMin,
    source: "AI提案",
    detail: s.note,
  };
}

/**
 * 行き先リストの「構造」を表す署名。ジオコーディングで座標だけ埋まっても変化せず、
 * 追加・削除・時刻/滞在/重要度/種別の変更でのみ変化する。ローカル再スケジュールの発火判定に使う。
 */
export function scheduleSignature(entries: PlanEntry[]): string {
  return entries
    .map((e) => `${e.id}|${e.arriveBy ?? ""}|${e.stayMin ?? ""}|${e.priority}|${e.mode}|${e.fixedTime ? 1 : 0}`)
    .join(";");
}

export interface PlanTotals {
  entryCount: number;
  totalCost: number;
  costedCount: number;
}

export function computePlanTotals(entries: PlanEntry[]): PlanTotals {
  let totalCost = 0;
  let costedCount = 0;
  for (const e of entries) {
    if (typeof e.cost === "number" && e.cost > 0) {
      totalCost += e.cost;
      costedCount += 1;
    }
  }
  return { entryCount: entries.length, totalCost, costedCount };
}
