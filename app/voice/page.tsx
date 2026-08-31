import { ArrowLeft, Mic, Waves } from "lucide-react";
import Link from "next/link";

export default function VoicePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1b1b19]" aria-label="Zurück">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="text-[13px] tracking-[0.22em] text-[#8f8a82]">kipu</p>
        <div className="h-10 w-10" />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#e8dec8] text-[#171716] shadow-[0_0_80px_rgba(232,222,200,0.12)]">
          <Mic className="h-11 w-11" strokeWidth={1.7} />
        </div>
        <h1 className="mt-9 text-[38px] font-semibold leading-none tracking-[-0.045em]">Erzähl mir davon.</h1>
        <p className="mt-4 max-w-[300px] text-[15px] leading-6 text-[#aaa399]">Sprich einfach los. Kipu kümmert sich später um Titel, Ort, Tags und zusätzliche Infos.</p>
        <div className="mt-10 flex h-12 items-center gap-1.5 text-[#d8a15e]" aria-hidden="true">
          {[16, 28, 40, 24, 34, 18, 44, 30, 20, 36, 26].map((height, i) => (
            <span key={i} className="w-1 rounded-full bg-current" style={{ height }} />
          ))}
        </div>
        <p className="mt-5 text-[13px] text-[#7e7972]">Tippen zum Aufnehmen</p>
      </section>

      <div className="flex items-center justify-center gap-2 text-[12px] text-[#6f6b65]"><Waves className="h-4 w-4" /> Noch Mockup – keine Aufnahme aktiv</div>
    </main>
  );
}
