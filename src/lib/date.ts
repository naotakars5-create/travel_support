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
