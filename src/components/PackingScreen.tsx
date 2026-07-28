import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PackingItem } from "@/lib/types";
import { packingProgress } from "@/lib/packing";
import { Illustration } from "./Illustration";

const PLACEHOLDER = "rgba(111, 98, 90, 0.5)"; // muted の薄い版（入力済みと見間違えない濃さ）

export function PackingScreen({
  items,
  onToggle,
  onAdd,
  onRemove,
  onBack,
}: {
  items: PackingItem[];
  onToggle: (id: string) => void;
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
  /** 下タブから外したので、マイページへ戻る導線を置く */
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const { done, total } = packingProgress(items);

  const submit = () => {
    if (!input.trim()) return;
    onAdd(input);
    setInput("");
  };

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      <View className="px-[26px] pb-3 pt-4">
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="マイページへ戻る" className="self-start">
          <Text className="font-gothic-400 text-[12px] text-muted">‹ マイページ</Text>
        </Pressable>
        <Text className="mt-1 font-mincho-600 text-[26px] text-ink">持ち物</Text>
        <Text className="mt-1 font-gothic-400 text-[12px] text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {done} / {total} 準備済み
        </Text>
        {/* 進捗バー：準備完了（全チェック）でマスタード、それまでは墨 */}
        {total > 0 && (
          <View className="mt-2 h-[5px] w-full overflow-hidden rounded-full bg-surface">
            <View
              className={`h-full rounded-full ${done === total ? "bg-highlight" : "bg-ink"}`}
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </View>
        )}
      </View>
      <View className="h-px w-full bg-highlight/60" />

      <ScrollView className="flex-1 px-[26px]" contentContainerStyle={{ paddingTop: 8, paddingBottom: 90 }} keyboardShouldPersistTaps="handled">
        {items.map((item) => (
          <View key={item.id} className="flex-row items-center gap-3 border-b border-black/[.06] py-3">
            <Pressable onPress={() => onToggle(item.id)} hitSlop={8}>
              {/* チェック済みはマスタード塗り（完了＝highlight） */}
              <View className={`h-[22px] w-[22px] items-center justify-center rounded-[6px] border ${item.checked ? "border-highlight bg-highlight" : "border-black/[.25]"}`}>
                {item.checked && <View className="h-[9px] w-[9px] rounded-[2px] bg-ink" />}
              </View>
            </Pressable>
            <Pressable className="flex-1" onPress={() => onToggle(item.id)}>
              <Text className={`font-mincho-400 text-[15px] ${item.checked ? "text-muted-light line-through" : "text-ink"}`}>{item.label}</Text>
            </Pressable>
            <Pressable onPress={() => onRemove(item.id)} hitSlop={8}>
              <Text className="font-gothic-400 text-[16px] text-muted-light">×</Text>
            </Pressable>
          </View>
        ))}

        {/* 全部チェックできたときだけ「準備完了」を出す（1つでも外れたら消える） */}
        {total > 0 && done === total && (
          <View className="mt-5 items-center">
            <Illustration name="packed-done" size="md" alt="" />
            <Text className="mt-2 font-mincho-600 text-[15px] text-ink">準備完了です</Text>
          </View>
        )}

        <View className="mt-4 flex-row items-stretch gap-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={submit}
            returnKeyType="done"
            placeholder="持ち物を追加"
            placeholderTextColor={PLACEHOLDER}
            className="min-w-0 flex-1 rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
          />
          <Pressable
            onPress={submit}
            className={`shrink-0 items-center justify-center rounded-[10px] px-5 py-2.5 ${input.trim() ? "bg-ink" : "bg-ink/30"}`}
          >
            <Text className="font-gothic-500 text-[12px] text-kinari">追加</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
