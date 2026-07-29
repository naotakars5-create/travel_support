import { PlanEntry } from "./types";
import { dateForDay, formatDateStrJa, tripPhase } from "./date";
import { prefectureOf, tripRegion } from "./region";
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
 * 都道府県名 → 楽天トラベルの地域コード（`f_chu`）。
 *
 * 楽天トラベルの検索はキーワード文字列ではなく地域コードで場所を指定する。
 * 自由文を投げても**黙って無視され、既定の地域（北海道）の結果が出る**ので、
 * コードに変換できない場合は枠ごと出さないこと（別の県へ送客するほうが害が大きい）。
 *
 * `kagawa` は実際の検索結果URLで裏取り済み。ほかは同じローマ字表記の規則に
 * 従っているが、ずれが見つかったらここだけ直せばよい。
 */
const RAKUTEN_PREF_CODE: Record<string, string> = {
  北海道: "hokkaido",
  青森県: "aomori",
  岩手県: "iwate",
  宮城県: "miyagi",
  秋田県: "akita",
  山形県: "yamagata",
  福島県: "fukushima",
  茨城県: "ibaraki",
  栃木県: "tochigi",
  群馬県: "gunma",
  埼玉県: "saitama",
  千葉県: "chiba",
  東京都: "tokyo",
  神奈川県: "kanagawa",
  新潟県: "niigata",
  富山県: "toyama",
  石川県: "ishikawa",
  福井県: "fukui",
  山梨県: "yamanashi",
  長野県: "nagano",
  岐阜県: "gifu",
  静岡県: "shizuoka",
  愛知県: "aichi",
  三重県: "mie",
  滋賀県: "shiga",
  京都府: "kyoto",
  大阪府: "osaka",
  兵庫県: "hyogo",
  奈良県: "nara",
  和歌山県: "wakayama",
  鳥取県: "tottori",
  島根県: "shimane",
  岡山県: "okayama",
  広島県: "hiroshima",
  山口県: "yamaguchi",
  徳島県: "tokushima",
  香川県: "kagawa",
  愛媛県: "ehime",
  高知県: "kochi",
  福岡県: "fukuoka",
  佐賀県: "saga",
  長崎県: "nagasaki",
  熊本県: "kumamoto",
  大分県: "oita",
  宮崎県: "miyazaki",
  鹿児島県: "kagoshima",
  沖縄県: "okinawa",
};

export interface LodgingPrefecture {
  /** 表示用の都道府県名（例: 香川県） */
  name: string;
  /** 楽天トラベルの地域コード（例: kagawa） */
  code: string;
}

/**
 * 宿探しの対象になる都道府県。地域コードに変換できなければ null。
 *
 * 行き先の住所から取れる都道府県を優先し（しおりの表紙写真と同じ考え方・
 * lib/region.ts）、住所がまだ無ければ行き先の自由文から拾う。
 * 「香川県 高松・小豆島」のような書き方でも都道府県だけ取り出せる。
 */
export function lodgingPrefecture(entries: PlanEntry[], destination: string): LodgingPrefecture | null {
  const name = tripRegion(entries.map((e) => e.place)) ?? prefectureOf(destination);
  if (!name) return null;
  const code = RAKUTEN_PREF_CODE[name];
  return code ? { name, code } : null;
}

/**
 * 楽天トラベルの空室検索URL（楽天アフィリエイトのラッパー経由）。
 * アフィリエイトID未設定なら null＝枠ごと出さない。
 *
 * パラメータは実際の検索結果URLから起こしてある。特に**エンドポイントに注意**:
 * `/ds/yado/japan` に投げると日付もエリアも黙って無視され、既定の地域
 * （北海道）の結果が出る。`/ds/vacant/searchVacant` が正しい。
 *
 *   f_dai=japan     国内
 *   f_chu=kagawa    都道府県コード（f_shou は市町村。省略して県全体で探す）
 *   f_nen1/f_tuki1/f_hi1   チェックイン
 *   f_nen2/f_tuki2/f_hi2   チェックアウト
 *
 * 料金の上限（f_kin）は渡さない。渡すとその額を超える宿が結果から消えるので、
 * サイト側の既定に任せる。
 *
 * @param affiliateId テスト用に上書きできるようにしてある。
 */
export function lodgingSearchUrl(
  opts: { prefCode: string; checkIn: string; checkOut: string; adults?: number },
  affiliateId: string = rakutenAffiliateId()
): string | null {
  const id = affiliateId.trim();
  if (!id) return null;
  const inParts = splitDate(opts.checkIn);
  const outParts = splitDate(opts.checkOut);
  if (!opts.prefCode.trim() || !inParts || !outParts) return null;

  // React Native の URLSearchParams は実装が不完全なので、mapsLink.ts と同じく手で組む
  const q = [
    `f_dai=japan`,
    `f_chu=${encodeURIComponent(opts.prefCode.trim())}`,
    `f_nen1=${inParts.y}`,
    `f_tuki1=${inParts.m}`,
    `f_hi1=${inParts.d}`,
    `f_nen2=${outParts.y}`,
    `f_tuki2=${outParts.m}`,
    `f_hi2=${outParts.d}`,
    `f_heya_su=1`,
    `f_otona_su=${Math.max(1, Math.floor(opts.adults ?? 2))}`,
    `f_tab=hotel`,
    `f_hyoji=30`,
  ].join("&");
  const target = `https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?${q}`;
  return `https://hb.afl.rakuten.co.jp/hgc/${encodeURIComponent(id)}/?pc=${encodeURIComponent(target)}`;
}

/** YYYY-MM-DD を年月日に割る。形式が違えば null。 */
function splitDate(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export interface LodgingAd {
  /** 対象の都道府県名（カードにも出す） */
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

  // 地域コードに変換できないときは出さない。自由文を投げても黙って無視され、
  // 関係のない県の宿一覧へ送ってしまうため（出さないほうがまし）
  const pref = lodgingPrefecture(entries, destination);
  if (!pref) return null;

  const days = Math.floor(tripDayCount);
  const checkIn = tripDate;
  const checkOut = dateForDay(tripDate, days);
  const url = lodgingSearchUrl(
    { prefCode: pref.code, checkIn, checkOut },
    opts.affiliateId ?? rakutenAffiliateId()
  );
  if (!url) return null;

  const nights = days - 1;
  return {
    keyword: pref.name,
    checkIn,
    checkOut,
    nights,
    rangeLabel: `${formatDateStrJa(checkIn)} 〜 ${formatDateStrJa(checkOut)} · ${nights}泊`,
    url,
  };
}
