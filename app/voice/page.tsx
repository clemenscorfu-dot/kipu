import { ArrowLeft, Mic, Waves } from "lucide-react";
import Link from "next/link";

export default function VoicePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ded5c7] bg-[#fffdf8] shadow-sm" aria-label="Zurück">
          <ArrowLeft className="h-5 w-5 text-[#38322d]" />
        </Link>
        <p className="text-[13px] tracking-[0.22em] text-[#8d8378]">kipu</p>
        <div className="h-10 w-10" />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[#d9c8b4] bg-[#ead8c0] text-[#332d27] shadow-[0_20px_70px_rgba(117,83,47,0.14)]">
          <Mic className="h-11 w-11" strokeWidth={1.7} />
        </div>
        <h1 className="mt-9 text-[38px] font-semibold leading-none tracking-[-0.045em] text-[#26221f]">Erzähl mir davon.</h1>
        <p className="mt-4 max-w-[300px] text-[15px] leading-6 text-[#766d64]">Sprich einfach los. Kipu kümmert sich später um Titel, Ort, Tags und zusätzliche Infos.</p>
        <div className="mt-10 flex h-12 items-center gap-1.5 text-[#b98244]" aria-hidden="true">
          {[16, 28, 40, 24, 34, 18, 44, 30, 20, 36, 26].map((height, i) => (
            <span key={i} className="w-1 rounded-full bg-current" style={{ height }} />
          ))}
        </div>
        <Link href="/processing" className="mt-6 rounded-full bg-[#2f2a25] px-6 py-3 text-[14px] font-medium text-[#fffaf2] shadow-sm">Aufnahme simulieren</Link>
      </section>

      <div className="flex items-center justify-center gap-2 text-[12px] text-[#9b9187]"><Waves className="h-4 w-4" /> Noch Mockup – keine Aufnahme aktiv</div>
    </main>
  );
}
