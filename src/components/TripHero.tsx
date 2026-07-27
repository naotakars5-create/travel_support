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
  const subColor = onPhoto ? "text-white/85" : "text-muted";

  const body = (
    <View className="px-[26px] pb-4 pt-3">
      <View className="flex-row items-start justify-between gap-3">
        <Pressable
          onPress={onPressTitle}
          disabled={readOnly}
          accessibilityRole="button"
          accessibilityLabel={`${title}。押すと旅を切り替えられます`}
          className="flex-1"
        >
          <View className="flex-row items-center gap-1.5">
            <Text numberOfLines={1} className={`font-mincho-700 text-[27px] leading-[36px] ${titleColor}`}>
              {title}
            </Text>
            {!readOnly && <Text className={`font-gothic-400 text-[13px] ${subColor}`}>▾</Text>}
          </View>
          {destination ? (
            <Text numberOfLines={1} className={`mt-0.5 font-gothic-500 text-[13px] ${subColor}`}>
              {destination}
            </Text>
          ) : null}
        </Pressable>

        {!readOnly && (
          <View className="mt-1 flex-row items-center gap-2">
            <Pressable
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel="この旅程を共有する"
              className={`h-9 items-center justify-center rounded-[10px] px-3 ${onPhoto ? "bg-white/85" : "border border-ink/25"}`}
            >
              <Text className="font-gothic-500 text-[12px] text-ink">共有</Text>
            </Pressable>
            <Pressable
              onPress={onAdd}
              accessibilityRole="button"
              accessibilityLabel="行き先を追加"
              className={`h-9 w-9 items-center justify-center rounded-[10px] ${onPhoto ? "bg-white/85" : "bg-ink"}`}
            >
              <View className="relative h-[12px] w-[12px]">
                <View className={`absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 ${onPhoto ? "bg-ink" : "bg-kinari"}`} />
                <View className={`absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 ${onPhoto ? "bg-ink" : "bg-kinari"}`} />
              </View>
            </Pressable>
          </View>
        )}
      </View>

      <View className="mt-2 flex-row flex-wrap items-center gap-2">
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
    </View>
  );

  if (!coverUri) return body;
  return (
    <ImageBackground source={{ uri: coverUri }} resizeMode="cover">
      {/* 写真の上でも文字が読めるよう墨を重ねる */}
      <View className="absolute inset-0 bg-ink/55" />
      {body}
    </ImageBackground>
  );
}
