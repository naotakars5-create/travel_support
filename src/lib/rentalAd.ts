import { PlanEntry } from "./types";
import { BaseMode } from "./transit";
import { dateForDay, formatDateStrJa, tripPhase } from "./date";
import { rakutenAffiliateId } from "./ads";
import { LodgingPrefecture } from "./lodgingAd";

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
 * 宿と同じく、登録されたら消える。
 */

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
 * 楽天トラベル レンタカーの検索URL（楽天アフィリエイトのラッパー経由）。
 * アフィリエイトID未設定・都道府県不明なら null＝ボタンを出さない。
 *
 * 注: 遷移先のクエリ名は**実際の検索結果URLで裏取りするまで暫定**。
 * 宿のときに `/ds/yado/japan` へ投げて日付もエリアも黙って無視され、
 * 既定の北海道の結果が返っていた前例があるので、
 * **必ずブラウザで開いて、指定した県と日付が反映されているか確認すること。**
 *
 * @param affiliateId テスト用に上書きできるようにしてある。
 */
export function rentalSearchUrl(
  opts: { prefCode: string; pickUp: string; dropOff: string },
  affiliateId: string = rakutenAffiliateId()
): string | null {
  const id = affiliateId.trim();
  if (!id) return null;
  const from = compactDate(opts.pickUp);
  const to = compactDate(opts.dropOff);
  if (!opts.prefCode.trim() || !from || !to) return null;

  const q = [`f_pref=${encodeURIComponent(opts.prefCode.trim())}`, `f_start=${from}`, `f_end=${to}`].join("&");
  const target = `https://travel.rakuten.co.jp/cars/search/?${q}`;
  return `https://hb.afl.rakuten.co.jp/hgc/${encodeURIComponent(id)}/?pc=${encodeURIComponent(target)}`;
}

/** YYYY-MM-DD → YYYYMMDD。形式が違えば null。 */
function compactDate(s: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  return m ? `${m[1]}${m[2]}${m[3]}` : null;
}

export interface RentalAd {
  /** 対象の都道府県名（ボタンにも出す） */
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
 * 都道府県不明なら null。画面側はこの戻り値が null かだけを見ればよい。
 */
export function rentalAd(opts: {
  entries: PlanEntry[];
  baseMode: BaseMode;
  tripDate: string;
  tripDayCount: number;
  now: Date;
  /** 宿と同じ判定結果を使い回す（lodgingPrefecture の戻り値） */
  prefecture: LodgingPrefecture | null;
  affiliateId?: string;
}): RentalAd | null {
  const { entries, baseMode, tripDate, tripDayCount, now, prefecture } = opts;
  if (!needsRental(entries, baseMode, tripDate, tripDayCount, now)) return null;
  if (!prefecture) return null;

  const pickUp = tripDate;
  const dropOff = dateForDay(tripDate, Math.max(1, Math.floor(tripDayCount)));
  const url = rentalSearchUrl(
    { prefCode: prefecture.code, pickUp, dropOff },
    opts.affiliateId ?? rakutenAffiliateId()
  );
  if (!url) return null;

  return {
    areaName: prefecture.name,
    pickUp,
    dropOff,
    rangeLabel:
      pickUp === dropOff
        ? formatDateStrJa(pickUp)
        : `${formatDateStrJa(pickUp)} → ${formatDateStrJa(dropOff)}`,
    url,
  };
}
