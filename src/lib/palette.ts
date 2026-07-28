/**
 * 色の使い方の決まりごと。
 *
 * 絵の具はブランドイラストから借りている。フラットベクターの旅人イラスト
 * （コーラルピンクの地に、クリーム・ローズレッド・太い黒線だけで描いたもの）で
 * 使われている4色をそのままUIのトークンにしているので、
 * 画面とイラストが同じ絵の具で描かれているように見える。
 *
 * - ローズレッド（accent / #DD5967）＝ 今・進行中
 * - コーラルピンク（highlight / #F69B96）＝ 完了・達成と、罫線・見出しバーなどの差し色
 * - クリーム（base / #F5EAD6）＝ 画面の地
 * - 墨（ink / #1A1A1A）＝ 文字・輪郭・主要ボタン
 *
 * 日ごとの色は「日本の伝統色」の落ち着いた一族のまま。ただしローズ／コーラルと
 * 並べても浮かないよう、彩度と明度をそちらに寄せて組み直してある。
 *
 * クリーム（#F5EAD6）の文字を載せてコントラスト比4.5以上になる濃さに揃えてある。
 */

/** UIトークンの実体。className で書けない場所（style / SVG / ActivityIndicator）から参照する。 */
export const COLORS = {
  base: "#F5EAD6",
  surface: "#EFDFC5",
  ink: "#1A1A1A",
  muted: "#6F625A",
  accent: "#DD5967",
  highlight: "#F69B96",
} as const;

/** 日ごとの色（紅梅・朽葉・藤・錆浅葱・鈍藍）。6日目以降は先頭へ戻る。 */
export const DAY_COLORS = ["#A8465F", "#8A5A3C", "#6E5A7A", "#4F6B6B", "#55657F"] as const;

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
