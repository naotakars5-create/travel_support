import { PlanEntry } from "./types";
import { BaseMode } from "./transit";
import { dateForDay, formatDateStrJa, tripPhase } from "./date";
import { rakutenAffiliateId } from "./ads";
import { prefectureNameOfCode } from "./lodgingAd";

/**
 * 「電車・徒歩が基本の旅で、レンタカーがまだ登録されていない」ときに出す探す導線。
 *
 * ## baseMode の読み違いに注意
 *
 * `baseMode === "car"` は **マイカー**（自分の車でずっと移動する）という意味で、
 * この人たちにレンタカーを勧める理由は無い。レンタカーが要るのは
 * `baseMode === "walk"`（徒歩・電車が基本）を選んだうえで、
 * 一部の区間だけ車で回りたい人。地方都市の旅ではこれが実際に多い。
 *
 * 画面にはもともと「途中でレンタカーを借りるなら『＋レンタカー』で
 * 借りる〜返す時間を登録すると、その期間だけ車で計算します」という案内がある。
 * つまりアプリ側から既にレンタカーを勧めているので、その隣に
 * 「探す」を並べるのは自然な対で、宿泊先と同じ形になる。
 *
 * ## 宿と違って「市区」まで要る
 *
 * 楽天レンタカーの検索は**小エリア（gsarea）が必須**で、都道府県だけでは
 * 「入力パラメータが不正です」になる（実地確認済み）。都道府県まで分かれば
 * 出せた宿とは違い、市区まで特定できたときしか出せない。
 *
 * そのため `RENTAL_AREAS` に載っている地名が行き先に含まれるときだけ出す。
 *
 * ## 無効なエリアコードは県全体の検索に落ちる（実地確認済み）
 *
 * `gsarea` を**空**にすると「入力パラメータが不正です」になるが、
 * **値が入っていれば無効なコードでもエラーにはならず、都道府県全体の検索**
 * になる（naha / nagoya で確認）。つまり誤ったコードは致命傷ではない。
 *
 * ただし裏取りできていないコードで市区名をボタンに出すと、
 * 「那覇でレンタカーを探す」と書いてあるのに沖縄県全体が出る、という
 * 小さな嘘になる。そこで `verified` が付いていないエリアは
 * **都道府県名でボタンを出す**。表示と結果を必ず一致させる。
 */

export interface RentalArea {
  /** 表示用の地名（例: 金沢） */
  label: string;
  /** 貸出の都道府県コード（gmarea） */
  pref: string;
  /** 貸出の小エリアコード（gsarea） */
  area: string;
  /**
   * 実際の検索結果URLで「出発エリア: ◯◯県 > △△」まで出ることを確認済みか。
   * 未確認のものは市区が無視されて県全体の検索になるため、
   * ボタンには市区名ではなく都道府県名を出す。
   */
  verified?: boolean;
}

/**
 * 地名 → 楽天レンタカーのエリアコード。
 *
 * コードが外れても県全体の検索に落ちるだけなので（上記参照）、主要地域は
 * ローマ字から推定して載せてある。ただし**裏取りできたものだけ `verified`**
 * を付け、未確認のエリアはボタンの文言を県名にして実態と合わせる。
 */
const RENTAL_AREAS: Record<string, RentalArea> = {
  // ▼ verified: 実際の検索結果URLで「出発エリア: ◯◯県 > △△」まで出ることを確認済み
  金沢: { label: "金沢", pref: "ishikawa", area: "kanazawa", verified: true },
  帯広: { label: "帯広", pref: "hokkaido", area: "obihiro", verified: true },
  高松: { label: "高松", pref: "kagawa", area: "takamatsu", verified: true },
  札幌: { label: "札幌", pref: "hokkaido", area: "sapporo", verified: true },

  // ▼ 未確認。コード体系（ヘボン式ローマ字）から足したもので、当たれば市区、
  //    外れても県全体の検索に落ちるだけ（naha / nagoya は外れることを確認済み）。
  //    確認できたものから verified: true を付けていく。
  函館: { label: "函館", pref: "hokkaido", area: "hakodate" },
  旭川: { label: "旭川", pref: "hokkaido", area: "asahikawa" },
  釧路: { label: "釧路", pref: "hokkaido", area: "kushiro" },
  青森: { label: "青森", pref: "aomori", area: "aomori" },
  盛岡: { label: "盛岡", pref: "iwate", area: "morioka" },
  仙台: { label: "仙台", pref: "miyagi", area: "sendai" },
  秋田: { label: "秋田", pref: "akita", area: "akita" },
  山形: { label: "山形", pref: "yamagata", area: "yamagata" },
  郡山: { label: "郡山", pref: "fukushima", area: "koriyama" },
  水戸: { label: "水戸", pref: "ibaraki", area: "mito" },
  宇都宮: { label: "宇都宮", pref: "tochigi", area: "utsunomiya" },
  高崎: { label: "高崎", pref: "gunma", area: "takasaki" },
  成田: { label: "成田", pref: "chiba", area: "narita" },
  横浜: { label: "横浜", pref: "kanagawa", area: "yokohama" },
  新潟: { label: "新潟", pref: "niigata", area: "niigata" },
  富山: { label: "富山", pref: "toyama", area: "toyama" },
  福井: { label: "福井", pref: "fukui", area: "fukui" },
  甲府: { label: "甲府", pref: "yamanashi", area: "kofu" },
  長野: { label: "長野", pref: "nagano", area: "nagano" },
  松本: { label: "松本", pref: "nagano", area: "matsumoto" },
  高山: { label: "高山", pref: "gifu", area: "takayama" },
  静岡: { label: "静岡", pref: "shizuoka", area: "shizuoka" },
  浜松: { label: "浜松", pref: "shizuoka", area: "hamamatsu" },
  名古屋: { label: "名古屋", pref: "aichi", area: "nagoya" },
  伊勢: { label: "伊勢", pref: "mie", area: "ise" },
  大津: { label: "大津", pref: "shiga", area: "otsu" },
  京都: { label: "京都", pref: "kyoto", area: "kyoto" },
  大阪: { label: "大阪", pref: "osaka", area: "osaka" },
  神戸: { label: "神戸", pref: "hyogo", area: "kobe" },
  姫路: { label: "姫路", pref: "hyogo", area: "himeji" },
  奈良: { label: "奈良", pref: "nara", area: "nara" },
  和歌山: { label: "和歌山", pref: "wakayama", area: "wakayama" },
  白浜: { label: "白浜", pref: "wakayama", area: "shirahama" },
  鳥取: { label: "鳥取", pref: "tottori", area: "tottori" },
  米子: { label: "米子", pref: "tottori", area: "yonago" },
  松江: { label: "松江", pref: "shimane", area: "matsue" },
  出雲: { label: "出雲", pref: "shimane", area: "izumo" },
  岡山: { label: "岡山", pref: "okayama", area: "okayama" },
  倉敷: { label: "倉敷", pref: "okayama", area: "kurashiki" },
  広島: { label: "広島", pref: "hiroshima", area: "hiroshima" },
  福山: { label: "福山", pref: "hiroshima", area: "fukuyama" },
  下関: { label: "下関", pref: "yamaguchi", area: "shimonoseki" },
  徳島: { label: "徳島", pref: "tokushima", area: "tokushima" },
  松山: { label: "松山", pref: "ehime", area: "matsuyama" },
  高知: { label: "高知", pref: "kochi", area: "kochi" },
  福岡: { label: "福岡", pref: "fukuoka", area: "fukuoka" },
  北九州: { label: "北九州", pref: "fukuoka", area: "kitakyushu" },
  佐賀: { label: "佐賀", pref: "saga", area: "saga" },
  長崎: { label: "長崎", pref: "nagasaki", area: "nagasaki" },
  佐世保: { label: "佐世保", pref: "nagasaki", area: "sasebo" },
  熊本: { label: "熊本", pref: "kumamoto", area: "kumamoto" },
  阿蘇: { label: "阿蘇", pref: "kumamoto", area: "aso" },
  大分: { label: "大分", pref: "oita", area: "oita" },
  別府: { label: "別府", pref: "oita", area: "beppu" },
  宮崎: { label: "宮崎", pref: "miyazaki", area: "miyazaki" },
  鹿児島: { label: "鹿児島", pref: "kagoshima", area: "kagoshima" },
  那覇: { label: "那覇", pref: "okinawa", area: "naha" },
  石垣: { label: "石垣", pref: "okinawa", area: "ishigaki" },
  宮古島: { label: "宮古島", pref: "okinawa", area: "miyakojima" },
};

// 長い地名から先に照合する（region.ts と同じ考え方）
const RENTAL_AREA_KEYS = Object.keys(RENTAL_AREAS).sort((a, b) => b.length - a.length);

/** 行き先の文字列から、レンタカーの貸出エリアを特定する。載っていなければ null。 */
export function rentalArea(texts: (string | undefined)[]): RentalArea | null {
  for (const t of texts) {
    const text = t?.trim();
    if (!text) continue;
    const key = RENTAL_AREA_KEYS.find((k) => text.includes(k));
    if (key) return RENTAL_AREAS[key];
  }
  return null;
}

/** レンタカーを探す導線を出してよいか。 */
export function needsRental(
  entries: PlanEntry[],
  baseMode: BaseMode,
  tripDate: string,
  tripDayCount: number,
  now: Date
): boolean {
  if (baseMode !== "walk") return false; // マイカーの旅には勧めない
  if (entries.some((e) => e.mode === "rental")) return false; // もう登録済み
  const phase = tripPhase(tripDate, tripDayCount, now).phase;
  return phase === "before" || phase === "during"; // 旅行中に「やっぱり車が要る」もある
}

/**
 * 楽天レンタカーの検索URL（楽天アフィリエイトのラッパー経由）。
 * アフィリエイトID未設定・エリア不明なら null＝ボタンを出さない。
 *
 * パラメータは実際の検索結果URLから起こしてある。**宿とは別サイト**なので注意:
 *
 *   ドメイン  cars.travel.rakuten.co.jp（travel.rakuten.co.jp/cars/ は 404）
 *   パス      /cars/rcf010a.do
 *   gmarea    貸出の都道府県コード（ishikawa）
 *   gsarea    貸出の小エリアコード（kanazawa）。**空にすると入力エラーになる**
 *   gdatey/gdatem/gdated   借りる日（年・月・日をばらして渡す）
 *   bdatey/bdatem/bdated   返す日
 *   gtimeh/gtimem          借りる時刻（既定 10:00）
 *   btimeh/btimem          返す時刻（既定 17:00）
 *
 * 意味の分からないパラメータ（tid・rbt・atmt・searchid など）は、実際の検索が
 * 発行した値をそのまま残している。宿のときエンドポイントを変えただけで
 * エリアが既定値（北海道）に化けた前例があるので、動く形からは不用意に削らない。
 *
 * @param affiliateId テスト用に上書きできるようにしてある。
 */
export function rentalSearchUrl(
  opts: { prefCode: string; areaCode: string; pickUp: string; dropOff: string },
  affiliateId: string = rakutenAffiliateId()
): string | null {
  const id = affiliateId.trim();
  if (!id) return null;
  const from = splitDate(opts.pickUp);
  const to = splitDate(opts.dropOff);
  if (!opts.prefCode.trim() || !opts.areaCode.trim() || !from || !to) return null;

  // React Native の URLSearchParams は実装が不完全なので、mapsLink.ts と同じく手で組む
  const q = [
    `num=50`,
    `type=0`,
    `display=0`,
    `gdarea=`,
    `bdarea=`,
    `gsarea=${encodeURIComponent(opts.areaCode.trim())}`,
    `bsarea=`,
    `tid=1`,
    `f_teikei=`,
    `gdated=${from.d}`,
    `gdatem=${from.m}`,
    `gdatey=${from.y}`,
    `bdated=${to.d}`,
    `bdatem=${to.m}`,
    `bdatey=${to.y}`,
    `subtype=0`,
    `gmarea=${encodeURIComponent(opts.prefCode.trim())}`,
    `goflg=0`,
    `bairport=`,
    `searchid=1`,
    `searchid=2`,
    `searchid=3`,
    `rbt=6`,
    `atmt=1`,
    `gtimeh=10`,
    `gtimem=00`,
    `btimeh=17`,
    `btimem=00`,
  ].join("&");
  const target = `https://cars.travel.rakuten.co.jp/cars/rcf010a.do?${q}`;
  return `https://hb.afl.rakuten.co.jp/hgc/${encodeURIComponent(id)}/?pc=${encodeURIComponent(target)}`;
}

/** YYYY-MM-DD を年・月・日（ゼロ埋めのまま）に割る。形式が違えば null。 */
function splitDate(s: string): { y: string; m: string; d: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  return m ? { y: m[1], m: m[2], d: m[3] } : null;
}

export interface RentalAd {
  /** 表示用の地名（例: 金沢） */
  areaName: string;
  /** 借りる日（YYYY-MM-DD） */
  pickUp: string;
  /** 返す日（YYYY-MM-DD） */
  dropOff: string;
  /** ボタンに出す日付の表記 */
  rangeLabel: string;
  /** 遷移先 */
  url: string;
}

/**
 * レンタカーを探す導線の内容。条件を満たさない・提携ID未設定・
 * エリア不明なら null。画面側はこの戻り値が null かだけを見ればよい。
 */
export function rentalAd(opts: {
  entries: PlanEntry[];
  destination: string;
  baseMode: BaseMode;
  tripDate: string;
  tripDayCount: number;
  now: Date;
  affiliateId?: string;
}): RentalAd | null {
  const { entries, destination, baseMode, tripDate, tripDayCount, now } = opts;
  if (!needsRental(entries, baseMode, tripDate, tripDayCount, now)) return null;

  const area = rentalArea([destination, ...entries.map((e) => e.place), ...entries.map((e) => e.title)]);
  if (!area) return null;

  const pickUp = tripDate;
  const dropOff = dateForDay(tripDate, Math.max(1, Math.floor(tripDayCount)));
  const url = rentalSearchUrl(
    { prefCode: area.pref, areaCode: area.area, pickUp, dropOff },
    opts.affiliateId ?? rakutenAffiliateId()
  );
  if (!url) return null;

  // 裏取りできていないエリアは市区が無視されて県全体の検索になる。
  // ボタンの文言も県名にして、表示と結果を一致させる
  const areaName = area.verified ? area.label : prefectureNameOfCode(area.pref) ?? area.label;

  return {
    areaName,
    pickUp,
    dropOff,
    rangeLabel:
      pickUp === dropOff
        ? formatDateStrJa(pickUp)
        : `${formatDateStrJa(pickUp)} → ${formatDateStrJa(dropOff)}`,
    url,
  };
}
