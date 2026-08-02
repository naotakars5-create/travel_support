import { LodgingPrefecture } from "./lodgingAd";
import { rakutenAffiliateId } from "./ads";
import { tripPhase } from "./date";

/**
 * 旅から帰ったあと（または最終日の終わりに）、その土地のふるさと納税を案内する枠。
 *
 * ## これは「機能」ではなく純粋な広告
 *
 * このプロジェクトの判断基準は「**広告を外したら、このUIは要らなくなるか？**」。
 * 宿探しは残る（宿は旅程の一部だから）が、「石川県の返礼品を見る」は
 * アフィリエイトを外したら消してよい。つまり押しつけ型に分類される。
 *
 * したがって宿のように常設せず、**条件を絞った1枚のカード**として出す。
 * 出す場所は2つだけ:
 *
 * - しおり（旅の思い出）の末尾 … 旅行が終わった旅にだけ
 * - 当日画面 … **最終日で、その日の予定を全部終えたあと（done）だけ**
 *
 * ## 当日画面に出してよい理由
 *
 * 当日画面は「次に何をするかだけを示す」のが核なので、原則として広告を置かない。
 * ただし `done`（次のノードが無い＝その日の予定を消化しきった状態）では、
 * **そもそも案内すべき「次」が存在しない**。最終日の done は旅の締めくくりの
 * 画面なので、ここに限っては核を傷つけない。
 *
 * 逆に言えば **`done` 以外では絶対に出さないこと**。移動中・空き時間に
 * 差し込むと、当日画面の価値そのものが壊れる。
 *
 * ## 税額には触れない
 *
 * 控除の限度額は年収や家族構成で変わる。「実質2,000円」のような書き方は
 * 人によって成り立たないので使わない（景表法・税務の両面で危うい）。
 */

/**
 * 旅の最終日か（旅行中で、かつその日が最終日）。
 *
 * 当日画面にふるさと納税を出してよいのは「最終日 かつ done」だけなので、
 * その片方の判定。旅行前・中日・旅行後はいずれも false。
 */
export function isLastTripDay(tripDate: string, tripDayCount: number, now: Date): boolean {
  const phase = tripPhase(tripDate, tripDayCount, now);
  return phase.phase === "during" && phase.day === phase.dayCount;
}

/** ふるさと納税の締切（12/31）が近い時期か。文言の強さを変えるのに使う。 */
export function isYearEndSeason(now: Date): boolean {
  const m = now.getMonth() + 1;
  return m >= 10 && m <= 12;
}

export interface FurusatoAd {
  /** 対象の都道府県名（例: 石川県） */
  areaName: string;
  /** カードの見出し */
  headline: string;
  /** 補足（なぜ今これが出ているか） */
  sub: string;
  /** ボタンの文言 */
  actionLabel: string;
  /** 遷移先 */
  url: string;
}

/**
 * 旅先の県のふるさと納税ページURL（楽天アフィリエイトのラッパー経由）。
 * アフィリエイトID未設定・都道府県不明なら null＝カードを出さない。
 *
 * ## 楽天ふるさと納税の県別ページへ送る
 *
 * 返礼品そのものは `item.rakuten.co.jp/f304069-susami/...` のように
 * 自治体ショップ（`f` + 自治体コード）が楽天市場に出している商品なので、
 * 楽天市場の検索に送ることもできる。だが**公式の県別ページを使う**。
 *
 * - 検索結果は中身を保証できない（「石川」を含む無関係な商品が混ざりうる）。
 *   県別ページなら表示されるものが確実に石川県の参加自治体になる
 * - 旅の直後に出すカードは「ふるさと納税を見てみよう」という気分の入口で、
 *   いきなり商品を売り込む場面ではない。ランキング・金額・ジャンルの
 *   絞り込みが揃った公式ページのほうが文脈に合う
 *
 * 個別商品は選ばない。ページへ送れば、そこから何を寄付しても成果になる。
 *
 * @param affiliateId テスト用に上書きできるようにしてある。
 */
export function furusatoSearchUrl(
  prefCode: string,
  affiliateId: string = rakutenAffiliateId()
): string | null {
  const id = affiliateId.trim();
  const code = prefCode.trim();
  if (!id || !code) return null;
  const target = `https://event.rakuten.co.jp/furusato/area/${encodeURIComponent(code)}/`;
  return `https://hb.afl.rakuten.co.jp/hgc/${encodeURIComponent(id)}/?pc=${encodeURIComponent(target)}`;
}

/**
 * ふるさと納税の案内カードの内容。都道府県が分からない・提携ID未設定なら null。
 *
 * 「出してよい場面か」（旅行後か・最終日の done か）は画面側で判断する。
 * ここは中身の組み立てだけを持つ。
 */
export function furusatoAd(opts: {
  prefecture: LodgingPrefecture | null;
  now: Date;
  /** 当日画面（最終日の締めくくり）か。しおりとは文言を変える */
  onTripLastDay?: boolean;
  affiliateId?: string;
}): FurusatoAd | null {
  const pref = opts.prefecture;
  if (!pref) return null;
  const url = furusatoSearchUrl(pref.code, opts.affiliateId ?? rakutenAffiliateId());
  if (!url) return null;

  const yearEnd = isYearEndSeason(opts.now);
  return {
    areaName: pref.name,
    // 年末は締切が効くので前に出す。それ以外の時期に急かしても白々しい
    headline: yearEnd ? "今年のふるさと納税はお済みですか？" : `${pref.name}をもう一度、家で`,
    sub: opts.onTripLastDay
      ? `${pref.name} · 旅の記憶が新しいうちに`
      : `${pref.name} · 旅先の味を取り寄せる`,
    actionLabel: `${pref.name}の返礼品を見る`,
    url,
  };
}
