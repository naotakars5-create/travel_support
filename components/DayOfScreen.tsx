"use client";

import { useEffect, useState } from "react";
import { DayOfState } from "@/lib/dayof";
import { computeCountdown } from "@/lib/dayof";
import { formatDurationMin } from "@/lib/itinerary";
import { formatJstTime, formatJstMonthDayJa } from "@/lib/date";
import { MODE_COLOR, MODE_LABEL } from "@/lib/modeMeta";
import { createSpotProvider, Spot } from "@/lib/spots";
import { StatusBar } from "./StatusBar";

export function DayOfScreen({
  state,
  now,
  onNavigateInbox,
  onRecordArrival,
}: {
  state: DayOfState;
  now: Date;
  onNavigateInbox: () => void;
  onRecordArrival: (nodeKey: string, place: string) => void;
}) {
  return (
    <div className="flex h-full flex-col text-day-text">
      <StatusBar dark />
      <div className="flex items-baseline justify-between px-[26px] pb-4 pt-1">
        <p className="font-gothic text-[11px] text-day-text2">{formatJstMonthDayJa(now)} · 大阪</p>
        <p className="font-gothic text-[11px] tnum text-day-text2">現在 {formatJstTime(now)}</p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-[26px]">
        {state.mode === "locked" && <LockedHero onNavigateInbox={onNavigateInbox} />}
        {state.mode === "move" && <MoveHero state={state} now={now} onRecordArrival={onRecordArrival} />}
        {state.mode === "free" && <FreeHero state={state} onRecordArrival={onRecordArrival} />}
        {state.mode === "done" && <DoneHero totalReservations={state.totalReservations} />}
      </div>
    </div>
  );
}

function LockedHero({ onNavigateInbox }: { onNavigateInbox: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-gothic text-[11px] tracking-[.08em] text-day-text2">未確定の予約があります</p>
      <h2 className="mt-4 font-mincho text-[30px] font-bold leading-tight text-day-text">
        次の行き先が
        <br />
        まだ決まっていません
      </h2>
      <p className="mt-4 font-gothic text-[12px] leading-relaxed text-day-text2">
        受信箱の未解析メールを解析すると、
        <br />
        旅程がつながり出発時刻を計算します。
      </p>
      <button
        onClick={onNavigateInbox}
        className="mt-8 rounded-[12px] border border-day-text/40 px-6 py-3 font-gothic text-[12px] text-day-text"
      >
        受信箱で解析する
      </button>
    </div>
  );
}

function MoveHero({
  state,
  now,
  onRecordArrival,
}: {
  state: Extract<DayOfState, { mode: "move" }>;
  now: Date;
  onRecordArrival: (nodeKey: string, place: string) => void;
}) {
  const { mm, ss } = computeCountdown(state.targetDepartAt, now);
  const modeColor = MODE_COLOR[state.transitMode];
  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-gothic text-[11px] tracking-[.08em] text-day-text2">次の移動まで</p>
      <div className="mt-3 font-mincho text-countdown tnum text-accent">
        {mm}
        <span className="animate-blink">:</span>
        {ss}
      </div>
      <p className="mt-2 font-gothic text-[10px] tracking-[.15em] text-day-text3">分 秒</p>

      <div className="mt-8 w-full rounded-[16px] border border-day-text/10 bg-day-text/[.04] p-4 text-left">
        <p className="font-mincho text-next-event text-day-text">{state.nextNode.place}</p>
        <div className="mt-2 flex items-center gap-2 font-gothic text-[11px] tnum text-day-text2">
          <span className="h-2 w-2 rounded-full" style={{ background: modeColor }} />
          <span>
            {state.currentNode?.place ?? "現在地"} → {state.nextNode.place} · {MODE_LABEL[state.transitMode]}
            {state.transitMin > 0 ? formatDurationMin(state.transitMin) : ""}
          </span>
        </div>
      </div>

      <button
        onClick={() => onRecordArrival(state.nextNode.key, state.nextNode.place)}
        className="mt-6 w-full rounded-[12px] border border-day-text/40 py-3 font-gothic text-[12px] text-day-text"
      >
        {state.nextNode.place} に到着を記録
      </button>
    </div>
  );
}

function FreeHero({
  state,
  onRecordArrival,
}: {
  state: Extract<DayOfState, { mode: "free" }>;
  onRecordArrival: (nodeKey: string, place: string) => void;
}) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const geo = state.currentNode.geo;

  useEffect(() => {
    let cancelled = false;
    const provider = createSpotProvider(Boolean(geo));
    provider.nearby(geo?.lat ?? 0, geo?.lng ?? 0, state.freeMin).then((res) => {
      if (!cancelled) setSpots(res);
    });
    return () => {
      cancelled = true;
    };
  }, [state.freeMin, geo]);

  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-gothic text-[11px] tracking-[.08em] text-day-text2">空き時間</p>
      <div className="mt-3 font-mincho text-free-large tnum text-day-text">{formatDurationMin(state.freeMin)}</div>
      <p className="mt-2 font-gothic text-[11px] tnum text-day-text2">
        次の予約 {formatJstTime(new Date(state.nextNode.time))} {state.nextNode.place} まで
      </p>

      {spots.length > 0 && (
        <div className="mt-7 w-full text-left">
          <p className="mb-2 font-gothic text-[10px] tracking-[.15em] text-day-text3">近くに寄れる場所</p>
          <div className="flex flex-col divide-y divide-day-text/10 rounded-[16px] border border-day-text/10">
            {spots.map((s) => (
              <div key={s.name} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-mincho text-[14px] text-day-text">{s.name}</p>
                  <p className="font-gothic text-[10px] text-day-text2">{s.note}</p>
                </div>
                <span className="font-gothic text-[11px] tnum text-day-text2">徒歩 {s.walkMin}分</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onRecordArrival(state.nextNode.key, state.nextNode.place)}
        className="mt-6 w-full rounded-[12px] border border-day-text/40 py-3 font-gothic text-[12px] text-day-text"
      >
        {state.nextNode.place} に到着を記録
      </button>
    </div>
  );
}

function DoneHero({ totalReservations }: { totalReservations: number }) {
  if (totalReservations === 0) {
    return (
      <div className="flex flex-col items-center text-center">
        <p className="font-gothic text-[11px] tracking-[.08em] text-day-text2">本日の予定</p>
        <h2 className="mt-4 font-mincho text-[26px] font-bold text-day-text">まだ予定がありません</h2>
        <p className="mt-4 font-gothic text-[12px] leading-relaxed text-day-text2">
          受信箱でメールを解析すると、
          <br />
          ここに旅程が表示されます。
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-gothic text-[11px] tracking-[.08em] text-day-text2">本日の予定</p>
      <h2 className="mt-4 font-mincho text-[30px] font-bold text-day-text">すべて完了</h2>
      <p className="mt-4 font-gothic text-[12px] leading-relaxed text-day-text2">
        {totalReservations}件の予約を、途切れなく巡りました。
        <br />
        お疲れさまでした。
      </p>
    </div>
  );
}
