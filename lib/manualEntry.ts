import { ParsedEvent, TransportMode } from "./types";

export interface ManualEventInput {
  mode: TransportMode;
  title: string;
  /** datetime-local 形式 (YYYY-MM-DDTHH:mm) */
  startAt: string;
  endAt?: string;
  placeFrom?: string;
  placeTo?: string;
  detail?: string;
}

export function manualInputToEvent(id: string, input: ManualEventInput): ParsedEvent | null {
  if (!input.title.trim() || !input.startAt) return null;
  const start = new Date(input.startAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = input.endAt ? new Date(input.endAt) : undefined;

  return {
    id,
    mode: input.mode,
    title: input.title.trim(),
    startAt: start.toISOString(),
    endAt: end && !Number.isNaN(end.getTime()) ? end.toISOString() : undefined,
    placeFrom: input.placeFrom?.trim() || undefined,
    placeTo: input.placeTo?.trim() || undefined,
    detail: input.detail?.trim() || undefined,
    source: "手入力",
    fields: [],
    confidence: 1,
  };
}
