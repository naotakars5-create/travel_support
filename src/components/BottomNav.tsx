import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tab } from "@/hooks/useAppState";

// 下タブは毎日の導線だけに絞る。しおり・持ち物は旅の前後にしか使わないので
// マイページの中から開く（タブが多すぎて押し間違えるのを防ぐ）。
const ITEMS: { id: Tab; label: string }[] = [
  { id: "plan", label: "計画" },
  { id: "itin", label: "旅程" },
  { id: "map", label: "地図" },
  { id: "today", label: "当日" },
  { id: "profile", label: "マイページ" },
];

export function BottomNav({ tab, onChange, dark }: { tab: Tab; onChange: (t: Tab) => void; dark?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={dark ? "bg-day-nav border-t border-day-text/10" : "bg-kinari border-t border-black/[.08]"}
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="h-[66px] flex-row">
        {ITEMS.map((item) => {
          const active = item.id === tab;
          return (
            <Pressable
              key={item.id}
              onPress={() => onChange(item.id)}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              className="flex-1 items-center justify-center gap-1.5"
            >
              <View className={`h-[2px] w-[18px] rounded-full ${active ? (dark ? "bg-day-text" : "bg-ink") : "bg-transparent"}`} />
              <Text
                className={`font-gothic-400 text-[11px] ${
                  active ? (dark ? "text-day-text font-gothic-500" : "text-ink font-gothic-500") : dark ? "text-day-text3" : "text-muted-light"
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
