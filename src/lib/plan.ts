import { isTransitMode, ParsedEvent, ParsedField, PlanEntry, Priority, ScheduleSlot, SpotSuggestion, TransportMode } from "./types";

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
  home: 0,
};

/** 立ち寄り間の移動に確保する既定バッファ（分）。実測は Directions API 側で補正される。 */
const TRAVEL_BUFFER_MIN = 20;

/** 常識的な行動時間帯（この範囲に収まるよう自動配置する）。 */
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 20;

/** 翌日の朝（DAY_START_HOUR 時）へ進めた時刻（ローカル）。 */
function nextMorning(ms: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + 1);
  d.setHours(DAY_START_HOUR, 0, 0, 0);
  return d.getTime();
}

/** 早すぎる時刻（朝 DAY_START_HOUR 時より前）は当日の朝に引き上げる。 */
function notBeforeMorning(ms: number): number {
  const d = new Date(ms);
  if (d.getHours() < DAY_START_HOUR) {
    d.setHours(DAY_START_HOUR, 0, 0, 0);
    return d.getTime();
  }
  return ms;
}

export function effectiveStayMin(entry: PlanEntry): number {
  if (typeof entry.stayMin === "number" && entry.stayMin > 0) return entry.stayMin;
  return DEFAULT_STAY_MIN[entry.mode] ?? 45;
}

/** ジオコーディング等に使う地点テキスト（移動系は到着地、その他は住所優先→行き先名）。 */
export function entryPlaceText(entry: PlanEntry): string {
  if (isTransitMode(entry.mode) && entry.placeTo) return entry.placeTo.trim();
  return (entry.place && entry.place.trim()) || entry.title.trim();
}

/** その予定の所要時間（分）。移動=出発→到着、宿泊=チェックイン→アウト、その他=滞在時間。 */
export function entryDurationMin(entry: PlanEntry): number {
  // 自宅（出発・帰宅の地点イベント）は滞在時間を持たない
  if (entry.mode === "home") return 0;
  if (isTransitMode(entry.mode) && entry.departAt && entry.arriveBy) {
    return Math.max(0, Math.round((new Date(entry.arriveBy).getTime() - new Date(entry.departAt).getTime()) / 60000));
  }
  if (entry.mode === "stay" && entry.arriveBy && entry.checkOut) {
    return Math.max(0, Math.round((new Date(entry.checkOut).getTime() - new Date(entry.arriveBy).getTime()) / 60000));
  }
  return effectiveStayMin(entry);
}

/** スケジュールの基準になる固定時刻（移動=出発、その他=到着/チェックイン）。無ければ null。 */
export function entryAnchorTime(entry: PlanEntry): string | null {
  // 自宅は出発時刻をアンカーにする（帰宅時刻は別イベントとして扱う）
  if (entry.mode === "home") return entry.departAt ?? entry.arriveBy ?? null;
  if (isTransitMode(entry.mode)) return entry.departAt ?? entry.arriveBy ?? null;
  return entry.arriveBy ?? null;
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

  const anchored = entries
    .map((e) => ({ e, t: entryAnchorTime(e) }))
    .filter((x): x is { e: PlanEntry; t: string } => x.t !== null)
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());

  const loose = entries
    .filter((e) => entryAnchorTime(e) === null)
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));

  const bufferMs = TRAVEL_BUFFER_MIN * 60000;
  type Placed = { entry: PlanEntry; start: number };
  const placed: Placed[] = anchored.map(({ e, t }) => ({ entry: e, start: new Date(t).getTime() }));

  const endOf = (p: Placed) => p.start + entryDurationMin(p.entry) * 60000;

  if (placed.length === 0) {
    // 固定が無ければ referenceDate（＝旅行初日の朝）から、常識的な時間帯で前詰め
    let cursor = notBeforeMorning(referenceDate.getTime());
    for (const e of loose) {
      if (new Date(cursor).getHours() >= DAY_END_HOUR) cursor = nextMorning(cursor); // 遅すぎたら翌朝へ
      placed.push({ entry: e, start: cursor });
      cursor += (entryDurationMin(e) + TRAVEL_BUFFER_MIN) * 60000;
    }
  } else {
    // loose を「空いている一番早い隙間」に差し込む（＝一番最後にしない）
    for (const e of loose) {
      const durMs = entryDurationMin(e) * 60000;
      placed.sort((a, b) => a.start - b.start);
      let insertAt: number | null = null;
      for (let i = 0; i < placed.length; i++) {
        const gapStart = endOf(placed[i]) + bufferMs;
        const nextStart = i + 1 < placed.length ? placed[i + 1].start : Infinity;
        const gapEnd = nextStart === Infinity ? Infinity : nextStart - bufferMs;
        if (gapEnd - gapStart >= durMs) {
          insertAt = gapStart;
          break;
        }
      }
      if (insertAt === null) {
        const last = placed.reduce((m, p) => (p.start > m.start ? p : m), placed[0]);
        insertAt = endOf(last) + bufferMs;
        if (new Date(insertAt).getHours() >= DAY_END_HOUR) insertAt = nextMorning(insertAt); // 遅すぎたら翌朝へ
      }
      placed.push({ entry: e, start: insertAt });
    }
  }

  placed.sort((a, b) => a.start - b.start);
  return placed.map((p) => ({
    entryId: p.entry.id,
    arriveAt: new Date(p.start).toISOString(),
    stayMin: entryDurationMin(p.entry),
  }));
}

/** 1件の PlanEntry を、種別に応じた ParsedEvent（複数になる場合あり）へ変換する。 */
function entryToEvents(entry: PlanEntry, slot: ScheduleSlot): ParsedEvent[] {
  const base = {
    id: `evt-${entry.id}`,
    mode: entry.mode,
    title: entry.title,
    detail: entry.detail,
    price: entry.cost,
    source: entry.source,
    fields: [] as ParsedField[],
    confidence: 1,
  };

  // 自宅 → 「出発」と「帰宅」の2つの地点イベント（別々の日時になりうる）
  if (entry.mode === "home") {
    const placeText = entryPlaceText(entry);
    const events: ParsedEvent[] = [];
    const departMs = new Date(entry.departAt ?? slot.arriveAt).getTime();
    if (!Number.isNaN(departMs)) {
      events.push({
        ...base,
        id: `evt-${entry.id}-depart`,
        title: `${entry.title || "自宅"}を出発`,
        placeTo: placeText,
        placeToGeo: entry.placeGeo,
        startAt: new Date(departMs).toISOString(),
      });
    }
    const returnMs = entry.arriveBy ? new Date(entry.arriveBy).getTime() : NaN;
    if (!Number.isNaN(returnMs)) {
      events.push({
        ...base,
        id: `evt-${entry.id}-return`,
        title: `${entry.title || "自宅"}へ帰宅`,
        placeTo: placeText,
        placeToGeo: entry.placeGeo,
        startAt: new Date(returnMs).toISOString(),
      });
    }
    return events;
  }

  // 移動系（出発地・到着地あり）→ 出発〜到着の区間イベント
  if (isTransitMode(entry.mode) && entry.placeFrom && entry.placeTo) {
    const startMs = new Date(entry.departAt ?? slot.arriveAt).getTime();
    if (Number.isNaN(startMs)) return [];
    const arriveMs = entry.arriveBy ? new Date(entry.arriveBy).getTime() : NaN;
    const endIso = !Number.isNaN(arriveMs) && arriveMs > startMs ? new Date(arriveMs).toISOString() : new Date(startMs + 30 * 60000).toISOString();
    return [
      {
        ...base,
        placeFrom: entry.placeFrom,
        placeTo: entry.placeTo,
        placeFromGeo: entry.placeFromGeo,
        placeToGeo: entry.placeToGeo,
        startAt: new Date(startMs).toISOString(),
        endAt: endIso,
      },
    ];
  }

  // 宿泊 → チェックイン〜チェックアウト
  if (entry.mode === "stay") {
    const startMs = new Date(entry.arriveBy ?? slot.arriveAt).getTime();
    if (Number.isNaN(startMs)) return [];
    const outMs = entry.checkOut ? new Date(entry.checkOut).getTime() : NaN;
    return [
      {
        ...base,
        placeTo: entryPlaceText(entry),
        placeToGeo: entry.placeGeo,
        startAt: new Date(startMs).toISOString(),
        endAt: !Number.isNaN(outMs) && outMs > startMs ? new Date(outMs).toISOString() : undefined,
      },
    ];
  }

  // 観光・食事など → 地点イベント
  const startMs = new Date(entry.arriveBy ?? slot.arriveAt).getTime();
  if (Number.isNaN(startMs)) return [];
  const stay = slot.stayMin > 0 ? slot.stayMin : effectiveStayMin(entry);
  return [
    {
      ...base,
      placeTo: entryPlaceText(entry),
      placeToGeo: entry.placeGeo,
      startAt: new Date(startMs).toISOString(),
      endAt: stay > 0 ? new Date(startMs + stay * 60000).toISOString() : undefined,
    },
  ];
}

/**
 * スケジュール（ローカル or AI 由来）と行き先リストから、路線図パイプライン（buildRail）が
 * 受け取る ParsedEvent 列を生成する。種別ごとに地点/区間/宿泊のイベントへ変換する。
 */
export function buildEventsFromSchedule(entries: PlanEntry[], slots: ScheduleSlot[]): ParsedEvent[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const events: ParsedEvent[] = [];
  for (const slot of slots) {
    const entry = byId.get(slot.entryId);
    if (!entry) continue;
    events.push(...entryToEvents(entry, slot));
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
  /** ISO8601。観光/食事=到着、宿泊=チェックイン、移動=到着 */
  arriveBy?: string;
  fixedTime?: boolean;
  cost?: number;
  detail?: string;
  /** 何日目か（1始まり） */
  day?: number;
  /** 移動系: 出発地・到着地・出発時刻(ISO) */
  placeFrom?: string;
  placeTo?: string;
  departAt?: string;
  /** 宿泊: チェックアウト時刻(ISO) */
  checkOut?: string;
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
    day: input.day && input.day > 0 ? input.day : undefined,
    placeFrom: input.placeFrom?.trim() || undefined,
    placeTo: input.placeTo?.trim() || undefined,
    departAt: input.departAt || undefined,
    checkOut: input.checkOut || undefined,
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
    .map(
      (e) =>
        `${e.id}|${e.arriveBy ?? ""}|${e.departAt ?? ""}|${e.checkOut ?? ""}|${e.stayMin ?? ""}|${e.priority}|${e.mode}|${e.day ?? ""}|${e.fixedTime ? 1 : 0}|${e.placeFrom ?? ""}|${e.placeTo ?? ""}`
    )
    .join(";");
}

/** 予算集計のカテゴリ。 */
export type CostCategory = "transit" | "stay" | "dining" | "sightseeing";

export const COST_CATEGORY_LABEL: Record<CostCategory, string> = {
  transit: "交通",
  stay: "宿泊",
  dining: "食事",
  sightseeing: "観光",
};

/** 表示順（交通→宿泊→食事→観光）。 */
export const COST_CATEGORY_ORDER: CostCategory[] = ["transit", "stay", "dining", "sightseeing"];

/** 種別を予算カテゴリへ対応づける。 */
export function costCategoryOf(mode: TransportMode): CostCategory {
  if (mode === "stay") return "stay";
  if (mode === "dining") return "dining";
  if (isTransitMode(mode)) return "transit";
  return "sightseeing"; // activity / home など
}

export interface PlanTotals {
  entryCount: number;
  totalCost: number;
  costedCount: number;
  /** カテゴリ別の費用合計（円）。0のカテゴリも含む。 */
  byCategory: Record<CostCategory, number>;
}

export function computePlanTotals(entries: PlanEntry[]): PlanTotals {
  let totalCost = 0;
  let costedCount = 0;
  const byCategory: Record<CostCategory, number> = { transit: 0, stay: 0, dining: 0, sightseeing: 0 };
  for (const e of entries) {
    if (typeof e.cost === "number" && e.cost > 0) {
      totalCost += e.cost;
      costedCount += 1;
      byCategory[costCategoryOf(e.mode)] += e.cost;
    }
  }
  return { entryCount: entries.length, totalCost, costedCount, byCategory };
}
