import { ArrowLeft, Mic, Search } from "lucide-react";
import Link from "next/link";

const results = [
  { id: "grillstelle-wald", title: "Coole Grillstelle im Wald", place: "Nähe Morschach, SZ", meta: "30.08.2024 · ca. 1.2 km", emoji: "🔥" },
  { id: "grillstelle-wald", title: "Feuerstelle am Fluss", place: "Val Verzasca, TI", meta: "12.07.2024 · ca. 18 km", emoji: "🏞️" },
];

export default function SearchPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#fbfaf7] px-4 pb-6 pt-7 text-black">
      <header>
        <Link href="/" aria-label="Zurück">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </header>

      <div className="mt-7 flex items-center gap-3 rounded-[22px] border border-black/5 bg-white px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,.05)]">
        <Search className="h-5 w-5 text-black/55" />
        <span className="flex-1 text-[14px]">Was hatte ich nochmal für Grillstellen gespeichert?</span>
        <Mic className="h-5 w-5 text-[#6c70e8]" />
      </div>

      <div className="mt-5 flex gap-2">
        <span className="rounded-full bg-black px-4 py-2 text-[12px] text-white">Ideen (2)</span>
        <span className="rounded-full px-4 py-2 text-[12px]">Karte (2)</span>
      </div>

      <section className="mt-4 space-y-2">
        {results.map((r, i) => (
          <Link key={i} href={`/ideas/${r.id}`} className="flex gap-3 rounded-[14px] bg-white p-2 shadow-[0_2px_10px_rgba(0,0,0,.06)]">
            <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[11px] bg-[#e2ead8] text-[36px]">{r.emoji}</div>
            <div className="py-2">
              <h2 className="text-[15px] font-semibold">{r.title}</h2>
              <p className="mt-1 text-[12px] text-black/55">{r.place}</p>
              <p className="mt-1 text-[11px] text-black/45">{r.meta}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-auto flex gap-3 rounded-[18px] bg-[#eeecff] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7772ea] text-[20px]">🤖</div>
        <div>
          <p className="text-[11px] font-semibold">Tipp der KI</p>
          <p className="mt-1 text-[12px] leading-5">Beide Orte sind beliebt zum Grillieren. Bitte lokale Regeln beachten.</p>
        </div>
      </section>
    </main>
  );
}
