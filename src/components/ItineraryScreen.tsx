import { useMemo, useState } from "react";
import { Animated, Linking, Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RailItem, computeStats, formatDurationMin } from "@/lib/itinerary";
import { MODE_COLOR, MODE_DASHED, MODE_LABEL } from "@/lib/modeMeta";
import { dayOfIso, formatJstHeadingJa, formatJstMonthDayJa, formatJstTime } from "@/lib/date";
import { GeoPoint, PlanEntry } from "@/lib/types";
import {
  isClosedOn,
  closedDaysLabel,
  entryIdFromEventId,
  timeWishOf,
  violatesWish,
  wishFullLabel,
  PRIORITY_META,
} from "@/lib/plan";
import { pickBenchIllustration } from "@/lib/illustrations";
import { COLORS, dayColor, tint } from "@/lib/palette";
import { directionsUrl } from "@/lib/mapsLink";
import { SpotThumb } from "./SpotThumb";
import { Illustration } from "./Illustration";
import { RouteMap } from "./RouteMap";
import { Blinker, PulseRing, useNodeInStyle } from "./animations";
import { SectionHeading } from "./ui";

const MUTED_LIGHT = COLORS.muted;
const INK = COLORS.ink;
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
      <Text className="font-gothic-400 text-[11px] text-muted underline">{label}</Text>
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
  /** 座標が無いときにGoogleマップへ渡す地点名（住所または行き先名） */
  mapPlaces: string[];
}

export function ItineraryScreen({
  rail,
  entries,
  unplaced,
  currentNodeKey,
  justAddedEventId,
  liveLocation,
  now,
  tripDate,
  tripDayCount,
  readOnly,
  canUndoCompose,
  suggestOptimize,
  composing,
  onCompose,
  onUndoCompose,
  onNavigatePlan,
  onBumpPriority,
  onEditEntry,
  onRemoveEntry,
  onMoveEntry,
  onSetEntryDay,
  onAddToDay,
  embedded = false,
}: {
  rail: RailItem[];
  /** 旅程の元になっている行き先一覧（この画面から直接編集するために引く） */
  entries: PlanEntry[];
  /** AIが時間内に収まらないと判断して外した予定 */
  unplaced: PlanEntry[];
  currentNodeKey: string | null;
  justAddedEventId: string | null;
  liveLocation: GeoPoint | null;
  now: Date;
  tripDate: string;
  tripDayCount: number;
  /** 共有された旅程を見ているだけの状態（編集操作を出さない） */
  readOnly: boolean;
  /** 直前のAI組み直しを取り消せるか（スナップショットがあるか） */
  canUndoCompose: boolean;
  /** 行き先が最後の最適化から変わっている（AI最適化の提案チップを出す） */
  suggestOptimize: boolean;
  composing: boolean;
  onCompose: () => void;
  onUndoCompose: () => void;
  onNavigatePlan: () => void;
  onBumpPriority: (id: string) => void;
  onEditEntry: (id: string) => void;
  onRemoveEntry: (id: string) => void;
  onMoveEntry: (id: string, dir: -1 | 1) => void;
  onSetEntryDay: (id: string, day: number) => void;
  /** その日に新しい行き先を足す（空き時間の「＋」から） */
  onAddToDay: (day: number) => void;
  /** 「旅」タブの中に埋め込まれているか（見出しは TripHero が持つので出さない） */
  embedded?: boolean;
}) {
  const insets = useSafeAreaInsets();
  // タップして開いている地点（そこだけ操作バーを出す）。もう一度押すと閉じる。
  const [openKey, setOpenKey] = useState<string | null>(null);
  const entryById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  // 「最適化しますか？」チップを閉じたか。行き先がさらに変わったら（suggestOptimize が立ち直したら）また出す
  const [optimizeDismissed, setOptimizeDismissed] = useState(false);
  if (!suggestOptimize && optimizeDismissed) setOptimizeDismissed(false);
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
    let spotSeq = 0; // その日のスポット番号（宿の出発は0、回るスポットは1から）
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
            mapPlaces: [],
          };
          groups.push(current);
          prevDate = dk;
          spotSeq = 0;
        }
      }
      if (!current) continue; // 先頭にnode以外は来ない想定の保険
      current.items.push(item);
      if (item.type === "node") {
        // その日の起点（ホテルのチェックアウト）は「0」。回るスポットは1から数える。
        const isDeparturePoint = /-(out|stay\d+)$/.test(item.event.id) && current.numberOf.size === 0;
        const num = isDeparturePoint ? 0 : ++spotSeq;
        current.numberOf.set(item.key, num);
        if (item.geo) {
          current.mapPoints.push(item.geo);
          current.mapLabels.push(String(num));
        }
        // 座標が無くてもGoogleマップは開けるよう、地点名を控えておく
        const placeText = (item.place || item.event.title || "").trim();
        if (placeText) current.mapPlaces.push(placeText);
      }
    }
    return groups;
  }, [rail, tripDate]);

  const subLine = `予定${stats.reservationCount}件 · 空き${stats.gapCount}件 · 総移動${formatDurationMin(stats.totalTransitMin)}`;

  return (
    <View className="flex-1 bg-kinari" style={embedded ? undefined : { paddingTop: insets.top }}>
      {!embedded && (
        <View className="px-[26px] pb-2 pt-3">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-gothic-400 text-[12px] text-muted">{heading}</Text>
            <Text className="font-gothic-500 text-[12px] text-ink" style={TNUM}>現在 {formatJstTime(now)}</Text>
          </View>
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="font-mincho-600 text-[26px] text-ink">今回の旅程</Text>
            <View className="flex-row items-center gap-2">
              {canUndoCompose && (
                <Pressable
                  onPress={onUndoCompose}
                  accessibilityRole="button"
                  accessibilityLabel="AIで組む前の旅程に戻す"
                  className="rounded-full border border-ink/25 px-3 py-1.5"
                >
                  <Text className="font-gothic-500 text-[12px] text-ink">元に戻す</Text>
                </Pressable>
              )}
              {rail.length > 0 && (
                <Pressable onPress={onNavigatePlan} className="rounded-full border border-ink/25 px-3 py-1.5">
                  <Text className="font-gothic-500 text-[12px] text-ink">行き先を編集</Text>
                </Pressable>
              )}
            </View>
          </View>
          <Text className="mt-1 font-gothic-400 text-[12px] text-muted" style={TNUM}>
            {subLine}
          </Text>
          {rail.length > 0 && !readOnly && (
            <Text className="mt-0.5 font-gothic-400 text-[12px] text-muted-light">
              地点をタップすると、順番・日・内容をその場で変えられます
            </Text>
          )}
        </View>
      )}
      {!embedded && <View className="h-px w-full bg-highlight/60" />}

      <ScrollView className="flex-1 px-[26px]" contentContainerStyle={{ paddingTop: 8, paddingBottom: 90 }}>
        {embedded && rail.length > 0 && (
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-gothic-400 text-[12px] text-muted" style={TNUM}>{subLine}</Text>
            {canUndoCompose && (
              <Pressable
                onPress={onUndoCompose}
                accessibilityRole="button"
                accessibilityLabel="AIで組む前の旅程に戻す"
                className="rounded-full border border-ink/25 px-3 py-1"
              >
                <Text className="font-gothic-500 text-[12px] text-ink">組む前に戻す</Text>
              </Pressable>
            )}
          </View>
        )}
        {embedded && rail.length > 0 && !readOnly && (
          <Text className="mb-2 font-gothic-400 text-[12px] text-muted-light">
            地点をタップすると、順番・日・内容をその場で変えられます
          </Text>
        )}
        {/* 行き先が変わった時だけそっと出す「最適化しますか？」チップ（B案）。押し忘れをなくす */}
        {suggestOptimize && !optimizeDismissed && rail.length > 0 && (
          <View className="mb-2 flex-row items-center gap-2 rounded-[12px] border border-ink/15 bg-surface/60 px-3 py-2">
            <Text className="flex-1 font-gothic-400 text-[12px] leading-[18px] text-ink">
              行き先が変わりました。AIで予定を組み直しますか？
            </Text>
            <Pressable
              disabled={composing}
              onPress={onCompose}
              accessibilityRole="button"
              className={`rounded-full px-3 py-1.5 ${composing ? "bg-ink/40" : "bg-ink"}`}
            >
              <Text className="font-gothic-500 text-[12px] text-kinari">{composing ? "組んでいます…" : "予定を組む"}</Text>
            </Pressable>
            <Pressable onPress={() => setOptimizeDismissed(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="この提案を閉じる">
              <Text className="font-gothic-400 text-[14px] text-muted-light">×</Text>
            </Pressable>
          </View>
        )}
        {rail.length === 0 && (
          <Pressable onPress={onNavigatePlan} className="mt-10 self-center rounded-[12px] border border-ink/25 px-5 py-3">
            <Text className="text-center font-gothic-400 text-[12px] text-muted">
              まだ予定がありません。{"\n"}行き先を追加すると、ここに旅程が並びます。
            </Text>
          </Pressable>
        )}

        {dayGroups.map((g, gi) => (
          <View key={`day-${g.day}-${gi}`}>
            {/* 日の見出し（複数日程では塗りのバンドで目立たせる） */}
            {dayGroups.length > 1 && (
              <View
                className={`mb-1.5 flex-row items-baseline justify-between rounded-[10px] px-4 py-1.5 ${gi > 0 ? "mt-2.5" : "mt-0.5"}`}
                style={{ backgroundColor: dayColor(g.day) }}
              >
                <Text className="font-gothic-700 text-[14px] text-kinari">{g.day}日目</Text>
                <Text className="font-gothic-400 text-[12px] text-kinari/80">{g.dateLabel}</Text>
              </View>
            )}
            {/* その日の動線マップ。日の見出しのすぐ下＝各日の一番頭に必ず置く。
                番号はその日の 1,2,3… と一致。座標がまだ無い日も、地点名で
                Googleマップを開くボタンとして必ず出す。 */}
            {(g.mapPoints.length > 0 || g.mapPlaces.length > 0 || (gi === 0 && liveLocation)) && (
              <RouteMap
                points={g.mapPoints}
                places={g.mapPlaces}
                me={gi === 0 ? liveLocation : null}
                labels={g.mapLabels}
                caption={`${dayGroups.length > 1 ? `${g.day}日目の` : ""}動線 · ${g.mapPlaces.length}箇所`}
              />
            )}
            {g.items.map((item, i) => {
              if (item.type === "node") {
                const entryId = entryIdFromEventId(item.event.id);
                const entry = entryId ? entryById.get(entryId) ?? null : null;
                return (
                  <NodeRow
                    key={item.key}
                    item={item}
                    stopNumber={g.numberOf.get(item.key)}
                    isCurrent={item.key === currentNodeKey}
                    isNext={item.key === nextUpcomingKey}
                    isPast={item.nodeIndex < currentIndex && item.key !== currentNodeKey}
                    justAdded={item.event.id === justAddedEventId}
                    entry={entry}
                    editable={!readOnly && Boolean(entry)}
                    open={openKey === item.key}
                    onToggleOpen={() => setOpenKey((k) => (k === item.key ? null : item.key))}
                    tripDayCount={tripDayCount}
                    dayNumber={g.day}
                    tripDate={tripDate}
                    onEditEntry={onEditEntry}
                    onRemoveEntry={(id) => {
                      setOpenKey(null);
                      onRemoveEntry(id);
                    }}
                    onMoveEntry={onMoveEntry}
                    onSetEntryDay={(id, d) => {
                      setOpenKey(null);
                      onSetEntryDay(id, d);
                    }}
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
                      {item.driving != null || item.walking != null ? (
                        <Text className="font-gothic-400 text-[12px]" style={[{ color: style?.color }, TNUM]}>
                          {[
                            item.driving != null ? `車 ${formatDurationMin(item.driving)}` : null,
                            item.walking != null ? `徒歩 ${formatDurationMin(item.walking)}` : null,
                          ]
                            .filter(Boolean)
                            .join(" ／ ")}
                        </Text>
                      ) : (
                        <Text className="font-gothic-400 text-[12px]" style={[{ color: style?.color }, TNUM]}>
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
                        <Text className="font-gothic-500 text-[12px] text-ink">
                          {item.durationMin < 0 ? "予定が重なっています" : "移動時間が足りない可能性があります"}
                        </Text>
                        {(item.driving != null || item.walking != null || item.requiredMin != null) && (
                          <Text className="mt-0.5 font-gothic-400 text-[11px] text-muted" style={TNUM}>
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
                        <Text className="font-gothic-400 text-[12px] text-ink">未確定 · 行き先を追加する</Text>
                      </Pressable>
                    ) : item.durationMin >= 360 && i === g.items.length - 1 && gi < dayGroups.length - 1 ? (
                      // 実際に日をまたぐ（その日の最後×翌日がある）場合だけ「翌日まで」
                      <View className="self-start rounded-[10px] border border-muted-light px-3 py-1">
                        <Text className="font-gothic-400 text-[12px] text-muted">翌日まで（宿泊）</Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center gap-2">
                        {/* 直前ノードの時刻をシードに、常に同じ絵を出す（Math.randomは使わない） */}
                        <Illustration name={pickBenchIllustration(gapSeed(g, item, gi, i))} size="sm" alt="" />
                        <View className="self-start rounded-[10px] border border-muted-light px-3 py-1.5">
                          <Text className="font-gothic-400 text-[12px] text-muted" style={TNUM}>
                            空き時間 · {formatDurationMin(item.durationMin)}
                          </Text>
                        </View>
                        {/* 空いている所にその場で行き先を足せるようにする（この日が初期選択される） */}
                        {!readOnly && (
                          <Pressable
                            onPress={() => onAddToDay(g.day)}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel={`${g.day}日目のこの時間に行き先を追加`}
                            className="rounded-full border border-accent/45 bg-accent/[.08] px-2.5 py-1"
                          >
                            <Text className="font-gothic-500 text-[12px] text-accent">＋ ここに追加</Text>
                          </Pressable>
                        )}
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
<SectionHeading label="旅程に入らなかった予定" className="mb-2" />
            <View className="rounded-[16px] border border-ink/25">
              {unplaced.map((e, i) => (
                <View key={e.id} className={`flex-row items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-black/[.06]" : ""}`}>
                  <View className="flex-1 pr-2">
                    <Text className="font-mincho-600 text-[14px] text-ink">{e.title}</Text>
                    <Text className="mt-0.5 font-gothic-400 text-[11px] text-muted">{PRIORITY_META[e.priority].label}</Text>
                  </View>
                  {e.priority !== "must" && (
                    <Pressable onPress={() => onBumpPriority(e.id)} className="rounded-full border border-ink px-3 py-1.5">
                      <Text className="font-gothic-500 text-[12px] text-ink">必ず行くにする</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
            <Text className="mt-1.5 font-gothic-400 text-[11px] leading-[17px] text-muted-light">
              時間が足りず入らなかった予定です。「必ず行くにする」→もう一度「AIで旅程を組む」と優先して組み込みます。
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** 地点カードを開いた時に出す操作ボタン。 */
function ActionChip({
  label,
  onPress,
  disabled,
  tone = "plain",
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "plain" | "accent" | "danger";
  accessibilityLabel?: string;
}) {
  const cls =
    tone === "accent"
      ? "border-accent/50 bg-accent/[.1]"
      : tone === "danger"
        ? "border-ink/25 bg-transparent"
        : "border-ink/20 bg-white/70";
  const textCls = tone === "accent" ? "text-accent" : tone === "danger" ? "text-muted" : "text-ink";
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      className={`rounded-full border px-2.5 py-1 ${cls} ${disabled ? "opacity-35" : ""}`}
    >
      <Text className={`font-gothic-500 text-[12px] ${textCls}`}>{label}</Text>
    </Pressable>
  );
}

function NodeRow({
  item,
  stopNumber,
  isCurrent,
  isNext,
  isPast,
  justAdded,
  entry,
  editable,
  open,
  onToggleOpen,
  tripDayCount,
  dayNumber,
  tripDate,
  onEditEntry,
  onRemoveEntry,
  onMoveEntry,
  onSetEntryDay,
}: {
  item: Extract<RailItem, { type: "node" }>;
  stopNumber?: number;
  isCurrent: boolean;
  /** 現在時刻より後の最初の予定（次に向かう先） */
  isNext: boolean;
  isPast: boolean;
  justAdded: boolean;
  /** この地点の元になっている行き先（無い場合は編集できない） */
  entry: PlanEntry | null;
  editable: boolean;
  open: boolean;
  onToggleOpen: () => void;
  tripDayCount: number;
  dayNumber: number;
  /** 旅行の開始日（希望の「何日目」とのずれを判定するために使う） */
  tripDate: string;
  onEditEntry: (id: string) => void;
  onRemoveEntry: (id: string) => void;
  onMoveEntry: (id: string, dir: -1 | 1) => void;
  onSetEntryDay: (id: string, day: number) => void;
}) {
  const nodeInStyle = useNodeInStyle(justAdded);
  // 宿泊・レンタカーは並び順が時刻で決まるため、上下移動はさせない（内容の編集だけ）
  const reorderable = Boolean(entry && entry.mode !== "stay" && entry.mode !== "rental");
  // その日の色。番号とカードの縁に薄く効かせて、日ごとのまとまりを分かりやすくする
  const dc = dayColor(dayNumber);
  const markerBg = isCurrent ? COLORS.accent : isPast ? COLORS.muted : dayColor(dayNumber);
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
  // 定休日と重なっていないか（Place Details 由来の定休日がある場合のみ判定できる）
  const closedConflict = isClosedOn(item.event, start);
  // 「午後がいい」等の希望どおりに置けたか。外れていたら黙らせずに知らせる
  const wishKind = entry ? timeWishOf(entry) : "any";
  const wishMissed = entry ? violatesWish(entry, item.time, tripDate) : false;

  return (
    <Animated.View style={nodeInStyle} className="flex-row">
      {/* 溝は空ける（番号はカードの中に入れる。縦線はカードとカードの間だけ通る） */}
      <View style={{ width: GUTTER_W }} />
      <View className="flex-1 pb-1 pl-1">
        <Pressable
          disabled={!editable}
          onPress={onToggleOpen}
          accessibilityRole={editable ? "button" : undefined}
          accessibilityLabel={editable ? `${item.event.title || item.place}の予定を変更する` : undefined}
          className={`rounded-[12px] border px-2.5 py-1.5 ${
            open ? "border-accent bg-accent/[.09]" : isCurrent ? "border-accent/50 bg-accent/[.06]" : ""
          }`}
          style={[
            // 平常時はその日の色を縁と下地にごく薄く効かせる（日ごとのまとまりが出る）
            open || isCurrent
              ? null
              : { borderColor: tint(dc, isPast ? 0.14 : 0.28), backgroundColor: tint(dc, isPast ? 0.03 : 0.06) },
            // 次に向かう予定：左に3pxのテラコッタ縦ボーダー（今・進行中の合図）
            isNext && !isCurrent ? { borderLeftWidth: 3, borderLeftColor: COLORS.accent } : null,
          ]}
        >
          {/* 番号・時刻・行き先を1行に。番号がカードの中に入るので、地点の区切りが分かりやすい */}
          <View className="flex-row items-center gap-2">
            <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
              {isCurrent && <PulseRing size={22} color="rgba(221, 89, 103, .45)" />}
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: markerBg, alignItems: "center", justifyContent: "center" }}>
                <Text className="font-gothic-500 text-[12px] text-kinari" style={TNUM}>
                  {stopNumber ?? ""}
                </Text>
              </View>
            </View>
            <Text className={`font-gothic-500 text-[12px] ${isPast ? "text-muted-light" : "text-muted"}`} style={TNUM}>
              {timeLabel}
            </Text>
            <Text
              numberOfLines={1}
              className={`flex-1 font-mincho-600 text-[15px] leading-[21px] ${isPast ? "text-muted-light" : "text-ink"}`}
            >
              {item.event.title || item.place}
            </Text>
            {isCurrent && (
              <Blinker>
                <View className="rounded-full bg-accent/15 px-2 py-[2px]">
                  <Text className="font-gothic-500 text-[10px] text-ink">● 現在地</Text>
                </View>
              </Blinker>
            )}
            <SpotThumb photoRef={item.event.photoRef} attribution={item.event.photoAttribution} />
          </View>
          {(meta || item.confidence < 0.5 || closedConflict || wishMissed) && (
            <View className="mt-0.5 flex-row items-center gap-1.5" style={{ paddingLeft: 30 }}>
              {closedConflict && (
                <View className="rounded-full border border-ink bg-surface px-1.5">
                  <Text className="font-gothic-500 text-[10px] text-ink">
                    {closedDaysLabel(item.event) ?? "定休日"}・この日は休み
                  </Text>
                </View>
              )}
              {item.confidence < 0.5 && (
                <View className="rounded-full border border-muted px-1.5">
                  <Text className="font-gothic-400 text-[10px] text-muted">要確認</Text>
                </View>
              )}
              {wishMissed && entry && (
                <View className="rounded-full border border-accent/60 bg-accent/[.1] px-1.5">
                  <Text className="font-gothic-500 text-[10px] text-accent">
                    希望「{wishFullLabel(entry)}」に置けませんでした
                  </Text>
                </View>
              )}
              {!wishMissed && wishKind === "fixed" && (
                <View className="rounded-full bg-ink px-1.5">
                  <Text className="font-gothic-500 text-[10px] text-kinari">時刻固定</Text>
                </View>
              )}
              {meta ? (
                <Text numberOfLines={2} className="flex-1 font-gothic-400 text-[11px] leading-[16px] text-muted-light">
                  {meta}
                </Text>
              ) : null}
            </View>
          )}

          {/* タップで開く操作バー。旅程の画面から直接、順番・日・内容を変えられる。 */}
          {open && entry && (
            <View className="mt-1.5 border-t border-accent/25 pt-1.5" style={{ paddingLeft: 30 }}>
              <View className="flex-row flex-wrap items-center gap-1.5">
                <ActionChip label="内容を編集" tone="accent" onPress={() => onEditEntry(entry.id)} />
                {reorderable && (
                  <>
                    <ActionChip label="↑ 前へ" accessibilityLabel="この地点を一つ前にする" onPress={() => onMoveEntry(entry.id, -1)} />
                    <ActionChip label="↓ 後へ" accessibilityLabel="この地点を一つ後にする" onPress={() => onMoveEntry(entry.id, 1)} />
                  </>
                )}
                <ActionChip label="削除" tone="danger" accessibilityLabel={`${entry.title || "この地点"}を削除`} onPress={() => onRemoveEntry(entry.id)} />
              </View>
              {tripDayCount > 1 && reorderable && (
                <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5">
                  <Text className="font-gothic-400 text-[11px] text-muted">日を移す</Text>
                  {Array.from({ length: tripDayCount }, (_, k) => k + 1).map((d) => (
                    <Pressable
                      key={d}
                      disabled={d === dayNumber}
                      onPress={() => onSetEntryDay(entry.id, d)}
                      accessibilityRole="button"
                      accessibilityLabel={`${d}日目へ移す`}
                      className="rounded-full border px-2 py-[3px]"
                      style={
                        d === dayNumber
                          ? { backgroundColor: dayColor(d), borderColor: dayColor(d) }
                          : { backgroundColor: "rgba(255,255,255,.7)", borderColor: tint(dayColor(d), 0.3) }
                      }
                    >
                      <Text className={`font-gothic-500 text-[11px] ${d === dayNumber ? "text-kinari" : "text-ink"}`} style={TNUM}>
                        {d}日目
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}
