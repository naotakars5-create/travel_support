import { useMemo } from "react";
import { Animated, Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RailItem, computeStats, formatDurationMin } from "@/lib/itinerary";
import { MODE_COLOR, MODE_DASHED, MODE_LABEL } from "@/lib/modeMeta";
import { dayOfIso, formatJstHeadingJa, formatJstMonthDayJa, formatJstTime } from "@/lib/date";
import { GeoPoint, PlanEntry } from "@/lib/types";
import { PRIORITY_META } from "@/lib/plan";
import { RouteMap } from "./RouteMap";
import { Blinker, PulseRing, useNodeInStyle } from "./animations";

const MUTED_LIGHT = "#6E675C";
const INK = "#23201D";
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

/** 1日分の旅程（日番号・日付・その日の rail 要素・地点番号）。 */
interface DayGroup {
  day: number;
  dateLabel: string;
  items: RailItem[];
  /** その日の中での地点番号（1始まり・日ごとにリセット） */
  numberOf: Map<string, number>;
  mapPoints: GeoPoint[];
  mapLabels: (string | undefined)[];
}

export function ItineraryScreen({
  rail,
  unplaced,
  currentNodeKey,
  justAddedEventId,
  liveLocation,
  now,
  tripDate,
  onNavigatePlan,
  onBumpPriority,
}: {
  rail: RailItem[];
  /** AIが時間内に収まらないと判断して外した予定 */
  unplaced: PlanEntry[];
  currentNodeKey: string | null;
  justAddedEventId: string | null;
  liveLocation: GeoPoint | null;
  now: Date;
  tripDate: string;
  onNavigatePlan: () => void;
  onBumpPriority: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const stats = computeStats(rail);
  const heading = formatJstHeadingJa(new Date());
  const currentNode = rail.find((i) => i.type === "node" && i.key === currentNodeKey);
  const currentIndex = currentNode && currentNode.type === "node" ? currentNode.nodeIndex : -1;

  // 現在時刻より後の最初の予定（＝次に向かう予定）。左に3pxのテラコッタを付けて示す。
  const nextUpcomingKey = useMemo(() => {
    const nowMs = now.getTime();
    for (const item of rail) {
      if (item.type === "node" && new Date(item.time).getTime() > nowMs) return item.key;
    }
    return null;
  }, [rail, now]);

  // rail を「日」ごとのグループに分割し、日内で地点番号（1,2,3…）と地図の点列を作る。
  // 番号は日ごとにリセットされ、その日の地図マーカーと一致する。
  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups: DayGroup[] = [];
    let current: DayGroup | null = null;
    let prevDate: string | null = null;
    let spotSeq = 0; // その日のスポット番号（出発地点は0、スポットは1から）
    for (const item of rail) {
      if (item.type === "node") {
        const dk = new Date(item.time).toDateString();
        if (prevDate === null || dk !== prevDate) {
          current = {
            day: dayOfIso(tripDate, item.time),
            dateLabel: formatJstMonthDayJa(new Date(item.time)),
            items: [],
            numberOf: new Map(),
            mapPoints: [],
            mapLabels: [],
          };
          groups.push(current);
          prevDate = dk;
          spotSeq = 0;
        }
      }
      if (!current) continue; // 先頭にnode以外は来ない想定の保険
      current.items.push(item);
      if (item.type === "node") {
        const isHome = item.event.mode === "home";
        // その日の起点（ホテルのチェックアウト・出発地の出発）は「0」。回るスポットは1から数える。
        // 帰着（自宅・集合場所へ戻る）は番号を振らず「着」。
        const isDeparturePoint = /-(out|depart)$/.test(item.event.id) && current.numberOf.size === 0;
        const isReturnPoint = isHome && /-return$/.test(item.event.id);
        const num = isReturnPoint ? -1 : isDeparturePoint ? 0 : ++spotSeq;
        current.numberOf.set(item.key, num);
        // 自宅（出発地）はプライバシーのため地図には載せない
        if (item.geo && !isHome) {
          current.mapPoints.push(item.geo);
          current.mapLabels.push(String(num));
        }
      }
    }
    return groups;
  }, [rail, tripDate]);

  const subLine = `予定${stats.reservationCount}件 · 空き${stats.gapCount}件 · 総移動${formatDurationMin(stats.totalTransitMin)}`;

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      <View className="px-[26px] pb-2 pt-3">
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
        {rail.length === 0 && (
          <Pressable onPress={onNavigatePlan} className="mt-10 self-center rounded-[12px] border border-ink/25 px-5 py-3">
            <Text className="text-center font-gothic-400 text-[12px] text-muted">
              まだ予定がありません。{"\n"}「計画」で行き先を追加してください。
            </Text>
          </Pressable>
        )}

        {dayGroups.map((g, gi) => (
          <View key={`day-${g.day}-${gi}`}>
            {/* 日の見出し（複数日程では塗りのバンドで目立たせる） */}
            {dayGroups.length > 1 && (
              <View className={`mb-2 flex-row items-baseline justify-between rounded-[10px] bg-ink px-4 py-2 ${gi > 0 ? "mt-3" : "mt-1"}`}>
                <Text className="font-gothic-700 text-[14px] text-kinari">{g.day}日目</Text>
                <Text className="font-gothic-400 text-[11px] text-kinari/80">{g.dateLabel}</Text>
              </View>
            )}
            {/* その日の全行程マップ（番号はその日の1,2,3…と一致） */}
            {(g.mapPoints.length > 0 || (gi === 0 && liveLocation)) && (
              <RouteMap points={g.mapPoints} me={liveLocation} labels={g.mapLabels} />
            )}
            {g.items.map((item, i) => {
              const prev = g.items[i - 1];
              const next = g.items[i + 1];

              if (item.type === "node") {
                return (
                  <NodeRow
                    key={item.key}
                    item={item}
                    stopNumber={g.numberOf.get(item.key)}
                    prevStyle={lineStyleFor(prev)}
                    nextStyle={lineStyleFor(next)}
                    isCurrent={item.key === currentNodeKey}
                    isNext={item.key === nextUpcomingKey}
                    isPast={item.nodeIndex < currentIndex && item.key !== currentNodeKey}
                    justAdded={item.event.id === justAddedEventId}
                  />
                );
              }

              if (item.type === "edge") {
                const style = lineStyleFor(item);
                return (
                  <View key={`edge-${gi}-${i}`} className="min-h-[28px] flex-row">
                    <View className="w-12" />
                    <View className="w-[26px]">
                      <LineFull style={style} />
                    </View>
                    <View className="flex-1 justify-center pb-1 pl-1">
                      {item.explicit ? (
                        // 出発地→最初のスポット等、移動手段が指定された区間は指定手段のみ表示
                        <Text className="font-gothic-500 text-[11px]" style={[{ color: style?.color }, TNUM]}>
                          {item.mode === "rail" ? "電車・バス" : MODE_LABEL[item.mode]} {formatDurationMin(item.durationMin)}
                        </Text>
                      ) : item.driving != null || item.walking != null ? (
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
                <View key={`gap-${gi}-${i}`} className="min-h-[38px] flex-row">
                  <View className="w-12" />
                  <View className="w-[26px]">
                    <LineFull style={style} />
                  </View>
                  <View className="flex-1 justify-center py-1 pl-1">
                    {isConflict ? (
                      <View className="self-start rounded-[10px] border border-ink/50 bg-surface px-3 py-1.5">
                        <Text className="font-gothic-500 text-[11px] text-ink">
                          {item.durationMin < 0 ? "予定が重なっています" : "移動時間が足りない可能性があります"}
                        </Text>
                        {(item.driving != null || item.walking != null || item.requiredMin != null) && (
                          <Text className="mt-0.5 font-gothic-400 text-[10px] text-muted" style={TNUM}>
                            実際の移動{" "}
                            {item.driving != null || item.walking != null
                              ? [
                                  item.driving != null ? `車 ${formatDurationMin(item.driving)}` : null,
                                  item.walking != null ? `徒歩 ${formatDurationMin(item.walking)}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" ／ ")
                              : `約 ${formatDurationMin(item.requiredMin ?? 0)}`}
                            {item.durationMin >= 0 ? ` · 空き ${formatDurationMin(item.durationMin)}` : ""}
                          </Text>
                        )}
                      </View>
                    ) : isUnconfirmed ? (
                      <Pressable onPress={onNavigatePlan} className="self-start rounded-[10px] border border-ink px-3 py-1.5">
                        <Text className="font-gothic-400 text-[11px] text-ink">未確定 · 計画で行き先を追加</Text>
                      </Pressable>
                    ) : item.durationMin >= 360 && i === g.items.length - 1 && gi < dayGroups.length - 1 ? (
                      // 実際に日をまたぐ（その日の最後×翌日がある）場合だけ「翌日まで」
                      <View className="self-start rounded-[10px] border border-muted-light px-3 py-1">
                        <Text className="font-gothic-400 text-[11px] text-muted">翌日まで（宿泊）</Text>
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
          </View>
        ))}

        {/* AIが時間内に収まらないと判断して外した予定 */}
        {unplaced.length > 0 && (
          <View className="mt-7">
            <Text className="mb-2 font-gothic-500 text-[10px] tracking-[.15em] text-ink">旅程に入らなかった予定</Text>
            <View className="rounded-[16px] border border-ink/25">
              {unplaced.map((e, i) => (
                <View key={e.id} className={`flex-row items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-black/[.06]" : ""}`}>
                  <View className="flex-1 pr-2">
                    <Text className="font-mincho-600 text-[14px] text-ink">{e.title}</Text>
                    <Text className="mt-0.5 font-gothic-400 text-[10px] text-muted">{PRIORITY_META[e.priority].label}</Text>
                  </View>
                  {e.priority !== "must" && (
                    <Pressable onPress={() => onBumpPriority(e.id)} className="rounded-full border border-ink px-3 py-1.5">
                      <Text className="font-gothic-500 text-[11px] text-ink">必ず行くにする</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
            <Text className="mt-1.5 font-gothic-400 text-[10px] leading-[15px] text-muted-light">
              時間が足りず入らなかった予定です。「必ず行くにする」→もう一度「AIで旅程を組む」と優先して組み込みます。
            </Text>
          </View>
        )}
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
  isNext,
  isPast,
  justAdded,
}: {
  item: Extract<RailItem, { type: "node" }>;
  stopNumber?: number;
  prevStyle: LineStyle | null;
  nextStyle: LineStyle | null;
  isCurrent: boolean;
  /** 現在時刻より後の最初の予定（次に向かう先） */
  isNext: boolean;
  isPast: boolean;
  justAdded: boolean;
}) {
  const nodeInStyle = useNodeInStyle(justAdded);
  const markerBg = isCurrent ? "#D96F4C" : isPast ? "#6E675C" : "#23201D";
  return (
    <Animated.View style={nodeInStyle} className="min-h-[50px] flex-row">
      <View className="w-12 items-end pt-1.5 pr-2">
        <Text className={`font-mincho-600 text-[14px] ${isPast ? "text-muted-light" : "text-ink"}`} style={TNUM}>
          {formatJstTime(new Date(item.time))}
        </Text>
      </View>
      <View className="w-[26px] items-center">
        <LineHalf style={prevStyle} side="top" />
        <LineHalf style={nextStyle} side="bottom" />
        {/* 番号マーカー（＝地点の目印。現在地は薄い赤＋脈動） */}
        <View className="mt-1" style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
          {isCurrent && <PulseRing size={22} color="rgba(217,111,76,.45)" />}
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: markerBg, alignItems: "center", justifyContent: "center" }}>
            <Text className="font-gothic-500 text-[11px] text-kinari" style={TNUM}>
              {stopNumber === -1 ? "着" : stopNumber ?? ""}
            </Text>
          </View>
        </View>
      </View>
      <View className="flex-1 pb-2 pl-1 pt-0.5">
        <View
          className={`rounded-[12px] border px-3 py-2 ${isCurrent ? "border-accent/50 bg-accent/[.06]" : "border-black/[.07] bg-white/60"}`}
          // 次に向かう予定：左に3pxのテラコッタ縦ボーダー（今・進行中の合図）
          style={isNext && !isCurrent ? { borderLeftWidth: 3, borderLeftColor: "#D96F4C" } : undefined}
        >
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className={`font-mincho-600 text-[15px] ${isPast ? "text-muted-light" : "text-ink"}`}>{item.event.title || item.place}</Text>
            {isCurrent && (
              <Blinker>
                <View className="rounded-full bg-accent/15 px-2 py-[2px]">
                  <Text className="font-gothic-500 text-[9px] text-ink">● 現在地</Text>
                </View>
              </Blinker>
            )}
            {item.confidence < 0.5 && (
              <View className="rounded-full border border-muted px-2 py-[1px]">
                <Text className="font-gothic-400 text-[9px] text-muted">要確認</Text>
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
