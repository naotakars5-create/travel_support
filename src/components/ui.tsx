import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { COLORS } from "@/lib/palette";

/**
 * 画面をまたいで使う共通パーツ。
 *
 * ここに集める理由は「重みの階層」を1か所で決めるため。
 * 以前は主要な操作も補助的な操作も同じ見た目（墨色の角丸）だったので、
 * どれが本筋の一手なのかが分からなかった。
 *
 * 階層は3段だけ:
 *  - primary   … その画面で一番やってほしい一手。塗り。大きい。
 *  - secondary … よく使うが主役ではない。枠線。
 *  - ghost     … 補助・取り消し。文字だけ。
 */

export type ButtonTone = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "lg" | "md" | "sm";

const SIZE: Record<ButtonSize, { pad: string; text: string }> = {
  lg: { pad: "px-5 py-4", text: "text-[15px]" },
  md: { pad: "px-4 py-3", text: "text-[13px]" },
  sm: { pad: "px-3 py-2", text: "text-[12px]" },
};

export function Button({
  label,
  onPress,
  tone = "primary",
  size = "md",
  disabled,
  loading,
  accent,
  fullWidth = true,
  accessibilityLabel,
  left,
}: {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** primary をテラコッタで塗る（「今これをやる」場面だけ） */
  accent?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  left?: React.ReactNode;
}) {
  const s = SIZE[size];
  const off = disabled || loading;
  const box =
    tone === "primary"
      ? accent
        ? "bg-accent"
        : "bg-ink"
      : tone === "secondary"
        ? "border border-ink/30 bg-white/60"
        : tone === "danger"
          ? "border border-ink/20"
          : "";
  const textColor =
    tone === "primary" ? "text-kinari" : tone === "danger" ? "text-muted" : tone === "ghost" ? "text-muted" : "text-ink";
  const weight = tone === "primary" ? "font-gothic-700" : "font-gothic-500";
  return (
    <Pressable
      disabled={off}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(off) }}
      className={`flex-row items-center justify-center gap-2 rounded-[12px] ${s.pad} ${box} ${
        fullWidth ? "w-full" : "self-start"
      } ${off ? "opacity-40" : ""}`}
    >
      {loading ? <ActivityIndicator size="small" color={tone === "primary" ? COLORS.base : COLORS.muted} /> : left}
      <Text className={`text-center ${weight} ${s.text} ${textColor}`}>{label}</Text>
    </Pressable>
  );
}

/** 節の見出し。左のテラコッタの棒で、どの画面でも同じ形にそろえる。 */
export function SectionHeading({ label, right, className = "" }: { label: string; right?: React.ReactNode; className?: string }) {
  return (
    <View className={`flex-row items-center justify-between ${className}`}>
      <View className="flex-row items-center gap-1.5">
        <View className="h-[12px] w-[3px] rounded-full bg-highlight" />
        <Text className="font-gothic-700 text-[11px] tracking-[.14em] text-ink">{label}</Text>
      </View>
      {right}
    </View>
  );
}

/**
 * 押すと次の画面・シートが開く行。右端の「›」でタップできることを示す。
 * 見た目が同じなのに片方だけ押せる、という状態を作らないために使う。
 */
export function Row({
  title,
  sub,
  onPress,
  left,
  accessibilityLabel,
  first,
}: {
  title: string;
  sub?: string;
  onPress: () => void;
  left?: React.ReactNode;
  accessibilityLabel?: string;
  first?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      className={`flex-row items-center gap-3 px-4 py-3.5 ${first ? "" : "border-t border-ink/10"}`}
    >
      {left}
      <View className="flex-1">
        <Text className="font-gothic-500 text-[14px] text-ink">{title}</Text>
        {sub ? <Text className="mt-0.5 font-gothic-400 text-[11px] leading-[17px] text-muted">{sub}</Text> : null}
      </View>
      <Text className="font-gothic-400 text-[16px] text-muted-light">›</Text>
    </Pressable>
  );
}

/**
 * 達成・完了の合図。マスタード（highlight）はここだけで使う。
 * 「終わったこと」が視覚的に報われないと、旅の準備が作業になってしまう。
 */
export function DoneBadge({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-1 self-start rounded-full bg-highlight/25 px-2.5 py-[3px]">
      <Text className="font-gothic-700 text-[10px] text-ink">✓ {label}</Text>
    </View>
  );
}
