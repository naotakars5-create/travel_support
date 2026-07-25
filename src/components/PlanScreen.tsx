import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlanEntry, Priority, SpotSuggestion } from "@/lib/types";
import { PlanTotals, PRIORITY_META, effectiveStayMin, COST_CATEGORY_LABEL, COST_CATEGORY_ORDER } from "@/lib/plan";
import { Profile } from "@/lib/profile";
import { BaseMode } from "@/lib/transit";
import { MODE_LABEL } from "@/lib/modeMeta";
import { formatDurationMin } from "@/lib/itinerary";
import { formatJstTime } from "@/lib/date";
import { formatYen } from "@/lib/format";
import { DateOnlyField } from "./PlainFields";

const TNUM: TextStyle = { fontVariant: ["tabular-nums"] };

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
  onOpenProfile,
  onOpenTrips,
  onOpenAdd,
  onCompose,
  onRemoveEntry,
  onEditEntry,
  onBumpPriority,
  onSetEntryDay,
  onAddSuggestions,
  onShare,
  onImportShared,
}: {
  entries: PlanEntry[];
  totals: PlanTotals;
  scheduleByEntry: Map<string, string>;
  suggestions: SpotSuggestion[];
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
  onOpenProfile: () => void;
  onOpenTrips: () => void;
  onOpenAdd: () => void;
  onCompose: () => void;
  onRemoveEntry: (id: string) => void;
  onEditEntry: (id: string) => void;
  onBumpPriority: (id: string) => void;
  onSetEntryDay: (id: string, day: number) => void;
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
  // 表示時刻：固定予定は目安到着を厳守、それ以外は組み上げ結果（AI/自動）の時刻を優先
  const timeOf = (e: PlanEntry): string | null =>
    (e.fixedTime && e.arriveBy ? e.arriveBy : scheduleByEntry.get(e.id) ?? e.arriveBy) ?? null;
  const sorted = [...entries].sort((a, b) => {
    const ta = timeOf(a) ? new Date(timeOf(a)!).getTime() : Infinity;
    const tb = timeOf(b) ? new Date(timeOf(b)!).getTime() : Infinity;
    return ta - tb;
  });
  // AIが組んだ結果、今の旅程に入りきらなかった予定（スケジュールに含まれていないもの）
  const dropped = scheduleByEntry.size > 0 ? entries.filter((e) => !scheduleByEntry.has(e.id)) : [];

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      <View className="px-[26px] pb-3 pt-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            {!readOnly && (
              <Pressable onPress={onOpenProfile} className="h-10 w-10 items-center justify-center rounded-full bg-white/70 border border-black/[.08]">
                <Text className="text-[22px]">{profile.avatar}</Text>
              </Pressable>
            )}
            <View>
              <Text className="font-gothic-400 text-[10px] tracking-[.2em] text-muted">
                {profile.name ? profile.name : "TABI-NAVI"}
              </Text>
              <Text className="mt-1 font-mincho-600 text-[26px] text-ink">{readOnly ? "共有された旅程" : "行き先リスト"}</Text>
            </View>
          </View>
          {!readOnly && (
            <View className="mt-1 flex-row items-center gap-2">
              <Pressable onPress={onOpenTrips} className="h-7 items-center justify-center rounded-[8px] border border-ink/25 px-3">
                <Text className="font-gothic-500 text-[11px] text-ink">履歴</Text>
              </Pressable>
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
        {sorted.length === 0 && (
          <Text className="mt-10 text-center font-gothic-400 text-[12px] leading-[19px] text-muted">
            右上の＋から行きたい場所を追加してください。{"\n"}追加していくと、AIが一日の順路に組み上げます。
          </Text>
        )}

        {sorted.map((e) => {
          const ps = PRIORITY_STYLE[e.priority];
          return (
            <View key={e.id} className="border-b border-black/[.06] py-3.5">
              <View className="flex-row gap-3">
              <Pressable disabled={readOnly} onPress={() => onEditEntry(e.id)} className="flex-1 flex-row gap-3">
                <View className="w-[46px] pt-0.5">
                  {timeOf(e) ? (
                    <Text className="font-mincho-600 text-[14px] text-ink" style={TNUM}>
                      {formatJstTime(new Date(timeOf(e)!))}
                    </Text>
                  ) : (
                    <Text className="font-gothic-400 text-[10px] text-muted-light">—</Text>
                  )}
                  {e.fixedTime ? (
                    <Text className="mt-0.5 font-gothic-400 text-[9px] text-accent">固定</Text>
                  ) : (
                    !e.arriveBy && timeOf(e) && <Text className="mt-0.5 font-gothic-400 text-[9px] text-muted-light">予定</Text>
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
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
                </View>
              </Pressable>
              {!readOnly && (
                <Pressable onPress={() => onRemoveEntry(e.id)} hitSlop={8} className="pt-0.5">
                  <Text className="font-gothic-400 text-[16px] text-muted-light">×</Text>
                </Pressable>
              )}
              </View>
              {/* 複数日程では、行き先を何日目に置くか切り替えられる */}
              {!readOnly && tripDayCount > 1 && (
                <View className="mt-2 flex-row flex-wrap items-center gap-1.5 pl-[58px]">
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
          );
        })}

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
              到着時刻・重要度・移動時間をもとに最適な順路に並べ替えます
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

        {!readOnly && dropped.length > 0 && (
          <View className="mt-6">
            <Text className="mb-2 font-gothic-500 text-[10px] tracking-[.15em] text-accent">今の旅程に入りきらなかった予定</Text>
            <View className="rounded-[16px] border border-accent/40">
              {dropped.map((e, i) => (
                <View key={e.id} className={`flex-row items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-black/[.06]" : ""}`}>
                  <View className="flex-1 pr-2">
                    <Text className="font-mincho-400 text-[14px] text-ink">{e.title}</Text>
                    <Text className="mt-0.5 font-gothic-400 text-[10px] text-muted">{PRIORITY_META[e.priority].label}</Text>
                  </View>
                  {e.priority !== "must" ? (
                    <Pressable onPress={() => onBumpPriority(e.id)} className="rounded-full border border-accent px-3 py-1">
                      <Text className="font-gothic-500 text-[11px] text-accent">必ず行く</Text>
                    </Pressable>
                  ) : (
                    <Text className="font-gothic-400 text-[10px] text-muted-light">時間が不足</Text>
                  )}
                </View>
              ))}
            </View>
            <Text className="mt-1.5 font-gothic-400 text-[10px] leading-[15px] text-muted-light">
              「必ず行く」にすると優先して旅程へ組み込みます（時間が厳しい場合は他の任意予定が後回しになります）。
            </Text>
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
