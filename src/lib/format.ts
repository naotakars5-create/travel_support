import { ParsedEvent } from "./types";
import { formatJstTime } from "./date";
import { MODE_LABEL } from "./modeMeta";

export function formatEventSummary(event: ParsedEvent): string {
  const start = formatJstTime(new Date(event.startAt));
  const isLeg = event.placeFrom && event.placeTo && event.endAt && event.endAt !== event.startAt;
  if (isLeg) {
    const end = formatJstTime(new Date(event.endAt!));
    const label = event.detail?.split(/[·\s]/)[0] || MODE_LABEL[event.mode];
    return `${label} · ${start} → ${end}`;
  }
  const extra = event.fields.find((f) => /人|名/.test(f.key))?.value;
  const parts = [start, extra, event.detail && !extra ? event.detail : undefined].filter(Boolean);
  return parts.join(" · ");
}

export function formatMailSummary(events: ParsedEvent[]): string {
  if (events.length === 0) return "";
  const primary = formatEventSummary(events[0]);
  return events.length > 1 ? `${primary} 他${events.length - 1}件` : primary;
}
