import { Platform } from "react-native";
import { PlanEntry, ScheduleSlot } from "./types";
import { dateForDay, formatDateStrJa, formatJstTime, tripRangeLabel } from "./date";
import { effectiveStayMin, entryDurationMin, entryPlaceText } from "./plan";
import { MODE_LABEL } from "./modeMeta";

/**
 * 旅程を「画像1枚」にして配るためのデータ組み立てと描画。
 *
 * 共有の相手は2種類いる:
 *  - このアプリを使っている人 … リンクを送れば旅程がそのまま開く（share.ts）
 *  - 使っていない人           … リンクを踏んでもらえないことが多いので、画像で渡す
 *
 * ここは後者のための実装。データ作り（純粋関数）と描画（Web の canvas）を分けてあり、
 * 前者だけをテストできる。
 */

export interface ItineraryImageStop {
  /** その日の通し番号（宿の出発は0） */
  num: number;
  /** "09:30" または "09:30–10:30" */
  time: string;
  title: string;
  place?: string;
  /** 種別（観光・食事・宿泊など） */
  modeLabel: string;
}

export interface ItineraryImageDay {
  day: number;
  /** "7月28日(火)" */
  dateLabel: string;
  stops: ItineraryImageStop[];
}

export interface ItineraryImageData {
  title: string;
  /** "7月28日(火) 〜 7月30日(木) · 3日間" */
  subtitle: string;
  days: ItineraryImageDay[];
}

/**
 * 行き先と時刻割り当てから、画像に描くための日ごとの一覧を作る。
 * レンタカー（借りている期間であって地点ではない）は除く。
 * 時刻が未割り当ての行き先も「時刻未定」として最後に載せる（黙って消さない）。
 */
export function buildItineraryImageData(
  entries: PlanEntry[],
  slots: ScheduleSlot[],
  tripDate: string,
  tripDayCount: number,
  title: string
): ItineraryImageData {
  const slotBy = new Map(slots.map((s) => [s.entryId, s]));
  const visible = entries.filter((e) => e.mode !== "rental");

  const byDay = new Map<number, { sortKey: number; stop: Omit<ItineraryImageStop, "num"> }[]>();
  for (const e of visible) {
    const slot = slotBy.get(e.id);
    const iso = slot?.arriveAt ?? e.arriveBy;
    const start = iso ? new Date(iso) : null;
    const valid = start && !Number.isNaN(start.getTime());

    // 何日目か: 明示指定 → 時刻から逆算 → 1日目
    let day = e.day && e.day > 0 ? e.day : 0;
    if (!day && valid) {
      const base = new Date(`${tripDate}T00:00`);
      const diff = Math.floor((start.getTime() - base.getTime()) / 86400000);
      day = diff >= 0 ? diff + 1 : 1;
    }
    if (!day) day = 1;
    day = Math.min(Math.max(1, day), Math.max(1, tripDayCount));

    let time = "時刻未定";
    if (valid) {
      const durMin = e.mode === "stay" ? 0 : entryDurationMin(e) || effectiveStayMin(e);
      time =
        durMin > 0
          ? `${formatJstTime(start)}–${formatJstTime(new Date(start.getTime() + durMin * 60000))}`
          : formatJstTime(start);
    }

    const place = entryPlaceText(e);
    const arr = byDay.get(day) ?? [];
    arr.push({
      sortKey: valid ? start.getTime() : Number.MAX_SAFE_INTEGER,
      stop: {
        time,
        title: e.title || place,
        place: place && place !== e.title ? place : undefined,
        modeLabel: MODE_LABEL[e.mode] ?? "",
      },
    });
    byDay.set(day, arr);
  }

  const days: ItineraryImageDay[] = [...byDay.keys()]
    .sort((a, b) => a - b)
    .map((day) => ({
      day,
      dateLabel: formatDateStrJa(dateForDay(tripDate, day)),
      stops: byDay
        .get(day)!
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((x, i) => ({ num: i + 1, ...x.stop })),
    }));

  return {
    title: title.trim() || "旅のしおり",
    subtitle: `${tripRangeLabel(tripDate, tripDayCount)}${tripDayCount > 1 ? ` · ${tripDayCount}日間` : ""}`,
    days,
  };
}

// --- 描画（Web のみ。canvas が無い環境では null を返す） ---

const W = 1080;
const PAD = 56;
const COLOR = {
  bg: "#F5EAD6",
  ink: "#1A1A1A",
  muted: "#6F625A",
  accent: "#DD5967",
  coral: "#F69B96",
  card: "#FFFFFF",
};

/** 画像の高さを内容から先に見積もる（canvas は後から高さを変えられないため）。 */
function measureHeight(data: ItineraryImageData): number {
  let h = PAD + 62 + 34 + 28; // タイトル + 日付 + 余白
  for (const d of data.days) {
    h += 52; // 日の見出し
    for (const s of d.stops) h += s.place ? 92 : 70;
    h += 18;
  }
  return h + 70 + PAD; // フッター
}

/** 長い文字列を幅に収まるよう切り詰める（末尾に…）。 */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/**
 * 旅程を1枚のPNG画像にする。Web 以外・canvas が使えない環境では null。
 * フォントはアプリと同じものを使い、読み込み完了を待ってから描く
 * （待たないと日本語が別フォントで描かれてしまう）。
 */
export async function renderItineraryImage(data: ItineraryImageData): Promise<Blob | null> {
  if (Platform.OS !== "web" || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
  } catch {
    // フォント待ちに失敗しても、代替フォントで描ければ十分
  }

  const H = measureHeight(data);
  canvas.width = W;
  canvas.height = H;

  const mincho = (size: number, weight = 600) => `${weight} ${size}px ZenOldMincho_${weight}SemiBold, serif`;
  const gothic = (size: number, weight = 400) =>
    `${weight} ${size}px NotoSansJP_${weight}${weight === 400 ? "Regular" : weight === 500 ? "Medium" : "Bold"}, sans-serif`;

  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  let y = PAD + 52;
  ctx.fillStyle = COLOR.ink;
  ctx.font = mincho(46, 700);
  ctx.fillText(ellipsize(ctx, data.title, W - PAD * 2), PAD, y);

  y += 40;
  ctx.fillStyle = COLOR.muted;
  ctx.font = gothic(24);
  ctx.fillText(data.subtitle, PAD, y);

  y += 20;
  ctx.fillStyle = COLOR.coral;
  ctx.fillRect(PAD, y, W - PAD * 2, 2);
  y += 30;

  for (const d of data.days) {
    // 日の見出し（ローズの角ラベル）
    const label = `DAY ${d.day}`;
    ctx.font = gothic(22, 700);
    const lw = ctx.measureText(label).width + 26;
    ctx.fillStyle = COLOR.accent;
    ctx.beginPath();
    ctx.roundRect(PAD, y, lw, 34, 8);
    ctx.fill();
    ctx.fillStyle = COLOR.bg;
    ctx.fillText(label, PAD + 13, y + 24);
    ctx.fillStyle = COLOR.ink;
    ctx.font = gothic(24, 500);
    ctx.fillText(d.dateLabel, PAD + lw + 16, y + 24);
    y += 52;

    for (const s of d.stops) {
      const rowH = s.place ? 92 : 70;
      // 番号の丸
      ctx.fillStyle = COLOR.coral;
      ctx.beginPath();
      ctx.arc(PAD + 18, y + 22, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLOR.ink;
      ctx.font = gothic(20, 700);
      const nw = ctx.measureText(String(s.num)).width;
      ctx.fillText(String(s.num), PAD + 18 - nw / 2, y + 29);

      // 時刻
      ctx.fillStyle = COLOR.muted;
      ctx.font = gothic(23, 500);
      ctx.fillText(s.time, PAD + 50, y + 22);
      const timeW = ctx.measureText(s.time).width;

      // 種別
      if (s.modeLabel) {
        ctx.fillStyle = COLOR.muted;
        ctx.font = gothic(20);
        ctx.fillText(`· ${s.modeLabel}`, PAD + 50 + timeW + 14, y + 22);
      }

      // 行き先
      ctx.fillStyle = COLOR.ink;
      ctx.font = mincho(30, 600);
      ctx.fillText(ellipsize(ctx, s.title, W - PAD * 2 - 50), PAD + 50, y + 56);

      if (s.place) {
        ctx.fillStyle = COLOR.muted;
        ctx.font = gothic(20);
        ctx.fillText(ellipsize(ctx, s.place, W - PAD * 2 - 50), PAD + 50, y + 84);
      }
      y += rowH;
    }
    y += 18;
  }

  // フッター
  ctx.fillStyle = COLOR.coral;
  ctx.fillRect(PAD, H - PAD - 46, W - PAD * 2, 2);
  ctx.fillStyle = COLOR.muted;
  ctx.font = gothic(21);
  ctx.fillText("旅ナビ / TABI-NAVI でつくった旅程", PAD, H - PAD - 12);

  return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/**
 * 画像を共有する。端末の共有シート（ファイル添付）が使えればそれを使い、
 * 使えなければダウンロードへ落とす。
 */
export async function shareImageBlob(
  blob: Blob,
  fileName: string,
  title: string
): Promise<"shared" | "cancelled" | "downloaded" | "failed"> {
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & {
          share?: (d: unknown) => Promise<void>;
          canShare?: (d: unknown) => boolean;
        })
      : undefined;
  const file = typeof File !== "undefined" ? new File([blob], fileName, { type: "image/png" }) : null;

  if (file && nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
      // 共有に失敗したらダウンロードへ落とす
    }
  }

  if (typeof document === "undefined" || typeof URL?.createObjectURL !== "function") return "failed";
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
