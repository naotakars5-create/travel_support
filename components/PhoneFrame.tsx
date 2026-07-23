export function PhoneFrame({ dark, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-[#e7e2d6] sm:flex sm:items-center sm:justify-center sm:p-6">
      {/* 実機幅（sm未満）ではベゼルなしで画面いっぱいに表示。sm以上はプレゼンテーション用の端末フレームを表示。 */}
      <div className="h-dvh w-full bg-bezel sm:h-auto sm:w-auto sm:rounded-device sm:p-[11px] sm:shadow-2xl">
        <div
          className={`relative h-full w-full overflow-hidden transition-colors duration-300 sm:h-device-h sm:w-device-w sm:rounded-screen ${
            dark ? "bg-day-bg" : "bg-kinari"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
