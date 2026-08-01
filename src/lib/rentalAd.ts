import { PlanEntry } from "./types";
import { BaseMode } from "./transit";
import { dateForDay, formatDateStrJa, tripPhase } from "./date";
import { rakutenAffiliateId } from "./ads";

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
 * **推測でコードを足さないこと。** 間違えるとユーザーはエラー画面に着地する。
 * 実際に楽天レンタカーで検索して発行されたURLで裏を取ってから足す。
 */

export interface RentalArea {
  /** 表示用の地名（例: 金沢） */
  label: string;
  /** 貸出の都道府県コード（gmarea） */
  pref: string;
  /** 貸出の小エリアコード（gsarea） */
  area: string;
}

/**
 * 地名 → 楽天レンタカーのエリアコード。
 *
 * **実際の検索URLで裏取りしたものだけを載せる。** 一覧を埋めたくなるが、
 * コードを間違えると検索が通らずエラー画面になるので、
 * 「載っていないから出ない」ほうが「出たけれど壊れている」より良い。
 */
const RENTAL_AREAS: Record<string, RentalArea> = {
  // 裏取り済み: cars.travel.rakuten.co.jp の検索結果URL（gmarea=ishikawa&gsarea=kanazawa）
  金沢: { label: "金沢", pref: "ishikawa", area: "kanazawa" },
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

  return {
    areaName: area.label,
    pickUp,
    dropOff,
    rangeLabel:
      pickUp === dropOff
        ? formatDateStrJa(pickUp)
        : `${formatDateStrJa(pickUp)} → ${formatDateStrJa(dropOff)}`,
    url,
  };
}
