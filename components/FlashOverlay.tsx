export function FlashOverlay({ visible, text }: { visible: boolean; text: string }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-30 flex animate-flashfade flex-col items-center justify-center bg-[rgba(28,25,21,.9)] text-center">
      {text.split("\n").map((line, i) => (
        <p key={i} className={`font-mincho text-day-text ${i === 0 ? "text-[13px] text-day-text2" : "mt-3 text-[22px] font-semibold"}`}>
          {line}
        </p>
      ))}
    </div>
  );
}
