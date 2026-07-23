import { ParsedEvent, TransportMode, isTransitMode } from "./types";
import { TransitEstimator, heuristicTransitEstimator } from "./transit";

export const FREE_GAP_THRESHOLD_MIN = 60;

export interface RailNode {
  type: "node";
  nodeIndex: number;
  event: ParsedEvent;
  /** この地点イベントの発生時刻（ISO） */
  time: string;
  place: string;
  sub?: string;
  confidence: number;
}

export interface RailEdge {
  type: "edge";
  mode: TransportMode;
  durationMin: number;
}

export interface RailGap {
  type: "gap";
  kind: "free" | "unconfirmed" | "conflict";
  durationMin: number;
  /** free ギャップ算出の基点になる直前ノードindex（周辺スポット検索などに使用） */
  afterNodeIndex: number;
}

export type RailItem = RailNode | RailEdge | RailGap;

interface NodeSeed {
  event: ParsedEvent;
  time: string;
  place: string;
  sub?: string;
}

function minutesBetween(aIso: string, bIso: string): number {
  return Math.round((new Date(bIso).getTime() - new Date(aIso).getTime()) / 60000);
}

/** イベント1件を1〜2個のノードシードに変換する（移動系は出発・到着の2点、それ以外は1点）。 */
function eventToNodeSeeds(event: ParsedEvent): NodeSeed[] {
  const isLeg = isTransitMode(event.mode) && event.placeFrom && event.placeTo && event.endAt && event.endAt !== event.startAt;
  if (isLeg) {
    return [
      { event, time: event.startAt, place: event.placeFrom!, sub: event.detail },
      { event, time: event.endAt!, place: event.placeTo!, sub: undefined },
    ];
  }
  return [
    {
      event,
      time: event.startAt,
      place: event.placeTo ?? event.placeFrom ?? event.title,
      sub: event.detail,
    },
  ];
}

/**
 * イベント配列を 時刻順の node/edge/gap 列（路線図）に変換する。
 * @param events 確定済み（解析済み）イベント一覧
 * @param hasPendingReservation 未解析の予約メールが受信箱に残っているか
 * @param estimator 移動手段・所要時間の見積もり実装（差し替え可能）
 */
export function buildRail(
  events: ParsedEvent[],
  hasPendingReservation: boolean,
  estimator: TransitEstimator = heuristicTransitEstimator
): RailItem[] {
  const sortedEvents = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  // グループ = 1イベントから生じるノード列（移動系は [from, inlineEdge, to]）
  type Group = { seeds: NodeSeed[]; event: ParsedEvent };
  const groups: Group[] = sortedEvents.map((event) => ({ seeds: eventToNodeSeeds(event), event }));

  const rail: RailItem[] = [];
  let nodeIndex = 0;
  let unconfirmedUsed = false;

  groups.forEach((group, gi) => {
    group.seeds.forEach((seed, si) => {
      rail.push({
        type: "node",
        nodeIndex,
        event: seed.event,
        time: seed.time,
        place: seed.place,
        sub: seed.sub,
        confidence: seed.event.confidence,
      });
      nodeIndex += 1;

      // 移動系イベント内部のインライン edge（出発ノードの直後のみ）
      if (si === 0 && group.seeds.length === 2) {
        rail.push({
          type: "edge",
          mode: group.event.mode,
          durationMin: minutesBetween(group.seeds[0].time, group.seeds[1].time),
        });
      }
    });

    const nextGroup = groups[gi + 1];
    if (!nextGroup) return;

    const prevSeed = group.seeds[group.seeds.length - 1];
    const nextSeed = nextGroup.seeds[0];
    const intervalMin = minutesBetween(prevSeed.time, nextSeed.time);
    const prevNodeIndex = nodeIndex - 1;

    const requiredMin = estimator.estimateRequiredMin(prevSeed.event, nextSeed.event);
    if (intervalMin < 0 || (requiredMin != null && requiredMin > intervalMin)) {
      rail.push({ type: "gap", kind: "conflict", durationMin: intervalMin, afterNodeIndex: prevNodeIndex });
      return;
    }

    if (intervalMin < FREE_GAP_THRESHOLD_MIN) {
      const est = estimator.estimateFullInterval(prevSeed.event, nextSeed.event, intervalMin);
      rail.push({ type: "edge", mode: est.mode, durationMin: est.durationMin });
      return;
    }

    if (hasPendingReservation && !unconfirmedUsed) {
      unconfirmedUsed = true;
      rail.push({ type: "gap", kind: "unconfirmed", durationMin: intervalMin, afterNodeIndex: prevNodeIndex });
      return;
    }

    const lead = estimator.estimateLeadTime(prevSeed.event, nextSeed.event);
    const leadMin = Math.min(lead.durationMin, intervalMin - 1);
    const freeMin = intervalMin - leadMin;
    rail.push({ type: "gap", kind: "free", durationMin: freeMin, afterNodeIndex: prevNodeIndex });
    rail.push({ type: "edge", mode: lead.mode, durationMin: leadMin });
  });

  return rail;
}

export function railNodes(rail: RailItem[]): RailNode[] {
  return rail.filter((i): i is RailNode => i.type === "node");
}

export interface ItineraryStats {
  reservationCount: number;
  gapCount: number;
  unconfirmedCount: number;
  totalTransitMin: number;
}

export function computeStats(rail: RailItem[]): ItineraryStats {
  let reservationCount = 0;
  let gapCount = 0;
  let unconfirmedCount = 0;
  let totalTransitMin = 0;
  const seenEvents = new Set<string>();
  for (const item of rail) {
    if (item.type === "node" && !seenEvents.has(item.event.id)) {
      seenEvents.add(item.event.id);
      reservationCount += 1;
    }
    if (item.type === "gap") {
      if (item.kind === "unconfirmed") unconfirmedCount += 1;
      else if (item.kind === "free") gapCount += 1;
    }
    if (item.type === "edge") totalTransitMin += item.durationMin;
  }
  return { reservationCount, gapCount, unconfirmedCount, totalTransitMin };
}

export function formatDurationMin(min: number): string {
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h > 0 && m > 0) return `${h}時間${m}分`;
  if (h > 0) return `${h}時間`;
  return `${m}分`;
}
