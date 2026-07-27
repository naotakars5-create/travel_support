/**
 * 色の使い方の決まりごと。
 *
 * ベース（生成り・砂・墨・鈍色）はそのまま、有彩色は「日本の伝統色」の
 * 落ち着いた一族だけを使う。どれも彩度と明度がそろっているので、
 * 何色か並んでも散らからず、共通の顔つきになる。
 *
 * - テラコッタ（accent）＝ 今・進行中
 * - マスタード（highlight）＝ 完了・達成
 * - 下の5色 ＝ 日ごとの色。1日目/2日目…を見分けるためだけに使う。
 *
 * 生成り（#F4EFE5）の文字を載せてコントラスト比4.5以上になる濃さに揃えてある。
 */

/** 日ごとの色（藍・松葉・梅・朽葉・鉛）。6日目以降は先頭へ戻る。 */
export const DAY_COLORS = ["#4A6B8A", "#55704F", "#96536B", "#7D5F36", "#4F5D6B"] as const;

/** 何日目かに対応する色。 */
export function dayColor(day: number): string {
  const i = (Math.max(1, Math.round(day)) - 1) % DAY_COLORS.length;
  return DAY_COLORS[i];
}

/** 同じ色の薄い面（カードの下地など）。`rgba` にして重ねる。 */
export function tint(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
