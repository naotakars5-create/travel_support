"use client";

import { useState } from "react";

export function AddMailSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (body: string, source: string) => void }) {
  const [source, setSource] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="absolute inset-0 z-20">
      <button aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-[rgba(28,25,21,.28)]" />
      <div className="absolute inset-x-0 bottom-0 max-h-[86%] overflow-y-auto rounded-t-sheet bg-sheet px-6 pb-8 pt-3 animate-sheetup">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-black/[.14]" />
        <h2 className="mb-1 font-mincho text-[18px] font-semibold text-ink">メールを貼り付け</h2>
        <p className="mb-4 font-gothic text-[11px] text-muted">予約確認メールの本文をそのまま貼り付けてください。</p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim()) return;
            onAdd(body, source);
          }}
        >
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
      </div>
    </div>
  );
}
