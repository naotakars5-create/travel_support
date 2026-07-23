import { SignalDots } from "./icons";

export function StatusBar({ dark, time = "9:41" }: { dark?: boolean; time?: string }) {
  return (
    <div
      className={`flex items-center justify-between px-[26px] pt-4 pb-2 font-mincho text-[15px] font-semibold tnum ${
        dark ? "text-day-text" : "text-ink"
      }`}
    >
      <span>{time}</span>
      <SignalDots dark={dark} />
    </div>
  );
}
