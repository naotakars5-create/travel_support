import { useMemo } from "react";
import { Animated, Linking, Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RailItem, computeStats, formatDurationMin } from "@/lib/itinerary";
import { MODE_COLOR, MODE_DASHED, MODE_LABEL } from "@/lib/modeMeta";
import { dayOfIso, formatJstHeadingJa, formatJstMonthDayJa, formatJstTime } from "@/lib/date";
import { GeoPoint, PlanEntry } from "@/lib/types";
import { PRIORITY_META } from "@/lib/plan";
import { pickBenchIllustration } from "@/lib/illustrations";
import { directionsUrl } from "@/lib/mapsLink";
import { Illustration } from "./Illustration";
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

/** 路線図の縦線を引く左側の溝（幅22px・線はその中央）。 */
const GUTTER_W = 22;

function LineFull({ style }: { style: LineStyle | null }) {
  return <View style={[{ position: "absolute", left: 10, top: 0, width: 1, height: "100%" } as const, lineBorderStyle(style)]} />;
}

/**
 * 区間の経路をGoogleマップで開くリンク。
 * 電車・バスの乗換や時刻表はAPIで取得できないため、本家マップで確認してもらう。
 */
function RouteLink({ url, label }: { url: string; label: string }) {
  return (
    <Pressable onPress={() => void Linking.openURL(url)} hitSlop={6} className="self-start">
      <Text className="font-gothic-400 text-[10px] text-muted underline">{label}</Text>
    </Pressable>
  );
}

/**
 * 空き時間ブロックの安定シード。直前の地点の時刻（無ければ日と位置）を使う。
 * 再レンダリングしても値が変わらないため、同じブロックには常に同じ絵が出る。
 */
function gapSeed(group: DayGroup, item: RailItem, groupIndex: number, itemIndex: number): string {
  for (let i = itemIndex - 1; i >= 0; i--) {
    const prev = group.items[i];
    if (prev.type === "node") return prev.time;
  }
  return `${groupIndex}-${itemIndex}-${item.type}`;
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
              <View className={`mb-1.5 flex-row items-baseline justify-between rounded-[10px] bg-ink px-4 py-1.5 ${gi > 0 ? "mt-2.5" : "mt-0.5"}`}>
                <Text className="font-gothic-700 text-[14px] text-kinari">{g.day}日目</Text>
                <Text className="font-gothic-400 text-[11px] text-kinari/80">{g.dateLabel}</Text>
              </View>
            )}
            {/* その日の全行程マップ（番号はその日の1,2,3…と一致） */}
            {(g.mapPoints.length > 0 || (gi === 0 && liveLocation)) && (
              <RouteMap points={g.mapPoints} me={liveLocation} labels={g.mapLabels} />
            )}
            {g.items.map((item, i) => {
              if (item.type === "node") {
                return (
                  <NodeRow
                    key={item.key}
                    item={item}
                    stopNumber={g.numberOf.get(item.key)}
                    isCurrent={item.key === currentNodeKey}
                    isNext={item.key === nextUpcomingKey}
                    isPast={item.nodeIndex < currentIndex && item.key !== currentNodeKey}
                    justAdded={item.event.id === justAddedEventId}
                  />
                );
              }

              if (item.type === "edge") {
                const style = lineStyleFor(item);
                const routeUrl = directionsUrl(item.leg, item.mode);
                return (
                  <View key={`edge-${gi}-${i}`} className="min-h-[22px] flex-row">
                    <View style={{ width: GUTTER_W }}>
                      <LineFull style={style} />
                    </View>
                    {/* 移動時間と経路リンクは1行に並べる（改行を減らして間延びを防ぐ） */}
                    <View className="flex-1 flex-row flex-wrap items-center gap-x-2 py-0.5 pl-1">
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
                      {routeUrl && <RouteLink url={routeUrl} label={item.mode === "rail" || item.mode === "bus" ? "乗換を見る" : "経路を見る"} />}
                    </View>
                  </View>
                );
              }

              const style = lineStyleFor(item);
              const isConflict = item.kind === "conflict";
              const isUnconfirmed = item.kind === "unconfirmed";
              return (
                <View key={`gap-${gi}-${i}`} className="min-h-[30px] flex-row">
                  <View style={{ width: GUTTER_W }}>
                    <LineFull style={style} />
                  </View>
                  <View className="flex-1 justify-center py-0.5 pl-1">
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
                        {(() => {
                          const url = directionsUrl(item.leg, "car");
                          return url ? (
                            <View className="mt-0.5">
                              <RouteLink url={url} label="経路をGoogleマップで見る" />
                            </View>
                          ) : null;
                        })()}
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
                      <View className="flex-row items-center gap-2">
                        {/* 直前ノードの時刻をシードに、常に同じ絵を出す（Math.randomは使わない） */}
                        <Illustration name={pickBenchIllustration(gapSeed(g, item, gi, i))} size="sm" alt="" />
                        <View className="self-start rounded-[10px] border border-muted-light px-3 py-1.5">
                          <Text className="font-gothic-400 text-[11px] text-muted" style={TNUM}>
                            空き時間 · {formatDurationMin(item.durationMin)}
                          </Text>
                        </View>
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
  isCurrent,
  isNext,
  isPast,
  justAdded,
}: {
  item: Extract<RailItem, { type: "node" }>;
  stopNumber?: number;
  isCurrent: boolean;
  /** 現在時刻より後の最初の予定（次に向かう先） */
  isNext: boolean;
  isPast: boolean;
  justAdded: boolean;
}) {
  const nodeInStyle = useNodeInStyle(justAdded);
  const markerBg = isCurrent ? "#D96F4C" : isPast ? "#6E675C" : "#23201D";
  // 時刻は「開始〜終了」の1行にまとめる（滞在時間を別行に出さずに済み、情報が密になる）
  const start = new Date(item.time);
  const timeLabel =
    item.stayMin && item.stayMin > 0
      ? `${formatJstTime(start)}–${formatJstTime(new Date(start.getTime() + item.stayMin * 60000))}`
      : formatJstTime(start);
  // 住所と補足も1行にまとめる
  const meta = [item.place && item.place !== item.event.title ? item.place : null, item.sub ?? null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Animated.View style={nodeInStyle} className="flex-row">
      {/* 溝は空ける（番号はカードの中に入れる。縦線はカードとカードの間だけ通る） */}
      <View style={{ width: GUTTER_W }} />
      <View className="flex-1 pb-1 pl-1">
        <View
          className={`rounded-[12px] border px-2.5 py-1.5 ${isCurrent ? "border-accent/50 bg-accent/[.06]" : "border-black/[.07] bg-white/60"}`}
          // 次に向かう予定：左に3pxのテラコッタ縦ボーダー（今・進行中の合図）
          style={isNext && !isCurrent ? { borderLeftWidth: 3, borderLeftColor: "#D96F4C" } : undefined}
        >
          {/* 番号・時刻・行き先を1行に。番号がカードの中に入るので、地点の区切りが分かりやすい */}
          <View className="flex-row items-center gap-2">
            <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
              {isCurrent && <PulseRing size={22} color="rgba(217,111,76,.45)" />}
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: markerBg, alignItems: "center", justifyContent: "center" }}>
                <Text className="font-gothic-500 text-[11px] text-kinari" style={TNUM}>
                  {stopNumber === -1 ? "着" : stopNumber ?? ""}
                </Text>
              </View>
            </View>
            <Text className={`font-gothic-500 text-[11px] ${isPast ? "text-muted-light" : "text-muted"}`} style={TNUM}>
              {timeLabel}
            </Text>
            <Text
              numberOfLines={1}
              className={`flex-1 font-mincho-600 text-[15px] leading-[20px] ${isPast ? "text-muted-light" : "text-ink"}`}
            >
              {item.event.title || item.place}
            </Text>
            {isCurrent && (
              <Blinker>
                <View className="rounded-full bg-accent/15 px-2 py-[2px]">
                  <Text className="font-gothic-500 text-[9px] text-ink">● 現在地</Text>
                </View>
              </Blinker>
            )}
          </View>
          {(meta || item.confidence < 0.5) && (
            <View className="mt-0.5 flex-row items-center gap-1.5" style={{ paddingLeft: 30 }}>
              {item.confidence < 0.5 && (
                <View className="rounded-full border border-muted px-1.5">
                  <Text className="font-gothic-400 text-[9px] text-muted">要確認</Text>
                </View>
              )}
              {meta ? (
                <Text numberOfLines={2} className="flex-1 font-gothic-400 text-[10px] leading-[14px] text-muted-light">
                  {meta}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
