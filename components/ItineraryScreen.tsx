"use client";

import { RailItem } from "@/lib/itinerary";
import { computeStats, formatDurationMin } from "@/lib/itinerary";
import { MODE_COLOR, MODE_DASHED, MODE_LABEL } from "@/lib/modeMeta";
import { formatJstHeadingJa, formatJstTime } from "@/lib/date";
import { RailNodeDot } from "./icons";
import { StatusBar } from "./StatusBar";

const MUTED_LIGHT = "#b7b0a3";
const INK = "#2a2622";

function lineStyleFor(item: RailItem | undefined): { color: string; dashed: boolean } | null {
  if (!item) return null;
  if (item.type === "edge") return { color: MODE_COLOR[item.mode], dashed: Boolean(MODE_DASHED[item.mode]) };
  if (item.type === "gap") {
    if (item.kind === "free") return { color: MUTED_LIGHT, dashed: true };
    return { color: INK, dashed: true };
  }
  return null;
}

function LineHalf({ style, side }: { style: { color: string; dashed: boolean } | null; side: "top" | "bottom" }) {
  const base = "absolute left-1/2 w-[2px] -translate-x-1/2";
  const pos = side === "top" ? "top-0 h-1/2" : "bottom-0 h-1/2";
  if (!style) return <span className={`${base} ${pos}`} />;
  return (
    <span
      className={`${base} ${pos}`}
      style={
        style.dashed
          ? { backgroundImage: `repeating-linear-gradient(to bottom, ${style.color} 0 4px, transparent 4px 8px)` }
          : { backgroundColor: style.color }
      }
    />
  );
}

function LineFull({ style }: { style: { color: string; dashed: boolean } | null }) {
  const base = "absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2";
  if (!style) return <span className={base} />;
  return (
    <span
      className={base}
      style={
        style.dashed
          ? { backgroundImage: `repeating-linear-gradient(to bottom, ${style.color} 0 4px, transparent 4px 8px)` }
          : { backgroundColor: style.color }
      }
    />
  );
}

export function ItineraryScreen({
  rail,
  currentNodeKey,
  justAddedEventId,
  onNavigateInbox,
}: {
  rail: RailItem[];
  currentNodeKey: string | null;
  justAddedEventId: string | null;
  onNavigateInbox: () => void;
}) {
  const stats = computeStats(rail);
  const heading = formatJstHeadingJa(new Date());
  const currentNode = rail.find((i) => i.type === "node" && i.key === currentNodeKey);
  const currentIndex = currentNode && currentNode.type === "node" ? currentNode.nodeIndex : -1;

  const subLine =
    stats.unconfirmedCount > 0
      ? `予約${stats.reservationCount}件 · 未確定${stats.unconfirmedCount}件`
      : `予約${stats.reservationCount}件 · 空き${stats.gapCount}件 · 総移動${formatDurationMin(stats.totalTransitMin)}`;

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="px-[26px] pb-3 pt-1">
        <div className="flex items-baseline justify-between">
          <p className="font-gothic text-[11px] text-muted">{heading}</p>
        </div>
        <h1 className="mt-1 font-mincho text-screen-heading text-ink">大阪 一日目</h1>
        <p className="mt-1 font-gothic text-[11px] tnum text-muted">{subLine}</p>
      </div>
      <div className="h-px w-full bg-black/[.08]" />

      <div className="flex-1 overflow-y-auto px-[26px] pb-[80px] pt-2">
        {rail.length === 0 && (
          <p className="mt-10 text-center font-gothic text-[12px] text-muted">
            まだ予定がありません。受信箱でメールを解析すると、ここに旅程が表示されます。
          </p>
        )}
        {rail.map((item, i) => {
          const prev = rail[i - 1];
          const next = rail[i + 1];

          if (item.type === "node") {
            const isCurrent = item.key === currentNodeKey;
            const isPast = !isCurrent && item.nodeIndex < currentIndex;
            const justAdded = item.event.id === justAddedEventId;
            return (
              <div key={item.key} className={`grid grid-cols-rail ${justAdded ? "animate-nodein" : ""}`} style={{ minHeight: 64 }}>
                <div className="pt-1 pr-2 text-right font-mincho text-rail-time tnum text-ink">{formatJstTime(new Date(item.time))}</div>
                <div className="relative">
                  <LineHalf style={lineStyleFor(prev)} side="top" />
                  <LineHalf style={lineStyleFor(next)} side="bottom" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <RailNodeDot current={isCurrent} />
                  </div>
                </div>
                <div className="pb-4 pl-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-mincho text-node-title ${isPast ? "text-muted-light" : "text-ink"}`}>{item.place}</span>
                    {isCurrent && (
                      <span className="rounded-full border border-ink px-2 py-[1px] font-gothic text-[9px] text-ink">現在地</span>
                    )}
                    {item.confidence < 0.5 && (
                      <span className="rounded-full border border-mode-bus px-2 py-[1px] font-gothic text-[9px] text-mode-bus">要確認</span>
                    )}
                  </div>
                  {item.sub && <p className="mt-0.5 font-gothic text-[11px] text-muted">{item.sub}</p>}
                </div>
              </div>
            );
          }

          if (item.type === "edge") {
            const style = lineStyleFor(item);
            return (
              <div key={`edge-${i}`} className="grid grid-cols-rail" style={{ minHeight: 40 }}>
                <div />
                <div className="relative">
                  <LineFull style={style} />
                </div>
                <div className="flex items-center pb-2 pl-1">
                  <span className="font-gothic text-[11px] tnum" style={{ color: style?.color }}>
                    {MODE_LABEL[item.mode]} · {formatDurationMin(item.durationMin)}
                  </span>
                </div>
              </div>
            );
          }

          // gap
          const style = lineStyleFor(item);
          const isConflict = item.kind === "conflict";
          const isUnconfirmed = item.kind === "unconfirmed";
          return (
            <div key={`gap-${i}`} className="grid grid-cols-rail" style={{ minHeight: 56 }}>
              <div />
              <div className="relative">
                <LineFull style={style} />
              </div>
              <div className="flex items-center py-2 pl-1">
                {isConflict ? (
                  <span className="rounded-[10px] border border-ink px-3 py-1.5 font-gothic text-[11px] text-ink">
                    {item.durationMin < 0 ? "予定が重なっています" : "移動時間が足りない可能性があります"}
                  </span>
                ) : isUnconfirmed ? (
                  <button
                    onClick={onNavigateInbox}
                    className="rounded-[10px] border border-ink px-3 py-1.5 text-left font-gothic text-[11px] text-ink"
                  >
                    未確定 · 受信箱で予約を解析
                  </button>
                ) : (
                  <span className="rounded-[10px] border border-muted-light px-3 py-1.5 font-gothic text-[11px] tnum text-muted">
                    空き時間 · {formatDurationMin(item.durationMin)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
