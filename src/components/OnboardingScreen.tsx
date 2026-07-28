import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IllustrationPlate } from "./Illustration";
import { IllustrationName } from "@/lib/illustrations";
import { COLORS, DAY_COLORS, tint } from "@/lib/palette";

/** 初回だけ出す3枚のカード。旅の準備が楽しみになるトーンで、次に何をすればいいかを示す。 */
interface Card {
  illustration: IllustrationName;
  eyebrow: string;
  title: string;
  body: string;
  /** そのカードの色（紅梅→朽葉→ローズ。最後だけ「今から始まる」色にする） */
  color: string;
}

const CARDS: Card[] = [
  {
    illustration: "empty-suitcase",
    eyebrow: "ようこそ",
    title: "旅ナビは、\n旅のしおりを作るアプリ",
    body: "行きたい場所を並べるだけ。\n住所も営業時間もAIが調べて、\n回りやすい順番の旅程に組み上げます。",
    color: DAY_COLORS[0],
  },
  {
    illustration: "loading-map",
    eyebrow: "みんなで作る",
    title: "作ったしおりは、\nかんたんに共有できる",
    body: "リンクをひとつ送るだけ。\n一緒に行く人と予定を見ながら、\n行き先を足して計画を育てましょう。",
    color: DAY_COLORS[1],
  },
  {
    illustration: "packed-done",
    eyebrow: "はじめよう",
    title: "さっそく、\n最初の行き先を決めよう",
    body: "目的地をひとつ入れるだけで始められます。\n迷ったら、AIにゼロから\n旅程を作ってもらうこともできます。",
    color: COLORS.accent,
  },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const card = CARDS[index];
  const isLast = index === CARDS.length - 1;

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* 途中で抜けたい人のためのスキップ（最後のカードでは出さない） */}
      <View className="h-10 flex-row items-center justify-end px-[26px]">
        {!isLast && (
          <Pressable onPress={onDone} hitSlop={8} accessibilityRole="button" accessibilityLabel="紹介をとばす">
            <Text className="font-gothic-400 text-[12px] text-muted-light">とばす</Text>
          </Pressable>
        )}
      </View>

      <View className="flex-1 items-center justify-center px-[34px]">
        {/* 絵はブランドの地色（コーラルピンク）の台座に載せる。素材と同じ見え方になる */}
        <IllustrationPlate name={card.illustration} size="lg" alt="" round />
        <Text className="mt-6 font-gothic-500 text-[11px] tracking-[.2em]" style={{ color: card.color }}>
          {card.eyebrow}
        </Text>
        <Text className="mt-2 text-center font-mincho-700 text-[26px] leading-[38px] text-ink">{card.title}</Text>
        <Text className="mt-4 text-center font-gothic-400 text-[12px] leading-[21px] text-muted">{card.body}</Text>
      </View>

      <View className="px-[34px] pb-6">
        {/* 何枚目かを示すドット */}
        <View className="mb-5 flex-row items-center justify-center gap-1.5">
          {CARDS.map((c, i) => (
            <View
              key={c.eyebrow}
              className={`h-[6px] rounded-full ${i === index ? "w-[18px]" : "w-[6px]"}`}
              style={{ backgroundColor: i === index ? c.color : tint(c.color, 0.25) }}
            />
          ))}
        </View>
        <Pressable
          onPress={() => (isLast ? onDone() : setIndex((i) => i + 1))}
          accessibilityRole="button"
          accessibilityLabel={isLast ? "はじめる" : "次へ"}
          className="rounded-[12px] py-3.5"
          style={{ backgroundColor: card.color }}
        >
          <Text className="text-center font-gothic-500 text-[13px] text-kinari">{isLast ? "はじめる" : "次へ"}</Text>
        </Pressable>
        {index > 0 && (
          <Pressable onPress={() => setIndex((i) => i - 1)} hitSlop={8} accessibilityRole="button" className="mt-3 self-center">
            <Text className="font-gothic-400 text-[12px] text-muted-light">‹ 戻る</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
