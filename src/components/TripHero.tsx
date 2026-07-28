import { ImageBackground, Pressable, Text, View } from "react-native";
import { tripPhase, tripRangeLabel } from "@/lib/date";
import { formatYen } from "@/lib/format";

/**
 * 旅の見出し。画面を開いた瞬間に「どこへ・いつ・あと何日」が目に入る場所。
 *
 * ここが無かったので、アプリを開いても行き先の一覧が並ぶだけで、
 * 自分の旅という感じがしなかった。旅名は押すと旅の切り替えが開く。
 */
export function TripHero({
  title,
  destination,
  tripDate,
  tripDayCount,
  entryCount,
  totalCost,
  now,
  coverUri,
  readOnly,
  onPressTitle,
  onShare,
  onAdd,
}: {
  title: string;
  destination: string;
  tripDate: string;
  tripDayCount: number;
  entryCount: number;
  totalCost: number;
  now: Date;
  /** しおりの表紙写真（あれば背景に敷く） */
  coverUri?: string;
  readOnly: boolean;
  onPressTitle: () => void;
  onShare: () => void;
  onAdd: () => void;
}) {
  const phase = tripPhase(tripDate, tripDayCount, now);
  const meta = [
    tripRangeLabel(tripDate, tripDayCount),
    tripDayCount > 1 ? `${tripDayCount}日間` : null,
    entryCount > 0 ? `行き先${entryCount}件` : null,
    totalCost > 0 ? formatYen(totalCost) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const onPhoto = Boolean(coverUri);
  const titleColor = onPhoto ? "text-white" : "text-ink";
  const subColor = onPhoto ? "text-white/[.85]" : "text-muted";

  const body = (
    <View className="px-[26px] pb-2.5 pt-2">
      {/* 旅名は押すと設定が開く。「押せる」と分かるよう、
          隣に用途を書いたボタンを必ず添える（▾ だけでは気づかれなかった） */}
      <View className="flex-row items-center gap-2">
        <Pressable onPress={onPressTitle} disabled={readOnly} accessibilityRole="button" className="shrink">
          <Text numberOfLines={1} className={`font-mincho-700 text-[26px] leading-[35px] ${titleColor}`}>
            {title}
          </Text>
        </Pressable>
        {!readOnly && (
          <Pressable
            onPress={onPressTitle}
            accessibilityRole="button"
            accessibilityLabel="旅の名前・行き先を変える／ほかの旅に切り替える"
            className={`shrink-0 flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
              onPhoto ? "bg-white/[.85]" : "border border-ink/25 bg-white/60"
            }`}
          >
            <Text className="font-gothic-500 text-[11px] text-ink">✎ 旅の設定</Text>
          </Pressable>
        )}
      </View>

      {destination ? (
        <Text numberOfLines={1} className={`mt-0.5 font-gothic-500 text-[13px] ${subColor}`}>
          {destination}
        </Text>
      ) : !readOnly ? (
        <Pressable onPress={onPressTitle} accessibilityRole="button">
          <Text className={`mt-0.5 font-gothic-400 text-[12px] ${subColor}`}>行き先を入れる ›</Text>
        </Pressable>
      ) : null}

      <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
        {/* 旅がいつなのか。ここだけは色を強く出す（旅への高揚をつくる場所） */}
        {phase.phase === "before" && (
          <View className="rounded-full bg-accent px-3 py-[5px]">
            <Text className="font-gothic-700 text-[12px] text-kinari">
              {phase.daysUntil === 1 ? "明日から" : `あと${phase.daysUntil}日`}
            </Text>
          </View>
        )}
        {phase.phase === "during" && (
          <View className="rounded-full bg-accent px-3 py-[5px]">
            <Text className="font-gothic-700 text-[12px] text-kinari">
              旅行中 · {phase.day}日目{phase.dayCount > 1 ? `／${phase.dayCount}日` : ""}
            </Text>
          </View>
        )}
        {phase.phase === "after" && (
          <View className="rounded-full bg-highlight/30 px-3 py-[5px]">
            <Text className="font-gothic-700 text-[12px] text-ink">旅は終わりました</Text>
          </View>
        )}
        <Text numberOfLines={1} className={`flex-1 font-gothic-400 text-[12px] ${subColor}`}>
          {meta}
        </Text>
      </View>

      {/* 「＋」だけでは何が足せるのか分からなかったので、文字を入れて主要動作として置く */}
      {!readOnly && (
        <View className="mt-2 flex-row gap-2">
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel="行き先を追加"
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[12px] bg-ink py-2.5"
          >
            <Text className="font-gothic-700 text-[14px] text-kinari">＋ 行き先を追加</Text>
          </Pressable>
          <Pressable
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel="この旅程を共有する"
            className={`items-center justify-center rounded-[12px] px-4 ${onPhoto ? "bg-white/[.85]" : "border border-ink/25 bg-white/60"}`}
          >
            <Text className="font-gothic-500 text-[13px] text-ink">共有</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  if (!coverUri) return body;
  return (
    <ImageBackground source={{ uri: coverUri }} resizeMode="cover">
      {/* 写真の上でも文字が読めるよう墨を重ねる */}
      <View className="absolute inset-0 bg-ink/[.55]" />
      {body}
    </ImageBackground>
  );
}
