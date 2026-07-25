import { GeoPoint, ParsedEvent, TransportMode, isTransitMode } from "./types";
import { TransitEstimator, heuristicTransitEstimator } from "./transit";

export const FREE_GAP_THRESHOLD_MIN = 60;

export interface RailNode {
  type: "node";
  nodeIndex: number;
  /** event.id + 出発/到着の別からなる安定キー（イベント再構築後も同一地点を追跡できる） */
  key: string;
  event: ParsedEvent;
  /** この地点イベントの発生時刻（ISO） */
  time: string;
  place: string;
  sub?: string;
  confidence: number;
  /** この地点の座標（ジオコーディング済みの場合） */
  geo?: GeoPoint;
  /** 想定滞在時間（分）。滞在系の地点で終了時刻がある場合 */
  stayMin?: number;
}

export interface RailEdge {
  type: "edge";
  mode: TransportMode;
  durationMin: number;
  /** 実測の車・徒歩時間（分・取得できた場合）。両方表示に使う。 */
  driving?: number;
  walking?: number;
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
  key: string;
  time: string;
  /** この地点を出発する時刻（滞在後）。次区間の空き時間計算に使う。 */
  endTime?: string;
  place: string;
  sub?: string;
  geo?: GeoPoint;
}

function minutesBetween(aIso: string, bIso: string): number {
  return Math.round((new Date(bIso).getTime() - new Date(aIso).getTime()) / 60000);
}

function isLegEvent(event: ParsedEvent): boolean {
  return Boolean(isTransitMode(event.mode) && event.placeFrom && event.placeTo && event.endAt && event.endAt !== event.startAt);
}

/** イベントを開始時刻順に並べたもの（buildRail と同じ並び順）。 */
export function sortedGroupEvents(events: ParsedEvent[]): ParsedEvent[] {
  return [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

/** そのイベントの最後のノード（＝次のイベントへ接続する側）の座標。 */
export function lastSeedGeo(event: ParsedEvent): GeoPoint | undefined {
  return isLegEvent(event) ? event.placeToGeo : event.placeToGeo ?? event.placeFromGeo;
}

/** そのイベントの最初のノード（＝前のイベントから接続される側）の座標。 */
export function firstSeedGeo(event: ParsedEvent): GeoPoint | undefined {
  return isLegEvent(event) ? event.placeFromGeo : event.placeToGeo ?? event.placeFromGeo;
}

/** イベント1件を1〜2個のノードシードに変換する（移動系は出発・到着の2点、それ以外は1点）。 */
function eventToNodeSeeds(event: ParsedEvent): NodeSeed[] {
  const isLeg = isLegEvent(event);
  if (isLeg) {
    return [
      { event, key: `${event.id}:from`, time: event.startAt, place: event.placeFrom!, sub: event.detail, geo: event.placeFromGeo },
      { event, key: `${event.id}:to`, time: event.endAt!, place: event.placeTo!, sub: undefined, geo: event.placeToGeo },
    ];
  }
  return [
    {
      event,
      key: `${event.id}:point`,
      time: event.startAt,
      endTime: event.endAt && event.endAt !== event.startAt ? event.endAt : undefined,
      place: event.placeTo ?? event.placeFrom ?? event.title,
      sub: event.detail,
      geo: event.placeToGeo ?? event.placeFromGeo,
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
        key: seed.key,
        event: seed.event,
        time: seed.time,
        place: seed.place,
        sub: seed.sub,
        confidence: seed.event.confidence,
        geo: seed.geo,
        stayMin: seed.endTime ? minutesBetween(seed.time, seed.endTime) : undefined,
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
    // 空き時間は「前の地点を出発（滞在後）してから次の到着まで」で計算する。
    const intervalMin = minutesBetween(prevSeed.endTime ?? prevSeed.time, nextSeed.time);
    const prevNodeIndex = nodeIndex - 1;

    const est = estimator.estimate(prevSeed.event, nextSeed.event);

    // 前の予定の終了が次の開始を超えている、または見積もり移動時間が空き時間を超える＝間に合わない
    if (intervalMin < 0 || est.durationMin > intervalMin) {
      rail.push({ type: "gap", kind: "conflict", durationMin: intervalMin, afterNodeIndex: prevNodeIndex });
      return;
    }

    if (intervalMin < FREE_GAP_THRESHOLD_MIN) {
      rail.push({ type: "edge", mode: est.mode, durationMin: est.durationMin, driving: est.driving, walking: est.walking });
      return;
    }

    if (hasPendingReservation && !unconfirmedUsed) {
      unconfirmedUsed = true;
      rail.push({ type: "gap", kind: "unconfirmed", durationMin: intervalMin, afterNodeIndex: prevNodeIndex });
      return;
    }

    const freeMin = intervalMin - est.durationMin;
    rail.push({ type: "gap", kind: "free", durationMin: freeMin, afterNodeIndex: prevNodeIndex });
    rail.push({ type: "edge", mode: est.mode, durationMin: est.durationMin, driving: est.driving, walking: est.walking });
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
