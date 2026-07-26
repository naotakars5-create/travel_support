/**
 * 行き先の住所から「地域名」を取り出す。しおりの表紙写真を探すキーワードに使う。
 * 例: "香川県高松市栗林町1-20-16" → "香川県"
 */

// 3文字の県名（神奈川・和歌山・鹿児島）は2文字パターンより先に置く。
// 後ろに置くと「奈川県」のように途中から切り取られてしまう。
const PREFECTURE_RE = /(北海道|東京都|京都府|大阪府|神奈川県|和歌山県|鹿児島県|.{2}県)/;

/** 住所文字列から都道府県を取り出す。見つからなければ null。 */
export function prefectureOf(address: string | undefined): string | null {
  if (!address) return null;
  const m = PREFECTURE_RE.exec(address.trim());
  return m ? m[1] : null;
}

/**
 * 行き先の住所リストから、旅の代表的な地域名を決める。
 * 最も多く出てくる都道府県を採用する（数が同じなら最初に出たもの）。
 */
export function tripRegion(addresses: (string | undefined)[]): string | null {
  const count = new Map<string, number>();
  for (const a of addresses) {
    const pref = prefectureOf(a);
    if (!pref) continue;
    count.set(pref, (count.get(pref) ?? 0) + 1);
  }
  if (count.size === 0) return null;
  let best: string | null = null;
  let bestN = 0;
  for (const [pref, n] of count) {
    if (n > bestN) {
      best = pref;
      bestN = n;
    }
  }
  return best;
}
