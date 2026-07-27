import { RailItem, RailNode, railNodes } from "./itinerary";
import { TransportMode } from "./types";

export type DayOfMode = "locked" | "move" | "free" | "done";

export interface DayOfMoveInfo {
  mode: "move";
  targetDepartAt: string;
  nextNode: RailNode;
  currentNode: RailNode | null;
  transitMode: TransportMode;
  transitMin: number;
}

export interface DayOfFreeInfo {
  mode: "free";
  freeMin: number;
  currentNode: RailNode;
  nextNode: RailNode;
}

export interface DayOfLockedInfo {
  mode: "locked";
  currentNode: RailNode | null;
  nextNode: RailNode | null;
}

export interface DayOfDoneInfo {
  mode: "done";
  currentNode: RailNode | null;
  totalReservations: number;
}

export type DayOfState = DayOfMoveInfo | DayOfFreeInfo | DayOfLockedInfo | DayOfDoneInfo;

/** currentNode と nextNode の間にある rail 要素（inline edge / gap+edge など）を取得する */
function itemsBetween(rail: RailItem[], fromNodeIndex: number, toNodeIndex: number): RailItem[] {
  const fromPos = fromNodeIndex < 0 ? -1 : rail.findIndex((i) => i.type === "node" && i.nodeIndex === fromNodeIndex);
  const toPos = rail.findIndex((i) => i.type === "node" && i.nodeIndex === toNodeIndex);
  if (toPos < 0) return [];
  return rail.slice(fromPos + 1, toPos);
}

/**
 * 到着記録と現在時刻から「実効的な現在地」を決める。
 * - 到着記録が無くても、予定時刻を過ぎたノードは「通過済み」とみなして自動で進める
 *   （到着ボタンの押し忘れで一日中「9:00の予定へ」と表示され続けるのを防ぐ）。
 * - ただし「予定より遅れている状態で」ユーザーが手動で現在地を記録した場合は、
 *   本人の申告を信じて自動進行しない（実際に遅れているケース）。
 */
function effectiveCurrentPos(
  nodes: RailNode[],
  currentNodeKey: string | null,
  now?: Date,
  currentNodeSetAt?: string | null
): number {
  const recordedPos = currentNodeKey ? nodes.findIndex((n) => n.key === currentNodeKey) : -1;
  if (!now) return recordedPos;

  // 現在時刻までに開始しているはずの最後のノード
  const nowMs = now.getTime();
  let autoPos = -1;
  for (let i = 0; i < nodes.length; i++) {
    const t = new Date(nodes[i].time).getTime();
    if (!Number.isNaN(t) && t <= nowMs) autoPos = i;
    else break;
  }

  // 手動/GPS記録が「次のノードの予定時刻を過ぎてから」行われた＝遅れの自己申告 → 記録を優先
  if (recordedPos >= 0 && currentNodeSetAt) {
    const setAtMs = new Date(currentNodeSetAt).getTime();
    const nextPlanned = nodes[recordedPos + 1] ? new Date(nodes[recordedPos + 1].time).getTime() : Infinity;
    if (!Number.isNaN(setAtMs) && setAtMs >= nextPlanned) return recordedPos;
  }
  return Math.max(recordedPos, autoPos);
}

/**
 * @param currentNodeKey 到着記録済みの直近ノードのキー。まだ何も記録していない場合は null（先頭ノードより前）。
 * @param opts.now 現在時刻。渡すと、予定時刻を過ぎたノードを自動で通過扱いにする。
 * @param opts.currentNodeSetAt 到着記録を行った時刻（ISO）。遅れの自己申告を尊重するために使う。
 */
export function getDayOfState(
  rail: RailItem[],
  currentNodeKey: string | null,
  opts?: { now?: Date; currentNodeSetAt?: string | null }
): DayOfState {
  const nodes = railNodes(rail);
  const currentPos = effectiveCurrentPos(nodes, currentNodeKey, opts?.now, opts?.currentNodeSetAt);
  const currentNode = currentPos >= 0 ? nodes[currentPos] : null;
  const nextNode = nodes[currentPos + 1] ?? null;

  if (!nextNode) {
    return { mode: "done", currentNode, totalReservations: new Set(nodes.map((n) => n.event.id)).size };
  }

  const currentNodeIndex = currentNode ? currentNode.nodeIndex : -1;
  const between = itemsBetween(rail, currentNodeIndex, nextNode.nodeIndex);
  const unconfirmedGap = between.find((i) => i.type === "gap" && i.kind === "unconfirmed");
  if (unconfirmedGap) {
    return { mode: "locked", currentNode, nextNode };
  }

  const freeGap = between.find((i) => i.type === "gap" && i.kind === "free");
  if (freeGap && currentNode) {
    return { mode: "free", freeMin: (freeGap as { durationMin: number }).durationMin, currentNode, nextNode };
  }

  const edge = between.find((i) => i.type === "edge");
  const transitMin = edge && edge.type === "edge" ? edge.durationMin : 0;
  const transitMode = edge && edge.type === "edge" ? edge.mode : "walk";
  const targetDepartAt = new Date(new Date(nextNode.time).getTime() - transitMin * 60000).toISOString();
  return {
    mode: "move",
    targetDepartAt,
    nextNode,
    currentNode,
    transitMode,
    transitMin,
  };
}

export interface Countdown {
  totalSec: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  mm: string;
  ss: string;
  /**
   * 桁の見せ方。1時間以上先なら分:秒の大時計は意味を持たないので、
   * 「あと◯日◯時間」の形に切り替える。
   * - "soon": 1時間未満（分:秒の大時計）
   * - "hours": 24時間未満（◯時間◯分）
   * - "days": それ以上（◯日◯時間）
   */
  scale: "soon" | "hours" | "days";
}

export function computeCountdown(targetIso: string, now: Date): Countdown {
  const totalSec = Math.max(0, Math.round((new Date(targetIso).getTime() - now.getTime()) / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const scale = days > 0 ? "days" : totalSec >= 3600 ? "hours" : "soon";
  return {
    totalSec,
    days,
    hours,
    minutes,
    seconds,
    // 1時間未満のときだけ意味がある大時計用の値（60分以上は頭打ちにしない）
    mm: String(Math.floor(totalSec / 60)).padStart(2, "0"),
    ss: String(seconds).padStart(2, "0"),
    scale,
  };
}

/** カウントダウンを一言で表す（「あと3日7時間」「あと2時間15分」「あと8分」）。 */
export function countdownLabel(c: Countdown): string {
  if (c.totalSec <= 0) return "まもなく";
  if (c.scale === "days") return c.hours > 0 ? `${c.days}日${c.hours}時間` : `${c.days}日`;
  if (c.scale === "hours") return c.minutes > 0 ? `${c.hours}時間${c.minutes}分` : `${c.hours}時間`;
  if (c.minutes > 0) return `${c.minutes}分`;
  return `${c.seconds}秒`;
}
