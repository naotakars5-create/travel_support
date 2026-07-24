import { ActivityIndicator, Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlanEntry, Priority, SpotSuggestion } from "@/lib/types";
import { PlanTotals, PRIORITY_META, effectiveStayMin } from "@/lib/plan";
import { MODE_LABEL } from "@/lib/modeMeta";
import { formatDurationMin } from "@/lib/itinerary";
import { formatJstTime } from "@/lib/date";
import { formatYen } from "@/lib/format";

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
  onOpenAdd,
  onCompose,
  onRemoveEntry,
  onAddSuggestion,
}: {
  entries: PlanEntry[];
  totals: PlanTotals;
  scheduleByEntry: Map<string, string>;
  suggestions: SpotSuggestion[];
  planNotes: string | null;
  composing: boolean;
  composeError: string | null;
  onOpenAdd: () => void;
  onCompose: () => void;
  onRemoveEntry: (id: string) => void;
  onAddSuggestion: (s: SpotSuggestion) => void;
}) {
  const insets = useSafeAreaInsets();
  // 表示時刻＝目安到着（指定があれば）または組み上げ済みの到着予定
  const timeOf = (e: PlanEntry): string | null => e.arriveBy ?? scheduleByEntry.get(e.id) ?? null;
  const sorted = [...entries].sort((a, b) => {
    const ta = timeOf(a) ? new Date(timeOf(a)!).getTime() : Infinity;
    const tb = timeOf(b) ? new Date(timeOf(b)!).getTime() : Infinity;
    return ta - tb;
  });

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      <View className="px-[26px] pb-3 pt-4">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="font-gothic-400 text-[10px] tracking-[.2em] text-muted">TABI-NAVI</Text>
            <Text className="mt-1 font-mincho-600 text-[26px] text-ink">行き先リスト</Text>
          </View>
          <Pressable onPress={onOpenAdd} className="mt-1 h-7 w-7 items-center justify-center rounded-[8px] border border-ink/25">
            <View className="relative h-[10px] w-[10px]">
              <View className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 bg-ink" />
              <View className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-ink" />
            </View>
          </Pressable>
        </View>
        <Text className="mt-1 font-gothic-400 text-[11px] text-muted" style={TNUM}>
          行き先 {totals.entryCount}件{totals.totalCost > 0 ? ` · 予算 ${formatYen(totals.totalCost)}` : ""}
        </Text>
      </View>
      <View className="h-px w-full bg-black/[.08]" />

      <ScrollView className="flex-1 px-[26px]" contentContainerStyle={{ paddingTop: 12, paddingBottom: 90 }}>
        {sorted.length === 0 && (
          <Text className="mt-10 text-center font-gothic-400 text-[12px] leading-[19px] text-muted">
            右上の＋から行きたい場所を追加してください。{"\n"}追加していくと、AIが一日の順路に組み上げます。
          </Text>
        )}

        {sorted.map((e) => {
          const ps = PRIORITY_STYLE[e.priority];
          return (
            <View key={e.id} className="flex-row gap-3 border-b border-black/[.06] py-3.5">
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
                <Text className="font-mincho-600 text-[15px] text-ink">{e.title}</Text>
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
                </View>
              </View>
              <Pressable onPress={() => onRemoveEntry(e.id)} hitSlop={8} className="pt-0.5">
                <Text className="font-gothic-400 text-[16px] text-muted-light">×</Text>
              </Pressable>
            </View>
          );
        })}

        {entries.length > 0 && (
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

        {suggestions.length > 0 && (
          <View className="mt-7">
            <Text className="mb-2 font-gothic-500 text-[10px] tracking-[.15em] text-muted">AIのおすすめ · 近くで寄れる場所</Text>
            <View className="rounded-[16px] border border-ink/10">
              {suggestions.map((s, i) => (
                <View key={s.title} className={`flex-row items-center justify-between gap-2 px-4 py-3 ${i > 0 ? "border-t border-ink/10" : ""}`}>
                  <View className="flex-1">
                    <Text className="font-mincho-400 text-[14px] text-ink">{s.title}</Text>
                    {(s.area || s.note) && (
                      <Text className="mt-0.5 font-gothic-400 text-[10px] text-muted">{[s.area, s.note].filter(Boolean).join(" · ")}</Text>
                    )}
                  </View>
                  <Pressable onPress={() => onAddSuggestion(s)} className="rounded-full border border-ink px-3 py-1">
                    <Text className="font-gothic-500 text-[11px] text-ink">追加</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
