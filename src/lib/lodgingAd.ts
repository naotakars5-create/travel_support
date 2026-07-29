import { PlanEntry } from "./types";
import { dateForDay, formatDateStrJa, tripPhase } from "./date";
import { tripRegion } from "./region";
import { rakutenAffiliateId } from "./ads";

/**
 * 「泊まりの旅なのに、宿がまだ入っていない」ときだけ出す宿探しの枠。
 *
 * ## 常時表示にしない理由
 *
 * 常に出ていれば、それはただの広告になる。出す条件を
 * 「旅程に空いている穴がある」ときに絞ると、**旅程の不足を埋める提案**になり、
 * ユーザーにとっても実際に役に立つ。
 *
 * その結果、
 *
 * - 日帰り（tripDayCount === 1）のユーザーには一度も出ない
 * - 宿を1件登録した瞬間に消える
 * - 旅行が始まったら消える（今から宿を勧めても遅い）
 *
 * ようになる。**「広告が消えている状態がゴール」** という設計にしてあるので、
 * ここに「そのうち消えるから」と別の広告を足さないこと。
 *
 * ## 予約したあとの戻り道
 *
 * 送客して終わりにすると、ユーザーは外部で予約したあと宿の情報を
 * 手で入力し直すことになり、体験としてはむしろ悪くなる。
 * このアプリには既に受け皿があり、旅タブの「＋」→「メールから追加」に
 * 予約確認メールを貼れば `/api/parse` が mode:"stay" のエントリ
 * （チェックイン＝arriveBy、チェックアウト＝checkOut）を作る。
 * カードの説明文でそこへ繋いでいるので、文言を削らないこと。
 */

/** 宿が必要なのにまだ登録されていないか。 */
export function needsLodging(
  entries: PlanEntry[],
  tripDayCount: number,
  tripDate: string,
  now: Date
): boolean {
  if (Math.floor(tripDayCount) < 2) return false; // 日帰りには宿が要らない
  if (entries.some((e) => e.mode === "stay")) return false; // もう入っている
  return tripPhase(tripDate, tripDayCount, now).phase === "before";
}

/**
 * 宿探しに使う地域キーワード。
 *
 * `destination` は自由文（例「香川県 高松・小豆島」）なので、そのまま検索に
 * 投げると外すことがある。行き先の住所から都道府県が取れるならそちらを優先する
 * （しおりの表紙写真を探すときと同じ考え方・lib/region.ts）。
 */
export function lodgingKeyword(entries: PlanEntry[], destination: string): string | null {
  const pref = tripRegion(entries.map((e) => e.place));
  if (pref) return pref;
  const d = destination.trim();
  return d ? d : null;
}

/**
 * 楽天トラベルの空室検索URL（楽天アフィリエイトのラッパー経由）。
 * アフィリエイトID未設定なら null＝枠ごと出さない。
 *
 * 注: 遷移先のクエリ名（f_query / f_nen1 …）は楽天トラベル側の仕様で、
 * 変更される可能性がある。導入時は楽天アフィリエイトの管理画面で実際に
 * 発行されるリンクと突き合わせて確認すること。
 *
 * @param affiliateId テスト用に上書きできるようにしてある。
 */
export function lodgingSearchUrl(
  opts: { keyword: string; checkIn: string; checkOut: string; adults?: number },
  affiliateId: string = rakutenAffiliateId()
): string | null {
  const id = affiliateId.trim();
  if (!id) return null;
  const inParts = splitDate(opts.checkIn);
  const outParts = splitDate(opts.checkOut);
  if (!opts.keyword.trim() || !inParts || !outParts) return null;

  // React Native の URLSearchParams は実装が不完全なので、mapsLink.ts と同じく手で組む
  const q = [
    `f_query=${encodeURIComponent(opts.keyword.trim())}`,
    `f_nen1=${inParts.y}`,
    `f_tuki1=${inParts.m}`,
    `f_hi1=${inParts.d}`,
    `f_nen2=${outParts.y}`,
    `f_tuki2=${outParts.m}`,
    `f_hi2=${outParts.d}`,
    `f_heya_su=1`,
    `f_otona_su=${Math.max(1, Math.floor(opts.adults ?? 2))}`,
  ].join("&");
  const target = `https://search.travel.rakuten.co.jp/ds/yado/japan?${q}`;
  return `https://hb.afl.rakuten.co.jp/hgc/${encodeURIComponent(id)}/?pc=${encodeURIComponent(target)}`;
}

/** YYYY-MM-DD を年月日に割る。形式が違えば null。 */
function splitDate(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export interface LodgingAd {
  /** 検索に使う地域名（カードにも出す） */
  keyword: string;
  /** チェックイン日（YYYY-MM-DD） */
  checkIn: string;
  /** チェックアウト日（YYYY-MM-DD） */
  checkOut: string;
  /** 泊数 */
  nights: number;
  /** カードに出す日付の表記（「8月12日(水) 〜 8月13日(木) · 1泊」） */
  rangeLabel: string;
  /** 遷移先 */
  url: string;
}

/**
 * 宿探しの枠に出す内容。出す条件を満たさない・提携ID未設定なら null。
 * 画面側はこの戻り値が null かどうかだけを見ればよい。
 */
export function lodgingAd(opts: {
  entries: PlanEntry[];
  destination: string;
  tripDate: string;
  tripDayCount: number;
  now: Date;
  affiliateId?: string;
}): LodgingAd | null {
  const { entries, destination, tripDate, tripDayCount, now } = opts;
  if (!needsLodging(entries, tripDayCount, tripDate, now)) return null;

  const keyword = lodgingKeyword(entries, destination);
  if (!keyword) return null;

  const days = Math.floor(tripDayCount);
  const checkIn = tripDate;
  const checkOut = dateForDay(tripDate, days);
  const url = lodgingSearchUrl(
    { keyword, checkIn, checkOut },
    opts.affiliateId ?? rakutenAffiliateId()
  );
  if (!url) return null;

  const nights = days - 1;
  return {
    keyword,
    checkIn,
    checkOut,
    nights,
    rangeLabel: `${formatDateStrJa(checkIn)} 〜 ${formatDateStrJa(checkOut)} · ${nights}泊`,
    url,
  };
}
