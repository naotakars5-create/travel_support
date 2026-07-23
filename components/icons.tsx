/** 幾何形のみで構成するアイコン群（円・正方形・線・リング）。アイコンライブラリは使わない。 */

export function MailStatusDot({ status, color }: { status: "done" | "parsing" | "new" | "skip" | "error"; color?: string }) {
  if (status === "done") {
    return <span className="inline-block h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: color ?? "#4f7a5b" }} />;
  }
  if (status === "parsing") {
    return (
      <span
        className="inline-block h-[9px] w-[9px] shrink-0 rounded-full border-2 border-mode-bus/35 border-t-mode-bus animate-spin"
        aria-hidden
      />
    );
  }
  if (status === "skip") {
    return <span className="inline-block h-2 w-2 shrink-0 rounded-[2px] border border-muted-light" />;
  }
  // new / error
  return <span className="inline-block h-[9px] w-[9px] shrink-0 rounded-full border-2 border-mode-bus" />;
}

export function RailNodeDot({ current, dark }: { current: boolean; dark?: boolean }) {
  if (current) {
    return (
      <span className="relative inline-flex h-[13px] w-[13px] items-center justify-center">
        <span className="absolute inline-flex h-full w-full rounded-full bg-ink/50 animate-pulse" />
        <span className={`relative inline-block h-[13px] w-[13px] rounded-full ${dark ? "bg-day-text" : "bg-ink"}`} />
      </span>
    );
  }
  return (
    <span
      className={`inline-block h-[13px] w-[13px] rounded-full border-[2.5px] ${
        dark ? "bg-day-bg border-day-text2" : "bg-kinari border-ink"
      }`}
    />
  );
}

export function SignalDots({ dark }: { dark?: boolean }) {
  const color = dark ? "bg-day-text" : "bg-ink";
  return (
    <span className="inline-flex items-center gap-[3px]">
      <span className={`h-[5px] w-[5px] rounded-full ${color}`} />
      <span className={`h-[5px] w-[5px] rounded-full ${color}`} />
      <span className={`h-[5px] w-[5px] rounded-full ${color}`} />
    </span>
  );
}
