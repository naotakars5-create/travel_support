import { PlanEntry } from "./types";
import { dateForDay, dayOfIso, formatDateStrJa, tripPhase } from "./date";
import { prefectureOf, resolvePrefecture, tripRegion } from "./region";
import { rakutenAffiliateId } from "./ads";

/**
 * 宿泊先を「泊ごとの枠」として扱う。
 *
 * ## なぜリストではなく泊ごとの枠なのか
 *
 * 3日間の旅なら必ず2泊ある。これは日程から自動的に決まる事実なのに、
 * 以前は「宿が0件かN件か」しか分からず、**あと何泊ぶん足りないのかが
 * 見えなかった**。泊ごとの枠にすると、埋まっている泊と空いている泊が
 * 一目で分かり、宿の準備が持ち物リストと同じ「あと何個」の形に揃う。
 *
 * 副次的に、宿探しリンクを**その1泊ぶんの日付**で飛ばせるようになる。
 * 以前は旅程全体（初日〜最終日）で検索していたので、2泊目を探したい人は
 * 遷移先で日付を入れ直す必要があった。
 *
 * ## 宿探しの導線は常に出す
 *
 * 「宿を探す」はユーザーが自分の意思で押すもので、押しつけの広告ではない。
 * 宿を決めるのは旅の準備そのものなので、条件を絞らず常に触れる場所に置く。
 * 埋まった泊・宿を取らないと決めた泊・過ぎた泊では自然に消える。
 *
 * ただし**「宿を取らない」を選べること**は必須（実家・車中泊・夜行バス・
 * 友人宅）。これが無いと、宿を取る予定のない人にとって消せない広告になる。
 */

/** 都道府県名 → 楽天トラベルの地域コード（`f_chu`）。 */
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

/** 楽天の地域コード（ishikawa 等）から都道府県名を引く。見つからなければ null。 */
export function prefectureNameOfCode(code: string): string | null {
  const hit = Object.entries(RAKUTEN_PREF_CODE).find(([, c]) => c === code);
  return hit ? hit[0] : null;
}

export interface LodgingPrefecture {
  /** 表示用の都道府県名（例: 香川県） */
  name: string;
  /** 楽天トラベルの地域コード（例: kagawa） */
  code: string;
}

/**
 * 宿探しの対象になる都道府県。地域コードに変換できなければ null。
 *
 * 楽天トラベルの検索はキーワード文字列ではなく地域コードで場所を指定する。
 * 自由文を投げても**黙って無視され、既定の地域（北海道）の結果が出る**ので、
 * コードに変換できない場合はリンクを出さない（別の県へ送るほうが害が大きい）。
 *
 * 判定は確からしい順に4段階。
 *
 * 1. 行き先のジオコーディング結果（`PlanEntry.prefecture`）— Google が返す
 *    都道府県なので最も確実。「金沢」のような市名入力でも正しく出る
 * 2. 行き先の住所に書かれた都道府県名（`tripRegion`）
 * 3. 旅の行き先の自由文に書かれた都道府県名（`prefectureOf`）
 * 4. 市名・観光地名からの推定（`resolvePrefecture`）— 「金沢」→「石川県」。
 *    ジオコーディング前・APIキー未設定・過去に作った旅のための補完
 *
 * 4段構えにしているのは、**旅の行き先を「金沢」「箱根」と市名で書くのが普通**
 * だから。都道府県名しか読めないと、実際にはほとんどの旅で宿探しが出ない。
 */
export function lodgingPrefecture(entries: PlanEntry[], destination: string): LodgingPrefecture | null {
  const name =
    entries.find((e) => e.prefecture)?.prefecture ??
    tripRegion(entries.map((e) => e.place)) ??
    prefectureOf(destination) ??
    resolvePrefecture([destination, ...entries.map((e) => e.place), ...entries.map((e) => e.title)]);
  if (!name) return null;
  const code = RAKUTEN_PREF_CODE[name];
  return code ? { name, code } : null;
}

/**
 * 楽天トラベルの空室検索URL（楽天アフィリエイトのラッパー経由）。
 * アフィリエイトID未設定なら null＝リンクを出さない。
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

/** Date → YYYY-MM-DD（ローカル）。 */
function dateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 旅程の1泊ぶんの枠。 */
export interface LodgingNight {
  /** 何泊目か（1始まり） */
  nth: number;
  /** チェックイン日（YYYY-MM-DD） */
  checkIn: string;
  /** チェックアウト日（YYYY-MM-DD） */
  checkOut: string;
  /** 日付の表記（「8月10日(月) → 8月11日(火)」） */
  rangeLabel: string;
  /** この泊に登録済みの宿 */
  entry?: PlanEntry;
  /** 「宿を取らない」と決めた泊（実家・車中泊など） */
  skipped: boolean;
  /** チェックアウト日を過ぎた泊。記録としては残すが宿探しは出さない */
  past: boolean;
  /** 今夜チェックインする泊。旅行中に「今夜の宿がまだ」を拾う */
  tonight: boolean;
  /** この泊の宿探しリンク。決定済み・スキップ・過去・提携ID未設定なら null */
  searchUrl: string | null;
}

/**
 * 何泊目の枠に入る宿かを求める。チェックイン日から逆算する。
 * 時刻が未入力の宿は「何日目か」（`day`）で拾う。
 */
export function nightIndexOf(entry: PlanEntry, tripDate: string, nights: number): number | null {
  if (entry.mode !== "stay") return null;
  const nth = entry.arriveBy ? dayOfIso(tripDate, entry.arriveBy) : entry.day ?? 1;
  return nth >= 1 && nth <= nights ? nth : null;
}

/**
 * 旅程の全泊ぶんの枠を組み立てる。日帰り（0泊）なら空配列。
 *
 * 画面側はこの配列をそのまま並べればよく、「宿を出すかどうか」の
 * 条件判断を持たなくて済む。
 */
export function lodgingNights(opts: {
  entries: PlanEntry[];
  destination: string;
  tripDate: string;
  tripDayCount: number;
  /** 「宿を取らない」と決めた泊（1始まりの泊番号） */
  skipped?: number[];
  now: Date;
  affiliateId?: string;
}): LodgingNight[] {
  const nights = Math.max(0, Math.floor(opts.tripDayCount) - 1);
  if (nights === 0) return [];

  const pref = lodgingPrefecture(opts.entries, opts.destination);
  const id = opts.affiliateId ?? rakutenAffiliateId();
  const skipped = new Set(opts.skipped ?? []);
  const today = dateStr(opts.now);

  // 宿を泊番号へ割り当てる（同じ泊に複数あれば先勝ち）
  const byNight = new Map<number, PlanEntry>();
  for (const e of opts.entries) {
    const nth = nightIndexOf(e, opts.tripDate, nights);
    if (nth !== null && !byNight.has(nth)) byNight.set(nth, e);
  }

  const result: LodgingNight[] = [];
  for (let nth = 1; nth <= nights; nth++) {
    const checkIn = dateForDay(opts.tripDate, nth);
    const checkOut = dateForDay(opts.tripDate, nth + 1);
    const entry = byNight.get(nth);
    const isSkipped = skipped.has(nth);
    const past = checkOut < today;
    const decided = Boolean(entry) || isSkipped;
    result.push({
      nth,
      checkIn,
      checkOut,
      rangeLabel: `${formatDateStrJa(checkIn)} → ${formatDateStrJa(checkOut)}`,
      entry,
      skipped: isSkipped,
      past,
      tonight: checkIn === today,
      searchUrl:
        decided || past || !pref
          ? null
          : lodgingSearchUrl({ prefCode: pref.code, checkIn, checkOut }, id),
    });
  }
  return result;
}

/** 宿の決定状況。持ち物リストと同じ「あと何個」の見せ方に使う。 */
export function lodgingProgress(nights: LodgingNight[]): { done: number; total: number } {
  return {
    done: nights.filter((n) => Boolean(n.entry) || n.skipped).length,
    total: nights.length,
  };
}

/**
 * 旅がまだ始まっていないか。宿探しを促す文言の出し分けに使う
 * （旅行中は「今夜の宿」を前に出すなど）。
 */
export function beforeTrip(tripDate: string, tripDayCount: number, now: Date): boolean {
  return tripPhase(tripDate, tripDayCount, now).phase === "before";
}
