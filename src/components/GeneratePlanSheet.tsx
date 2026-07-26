import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Companion, COMPANION_OPTIONS, Purpose, PURPOSE_OPTIONS, TripBrief } from "@/lib/tripBrief";
import { SlideUp } from "./animations";

const MUTED = "#6E675C";

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`rounded-full border px-3 py-1.5 ${active ? "border-ink bg-ink" : "border-black/[.12] bg-white/50"}`}
    >
      <Text className={`font-gothic-400 text-[11px] ${active ? "text-kinari" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}

/**
 * 行き先が何も決まっていない状態から、AIに旅程をまるごと作ってもらう入力。
 * 「どこへ・何日・誰と・何人・何をしたいか」だけ選べば動く。
 */
export function GeneratePlanSheet({
  onClose,
  onGenerate,
  initialDayCount,
}: {
  onClose: () => void;
  onGenerate: (brief: TripBrief) => Promise<{ ok: boolean; message?: string }>;
  initialDayCount: number;
}) {
  const insets = useSafeAreaInsets();
  const [destination, setDestination] = useState("");
  const [dayCount, setDayCount] = useState(Math.max(1, Math.min(7, initialDayCount)));
  const [companion, setCompanion] = useState<Companion>("solo");
  const [headcount, setHeadcount] = useState(1);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [freeText, setFreeText] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePurpose = (p: Purpose) =>
    setPurposes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const canSubmit = destination.trim().length > 0 && !running;

  const run = async () => {
    if (!canSubmit) return;
    setRunning(true);
    setError(null);
    const res = await onGenerate({
      destination: destination.trim(),
      dayCount,
      companion,
      headcount,
      purposes,
      freeText: freeText.trim() || undefined,
    });
    setRunning(false);
    if (res.ok) onClose();
    else setError(res.message ?? "旅程を作成できませんでした");
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* 背景は絶対配置にして、シート側だけが高さを持つようにする
          （シートの maxHeight が画面高に対して効き、ScrollView が正しく縮む） */}
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-[rgba(28,25,21,.28)]" onPress={onClose} />
        <SlideUp trigger="generate-plan" style={{ maxHeight: "92%" }}>
          <View className="rounded-t-sheet bg-sheet px-6 pt-3" style={{ maxHeight: "100%", paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/[.14]" />
            <View className="mb-3 flex-row items-center justify-between">
              <Pressable onPress={onClose} hitSlop={8} className="rounded-full border border-black/[.15] px-3 py-1">
                <Text className="font-gothic-400 text-[12px] text-muted">‹ 戻る</Text>
              </Pressable>
              <Text className="font-mincho-600 text-[16px] text-ink">AIに旅程を作ってもらう</Text>
              <View className="w-[52px]" />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
              <View className="gap-4">
                <Text className="-mt-1 font-gothic-400 text-[11px] leading-[18px] text-muted">
                  行き先だけ決まっていれば大丈夫。条件を選ぶと、AIが行き先を選んで日ごとに割り振ります。
                </Text>

                <View className="gap-1">
                  <Text className="font-gothic-400 text-[10px] text-muted">どこへ行く？ *</Text>
                  <TextInput
                    value={destination}
                    onChangeText={setDestination}
                    placeholder="例: 香川県 / 高松・小豆島 / 京都の東山あたり"
                    placeholderTextColor={MUTED}
                    className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
                  />
                </View>

                <View className="gap-1.5">
                  <Text className="font-gothic-400 text-[10px] text-muted">何日間</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <Chip key={n} active={dayCount === n} label={`${n}日`} onPress={() => setDayCount(n)} />
                    ))}
                  </View>
                </View>

                <View className="gap-1.5">
                  <Text className="font-gothic-400 text-[10px] text-muted">誰と行く</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {COMPANION_OPTIONS.map((o) => (
                      <Chip
                        key={o.value}
                        active={companion === o.value}
                        label={o.label}
                        onPress={() => {
                          setCompanion(o.value);
                          // ひとり旅を選んだら人数も1に合わせる（食い違いを防ぐ）
                          if (o.value === "solo") setHeadcount(1);
                          else if (headcount === 1) setHeadcount(2);
                        }}
                      />
                    ))}
                  </View>
                </View>

                <View className="gap-1.5">
                  <Text className="font-gothic-400 text-[10px] text-muted">何人</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <Chip key={n} active={headcount === n} label={`${n}人`} onPress={() => setHeadcount(n)} />
                    ))}
                  </View>
                </View>

                <View className="gap-1.5">
                  <Text className="font-gothic-400 text-[10px] text-muted">旅の目的（いくつでも）</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {PURPOSE_OPTIONS.map((o) => (
                      <Chip
                        key={o.value}
                        active={purposes.includes(o.value)}
                        label={o.label}
                        onPress={() => togglePurpose(o.value)}
                      />
                    ))}
                  </View>
                </View>

                <View className="gap-1">
                  <Text className="font-gothic-400 text-[10px] text-muted">そのほかの希望（任意）</Text>
                  <TextInput
                    value={freeText}
                    onChangeText={setFreeText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    placeholder={"例: 予算は控えめに。歩きすぎない範囲で。\nうどんは絶対に食べたい"}
                    placeholderTextColor={MUTED}
                    className="min-h-[76px] rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-gothic-400 text-[12px] leading-[19px] text-ink"
                  />
                </View>

                {error && <Text className="font-gothic-400 text-[11px] text-ink">{error}</Text>}

                <Pressable
                  disabled={!canSubmit}
                  onPress={run}
                  accessibilityRole="button"
                  className={`mt-1 flex-row items-center justify-center gap-2 rounded-[12px] px-4 py-3.5 ${canSubmit ? "bg-ink" : "bg-ink/30"}`}
                >
                  {running && <ActivityIndicator size="small" color="#F4EFE5" />}
                  <Text className="text-center font-gothic-500 text-[13px] text-kinari">
                    {running ? "旅程を考えています…" : "この条件で旅程を作る"}
                  </Text>
                </Pressable>
                <Text className="text-center font-gothic-400 text-[10px] leading-[15px] text-muted-light">
                  作られた旅程は、あとから自由に足したり並び替えたりできます。
                </Text>
              </View>
            </ScrollView>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}
