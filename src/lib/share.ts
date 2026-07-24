import { Platform } from "react-native";
import { PlanEntry, ScheduleSlot } from "./types";
import { getApiBaseUrl } from "./apiBase";

/**
 * 共有リンク（Tier 1）：アカウント不要・閲覧のみの共有。
 * プラン（行き先＋時刻割り当て）をURLに埋め込むだけなのでサーバー不要。
 * 受け取った相手が同じURLを開くと、同じ旅程・同じ当日ビューを閲覧できる（編集は不可）。
 */

export interface SharedPlan {
  entries: PlanEntry[];
  slots: ScheduleSlot[];
}

/** 共有URLのクエリキー。 */
export const SHARE_PARAM = "p";

// --- Unicode 対応の base64url エンコード/デコード ---

function toBase64Url(s: string): string {
  // 共有リンクは Web 前提。btoa は Latin1 のみ受け付けるため UTF-8→Latin1 変換を挟む。
  if (typeof btoa === "undefined") return "";
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  if (typeof atob === "undefined") return "";
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b64)));
}

/** プランを共有用の文字列（base64url）へ符号化する。 */
export function encodePlan(entries: PlanEntry[], slots: ScheduleSlot[]): string {
  const payload: SharedPlan = { entries, slots };
  return toBase64Url(JSON.stringify(payload));
}

/** 共有文字列をプランへ復号する。壊れていれば null。 */
export function decodePlan(encoded: string): SharedPlan | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    if (!parsed || !Array.isArray(parsed.entries) || !Array.isArray(parsed.slots)) return null;
    return { entries: parsed.entries as PlanEntry[], slots: parsed.slots as ScheduleSlot[] };
  } catch {
    return null;
  }
}

/** 共有URLを組み立てる。Web では現在のオリジンを使う。 */
export function buildShareUrl(entries: PlanEntry[], slots: ScheduleSlot[]): string {
  const encoded = encodePlan(entries, slots);
  let base = getApiBaseUrl();
  if (!base && Platform.OS === "web" && typeof window !== "undefined") {
    base = window.location.origin;
  }
  return `${base}/?${SHARE_PARAM}=${encoded}`;
}

/** 現在のURLから共有プランを読み取る（Web のみ）。無ければ null。 */
export function readSharedPlanFromUrl(): SharedPlan | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get(SHARE_PARAM);
    if (!encoded) return null;
    return decodePlan(encoded);
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
