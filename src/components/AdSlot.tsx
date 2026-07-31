import { Linking, Pressable, Text, View } from "react-native";
import { AD_LABEL } from "@/lib/ads";

/**
 * 広告枠の共通パーツ。
 *
 * ここを通さずに送客リンクを直接書かないこと。**PR表記の付け忘れは
 * 景表法（ステマ規制）違反**になるので、ラベルを省略できない形にしてある。
 *
 * 色は surface（砂）と muted（補助文字色）だけ。accent（ローズレッド）は
 * 「今・進行中」専用なので広告には使わない（lib/ads.ts の決まりごと参照）。
 */

/** 「PR」の小さなラベル。広告要素には必ずこれが付く。 */
function AdBadge() {
  return (
    <View className="shrink-0 rounded-[4px] border border-muted-light px-1.5 py-[1px]">
      <Text className="font-gothic-500 text-[9px] tracking-[.08em] text-muted-light">{AD_LABEL}</Text>
    </View>
  );
}

/**
 * 行に寄り添う1行リンク（持ち物リストなど）。
 * 本文より一段小さく・薄くして、リストの主役を奪わないようにする。
 */
export function AdInlineLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={`${label}を Amazon で探す（広告）`}
      hitSlop={6}
      className="mt-1 flex-row items-center gap-1.5 self-start"
    >
      <Text className="font-gothic-400 text-[11px] text-muted underline">{label}を探す</Text>
      <AdBadge />
    </Pressable>
  );
}

/**
 * 1枚のカード（旅程の穴を埋める提案として出す枠）。
 *
 * `secondaryLabel` / `onSecondary` には**アプリ内で完結する手段**を渡すこと。
 * 外部送客だけを置くと単なる広告になるが、アプリ内の選択肢と並べると
 * 「未確定の項目を埋める2つの手段」になり、押し売りにならない。
 */
export function AdCard({
  title,
  sub,
  body,
  actionLabel,
  url,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  /** 日付・エリアなど、なぜ今これが出ているかを示す一行 */
  sub?: string;
  /** 補足（予約後にアプリへ戻る道など） */
  body?: string;
  actionLabel: string;
  url: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <View className="mt-2 rounded-[12px] border border-ink/10 bg-surface/60 p-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="shrink font-gothic-500 text-[12px] text-ink">{title}</Text>
        <AdBadge />
      </View>
      {sub ? <Text className="mt-0.5 font-gothic-400 text-[11px] text-muted">{sub}</Text> : null}
      {body ? <Text className="mt-1.5 font-gothic-400 text-[11px] leading-[17px] text-muted-light">{body}</Text> : null}
      <View className="mt-2.5 flex-row gap-2">
        <Pressable
          onPress={() => void Linking.openURL(url)}
          accessibilityRole="link"
          accessibilityLabel={`${actionLabel}（広告・外部サイトが開きます）`}
          className="flex-1 items-center justify-center rounded-[10px] border border-ink/30 bg-white/60 px-3 py-2.5"
        >
          <Text className="font-gothic-500 text-[12px] text-ink">{actionLabel}</Text>
        </Pressable>
        {secondaryLabel && onSecondary ? (
          <Pressable
            onPress={onSecondary}
            accessibilityRole="button"
            className="items-center justify-center rounded-[10px] px-3 py-2.5"
          >
            <Text className="font-gothic-400 text-[12px] text-muted underline">{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * 送客の主導線。ユーザーが自分から押しに来る機能（宿を探す等）に使う。
 *
 * `AdCard` と違って**常設してよい**。押されるまで何もしない受け身の
 * ボタンなので、押しつけにはならない。そのぶん見つけやすさを優先して
 * 塗りボタンにしてある。
 *
 * `sub` には検索条件（エリア・日付・人数）を必ず入れること。遷移先が
 * 自分の条件で検索済みだと分かると、押すかどうかの判断ができる。
 * 何が起きるか分からないボタンは押されないし、押されても失望される。
 */
export function AdActionButton({
  label,
  sub,
  url,
  compact,
}: {
  label: string;
  /** 検索条件など「押した先に何があるか」 */
  sub?: string;
  url: string;
  /** 小さく出す（枠が狭い場所用） */
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={`${label}（広告・外部サイトが開きます）`}
      className={`flex-row items-center justify-center gap-2 rounded-[12px] bg-ink ${compact ? "px-3 py-2" : "px-4 py-3"}`}
    >
      <View className="shrink">
        <Text className={`text-center font-gothic-700 text-kinari ${compact ? "text-[12px]" : "text-[14px]"}`}>{label}</Text>
        {sub ? <Text className="mt-0.5 text-center font-gothic-400 text-[10px] text-kinari/75">{sub}</Text> : null}
      </View>
      {/* 塗りの上なのでクリーム側の枠線にする。PR表記は省略できない */}
      <View className="shrink-0 rounded-[4px] border border-kinari/50 px-1.5 py-[1px]">
        <Text className="font-gothic-500 text-[9px] tracking-[.08em] text-kinari/80">{AD_LABEL}</Text>
      </View>
    </Pressable>
  );
}

/** 画面の末尾に置く、収益についてのひとこと。広告を1つでも出した画面には必ず置く。 */
export function AdDisclosure({ text }: { text: string }) {
  return <Text className="mt-4 font-gothic-400 text-[10px] leading-[16px] text-muted-light">{text}</Text>;
}
