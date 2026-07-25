import { useMemo } from "react";
import { Animated, Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RailItem, computeStats, formatDurationMin, railNodes } from "@/lib/itinerary";
import { MODE_COLOR, MODE_DASHED, MODE_LABEL } from "@/lib/modeMeta";
import { dayOfIso, formatJstHeadingJa, formatJstMonthDayJa, formatJstTime } from "@/lib/date";
import { GeoPoint } from "@/lib/types";
import { RouteMap } from "./RouteMap";
import { Blinker, PulseRing, useNodeInStyle } from "./animations";

const MUTED_LIGHT = "#b7b0a3";
const INK = "#2a2622";
const TNUM: TextStyle = { fontVariant: ["tabular-nums"] };

interface LineStyle {
  color: string;
  dashed: boolean;
}

function lineStyleFor(item: RailItem | undefined): LineStyle | null {
  if (!item) return null;
  if (item.type === "edge") return { color: MODE_COLOR[item.mode], dashed: Boolean(MODE_DASHED[item.mode]) };
  if (item.type === "gap") {
    if (item.kind === "free") return { color: MUTED_LIGHT, dashed: true };
    return { color: INK, dashed: true };
  }
  return null;
}

function lineBorderStyle(style: LineStyle | null) {
  if (!style) return { borderLeftWidth: 0 };
  return {
    borderLeftWidth: 2,
    borderLeftColor: style.color,
    borderStyle: style.dashed ? ("dashed" as const) : ("solid" as const),
  };
}

function LineHalf({ style, side }: { style: LineStyle | null; side: "top" | "bottom" }) {
  return (
    <View
      style={[
        { position: "absolute", left: 12, width: 1, [side]: 0, height: "50%" } as const,
        lineBorderStyle(style),
      ]}
    />
  );
}

function LineFull({ style }: { style: LineStyle | null }) {
  return <View style={[{ position: "absolute", left: 12, top: 0, width: 1, height: "100%" } as const, lineBorderStyle(style)]} />;
}

export function ItineraryScreen({
  rail,
  currentNodeKey,
  justAddedEventId,
  liveLocation,
  now,
  tripDate,
  onNavigatePlan,
}: {
  rail: RailItem[];
  currentNodeKey: string | null;
  justAddedEventId: string | null;
  liveLocation: GeoPoint | null;
  now: Date;
  tripDate: string;
  onNavigatePlan: () => void;
}) {
  const insets = useSafeAreaInsets();
  const stats = computeStats(rail);
  const heading = formatJstHeadingJa(new Date());
  const currentNode = rail.find((i) => i.type === "node" && i.key === currentNodeKey);
  const currentIndex = currentNode && currentNode.type === "node" ? currentNode.nodeIndex : -1;

  // 各地点（ノード）に行く順の通し番号を振る。地図のマーカー番号と旅程の番号を一致させる。
  const nodes = railNodes(rail);
  const nodeNumber = useMemo(() => {
    const m = new Map<string, number>();
    nodes.forEach((n, i) => m.set(n.key, i + 1));
    return m;
  }, [nodes]);
  const mappableNodes = nodes.filter((n) => n.geo);
  const mapPoints: GeoPoint[] = mappableNodes.map((n) => n.geo as GeoPoint);
  const mapLabels: (string | undefined)[] = mappableNodes.map((n) => String(nodeNumber.get(n.key)));

  // 日付が変わるノードのキー → 日番号（「N日目」見出しを出す位置）
  const dayHeaders = useMemo(() => {
    const map = new Map<string, number>();
    let prevDate: string | null = null;
    for (const item of rail) {
      if (item.type !== "node") continue;
      const dk = new Date(item.time).toDateString();
      if (prevDate !== null && dk !== prevDate) map.set(item.key, dayOfIso(tripDate, item.time));
      prevDate = dk;
    }
    return map;
  }, [rail, tripDate]);

  const subLine = `予定${stats.reservationCount}件 · 空き${stats.gapCount}件 · 総移動${formatDurationMin(stats.totalTransitMin)}`;

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      <View className="px-[26px] pb-3 pt-4">
        <View className="flex-row items-baseline justify-between">
          <Text className="font-gothic-400 text-[11px] text-muted">{heading}</Text>
          <Text className="font-gothic-500 text-[11px] text-ink" style={TNUM}>現在 {formatJstTime(now)}</Text>
        </View>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="font-mincho-600 text-[26px] text-ink">本日の旅程</Text>
          {rail.length > 0 && (
            <Pressable onPress={onNavigatePlan} className="rounded-full border border-ink/25 px-3 py-1">
              <Text className="font-gothic-500 text-[11px] text-ink">計画を編集</Text>
            </Pressable>
          )}
        </View>
        <Text className="mt-1 font-gothic-400 text-[11px] text-muted" style={TNUM}>
          {subLine}
        </Text>
      </View>
      <View className="h-px w-full bg-black/[.08]" />

      <ScrollView className="flex-1 px-[26px]" contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}>
        {(mapPoints.length > 0 || liveLocation) && <RouteMap points={mapPoints} me={liveLocation} labels={mapLabels} />}
        {rail.length === 0 && (
          <Pressable onPress={onNavigatePlan} className="mt-10 self-center rounded-[12px] border border-ink/25 px-5 py-3">
            <Text className="text-center font-gothic-400 text-[12px] text-muted">
              まだ予定がありません。{"\n"}「計画」で行き先を追加してください。
            </Text>
          </Pressable>
        )}
        {rail.map((item, i) => {
          const prev = rail[i - 1];
          const next = rail[i + 1];

          if (item.type === "node") {
            const dayNum = dayHeaders.get(item.key);
            const showDayHeader = dayNum !== undefined;
            return (
              <View key={item.key}>
                {showDayHeader && (
                  <View className="mb-2 mt-3 flex-row items-center gap-2">
                    <View className="h-px flex-1 bg-black/[.1]" />
                    <Text className="font-gothic-500 text-[11px] text-ink">
                      {dayNum}日目 · {formatJstMonthDayJa(new Date(item.time))}
                    </Text>
                    <View className="h-px flex-1 bg-black/[.1]" />
                  </View>
                )}
                <NodeRow
                  item={item}
                  stopNumber={nodeNumber.get(item.key)}
                  prevStyle={lineStyleFor(showDayHeader ? undefined : prev)}
                  nextStyle={lineStyleFor(next)}
                  isCurrent={item.key === currentNodeKey}
                  isPast={item.nodeIndex < currentIndex && item.key !== currentNodeKey}
                  justAdded={item.event.id === justAddedEventId}
                />
              </View>
            );
          }

          if (item.type === "edge") {
            const style = lineStyleFor(item);
            return (
              <View key={`edge-${i}`} className="min-h-[40px] flex-row">
                <View className="w-12" />
                <View className="w-[26px]">
                  <LineFull style={style} />
                </View>
                <View className="flex-1 justify-center pb-2 pl-1">
                  {item.driving != null || item.walking != null ? (
                    <Text className="font-gothic-400 text-[11px]" style={[{ color: style?.color }, TNUM]}>
                      {[
                        item.driving != null ? `車 ${formatDurationMin(item.driving)}` : null,
                        item.walking != null ? `徒歩 ${formatDurationMin(item.walking)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" ／ ")}
                    </Text>
                  ) : (
                    <Text className="font-gothic-400 text-[11px]" style={[{ color: style?.color }, TNUM]}>
                      {MODE_LABEL[item.mode]} · {formatDurationMin(item.durationMin)}
                    </Text>
                  )}
                </View>
              </View>
            );
          }

          const style = lineStyleFor(item);
          const isConflict = item.kind === "conflict";
          const isUnconfirmed = item.kind === "unconfirmed";
          return (
            <View key={`gap-${i}`} className="min-h-[56px] flex-row">
              <View className="w-12" />
              <View className="w-[26px]">
                <LineFull style={style} />
              </View>
              <View className="flex-1 justify-center py-2 pl-1">
                {isConflict ? (
                  <View className="self-start rounded-[10px] border border-ink px-3 py-1.5">
                    <Text className="font-gothic-400 text-[11px] text-ink">
                      {item.durationMin < 0 ? "予定が重なっています" : "移動時間が足りない可能性があります"}
                    </Text>
                  </View>
                ) : isUnconfirmed ? (
                  <Pressable onPress={onNavigatePlan} className="self-start rounded-[10px] border border-ink px-3 py-1.5">
                    <Text className="font-gothic-400 text-[11px] text-ink">未確定 · 計画で行き先を追加</Text>
                  </Pressable>
                ) : item.durationMin >= 360 ? (
                  <View className="self-start rounded-[10px] border border-muted-light px-3 py-1.5">
                    <Text className="font-gothic-400 text-[11px] text-muted">翌日まで（宿泊など）</Text>
                  </View>
                ) : (
                  <View className="self-start rounded-[10px] border border-muted-light px-3 py-1.5">
                    <Text className="font-gothic-400 text-[11px] text-muted" style={TNUM}>
                      空き時間 · {formatDurationMin(item.durationMin)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function NodeRow({
  item,
  stopNumber,
  prevStyle,
  nextStyle,
  isCurrent,
  isPast,
  justAdded,
}: {
  item: Extract<RailItem, { type: "node" }>;
  stopNumber?: number;
  prevStyle: LineStyle | null;
  nextStyle: LineStyle | null;
  isCurrent: boolean;
  isPast: boolean;
  justAdded: boolean;
}) {
  const nodeInStyle = useNodeInStyle(justAdded);
  const markerBg = isCurrent ? "#c2492d" : isPast ? "#b7b0a3" : "#2a2622";
  return (
    <Animated.View style={nodeInStyle} className="min-h-[64px] flex-row">
      <View className="w-12 items-end pt-2 pr-2">
        <Text className={`font-mincho-600 text-[14px] ${isPast ? "text-muted-light" : "text-ink"}`} style={TNUM}>
          {formatJstTime(new Date(item.time))}
        </Text>
      </View>
      <View className="w-[26px] items-center">
        <LineHalf style={prevStyle} side="top" />
        <LineHalf style={nextStyle} side="bottom" />
        {/* 番号マーカー（＝地点の目印。現在地は薄い赤＋脈動） */}
        <View className="mt-1.5" style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
          {isCurrent && <PulseRing size={22} color="rgba(194,73,45,.45)" />}
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: markerBg, alignItems: "center", justifyContent: "center" }}>
            <Text className="font-gothic-500 text-[11px] text-kinari" style={TNUM}>
              {stopNumber ?? ""}
            </Text>
          </View>
        </View>
      </View>
      <View className="flex-1 pb-4 pl-1 pt-1">
        <View className={`rounded-[12px] border px-3 py-2.5 ${isCurrent ? "border-accent/50 bg-accent/[.06]" : "border-black/[.07] bg-white/60"}`}>
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className={`font-mincho-600 text-[15px] ${isPast ? "text-muted-light" : "text-ink"}`}>{item.event.title || item.place}</Text>
            {isCurrent && (
              <Blinker>
                <View className="rounded-full bg-accent/15 px-2 py-[2px]">
                  <Text className="font-gothic-500 text-[9px] text-accent">● 現在地</Text>
                </View>
              </Blinker>
            )}
            {item.confidence < 0.5 && (
              <View className="rounded-full border border-mode-bus px-2 py-[1px]">
                <Text className="font-gothic-400 text-[9px] text-mode-bus">要確認</Text>
              </View>
            )}
          </View>
          {item.place && item.place !== item.event.title && (
            <Text className="mt-1 font-gothic-400 text-[10px] text-muted-light">{item.place}</Text>
          )}
          {(item.stayMin || item.sub) && (
            <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-0.5">
              {item.stayMin ? (
                <Text className="font-gothic-400 text-[10px] text-muted" style={TNUM}>
                  滞在 {formatDurationMin(item.stayMin)}
                </Text>
              ) : null}
              {item.sub && <Text className="font-gothic-400 text-[11px] text-muted">{item.sub}</Text>}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
