import { Square, X } from "lucide-react";
import Link from "next/link";

const bars = [22, 36, 48, 30, 58, 42, 66, 32, 52, 40, 62, 28, 46, 34, 56, 38, 24];

export default function VoicePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#fbfaf8] px-6 pb-9 pt-5 text-[#111111]">
      <header className="grid grid-cols-3 items-center">
        <Link href="/" aria-label="Schliessen" className="flex h-9 w-9 items-center justify-center rounded-full">
          <X className="h-5 w-5" strokeWidth={2} />
        </Link>
        <h1 className="text-center text-[15px] font-semibold">Sprechen</h1>
        <div />
      </header>

      <section className="flex flex-1 flex-col items-center pt-16 text-center">
        <div className="relative flex h-[188px] w-[188px] items-center justify-center rounded-full bg-[#f0efff]">
          <div className="absolute inset-[17px] rounded-full bg-[#e9e7ff]" />
          <div className="relative flex h-[112px] w-[112px] items-center justify-center rounded-full bg-[#f5f4ff]">
            <div className="flex h-[76px] items-center gap-[4px] text-[#7d83f6]" aria-hidden="true">
              {bars.map((height, index) => (
                <span key={index} className="w-[3px] rounded-full bg-current" style={{ height }} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 text-[31px] font-medium leading-none tracking-[-0.03em]">00:18</div>

        <p className="mt-5 max-w-[270px] text-[16px] leading-6 text-[#242424]">
          Marco empfiehlt Restaurant XYZ im Tessin wegen fantastischem Risotto.
        </p>

        <Link
          href="/processing"
          aria-label="Aufnahme stoppen"
          className="mt-14 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition-transform active:scale-95"
        >
          <Square className="h-5 w-5 fill-white" strokeWidth={1.5} />
        </Link>
      </section>
    </main>
  );
}
