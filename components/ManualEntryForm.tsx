"use client";

import { useState } from "react";
import { TransportMode } from "@/lib/types";
import { ManualEventInput } from "@/lib/manualEntry";

const MODE_OPTIONS: { value: TransportMode; label: string }[] = [
  { value: "air", label: "飛行機" },
  { value: "rail", label: "鉄道" },
  { value: "bus", label: "バス" },
  { value: "car", label: "車" },
  { value: "walk", label: "徒歩" },
  { value: "stay", label: "宿泊" },
  { value: "dining", label: "食事" },
  { value: "activity", label: "観光" },
];

export function ManualEntryForm({ onSubmit }: { onSubmit: (input: ManualEventInput) => void }) {
  const [mode, setMode] = useState<TransportMode>("stay");
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [placeFrom, setPlaceFrom] = useState("");
  const [placeTo, setPlaceTo] = useState("");
  const [detail, setDetail] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ mode, title, startAt, endAt: endAt || undefined, placeFrom: placeFrom || undefined, placeTo: placeTo || undefined, detail: detail || undefined });
      }}
    >
      <p className="font-gothic text-[11px] text-muted">自動解析できなかったため、内容を手入力してください。</p>
      <label className="flex flex-col gap-1">
        <span className="font-gothic text-[10px] text-muted">種別</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as TransportMode)}
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2 font-gothic text-[13px] text-ink"
        >
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-gothic text-[10px] text-muted">タイトル *</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: ホテル日航大阪"
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2 font-mincho text-[14px] text-ink"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-gothic text-[10px] text-muted">開始日時 *</span>
          <input
            required
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="rounded-[10px] border border-black/[.1] bg-white/60 px-2 py-2 font-mincho text-[13px] tnum text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-gothic text-[10px] text-muted">終了日時</span>
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="rounded-[10px] border border-black/[.1] bg-white/60 px-2 py-2 font-mincho text-[13px] tnum text-ink"
          />
        </label>
      </div>
      {(mode === "air" || mode === "rail" || mode === "bus" || mode === "car") && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-gothic text-[10px] text-muted">出発地</span>
            <input
              value={placeFrom}
              onChange={(e) => setPlaceFrom(e.target.value)}
              className="rounded-[10px] border border-black/[.1] bg-white/60 px-2 py-2 font-mincho text-[13px] text-ink"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-gothic text-[10px] text-muted">到着地</span>
            <input
              value={placeTo}
              onChange={(e) => setPlaceTo(e.target.value)}
              className="rounded-[10px] border border-black/[.1] bg-white/60 px-2 py-2 font-mincho text-[13px] text-ink"
            />
          </label>
        </div>
      )}
      <label className="flex flex-col gap-1">
        <span className="font-gothic text-[10px] text-muted">詳細</span>
        <input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="例: 予約番号 / 座席 など"
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2 font-gothic text-[12px] text-ink"
        />
      </label>
      <button type="submit" className="mt-1 rounded-[12px] bg-ink px-4 py-3 font-gothic text-[12px] font-medium text-kinari">
        旅程に追加
      </button>
    </form>
  );
}
