import { Fragment } from "react";
import { Text, View } from "react-native";

/**
 * 「①行き先を追加 → ②AIで予定を組む → ③タイムライン完成」の3ステップ図解。
 * 初見の人が使い方の流れをぱっと掴めるように、空の画面に添える。
 * 文章で説明するより、番号つきの丸と矢印で「順番」を見せる。
 */
const STEPS = [
  { n: "1", icon: "📍", label: "行き先を追加" },
  { n: "2", icon: "✨", label: "AIで予定を組む" },
  { n: "3", icon: "🗓", label: "旅程ができる" },
] as const;

export function FlowSteps({ current }: { current?: 1 | 2 | 3 }) {
  return (
    <View className="flex-row items-start justify-center">
      {STEPS.map((s, i) => {
        const active = current === i + 1;
        return (
          <Fragment key={s.n}>
            {i > 0 && (
              <Text className="mx-1 mt-3 font-gothic-700 text-[14px] text-highlight" accessibilityElementsHidden>
                →
              </Text>
            )}
            <View className="w-[92px] items-center gap-1">
              <View
                className={`h-10 w-10 items-center justify-center rounded-full border ${
                  active ? "border-accent bg-accent/[.12]" : "border-highlight bg-highlight/[.25]"
                }`}
              >
                <Text className="text-[16px]">{s.icon}</Text>
              </View>
              <Text className={`text-center font-gothic-500 text-[10px] leading-[14px] ${active ? "text-accent" : "text-ink"}`}>
                <Text className={`font-gothic-700 ${active ? "text-accent" : "text-ink"}`}>{s.n}. </Text>
                {s.label}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}
