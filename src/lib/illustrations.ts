/**
 * イラスト素材の名前とアセット解決。
 * 素材は public/illustrations/ に配置され、Web ではそのまま静的配信される。
 */
export type IllustrationName =
  | "cover-default"
  | "empty-suitcase"
  | "loading-map"
  | "packed-done"
  | "avatar-01"
  | "avatar-02"
  | "spot-bench-01"
  | "spot-bench-02"
  | "icon-home"
  | "icon-bed";

/** アバターとして選べるイラスト（マイページ）。 */
export const AVATAR_ILLUSTRATIONS: IllustrationName[] = ["avatar-01", "avatar-02"];

/** 空き時間チップに出すイラスト（シードで選ぶ）。 */
const BENCH_ILLUSTRATIONS: IllustrationName[] = ["spot-bench-01", "spot-bench-02"];

/**
 * 文字列から安定した非負整数ハッシュを作る（djb2）。
 * Math.random() を使わないので、同じシードなら常に同じ結果になり、
 * 再レンダリングで絵が入れ替わってちらつくことがない。
 */
export function hashString(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** 空き時間ブロックのシード（開始時刻など）から、表示するベンチのイラストを決める。 */
export function pickBenchIllustration(seed: string): IllustrationName {
  return BENCH_ILLUSTRATIONS[hashString(seed) % BENCH_ILLUSTRATIONS.length];
}
