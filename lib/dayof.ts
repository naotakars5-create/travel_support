import { RailItem, RailNode, railNodes } from "./itinerary";
import { TransportMode } from "./types";

export type DayOfMode = "locked" | "move" | "free" | "done";

export interface DayOfMoveInfo {
  mode: "move";
  targetDepartAt: string;
  nextNode: RailNode;
  currentNode: RailNode;
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
}

export interface DayOfDoneInfo {
  mode: "done";
  currentNode: RailNode | null;
  totalReservations: number;
}

export type DayOfState = DayOfMoveInfo | DayOfFreeInfo | DayOfLockedInfo | DayOfDoneInfo;

/** currentNode と nextNode の間にある rail 要素（inline edge / gap+edge など）を取得する */
function itemsBetween(rail: RailItem[], fromNodeIndex: number, toNodeIndex: number): RailItem[] {
  const fromPos = rail.findIndex((i) => i.type === "node" && i.nodeIndex === fromNodeIndex);
  const toPos = rail.findIndex((i) => i.type === "node" && i.nodeIndex === toNodeIndex);
  if (fromPos < 0 || toPos < 0) return [];
  return rail.slice(fromPos + 1, toPos);
}

export function getDayOfState(rail: RailItem[], currentNodeIndex: number): DayOfState {
  const nodes = railNodes(rail);
  const currentNode = nodes.find((n) => n.nodeIndex === currentNodeIndex) ?? null;
  const nextNode = nodes.find((n) => n.nodeIndex === currentNodeIndex + 1) ?? null;

  if (!nextNode) {
    return { mode: "done", currentNode, totalReservations: nodes.length > 0 ? new Set(nodes.map((n) => n.event.id)).size : 0 };
  }

  const between = itemsBetween(rail, currentNodeIndex, nextNode.nodeIndex);
  const unconfirmedGap = between.find((i) => i.type === "gap" && i.kind === "unconfirmed");
  if (unconfirmedGap) {
    return { mode: "locked", currentNode };
  }

  const freeGap = between.find((i) => i.type === "gap" && i.kind === "free");
  if (freeGap && freeGap.type === "gap") {
    return { mode: "free", freeMin: freeGap.durationMin, currentNode: currentNode!, nextNode };
  }

  const edge = between.find((i) => i.type === "edge");
  const transitMin = edge && edge.type === "edge" ? edge.durationMin : 0;
  const transitMode = edge && edge.type === "edge" ? edge.mode : "walk";
  const targetDepartAt = new Date(new Date(nextNode.time).getTime() - transitMin * 60000).toISOString();
  return {
    mode: "move",
    targetDepartAt,
    nextNode,
    currentNode: currentNode!,
    transitMode,
    transitMin,
  };
}

export interface Countdown {
  totalSec: number;
  mm: string;
  ss: string;
}

export function computeCountdown(targetIso: string, now: Date): Countdown {
  const totalSec = Math.max(0, Math.round((new Date(targetIso).getTime() - now.getTime()) / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return { totalSec, mm, ss };
}
