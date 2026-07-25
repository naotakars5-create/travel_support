import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlanEntry, Priority, SpotSuggestion } from "@/lib/types";
import { PlanTotals, PRIORITY_META, effectiveStayMin, entryDurationMin, COST_CATEGORY_LABEL, COST_CATEGORY_ORDER } from "@/lib/plan";
import { Profile } from "@/lib/profile";
import { BaseMode } from "@/lib/transit";
import { MODE_LABEL } from "@/lib/modeMeta";
import { formatDurationMin } from "@/lib/itinerary";
import { dateForDay, formatJstMonthDayJa, formatJstTime } from "@/lib/date";
import { formatYen } from "@/lib/format";
import { DateOnlyField } from "./PlainFields";

const TNUM: TextStyle = { fontVariant: ["tabular-nums"] };

// 日ごとの淡い背景色（複数日程で日を見分けやすくする）。1日目は無地。
const DAY_TINTS = ["", "bg-mode-rail/[.06]", "bg-mode-air/[.06]", "bg-mode-bus/[.07]", "bg-accent/[.05]"];
const dayTint = (day: number): string => DAY_TINTS[(Math.max(1, day) - 1) % DAY_TINTS.length];

const PRIORITY_STYLE: Record<Priority, { border: string; text: string }> = {
  must: { border: "border-accent", text: "text-accent" },
  want: { border: "border-ink/40", text: "text-ink" },
  optional: { border: "border-muted-light", text: "text-muted" },
};

export function PlanScreen({
  entries,
  totals,
  scheduleByEntry,
  suggestions,
  areaSuggestions,
  areaSuggestionsLoading,
  hasGeoReference,
  planNotes,
  composing,
  composeError,
  readOnly,
  tripDate,
  onSetTripDate,
  tripDayCount,
  onSetTripDayCount,
  baseMode,
  onSetBaseMode,
  profile,
  onOpenAdd,
  onOpenAddLodging,
  onCompose,
  onRemoveEntry,
  onEditEntry,
  onSetEntryDay,
  onMoveEntry,
  onMoveEntryToEdge,
  onAddSuggestions,
  onShare,
  onImportShared,
}: {
  entries: PlanEntry[];
  totals: PlanTotals;
  scheduleByEntry: Map<string, string>;
  suggestions: SpotSuggestion[];
  areaSuggestions: SpotSuggestion[];
  areaSuggestionsLoading: boolean;
  hasGeoReference: boolean;
  planNotes: string | null;
  composing: boolean;
  composeError: string | null;
  readOnly: boolean;
  tripDate: string;
  onSetTripDate: (v: string) => void;
  tripDayCount: number;
  onSetTripDayCount: (n: number) => void;
  baseMode: BaseMode;
  onSetBaseMode: (m: BaseMode) => void;
  profile: Profile;
  onOpenAdd: () => void;
  onOpenAddLodging: () => void;
  onCompose: () => void;
  onRemoveEntry: (id: string) => void;
  onEditEntry: (id: string) => void;
  onSetEntryDay: (id: string, day: number) => void;
  onMoveEntry: (id: string, dir: -1 | 1) => void;
  onMoveEntryToEdge: (id: string, dir: -1 | 1) => void;
  onAddSuggestions: (list: SpotSuggestion[]) => void;
  onShare: () => void;
  onImportShared: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const togglePick = (title: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  const [pickedArea, setPickedArea] = useState<Set<string>>(new Set());
  const togglePickArea = (title: string) =>
    setPickedArea((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  // 表示時刻：固定予定は目安到着を厳守、それ以外は組み上げ結果（自動計算）の時刻を優先
  const timeOf = (e: PlanEntry): string | null =>
    (e.fixedTime && e.arriveBy ? e.arriveBy : scheduleByEntry.get(e.id) ?? e.arriveBy) ?? null;
  // 宿泊は「宿泊先（固定）」として別枠。並び替えの対象外。
  const lodging = entries.filter((e) => e.mode === "stay");
  // 表示は「並び順（＝行程順）」: 日ごと → 行き先リスト内の順番（宿泊は除外）
  const indexOf = new Map(entries.map((e, i) => [e.id, i]));
  const ordered = entries
    .filter((e) => e.mode !== "stay")
    .sort((a, b) => (a.day ?? 1) - (b.day ?? 1) || (indexOf.get(a.id) ?? 0) - (indexOf.get(b.id) ?? 0));
  // 日ごとの通し番号（1,2,3…）
  const numberOf = new Map<string, number>();
  const dayCounter = new Map<number, number>();
  for (const e of ordered) {
    const d = e.day ?? 1;
    const n = (dayCounter.get(d) ?? 0) + 1;
    dayCounter.set(d, n);
    numberOf.set(e.id, n);
  }
  // 日数が減った等で選択日が範囲外なら「全日」にフォールバック
  const activeDay: number | "all" =
    typeof selectedDay === "number" && selectedDay >= 1 && selectedDay <= tripDayCount ? selectedDay : "all";
  const visible = activeDay === "all" ? ordered : ordered.filter((e) => (e.day ?? 1) === activeDay);
  // 同じ日の中で最初/最後か（上下ボタンの無効化に使う）
  const isFirstInDay = (e: PlanEntry) => numberOf.get(e.id) === 1;
  const isLastInDay = (e: PlanEntry) => numberOf.get(e.id) === dayCounter.get(e.day ?? 1);
  // 時刻レンジ（開始〜終了）の表示
  const timeRange = (e: PlanEntry): string | null => {
    const startIso = timeOf(e);
    if (!startIso) return null;
    const start = new Date(startIso);
    const dur = entryDurationMin(e);
    const startStr = formatJstTime(start);
    if (dur <= 0) return `${startStr}〜`;
    return `${startStr}〜${formatJstTime(new Date(start.getTime() + dur * 60000))}`;
  };

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      <View className="px-[26px] pb-3 pt-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-gothic-400 text-[10px] tracking-[.2em] text-muted">
              {profile.name ? profile.name : "TABI-NAVI"}
            </Text>
            <Text className="mt-1 font-mincho-600 text-[26px] text-ink">{readOnly ? "共有された旅程" : "行き先リスト"}</Text>
          </View>
          {!readOnly && (
            <View className="mt-1 flex-row items-center gap-2">
              <Pressable onPress={onShare} className="h-7 items-center justify-center rounded-[8px] border border-ink/25 px-3">
                <Text className="font-gothic-500 text-[11px] text-ink">共有</Text>
              </Pressable>
              <Pressable onPress={onOpenAdd} className="h-7 w-7 items-center justify-center rounded-[8px] border border-ink/25">
                <View className="relative h-[10px] w-[10px]">
                  <View className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 bg-ink" />
                  <View className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-ink" />
                </View>
              </Pressable>
            </View>
          )}
        </View>
        <Text className="mt-1 font-gothic-400 text-[11px] text-muted" style={TNUM}>
          行き先 {totals.entryCount}件{totals.totalCost > 0 ? ` · 予算 ${formatYen(totals.totalCost)}` : ""}
        </Text>
      </View>
      <View className="h-px w-full bg-black/[.08]" />

      <ScrollView className="flex-1 px-[26px]" contentContainerStyle={{ paddingTop: 12, paddingBottom: 90 }}>
        {!readOnly && (
          <View className="mb-4 gap-3 rounded-[12px] border border-ink/10 bg-white/40 px-4 py-3">
            <View className="flex-row flex-wrap items-end justify-between gap-3">
              <DateOnlyField label="開始日" value={tripDate} onChange={onSetTripDate} />
              <View className="gap-1">
                <Text className="font-gothic-400 text-[10px] text-muted">日数</Text>
                <View className="flex-row gap-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = tripDayCount === n;
                    return (
                      <Pressable
                        key={n}
                        onPress={() => onSetTripDayCount(n)}
                        className={`rounded-full border px-3 py-1.5 ${active ? "border-ink bg-ink" : "border-black/[.12] bg-white/50"}`}
                      >
                        <Text className={`font-gothic-400 text-[11px] ${active ? "text-kinari" : "text-ink"}`}>{n}日</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
            <View className="gap-1">
              <Text className="font-gothic-400 text-[10px] text-muted">基本の移動手段</Text>
              <View className="flex-row gap-2">
                {(["car", "walk"] as BaseMode[]).map((m) => {
                  const active = baseMode === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => onSetBaseMode(m)}
                      className={`rounded-full border px-3 py-1.5 ${active ? "border-ink bg-ink" : "border-black/[.12] bg-white/50"}`}
                    >
                      <Text className={`font-gothic-400 text-[11px] ${active ? "text-kinari" : "text-ink"}`}>{m === "car" ? "車" : "徒歩・電車"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}
        {readOnly && (
          <View className="mb-4 rounded-[12px] border border-ink/15 bg-white/50 px-4 py-3">
            <Text className="font-gothic-500 text-[11px] text-ink">共有された旅程（閲覧のみ）</Text>
            <Text className="mt-1 font-gothic-400 text-[10px] leading-[16px] text-muted">
              旅程・当日ビュー（残り時間・近くのスポット）を見られます。編集はできません。
            </Text>
            <Pressable onPress={onImportShared} className="mt-2 self-start rounded-full bg-ink px-3 py-1.5">
              <Text className="font-gothic-500 text-[11px] text-kinari">自分のプランに保存して編集</Text>
            </Pressable>
          </View>
        )}
        {totals.totalCost > 0 && (
          <View className="mb-4 rounded-[12px] border border-ink/10 bg-white/40 px-4 py-3">
            <View className="flex-row items-baseline justify-between">
              <Text className="font-gothic-500 text-[10px] tracking-[.1em] text-muted">予算のめやす</Text>
              <Text className="font-mincho-600 text-[16px] text-ink" style={TNUM}>
                {formatYen(totals.totalCost)}
              </Text>
            </View>
            <View className="mt-2 gap-1">
              {COST_CATEGORY_ORDER.filter((c) => totals.byCategory[c] > 0).map((c) => {
                const amount = totals.byCategory[c];
                const pct = Math.round((amount / totals.totalCost) * 100);
                return (
                  <View key={c} className="flex-row items-center gap-2">
                    <Text className="w-8 font-gothic-400 text-[11px] text-muted">{COST_CATEGORY_LABEL[c]}</Text>
                    <View className="h-[6px] flex-1 overflow-hidden rounded-full bg-black/[.06]">
                      <View className="h-full rounded-full bg-ink/60" style={{ width: `${Math.max(4, pct)}%` }} />
                    </View>
                    <Text className="w-16 text-right font-gothic-400 text-[11px] text-muted" style={TNUM}>
                      {formatYen(amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        {/* 宿泊先（固定・並び替え対象外） */}
        {!readOnly && (
          <View className="mb-4 rounded-[12px] border border-ink/10 bg-white/40 px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-gothic-500 text-[11px] text-ink">宿泊先（固定）</Text>
              <Pressable onPress={onOpenAddLodging} className="rounded-full border border-ink/25 px-3 py-1">
                <Text className="font-gothic-500 text-[10px] text-ink">＋ 宿泊先</Text>
              </Pressable>
            </View>
            {lodging.length === 0 ? (
              <Text className="mt-1 font-gothic-400 text-[10px] leading-[15px] text-muted-light">
                ホテル等はここで固定登録します。旅程の並び替え対象にはなりません。
              </Text>
            ) : (
              <View className="mt-2 gap-2">
                {lodging.map((e) => (
                  <View key={e.id} className="flex-row items-center gap-2">
                    <Pressable onPress={() => onEditEntry(e.id)} className="flex-1">
                      <Text className="font-mincho-600 text-[13px] text-ink">{e.title}</Text>
                      <Text className="mt-0.5 font-gothic-400 text-[10px] text-muted" style={TNUM}>
                        {tripDayCount > 1 ? `${e.day ?? 1}日目 · ` : ""}
                        {e.arriveBy ? `IN ${formatJstTime(new Date(e.arriveBy))}` : ""}
                        {e.checkOut ? ` → OUT ${formatJstTime(new Date(e.checkOut))}` : ""}
                      </Text>
                      {e.place && (
                        <Text numberOfLines={1} className="font-gothic-400 text-[10px] text-muted-light">
                          {e.place}
                        </Text>
                      )}
                    </Pressable>
                    <Pressable onPress={() => onRemoveEntry(e.id)} hitSlop={8}>
                      <Text className="font-gothic-400 text-[15px] text-muted-light">×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Day タブ（複数日程のとき）。並び替えは各日の中で行う。 */}
        {tripDayCount > 1 && entries.length > 0 && (
          <View className="mb-3 flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => setSelectedDay("all")}
              className={`rounded-[10px] border px-3 py-1.5 ${activeDay === "all" ? "border-ink bg-ink" : "border-black/[.15] bg-white/50"}`}
            >
              <Text className={`font-gothic-500 text-[11px] ${activeDay === "all" ? "text-kinari" : "text-ink"}`}>全日</Text>
            </Pressable>
            {Array.from({ length: tripDayCount }, (_, i) => i + 1).map((d) => {
              const active = activeDay === d;
              const dateStr = formatJstMonthDayJa(new Date(`${dateForDay(tripDate, d)}T00:00`));
              return (
                <Pressable
                  key={d}
                  onPress={() => setSelectedDay(d)}
                  className={`rounded-[10px] border px-3 py-1.5 ${active ? "border-ink bg-ink" : "border-black/[.15] bg-white/50"}`}
                >
                  <Text className={`font-gothic-500 text-[11px] ${active ? "text-kinari" : "text-ink"}`}>Day{d}</Text>
                  <Text className={`font-gothic-400 text-[9px] ${active ? "text-kinari/80" : "text-muted"}`}>{dateStr}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {entries.length === 0 && (
          <Text className="mt-10 text-center font-gothic-400 text-[12px] leading-[19px] text-muted">
            右上の＋から行きたい場所をどんどん追加してください。{"\n"}時間は入れなくてOK。予約など決まっている時刻だけ入力すれば、{"\n"}AIが効率のよい順路と時間を自動で組みます。
          </Text>
        )}

        {visible.map((e) => {
          const ps = PRIORITY_STYLE[e.priority];
          const num = numberOf.get(e.id);
          const range = timeRange(e);
          const day = e.day ?? 1;
          const showHeader = activeDay === "all" && tripDayCount > 1 && num === 1;
          return (
            <View key={e.id}>
              {showHeader && (
                <View className="mb-1 mt-3 flex-row items-center gap-2">
                  <View className="h-[18px] w-[18px] items-center justify-center rounded-full bg-ink">
                    <Text className="font-gothic-500 text-[9px] text-kinari" style={TNUM}>{day}</Text>
                  </View>
                  <Text className="font-gothic-500 text-[12px] text-ink">
                    {day}日目 · {formatJstMonthDayJa(new Date(`${dateForDay(tripDate, day)}T00:00`))}
                  </Text>
                  <View className="h-px flex-1 bg-black/[.1]" />
                </View>
              )}
              <View className={`border-b border-black/[.06] px-2 py-3.5 ${dayTint(day)}`}>
              <View className="flex-row gap-2">
                {/* 番号 */}
                <View className="w-[22px] items-center pt-0.5">
                  <View className="h-[20px] w-[20px] items-center justify-center rounded-full bg-ink">
                    <Text className="font-gothic-500 text-[10px] text-kinari" style={TNUM}>{num}</Text>
                  </View>
                </View>
                <Pressable disabled={readOnly} onPress={() => onEditEntry(e.id)} className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    {range ? (
                      <Text className="font-mincho-600 text-[13px] text-ink" style={TNUM}>{range}</Text>
                    ) : (
                      <Text className="font-gothic-400 text-[10px] text-muted-light">時刻未定</Text>
                    )}
                    {e.fixedTime && <Text className="font-gothic-400 text-[9px] text-accent">固定</Text>}
                  </View>
                  <View className="mt-0.5 flex-row items-center gap-1.5">
                    <Text className="font-mincho-600 text-[15px] text-ink">{e.title}</Text>
                    {!readOnly && <Text className="font-gothic-400 text-[10px] text-muted-light">編集 ›</Text>}
                  </View>
                  {e.place && (
                    <Text numberOfLines={1} className="mt-0.5 font-gothic-400 text-[10px] text-muted-light">
                      {e.place}
                    </Text>
                  )}
                  <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5">
                    <View className={`rounded-full border px-2 py-[1px] ${ps.border}`}>
                      <Text className={`font-gothic-400 text-[9px] ${ps.text}`}>{PRIORITY_META[e.priority].label}</Text>
                    </View>
                    <Text className="font-gothic-400 text-[10px] text-muted">{MODE_LABEL[e.mode]}</Text>
                    <Text className="font-gothic-400 text-[10px] text-muted" style={TNUM}>
                      · 滞在{formatDurationMin(effectiveStayMin(e))}
                    </Text>
                    {typeof e.cost === "number" && e.cost > 0 && (
                      <Text className="font-gothic-400 text-[10px] text-muted" style={TNUM}>
                        · {formatYen(e.cost)}
                      </Text>
                    )}
                    {(e.openFrom || e.openTo) && (
                      <Text className="font-gothic-400 text-[10px] text-mode-rail" style={TNUM}>
                        · 営業{e.openFrom ?? "?"}〜{e.openTo ?? "?"}
                      </Text>
                    )}
                  </View>
                </Pressable>
                {/* 並び替え（上下タップ／長押しで先頭・末尾へ）＋削除 */}
                {!readOnly && (
                  <View className="items-center justify-center gap-1.5">
                    <Pressable
                      disabled={isFirstInDay(e)}
                      onPress={() => onMoveEntry(e.id, -1)}
                      onLongPress={() => onMoveEntryToEdge(e.id, -1)}
                      hitSlop={8}
                      className={`h-9 w-9 items-center justify-center rounded-[8px] border ${isFirstInDay(e) ? "border-black/[.08]" : "border-ink/30"}`}
                    >
                      <Text className={`text-[15px] ${isFirstInDay(e) ? "text-muted-light" : "text-ink"}`}>▲</Text>
                    </Pressable>
                    <Pressable
                      disabled={isLastInDay(e)}
                      onPress={() => onMoveEntry(e.id, 1)}
                      onLongPress={() => onMoveEntryToEdge(e.id, 1)}
                      hitSlop={8}
                      className={`h-9 w-9 items-center justify-center rounded-[8px] border ${isLastInDay(e) ? "border-black/[.08]" : "border-ink/30"}`}
                    >
                      <Text className={`text-[15px] ${isLastInDay(e) ? "text-muted-light" : "text-ink"}`}>▼</Text>
                    </Pressable>
                  </View>
                )}
                {!readOnly && (
                  <Pressable onPress={() => onRemoveEntry(e.id)} hitSlop={8} className="pt-0.5">
                    <Text className="font-gothic-400 text-[16px] text-muted-light">×</Text>
                  </Pressable>
                )}
              </View>
              {/* 複数日程では、行き先を何日目に置くか切り替えられる */}
              {!readOnly && tripDayCount > 1 && (
                <View className="mt-2 flex-row flex-wrap items-center gap-1.5 pl-[30px]">
                  <Text className="font-gothic-400 text-[9px] text-muted-light">日:</Text>
                  {Array.from({ length: tripDayCount }, (_, i) => i + 1).map((d) => {
                    const active = (e.day ?? 1) === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => onSetEntryDay(e.id, d)}
                        className={`rounded-full border px-2.5 py-[3px] ${active ? "border-ink bg-ink" : "border-black/[.15] bg-white/50"}`}
                      >
                        <Text className={`font-gothic-400 text-[10px] ${active ? "text-kinari" : "text-muted"}`}>{d}日目</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              </View>
            </View>
          );
        })}

        {!readOnly && ordered.length > 1 && (
          <Text className="mt-2 font-gothic-400 text-[10px] text-muted-light">▲▼で並び替え（長押しで先頭・末尾へ）。順番から時刻を自動計算します。</Text>
        )}

        {!readOnly && entries.length > 0 && (
          <View className="mt-5">
            <Pressable
              disabled={composing}
              onPress={onCompose}
              className={`flex-row items-center justify-center gap-2 rounded-[12px] py-3.5 ${composing ? "bg-ink/40" : "bg-ink"}`}
            >
              {composing && <ActivityIndicator size="small" color="#f3efe6" />}
              <Text className="font-gothic-500 text-[12px] text-kinari">{composing ? "AIが旅程を組んでいます…" : "AIで旅程を組む"}</Text>
            </Pressable>
            <Text className="mt-2 text-center font-gothic-400 text-[10px] text-muted-light">
              時間未定のままでOK。重要度と移動効率をもとに複数日へ自動配置します。入りきらない予定は旅程の下部へ。
            </Text>
            {composeError && <Text className="mt-2 text-center font-gothic-400 text-[11px] text-accent">{composeError}</Text>}
            {planNotes && (
              <View className="mt-3 rounded-[12px] border border-ink/10 bg-white/40 px-4 py-3">
                <Text className="font-gothic-500 text-[10px] tracking-[.1em] text-muted">AIのメモ</Text>
                <Text className="mt-1 font-mincho-400 text-[13px] leading-[20px] text-ink">{planNotes}</Text>
              </View>
            )}
          </View>
        )}

        {/* 周辺おすすめの状態表示（取得中／候補未選択） */}
        {!readOnly && entries.length > 0 && areaSuggestions.length === 0 && (
          <View className="mt-6">
            <Text className="mb-1 font-gothic-500 text-[10px] tracking-[.15em] text-muted">この辺のおすすめ</Text>
            {areaSuggestionsLoading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#8a8378" />
                <Text className="font-gothic-400 text-[11px] text-muted-light">周辺のおすすめを探しています…</Text>
              </View>
            ) : (
              <Text className="font-gothic-400 text-[11px] leading-[17px] text-muted-light">
                {hasGeoReference
                  ? "近くのおすすめが見つかりませんでした。"
                  : "行き先や宿泊先を住所候補から選ぶと、その周辺のおすすめが出ます。"}
              </Text>
            )}
          </View>
        )}

        {/* この辺のおすすめ（宿泊先などの周辺スポット・最初から表示） */}
        {!readOnly && areaSuggestions.length > 0 && (
          <View className="mt-7">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-gothic-500 text-[10px] tracking-[.15em] text-muted">この辺のおすすめ · 選んで追加</Text>
              <Pressable
                onPress={() =>
                  setPickedArea((prev) =>
                    prev.size === areaSuggestions.length ? new Set() : new Set(areaSuggestions.map((s) => s.title))
                  )
                }
                hitSlop={6}
                className="rounded-full border border-ink/25 px-2.5 py-1"
              >
                <Text className="font-gothic-400 text-[10px] text-ink">
                  {pickedArea.size === areaSuggestions.length ? "選択を解除" : "すべて選択"}
                </Text>
              </Pressable>
            </View>
            <Text className="mb-2 font-gothic-400 text-[10px] text-muted-light">登録した宿泊先・行き先の周辺から提案しています。</Text>
            <View className="rounded-[16px] border border-ink/10">
              {areaSuggestions.map((s, i) => {
                const on = pickedArea.has(s.title);
                return (
                  <Pressable
                    key={s.title}
                    onPress={() => togglePickArea(s.title)}
                    className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-ink/10" : ""}`}
                  >
                    <View className={`h-[20px] w-[20px] items-center justify-center rounded-[6px] border ${on ? "border-ink bg-ink" : "border-black/[.25]"}`}>
                      {on && <View className="h-[8px] w-[8px] rounded-[2px] bg-kinari" />}
                    </View>
                    <View className="flex-1">
                      <Text className="font-mincho-400 text-[14px] text-ink">{s.title}</Text>
                      {(s.area || s.note) && (
                        <Text className="mt-0.5 font-gothic-400 text-[10px] text-muted">{[s.area, s.note].filter(Boolean).join(" · ")}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              disabled={pickedArea.size === 0}
              onPress={() => {
                onAddSuggestions(areaSuggestions.filter((s) => pickedArea.has(s.title)));
                setPickedArea(new Set());
              }}
              className={`mt-2 rounded-[12px] py-3 ${pickedArea.size > 0 ? "bg-ink" : "bg-ink/30"}`}
            >
              <Text className="text-center font-gothic-500 text-[12px] text-kinari">
                {pickedArea.size > 0 ? `選択した${pickedArea.size}件を追加` : "追加したいものを選択"}
              </Text>
            </Pressable>
          </View>
        )}

        {suggestions.length > 0 && (
          <View className="mt-7">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-gothic-500 text-[10px] tracking-[.15em] text-muted">AIのおすすめ · 選んでまとめて追加</Text>
              <Pressable
                onPress={() =>
                  setPicked((prev) => (prev.size === suggestions.length ? new Set() : new Set(suggestions.map((s) => s.title))))
                }
                hitSlop={6}
                className="rounded-full border border-ink/25 px-2.5 py-1"
              >
                <Text className="font-gothic-400 text-[10px] text-ink">{picked.size === suggestions.length ? "選択を解除" : "すべて選択"}</Text>
              </Pressable>
            </View>
            <View className="rounded-[16px] border border-ink/10">
              {suggestions.map((s, i) => {
                const on = picked.has(s.title);
                return (
                  <Pressable
                    key={s.title}
                    onPress={() => togglePick(s.title)}
                    className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-ink/10" : ""}`}
                  >
                    <View className={`h-[20px] w-[20px] items-center justify-center rounded-[6px] border ${on ? "border-ink bg-ink" : "border-black/[.25]"}`}>
                      {on && <View className="h-[8px] w-[8px] rounded-[2px] bg-kinari" />}
                    </View>
                    <View className="flex-1">
                      <Text className="font-mincho-400 text-[14px] text-ink">{s.title}</Text>
                      {(s.area || s.note) && (
                        <Text className="mt-0.5 font-gothic-400 text-[10px] text-muted">{[s.area, s.note].filter(Boolean).join(" · ")}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              disabled={picked.size === 0}
              onPress={() => {
                onAddSuggestions(suggestions.filter((s) => picked.has(s.title)));
                setPicked(new Set());
              }}
              className={`mt-2 rounded-[12px] py-3 ${picked.size > 0 ? "bg-ink" : "bg-ink/30"}`}
            >
              <Text className="text-center font-gothic-500 text-[12px] text-kinari">
                {picked.size > 0 ? `選択した${picked.size}件を追加` : "追加したいものを選択"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
