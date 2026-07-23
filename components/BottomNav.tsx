import { Tab } from "@/hooks/useAppState";

const ITEMS: { id: Tab; label: string }[] = [
  { id: "inbox", label: "受信箱" },
  { id: "itin", label: "旅程" },
  { id: "today", label: "当日" },
];

export function BottomNav({ tab, onChange, dark }: { tab: Tab; onChange: (t: Tab) => void; dark?: boolean }) {
  return (
    <div
      className={`absolute inset-x-0 bottom-0 h-nav-h border-t ${
        dark ? "border-day-text/[.08] bg-day-nav" : "border-black/[.08] bg-kinari"
      }`}
    >
      <div className="grid h-full grid-cols-3">
        {ITEMS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className="relative flex flex-col items-center justify-center gap-1.5 font-gothic text-[11px]"
            >
              <span
                className={`h-[2px] w-[18px] rounded-full transition-opacity ${
                  active ? (dark ? "bg-day-text opacity-100" : "bg-ink opacity-100") : "opacity-0"
                }`}
              />
              <span
                className={
                  active
                    ? dark
                      ? "text-day-text font-medium"
                      : "text-ink font-medium"
                    : dark
                    ? "text-day-text3"
                    : "text-muted-light"
                }
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
