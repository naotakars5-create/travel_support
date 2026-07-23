"use client";

import { MailItem } from "@/lib/types";
import { MODE_COLOR } from "@/lib/modeMeta";
import { ManualEntryForm } from "./ManualEntryForm";
import { ManualEventInput } from "@/lib/manualEntry";
import { Tab } from "@/hooks/useAppState";

export function MailSheet({
  mail,
  onClose,
  onParse,
  onManualSubmit,
  onGoToItinerary,
}: {
  mail: MailItem;
  onClose: () => void;
  onParse: () => void;
  onManualSubmit: (input: ManualEventInput) => void;
  onGoToItinerary: (tab: Tab) => void;
}) {
  return (
    <div className="absolute inset-0 z-20">
      <button
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(28,25,21,.28)]"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[86%] overflow-y-auto rounded-t-sheet bg-sheet px-6 pb-8 pt-3 animate-sheetup">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-black/[.14]" />

        <div className="mb-5 flex items-center justify-between">
          <span className="font-mincho text-sender text-ink">{mail.source}</span>
          <StatusLabel status={mail.status} />
        </div>

        {mail.status === "new" && (
          <div className="flex flex-col gap-4">
            <p className="font-gothic text-[12px] leading-relaxed text-muted">
              「{mail.subject}」の本文をAIが読み取り、予約内容を旅程に組み込みます。
            </p>
            <button onClick={onParse} className="rounded-[12px] bg-ink px-4 py-3 font-gothic text-[12px] font-medium text-kinari">
              解析する
            </button>
          </div>
        )}

        {mail.status === "parsing" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-mode-bus/25 border-t-mode-bus" />
            <p className="font-gothic text-[11px] text-muted">解析中… 予約内容を読み取っています</p>
          </div>
        )}

        {mail.status === "done" && (
          <div className="flex flex-col gap-4">
            {mail.events.map((event) => (
              <div key={event.id} className="flex flex-col gap-2">
                {mail.events.length > 1 && (
                  <div className="font-mincho text-[13px] font-semibold text-ink">{event.title}</div>
                )}
                {event.confidence < 0.5 && (
                  <span className="w-fit rounded-full border border-mode-bus/60 px-2 py-0.5 font-gothic text-[9px] text-mode-bus">
                    要確認 · 抽出の確度が低い項目があります
                  </span>
                )}
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  {event.fields.map((f, i) => (
                    <FieldRow key={i} k={f.key} v={f.value} />
                  ))}
                  {event.placeFrom && <FieldRow k="出発地" v={event.placeFrom} />}
                  {event.placeTo && <FieldRow k="到着地" v={event.placeTo} />}
                  {event.reservationNo && <FieldRow k="予約番号" v={event.reservationNo} />}
                  {typeof event.price === "number" && <FieldRow k="料金" v={`${event.price.toLocaleString()}円`} />}
                </div>
              </div>
            ))}
            <button
              onClick={() => onGoToItinerary("itin")}
              className="rounded-[12px] border px-4 py-3 text-center font-gothic text-[12px] font-medium"
              style={{ borderColor: MODE_COLOR[mail.events[0]?.mode ?? "activity"], color: MODE_COLOR[mail.events[0]?.mode ?? "activity"] }}
            >
              旅程に追加済み — 旅程を見る
            </button>
          </div>
        )}

        {mail.status === "error" && (
          <div className="flex flex-col gap-4">
            <p className="font-gothic text-[12px] leading-relaxed text-mode-bus">{mail.errorMessage ?? "解析に失敗しました。"}</p>
            <ManualEntryForm onSubmit={onManualSubmit} />
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span className="font-gothic text-[11px] text-muted">{k}</span>
      <span className="font-mincho text-[13px] text-ink">{v}</span>
    </>
  );
}

function StatusLabel({ status }: { status: MailItem["status"] }) {
  const map: Record<MailItem["status"], string> = {
    new: "未解析",
    parsing: "解析中",
    done: "解析済",
    skip: "対象外",
    error: "要手入力",
  };
  const color: Record<MailItem["status"], string> = {
    new: "text-mode-bus",
    parsing: "text-mode-bus",
    done: "text-mode-rail",
    skip: "text-muted-light",
    error: "text-mode-bus",
  };
  return <span className={`font-gothic text-[10px] font-semibold ${color[status]}`}>{map[status]}</span>;
}
