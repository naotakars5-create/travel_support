import { GeoPoint, isTransitMode, ParsedEvent, ParsedField, PlanEntry, Priority, ScheduleSlot, SpotSuggestion, TransportMode } from "./types";

export const PRIORITY_META: Record<Priority, { label: string; short: string; weight: number }> = {
  must: { label: "必ず行く", short: "必須", weight: 0 },
  want: { label: "できれば", short: "希望", weight: 1 },
  optional: { label: "時間が余れば", short: "任意", weight: 2 },
};

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
  rental: 0,
};

/** 立ち寄り間の移動に確保する既定バッファ（分）。実測は Directions API 側で補正される。 */
const TRAVEL_BUFFER_MIN = 20;

/** 常識的な行動時間帯（各日の開始時刻）。 */
const DAY_START_HOUR = 9;

/** "HH:MM" を {h, min} に。不正なら null。 */
function parseHm(s: string | undefined): { h: number; min: number } | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, min };
}

/** その日付が行き先の定休日に当たるか（closedDays 未設定なら常に false）。 */
export function isClosedOn(entry: Pick<PlanEntry, "closedDays">, date: Date): boolean {
  if (!entry.closedDays || entry.closedDays.length === 0) return false;
  return entry.closedDays.includes(date.getDay());
}

export const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 定休日の表示用ラベル（例: "月曜定休"）。無ければ null。 */
export function closedDaysLabel(entry: Pick<PlanEntry, "closedDays">): string | null {
  if (!entry.closedDays || entry.closedDays.length === 0) return null;
  return `${entry.closedDays.map((d) => WEEKDAY_JA[d] ?? "?").join("・")}曜定休`;
}

/**
 * 開始時刻を施設の営業時間内へ寄せる。
 * - 開店前なら開店時刻へ繰り下げ
 * - 閉店までに滞在が収まらないなら翌日の開店（無ければ朝）へ
 * 営業時間の指定が無ければそのまま返す。
 */
function clampToOpenHours(ms: number, entry: PlanEntry): number {
  const from = parseHm(entry.openFrom);
  const to = parseHm(entry.openTo);
  if (!from && !to) return ms;
  const d = new Date(ms);
  const minutesOfDay = d.getHours() * 60 + d.getMinutes();
  if (from) {
    const fromMin = from.h * 60 + from.min;
    if (minutesOfDay < fromMin) {
      d.setHours(from.h, from.min, 0, 0);
      return d.getTime();
    }
  }
  if (to) {
    const toMin = to.h * 60 + to.min;
    const startMin = d.getHours() * 60 + d.getMinutes();
    if (startMin + entryDurationMin(entry) > toMin) {
      // 閉店までに収まらない → 翌日の開店（無ければ朝）へ
      const nd = new Date(ms);
      nd.setDate(nd.getDate() + 1);
      if (from) nd.setHours(from.h, from.min, 0, 0);
      else nd.setHours(DAY_START_HOUR, 0, 0, 0);
      return nd.getTime();
    }
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
  if (isTransitMode(entry.mode)) return entry.departAt ?? entry.arriveBy ?? null;
  return entry.arriveBy ?? null;
}

/**
 * 「行き先リストの並び順」をそのまま行程の順序として、時刻を前から順に自動計算する。
 * - 日ごとにグループ化し、各日は朝（DAY_START_HOUR）から前詰め。
 * - 固定時刻の予定（fixedTime）はその時刻を厳守し、以降のカーソルを進める。
 * - それ以外は「前の予定の終了＋移動バッファ」で次々に時刻を割り当てる（営業時間内へ寄せる）。
 * 並び替えるたびにこれを呼べば、時刻が自動で再計算される。
 */
export function sequentialSchedule(
  entries: PlanEntry[],
  referenceDate: Date,
  /** entryId→到着時刻(ISO)。AIが割り当てた時刻をアンカーとして尊重するために使う。 */
  anchors?: Map<string, string>
): ScheduleSlot[] {
  if (entries.length === 0) return [];

  const byDay = new Map<number, PlanEntry[]>();
  for (const e of entries) {
    const d = e.day && e.day > 0 ? e.day : 1;
    const arr = byDay.get(d);
    if (arr) arr.push(e);
    else byDay.set(d, [e]);
  }

  const slots: ScheduleSlot[] = [];
  const days = [...byDay.keys()].sort((a, b) => a - b);
  for (const day of days) {
    const dayStart = new Date(referenceDate.getTime() + (day - 1) * 86400000);
    dayStart.setHours(DAY_START_HOUR, 0, 0, 0);
    let cursor = dayStart.getTime();
    for (const e of byDay.get(day)!) {
      // レンタカーは「借りている期間」であって立ち寄り地点ではない。旅程には並べない。
      if (e.mode === "rental") continue;
      // 宿泊は「固定の泊まる場所」。指定のチェックイン時刻に置き、他の予定のカーソルは動かさない。
      if (e.mode === "stay") {
        const anchor = entryAnchorTime(e);
        const ms = anchor ? new Date(anchor).getTime() : cursor;
        slots.push({ entryId: e.id, arriveAt: new Date(Number.isNaN(ms) ? cursor : ms).toISOString(), stayMin: entryDurationMin(e) });
        continue;
      }
      // 固定時刻 or AIが割り当てた時刻（anchors）があればそれを尊重、無ければ前詰めで自動計算。
      const anchor = anchors?.get(e.id) ?? (e.fixedTime ? entryAnchorTime(e) : null);
      let start: number;
      if (anchor) {
        const anchorMs = new Date(anchor).getTime();
        start = Number.isNaN(anchorMs) ? clampToOpenHours(cursor, e) : anchorMs;
      } else {
        start = clampToOpenHours(cursor, e); // 営業時間内へ寄せる
        // 非固定でも「到着目安」があれば、その時刻より前には置かない（並び順は保ちつつ下限として尊重）。
        if (e.arriveBy) {
          const abMs = new Date(e.arriveBy).getTime();
          if (!Number.isNaN(abMs) && abMs > start) start = abMs;
        }
      }
      slots.push({ entryId: e.id, arriveAt: new Date(start).toISOString(), stayMin: entryDurationMin(e) });
      cursor = Math.max(cursor, start) + (entryDurationMin(e) + TRAVEL_BUFFER_MIN) * 60000;
    }
  }
  return slots;
}

/** 常識的な行動時間帯の終わり（この時刻までに滞在が終わるよう空き埋めする）。 */
const DAY_END_HOUR = 20;

/**
 * 旅程に入らなかった予定を、既存スケジュールの空き時間へ詰め込む（入る限り入れる）。
 * - 各日の 9:00〜20:00 の窓で、既存予定の合間に「滞在＋移動バッファ」が収まる最初の隙間へ配置。
 * - 営業時間の指定があればその時間内へ寄せる。出発前・帰着後には置かない。
 * - どうしても入らないものだけが残る（＝「旅程に入らなかった予定」）。
 */
export function fillIntoGaps(
  unplaced: PlanEntry[],
  slots: ScheduleSlot[],
  referenceDate: Date,
  dayCount: number,
  opts?: { notBefore?: string; notAfter?: string }
): ScheduleSlot[] {
  const bufferMs = TRAVEL_BUFFER_MIN * 60000;
  const notBeforeMs = opts?.notBefore ? new Date(opts.notBefore).getTime() : -Infinity;
  const notAfterMs = opts?.notAfter ? new Date(opts.notAfter).getTime() : Infinity;

  type Iv = { start: number; end: number };
  const ivs: Iv[] = slots
    .map((s) => {
      const start = new Date(s.arriveAt).getTime();
      return { start, end: start + Math.max(0, s.stayMin) * 60000 };
    })
    .filter((iv) => !Number.isNaN(iv.start))
    .sort((a, b) => a.start - b.start);

  const added: ScheduleSlot[] = [];
  // 重要度の高い順に詰める（must → want → optional）
  const queue = [...unplaced].sort((a, b) => PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight);

  for (const e of queue) {
    const durMin = Math.max(15, entryDurationMin(e));
    const durMs = durMin * 60000;
    let placedAt: number | null = null;

    for (let d = 1; d <= Math.max(1, dayCount) && placedAt === null; d++) {
      const dayStart = new Date(referenceDate.getTime() + (d - 1) * 86400000);
      dayStart.setHours(DAY_START_HOUR, 0, 0, 0);
      // 定休日には置かない（別の日を探す）
      if (isClosedOn(e, dayStart)) continue;
      const winStart = Math.max(dayStart.getTime(), notBeforeMs);
      const dayEnd = new Date(referenceDate.getTime() + (d - 1) * 86400000);
      dayEnd.setHours(DAY_END_HOUR, 0, 0, 0);
      const winEnd = Math.min(dayEnd.getTime(), notAfterMs);
      if (winEnd - winStart < durMs) continue;

      let cursor = winStart;
      const tryPlace = (gapEnd: number, needTrailingBuffer: boolean): boolean => {
        let start = cursor === winStart ? cursor : cursor + bufferMs;
        start = clampToOpenHours(start, e);
        const limit = gapEnd - (needTrailingBuffer ? bufferMs : 0);
        if (start + durMs <= limit && start >= winStart && start + durMs <= winEnd) {
          placedAt = start;
          return true;
        }
        return false;
      };

      for (const iv of ivs) {
        if (iv.end <= cursor) continue;
        if (iv.start >= winEnd) break;
        if (tryPlace(Math.min(iv.start, winEnd), true)) break;
        cursor = Math.max(cursor, iv.end);
        if (cursor >= winEnd) break;
      }
      if (placedAt === null && cursor < winEnd) {
        tryPlace(winEnd, false); // 最後の予定のあとの余り時間
      }
    }

    if (placedAt !== null) {
      added.push({ entryId: e.id, arriveAt: new Date(placedAt).toISOString(), stayMin: entryDurationMin(e) });
      ivs.push({ start: placedAt, end: placedAt + durMs });
      ivs.sort((a, b) => a.start - b.start);
    }
  }
  return added;
}

/** entries を、与えたスケジュール（slot の arriveAt 昇順）に合わせて並べ替える。手動並び替えの土台に使う。 */
export function orderEntriesBySchedule(entries: PlanEntry[], slots: ScheduleSlot[]): PlanEntry[] {
  const order = new Map<string, number>();
  slots.forEach((s, i) => order.set(s.entryId, i));
  return [...entries].sort((a, b) => {
    const oa = order.has(a.id) ? order.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const ob = order.has(b.id) ? order.get(b.id)! : Number.MAX_SAFE_INTEGER;
    return oa - ob;
  });
}

/**
 * ParsedEvent の id から、元になった PlanEntry の id を取り出す。
 * 旅程画面から「その予定の元の行き先」を直接編集するために使う。
 * id は `evt-{entryId}` で、宿泊だけ `-in` / `-out` / `-stayN` が付く。
 */
export function entryIdFromEventId(eventId: string): string | null {
  if (!eventId.startsWith("evt-")) return null;
  const body = eventId.slice(4).replace(/-(in|out|stay\d+)$/, "");
  return body || null;
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
    closedDays: entry.closedDays,
    photoRef: entry.photoRef,
    photoAttribution: entry.photoAttribution,
  };

  // レンタカーは「借りている期間」であって地点ではないため、旅程には出さない
  // （区間の移動手段を車として計算するためだけに使う）。
  if (entry.mode === "rental") return [];

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

  // 宿泊 → 「チェックイン（夜）」と「翌朝ホテルを出発（チェックアウト）」の2つの地点イベント。
  // 翌朝の出発イベントがあることで、2日目がホテル起点で始まり、ホテル→最初の施設の移動も計算される。
  if (entry.mode === "stay") {
    const startMs = new Date(entry.arriveBy ?? slot.arriveAt).getTime();
    if (Number.isNaN(startMs)) return [];
    const outMs = entry.checkOut ? new Date(entry.checkOut).getTime() : NaN;
    const events: ParsedEvent[] = [
      {
        ...base,
        id: `evt-${entry.id}-in`,
        placeTo: entryPlaceText(entry),
        placeToGeo: entry.placeGeo,
        startAt: new Date(startMs).toISOString(),
        detail: entry.detail ? `チェックイン · ${entry.detail}` : "チェックイン",
      },
    ];
    if (!Number.isNaN(outMs) && outMs > startMs) {
      // 連泊の場合、中間日の朝も「宿から出発」を置く（その日の起点がホテルになる）。
      const nights = Math.max(1, Math.round((outMs - startMs) / 86400000));
      for (let n = 1; n < nights; n++) {
        const morning = new Date(startMs + n * 86400000);
        morning.setHours(9, 0, 0, 0);
        events.push({
          ...base,
          id: `evt-${entry.id}-stay${n}`,
          placeTo: entryPlaceText(entry),
          placeToGeo: entry.placeGeo,
          startAt: morning.toISOString(),
          detail: `連泊${n + 1}日目 · ここから出発`,
          price: undefined,
        });
      }
      events.push({
        ...base,
        id: `evt-${entry.id}-out`,
        placeTo: entryPlaceText(entry),
        placeToGeo: entry.placeGeo,
        startAt: new Date(outMs).toISOString(),
        detail: "チェックアウト · ここから出発",
        price: undefined, // 費用はチェックイン側にのみ載せる（二重表示防止）
      });
    }
    return events;
  }

  // 観光・食事など → 地点イベント
  // 時刻固定の予定は arriveBy を厳守。それ以外は組み上げ結果（slot）の時刻を反映する
  //（AIやローカルが並べ替えた到着時刻が旅程・当日ビューに正しく出るようにするため）。
  const startSource = entry.fixedTime && entry.arriveBy ? entry.arriveBy : slot.arriveAt ?? entry.arriveBy;
  const startMs = new Date(startSource).getTime();
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
export function buildEventsFromSchedule(
  entries: PlanEntry[],
  slots: ScheduleSlot[]
): ParsedEvent[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const events: ParsedEvent[] = [];
  for (const slot of slots) {
    const entry = byId.get(slot.entryId);
    if (!entry) continue;
    events.push(...entryToEvents(entry, slot));
  }
  return events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
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
  /** 候補選択で得た正確な座標（あればジオコーディングをスキップして精度UP） */
  placeGeo?: GeoPoint;
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
  /** 営業・開館時間 "HH:MM" */
  openFrom?: string;
  openTo?: string;
  /** 定休日（0=日 … 6=土） */
  closedDays?: number[];
  /** スポット写真（Places Photo の参照IDと提供元） */
  photoRef?: string;
  photoAttribution?: string;
}

export function inputToEntry(id: string, input: PlanEntryInput): PlanEntry | null {
  if (!input.title.trim()) return null;
  return {
    id,
    title: input.title.trim(),
    place: input.place?.trim() || undefined,
    placeGeo: input.placeGeo,
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
    openFrom: input.openFrom || undefined,
    openTo: input.openTo || undefined,
    closedDays: input.closedDays && input.closedDays.length > 0 ? input.closedDays : undefined,
    photoRef: input.photoRef,
    photoAttribution: input.photoAttribution,
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
        `${e.id}|${e.arriveBy ?? ""}|${e.departAt ?? ""}|${e.checkOut ?? ""}|${e.stayMin ?? ""}|${e.priority}|${e.mode}|${e.day ?? ""}|${e.fixedTime ? 1 : 0}|${e.placeFrom ?? ""}|${e.placeTo ?? ""}|${e.openFrom ?? ""}|${e.openTo ?? ""}|${e.closedDays?.join(",") ?? ""}`
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
  if (mode === "rental") return "transit"; // レンタル料金は交通費として扱う
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
  // レンタカーは「借りている期間」であって行き先ではないので件数に数えない。
  const entryCount = entries.filter((e) => e.mode !== "rental").length;
  return { entryCount, totalCost, costedCount, byCategory };
}
