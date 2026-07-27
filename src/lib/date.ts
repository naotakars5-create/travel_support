const JST_TZ = "Asia/Tokyo";

export function addMinutes(date: Date, min: number): Date {
  return new Date(date.getTime() + min * 60000);
}

function jstParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JST_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
    weekday: get("weekday"),
  };
}

const WEEKDAY_JA: Record<string, string> = { Sun: "日", Mon: "月", Tue: "火", Wed: "水", Thu: "木", Fri: "金", Sat: "土" };

/** JST基準の HH:MM */
export function formatJstTime(date: Date): string {
  const { hour, minute } = jstParts(date);
  return `${hour.padStart(2, "0")}:${minute}`;
}

/** JST基準の YYYY年M月D日(曜) */
export function formatJstDateJa(date: Date): string {
  const { year, month, day, weekday } = jstParts(date);
  return `${year}年${month}月${day}日(${WEEKDAY_JA[weekday] ?? weekday})`;
}

/** M/D 曜 見出し用 */
export function formatJstMonthDayJa(date: Date): string {
  const { month, day, weekday } = jstParts(date);
  return `${month}/${day} ${WEEKDAY_JA[weekday] ?? weekday}`;
}

/** M月D日 曜 見出し用（旅程画面ヘッダー） */
export function formatJstHeadingJa(date: Date): string {
  const { month, day, weekday } = jstParts(date);
  return `${month}月${day}日 ${WEEKDAY_JA[weekday] ?? weekday}`;
}

export function formatJstTimeShort(date: Date): string {
  return formatJstTime(date);
}

// --- 旅行日（1日固定）＋時刻だけ入力するための補助 ---

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 端末ローカルの今日の日付（YYYY-MM-DD）。 */
export function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 旅行日（YYYY-MM-DD）と時刻（HH:mm）を結合して Date にする（ローカル時刻）。 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO 日時から時刻（HH:mm・ローカル）を取り出す。 */
export function timeStrFromIso(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** ISO日時が開始日から見て何日目か（1始まり）を返す。 */
export function dayOfIso(startDate: string, iso: string | undefined): number {
  if (!iso) return 1;
  const start = new Date(`${startDate}T00:00`);
  const d = new Date(iso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(d.getTime())) return 1;
  const day0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const s0 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.max(1, Math.round((day0.getTime() - s0.getTime()) / 86400000) + 1);
}

/** 開始日（YYYY-MM-DD）から day 日目（1始まり）の日付（YYYY-MM-DD）を求める。 */
export function dateForDay(startDate: string, day: number): string {
  const d = new Date(`${startDate}T00:00`);
  if (Number.isNaN(d.getTime())) return startDate;
  d.setDate(d.getDate() + (Math.max(1, day) - 1));
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** YYYY-MM-DD を「M月D日(曜)」表記にする（ローカル）。 */
export function formatDateStrJa(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日(${wd})`;
}

/**
 * 旅がいま「いつ」なのか。ヒーロー表示（あと◯日 / ◯日目 / 終わった）に使う。
 * - before: 出発前。daysUntil は残り日数（1 なら明日、0 は当日扱いにならない）
 * - during: 旅行中。day は何日目か（1始まり）
 * - after : 最終日を過ぎた
 */
export type TripPhase =
  | { phase: "before"; daysUntil: number }
  | { phase: "during"; day: number; dayCount: number }
  | { phase: "after" };

export function tripPhase(startDate: string, dayCount: number, now: Date): TripPhase {
  const start = new Date(`${startDate}T00:00`);
  if (Number.isNaN(start.getTime())) return { phase: "before", daysUntil: 0 };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.max(1, Math.floor(dayCount));
  const diff = Math.round((start.getTime() - today.getTime()) / 86400000);
  if (diff > 0) return { phase: "before", daysUntil: diff };
  const dayIndex = -diff + 1; // 開始日なら1日目
  if (dayIndex <= days) return { phase: "during", day: dayIndex, dayCount: days };
  return { phase: "after" };
}

/** 旅の期間表記（「8月1日(土) 〜 8月3日(月)」／1日なら1つだけ）。 */
export function tripRangeLabel(startDate: string, dayCount: number): string {
  const start = formatDateStrJa(startDate);
  if (Math.max(1, dayCount) <= 1) return start;
  return `${start} 〜 ${formatDateStrJa(dateForDay(startDate, dayCount))}`;
}
