import { Platform } from "react-native";
import { GeoPoint, PlanEntry, Priority, ScheduleSlot, TransportMode } from "./types";
import { getApiBaseUrl } from "./apiBase";

/**
 * 共有リンク（Tier 1）：アカウント不要・閲覧のみの共有。
 * プラン（行き先＋時刻割り当て）をURLに埋め込むだけなのでサーバー不要。
 * 受け取った相手が同じURLを開くと、同じ旅程・同じ当日ビューを閲覧できる（編集は不可）。
 *
 * URLが長すぎるとLINE・SMS・QRで切れて開けないため、
 * (1) 短いキーへの圧縮表現 + (2) deflate 圧縮（対応ブラウザ）で最小化する。
 * 形式:
 *   "2.<base64url(deflate-raw(JSON))>"  … CompressionStream が使える環境
 *   "1.<base64url(JSON)>"               … 圧縮なしのフォールバック（同じ圧縮表現）
 *   プレフィックス無し                    … 旧形式（フル PlanEntry の JSON）との互換読み込み
 */

export interface SharedPlan {
  entries: PlanEntry[];
  slots: ScheduleSlot[];
}

/** 共有URLのクエリキー。 */
export const SHARE_PARAM = "p";

// --- 圧縮表現（短キー） ---

interface CompactEntry {
  i: string; // id
  t: string; // title
  m: string; // mode
  p?: string; // priority（want は省略）
  a?: string; // place（住所）
  g?: [number, number]; // placeGeo
  s?: number; // stayMin
  b?: string; // arriveBy
  f?: 1; // fixedTime
  c?: number; // cost
  n?: string; // detail
  d?: number; // day
  of?: string; // openFrom
  ot?: string; // openTo
  cd?: number[]; // closedDays
  pf?: string; // placeFrom
  pt?: string; // placeTo
  fg?: [number, number]; // placeFromGeo
  tg?: [number, number]; // placeToGeo
  dp?: string; // departAt
  co?: string; // checkOut
  tm?: string; // travelMode
}

interface CompactPlan {
  e: CompactEntry[];
  s: [string, string, number][]; // [entryId, arriveAt, stayMin]
}

/** 座標を5桁（約1m）へ丸めてURLを短くする。 */
const roundGeo = (g: GeoPoint | undefined): [number, number] | undefined =>
  g ? [Math.round(g.lat * 1e5) / 1e5, Math.round(g.lng * 1e5) / 1e5] : undefined;

const toGeo = (t: [number, number] | undefined): GeoPoint | undefined => (t ? { lat: t[0], lng: t[1] } : undefined);

function toCompact(entries: PlanEntry[], slots: ScheduleSlot[]): CompactPlan {
  return {
    e: entries.map((e) => {
      const c: CompactEntry = { i: e.id, t: e.title, m: e.mode };
      if (e.priority !== "want") c.p = e.priority;
      if (e.place) c.a = e.place;
      const g = roundGeo(e.placeGeo);
      if (g) c.g = g;
      if (typeof e.stayMin === "number") c.s = e.stayMin;
      if (e.arriveBy) c.b = e.arriveBy;
      if (e.fixedTime) c.f = 1;
      if (typeof e.cost === "number") c.c = e.cost;
      if (e.detail) c.n = e.detail;
      if (e.day && e.day > 1) c.d = e.day;
      if (e.openFrom) c.of = e.openFrom;
      if (e.openTo) c.ot = e.openTo;
      if (e.closedDays && e.closedDays.length > 0) c.cd = e.closedDays;
      if (e.placeFrom) c.pf = e.placeFrom;
      if (e.placeTo) c.pt = e.placeTo;
      const fg = roundGeo(e.placeFromGeo);
      if (fg) c.fg = fg;
      const tg = roundGeo(e.placeToGeo);
      if (tg) c.tg = tg;
      if (e.departAt) c.dp = e.departAt;
      if (e.checkOut) c.co = e.checkOut;
      if (e.travelMode) c.tm = e.travelMode;
      return c;
    }),
    s: slots.map((s) => [s.entryId, s.arriveAt, s.stayMin]),
  };
}

function fromCompact(c: CompactPlan): SharedPlan {
  return {
    entries: c.e.map((e) => ({
      id: e.i,
      title: e.t,
      mode: e.m as TransportMode,
      priority: (e.p ?? "want") as Priority,
      source: "共有",
      place: e.a,
      placeGeo: toGeo(e.g),
      stayMin: e.s,
      arriveBy: e.b,
      fixedTime: e.f === 1 ? true : undefined,
      cost: e.c,
      detail: e.n,
      day: e.d,
      openFrom: e.of,
      openTo: e.ot,
      closedDays: e.cd,
      placeFrom: e.pf,
      placeTo: e.pt,
      placeFromGeo: toGeo(e.fg),
      placeToGeo: toGeo(e.tg),
      departAt: e.dp,
      checkOut: e.co,
      travelMode: e.tm as PlanEntry["travelMode"],
    })),
    slots: c.s.map(([entryId, arriveAt, stayMin]) => ({ entryId, arriveAt, stayMin })),
  };
}

// --- バイト列 <-> base64url ---

function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof btoa === "undefined") return "";
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array | null {
  if (typeof atob === "undefined") return null;
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

// --- deflate 圧縮（CompressionStream 対応環境のみ・非対応なら無圧縮へフォールバック） ---

type StreamCtor = new (format: string) => { readable: ReadableStream<Uint8Array>; writable: WritableStream<Uint8Array> };

async function pipeThrough(bytes: Uint8Array, Ctor: StreamCtor): Promise<Uint8Array> {
  const stream = new Ctor("deflate-raw");
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function compressionCtor(name: "CompressionStream" | "DecompressionStream"): StreamCtor | null {
  const g = globalThis as Record<string, unknown>;
  return typeof g[name] === "function" ? (g[name] as StreamCtor) : null;
}

// --- 符号化 / 復号 ---

/** プランを共有用の文字列へ符号化する（可能なら deflate 圧縮）。 */
export async function encodePlan(entries: PlanEntry[], slots: ScheduleSlot[]): Promise<string> {
  const json = JSON.stringify(toCompact(entries, slots));
  const bytes = new TextEncoder().encode(json);
  const Compress = compressionCtor("CompressionStream");
  if (Compress) {
    try {
      const deflated = await pipeThrough(bytes, Compress);
      return `2.${bytesToBase64Url(deflated)}`;
    } catch {
      // 圧縮失敗は無圧縮へフォールバック
    }
  }
  return `1.${bytesToBase64Url(bytes)}`;
}

function parseCompact(json: string): SharedPlan | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.e) || !Array.isArray(parsed.s)) return null;
    return fromCompact(parsed as CompactPlan);
  } catch {
    return null;
  }
}

/** 旧形式（フル PlanEntry JSON・プレフィックス無し）の復号。 */
function decodeLegacy(encoded: string): SharedPlan | null {
  try {
    const bytes = base64UrlToBytes(encoded);
    if (!bytes) return null;
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || !Array.isArray(parsed.entries) || !Array.isArray(parsed.slots)) return null;
    return { entries: parsed.entries as PlanEntry[], slots: parsed.slots as ScheduleSlot[] };
  } catch {
    return null;
  }
}

/** 共有文字列をプランへ復号する。壊れていれば null。 */
export async function decodePlan(encoded: string): Promise<SharedPlan | null> {
  if (encoded.startsWith("2.")) {
    const bytes = base64UrlToBytes(encoded.slice(2));
    const Decompress = compressionCtor("DecompressionStream");
    if (!bytes || !Decompress) return null;
    try {
      const inflated = await pipeThrough(bytes, Decompress);
      return parseCompact(new TextDecoder().decode(inflated));
    } catch {
      return null;
    }
  }
  if (encoded.startsWith("1.")) {
    const bytes = base64UrlToBytes(encoded.slice(2));
    return bytes ? parseCompact(new TextDecoder().decode(bytes)) : null;
  }
  return decodeLegacy(encoded);
}

/** 共有URLを組み立てる。Web では現在のオリジンを使う。 */
export async function buildShareUrl(entries: PlanEntry[], slots: ScheduleSlot[]): Promise<string> {
  const encoded = await encodePlan(entries, slots);
  let base = getApiBaseUrl();
  if (!base && Platform.OS === "web" && typeof window !== "undefined") {
    base = window.location.origin;
  }
  return `${base}/?${SHARE_PARAM}=${encoded}`;
}

/** 現在のURLから共有プランを読み取る（Web のみ）。無ければ null。 */
export async function readSharedPlanFromUrl(): Promise<SharedPlan | null> {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get(SHARE_PARAM);
    if (!encoded) return null;
    return await decodePlan(encoded);
  } catch {
    return null;
  }
}

/**
 * 共有リンクを送る。Web Share API（LINE等に送れる）が使えればそれを使い、
 * 使えなければクリップボードにコピーする。結果を返す。
 */
export async function sharePlanLink(url: string, title = "旅ナビの旅程"): Promise<"shared" | "copied" | "failed"> {
  try {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: unknown) => Promise<void> }) : undefined;
    if (nav?.share) {
      await nav.share({ title, text: "この旅程を共有します", url });
      return "shared";
    }
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(url);
      return "copied";
    }
    return "failed";
  } catch {
    return "failed";
  }
}
