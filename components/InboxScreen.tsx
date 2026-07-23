"use client";

import { MailItem } from "@/lib/types";
import { MODE_COLOR } from "@/lib/modeMeta";
import { formatMailSummary } from "@/lib/format";
import { MailStatusDot } from "./icons";
import { StatusBar } from "./StatusBar";

const STATUS_MICRO_LABEL: Record<MailItem["status"], string> = {
  new: "未解析",
  parsing: "解析中",
  done: "解析済",
  skip: "対象外",
  error: "要手入力",
};

export function InboxScreen({
  mails,
  onOpen,
  onAddMail,
}: {
  mails: MailItem[];
  onOpen: (id: string) => void;
  onAddMail: () => void;
}) {
  const unresolvedCount = mails.filter((m) => m.status === "new" || m.status === "error" || m.status === "parsing").length;
  const doneCount = mails.filter((m) => m.status === "done").length;

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="px-[26px] pb-3 pt-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-gothic text-[10px] tracking-[.2em] text-muted">TABI-NAVI</p>
            <h1 className="mt-1 font-mincho text-screen-heading text-ink">受信箱</h1>
          </div>
          <button
            onClick={onAddMail}
            aria-label="メールを追加"
            className="mt-1 flex h-7 w-7 items-center justify-center rounded-[8px] border border-ink/25"
          >
            <span className="relative block h-[10px] w-[10px]">
              <span className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 bg-ink" />
              <span className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-ink" />
            </span>
          </button>
        </div>
        <p className="mt-1 font-gothic text-[11px] tnum text-muted">
          未整理 {unresolvedCount}件 · 解析済 {doneCount}件
        </p>
      </div>
      <div className="h-px w-full bg-black/[.08]" />

      <div className="flex-1 overflow-y-auto px-[26px] pb-[66px]">
        {mails.map((mail) => {
          const isSkip = mail.status === "skip";
          const color = mail.status === "done" ? MODE_COLOR[mail.events[0]?.mode ?? "activity"] : undefined;
          return (
            <button
              key={mail.id}
              disabled={isSkip}
              onClick={() => onOpen(mail.id)}
              className="grid w-full grid-cols-[16px_1fr] gap-3 border-b border-black/[.06] py-4 text-left disabled:cursor-default"
            >
              <span className="pt-1.5">
                <MailStatusDot status={mail.status} color={color} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate font-mincho text-sender ${isSkip ? "text-muted-light" : "text-ink"}`}>{mail.source}</span>
                  <span className="shrink-0 font-gothic text-[9px] font-semibold text-muted">{STATUS_MICRO_LABEL[mail.status]}</span>
                </div>
                <div className="mt-0.5 truncate font-gothic text-[11px] text-muted">{mail.subject}</div>
                {mail.status === "done" && (
                  <div className="mt-1 font-mincho text-[12px] tnum" style={{ color }}>
                    {formatMailSummary(mail.events)}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
