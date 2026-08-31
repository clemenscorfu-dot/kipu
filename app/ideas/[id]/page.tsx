import { ArrowLeft, Map, MapPin, Mic, MoreHorizontal, Pencil, Share2 } from "lucide-react";
import Link from "next/link";
import { mockIdeas } from "@/lib/mock-ideas";

export default async function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idea = mockIdeas.find((x) => x.id === id) ?? mockIdeas[0];
  const restaurant = id === "restaurant-tipp";
  const title = restaurant ? "Restaurant XYZ" : "Coole Grillstelle im Wald";
  const place = restaurant
    ? "Via ai Monti 123, 6600 Locarno, Schweiz"
    : "Nähe Morschach, Schwyz, Schweiz";

  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] bg-[#fbfaf7] text-black">
      <header className="flex items-center justify-between bg-white px-5 py-6">
        <Link href="/ideas"><ArrowLeft className="h-5 w-5" /></Link>
        <MoreHorizontal className="h-5 w-5" />
      </header>

      <div className={`relative flex h-[205px] items-center justify-center ${restaurant ? "bg-[#e9dfc9]" : "bg-[#dce7d3]"}`}>
        <span className="text-[72px]">{restaurant ? "🍽️" : "🔥"}</span>
        <button className="absolute -bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow">
          <Pencil className="h-5 w-5" />
        </button>
      </div>

      <section className="relative -mt-1 rounded-t-[26px] bg-[#fbfaf7] px-5 pb-28 pt-5">
        <h1 className="text-[25px] font-semibold">{title}</h1>
        <p className="mt-2 flex items-center gap-2 text-[12px] text-black/55"><MapPin className="h-4 w-4" />{place}</p>
        {!restaurant && <p className="mt-1 flex items-center gap-2 text-[11px] text-black/45"><MapPin className="h-4 w-4" />47.0242, 8.6131</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {(restaurant ? ["Restaurant", "Tessin", "Empfehlung"] : ["Outdoor", "Grillstelle", "Wald"]).map((t) => (
            <span key={t} className="rounded-full bg-[#eeecef] px-3 py-1.5 text-[11px]">{t}</span>
          ))}
          <span className="rounded-full bg-[#eeecef] px-3 py-1.5 text-[11px]">+</span>
        </div>

        <div className="mt-4 rounded-[14px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,.05)]">
          <div className="flex gap-3">
            <Mic className="mt-1 h-4 w-4 shrink-0 text-[#7772ea]" />
            <div>
              <p className="text-[13px] leading-5">{restaurant ? "Marco empfiehlt Restaurant XYZ im Tessin wegen fantastischem Risotto." : "Mega Platz mit Seeblick durch die Bäume. Feuerstelle aus Steinen, viel Holz drumherum."}</p>
              <p className="mt-2 text-[10px] text-black/40">30.08.2024, 16:42</p>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[14px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,.05)]">
          <h2 className="text-[12px] font-semibold">Gefundene Informationen</h2>
          <p className="mt-2 whitespace-pre-line text-[12px] leading-5">{restaurant ? "⭐ 4.6 (328)\nItalienisch · Mediterran\nGeöffnet · 11:30 – 23:00" : "Nicht als offizielle Feuerstelle vermerkt.\nWaldweg ca. 300 m entfernt."}</p>
        </div>
      </section>

      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-[430px] -translate-x-1/2 items-center gap-3 border-t border-black/5 bg-[#fbfaf7]/95 px-5 py-3 backdrop-blur">
        <button className="flex h-12 w-16 items-center justify-center rounded-full bg-white shadow"><Map className="h-5 w-5" /></button>
        <button className="flex h-12 w-16 items-center justify-center rounded-full bg-white shadow"><Share2 className="h-5 w-5" /></button>
        <button className="h-12 flex-1 rounded-full bg-black text-[14px] font-semibold text-white">Merken</button>
      </nav>
    </main>
  );
}
