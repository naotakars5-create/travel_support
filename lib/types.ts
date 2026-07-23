export type TransportMode =
  | "air"
  | "rail"
  | "bus"
  | "walk"
  | "car"
  | "stay"
  | "dining"
  | "activity";

export interface ParsedField {
  key: string;
  value: string;
}

export interface ParsedEvent {
  id: string;
  mode: TransportMode;
  title: string;
  /** ISO8601 */
  startAt: string;
  /** ISO8601 */
  endAt?: string;
  placeFrom?: string;
  placeTo?: string;
  detail?: string;
  reservationNo?: string;
  price?: number;
  source: string;
  fields: ParsedField[];
  /** 0-1 */
  confidence: number;
}

export type MailStatus = "new" | "parsing" | "done" | "skip" | "error";

export interface MailItem {
  id: string;
  source: string;
  subject: string;
  body: string;
  status: MailStatus;
  events: ParsedEvent[];
  errorMessage?: string;
  /** ユーザーが手入力した場合 true */
  manual?: boolean;
}

export type ParseApiResponse =
  | { kind: "events"; events: ParsedEvent[] }
  | { kind: "skip" }
  | { kind: "error"; message: string };

/** 移動手段カテゴリ（路線図の色分け用） */
export const TRANSIT_MODES: TransportMode[] = ["air", "rail", "bus", "walk", "car"];

export function isTransitMode(mode: TransportMode): boolean {
  return (TRANSIT_MODES as string[]).includes(mode);
}
