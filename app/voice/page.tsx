import { ArrowLeft, Mic, MoreHorizontal, Waves } from "lucide-react";
import Link from "next/link";

const bars = [20, 34, 54, 30, 46, 24, 62, 38, 26, 48, 32, 58, 28, 44, 22];

export default function VoicePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-9 pt-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.05] bg-[#181817] text-[#d8d0c2]"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </Link>
        <p className="text-[13px] font-medium lowercase tracking-[0.22em] text-[#8f8a82]">kipu</p>
        <button
          type="button"
          aria-label="Mehr"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.05] bg-[#181817] text-[#8f8a82]"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center pb-8 text-center">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#8f8a82]">Sprache</p>
        <h1 className="mt-4 max-w-[330px] text-[43px] font-semibold leading-[0.98] tracking-[-0.05em] text-[#f3ead8]">
          Erzähl mir davon.
        </h1>
        <p className="mt-4 max-w-[305px] text-[15px] leading-6 text-[#aaa399]">
          Sprich einfach so, wie du es einem Menschen erzählen würdest. Kipu ordnet den Rest später ein.
        </p>

        <div className="mt-12 flex h-28 items-center justify-center gap-[5px]" aria-hidden="true">
          {bars.map((height, index) => (
            <span
              key={`${height}-${index}`}
              className="w-[5px] rounded-full bg-[#d8a15e]"
              style={{ height }}
            />
          ))}
        </div>

        <div className="mt-10 relative">
          <div className="absolute inset-0 scale-[1.5] rounded-full bg-[#e8dec8]/[0.06] blur-2xl" />
          <Link
            href="/processing"
            aria-label="Mock-Aufnahme starten"
            className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#e8dec8] text-[#171716] shadow-[0_12px_45px_rgba(0,0,0,0.35)] transition-transform active:scale-[0.96]"
          >
            <Mic className="h-10 w-10" strokeWidth={1.7} />
          </Link>
        </div>

        <p className="mt-5 text-[14px] font-medium text-[#d5cdbf]">Tippen zum Aufnehmen</p>
        <p className="mt-1 text-[12px] text-[#746f69]">Im Mockup führt der Button zur Verarbeitung.</p>
      </section>

      <div className="flex items-center justify-center gap-2 rounded-full border border-white/[0.04] bg-[#151514] px-4 py-3 text-[12px] text-[#746f69]">
        <Waves className="h-4 w-4" strokeWidth={1.7} />
        Noch keine echte Audioaufnahme
      </div>
    </main>
  );
}
