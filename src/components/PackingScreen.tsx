import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PackingItem } from "@/lib/types";
import { packingProgress } from "@/lib/packing";

const MUTED = "#8a8378";

export function PackingScreen({
  items,
  onToggle,
  onAdd,
  onRemove,
}: {
  items: PackingItem[];
  onToggle: (id: string) => void;
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
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
        <Text className="font-gothic-400 text-[10px] tracking-[.2em] text-muted">TABI-NAVI</Text>
        <Text className="mt-1 font-mincho-600 text-[26px] text-ink">持ち物</Text>
        <Text className="mt-1 font-gothic-400 text-[11px] text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {done} / {total} 準備済み
        </Text>
      </View>
      <View className="h-px w-full bg-black/[.08]" />

      <ScrollView className="flex-1 px-[26px]" contentContainerStyle={{ paddingTop: 8, paddingBottom: 90 }} keyboardShouldPersistTaps="handled">
        {items.map((item) => (
          <View key={item.id} className="flex-row items-center gap-3 border-b border-black/[.06] py-3">
            <Pressable onPress={() => onToggle(item.id)} hitSlop={8}>
              <View className={`h-[22px] w-[22px] items-center justify-center rounded-[6px] border ${item.checked ? "border-ink bg-ink" : "border-black/[.25]"}`}>
                {item.checked && <View className="h-[9px] w-[9px] rounded-[2px] bg-kinari" />}
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

        <View className="mt-4 flex-row gap-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={submit}
            returnKeyType="done"
            placeholder="持ち物を追加"
            placeholderTextColor={MUTED}
            className="flex-1 rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
          />
          <Pressable onPress={submit} className={`items-center justify-center rounded-[10px] px-4 ${input.trim() ? "bg-ink" : "bg-ink/30"}`}>
            <Text className="font-gothic-500 text-[12px] text-kinari">追加</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
