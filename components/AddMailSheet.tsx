"use client";

import { useState } from "react";
import { ManualEntryForm } from "./ManualEntryForm";
import { ManualEventInput } from "@/lib/manualEntry";

type Mode = "paste" | "manual";

export function AddMailSheet({
  onClose,
  onAdd,
  onAddManual,
}: {
  onClose: () => void;
  onAdd: (body: string, source: string) => void;
  onAddManual: (input: ManualEventInput) => void;
}) {
  const [mode, setMode] = useState<Mode>("paste");
  const [source, setSource] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="absolute inset-0 z-20">
      <button aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-[rgba(28,25,21,.28)]" />
      <div className="absolute inset-x-0 bottom-0 max-h-[86%] overflow-y-auto rounded-t-sheet bg-sheet px-6 pb-8 pt-3 animate-sheetup">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-black/[.14]" />

        <div className="mb-5 flex gap-2">
          <button
            onClick={() => setMode("paste")}
            className={`flex-1 rounded-[10px] py-2 font-gothic text-[11px] font-medium ${
              mode === "paste" ? "bg-ink text-kinari" : "border border-black/[.1] text-muted"
            }`}
          >
            メールを貼り付け
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 rounded-[10px] py-2 font-gothic text-[11px] font-medium ${
              mode === "manual" ? "bg-ink text-kinari" : "border border-black/[.1] text-muted"
            }`}
          >
            手入力で追加
          </button>
        </div>

        {mode === "paste" ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!body.trim()) return;
              onAdd(body, source);
            }}
          >
            <p className="-mt-2 font-gothic text-[11px] text-muted">予約確認メールの本文をそのまま貼り付けてください。</p>
            <label className="flex flex-col gap-1">
              <span className="font-gothic text-[10px] text-muted">送信元（任意）</span>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="例: じゃらんnet"
                className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2 font-mincho text-[14px] text-ink"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-gothic text-[10px] text-muted">メール本文 *</span>
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                placeholder="メール本文をここに貼り付け"
                className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2 font-gothic text-[12px] leading-relaxed text-ink"
              />
            </label>
            <button type="submit" className="mt-1 rounded-[12px] bg-ink px-4 py-3 font-gothic text-[12px] font-medium text-kinari">
              受信箱に追加
            </button>
          </form>
        ) : (
          <ManualEntryForm
            intro="場所（住所推奨）と時刻を入力して旅程に追加します。住所を入れると移動時間や周辺スポットの提案も自動計算されます。"
            onSubmit={onAddManual}
          />
        )}
      </div>
    </div>
  );
}
