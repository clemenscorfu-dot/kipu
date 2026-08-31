import { Filter, Home, Search, UserRound } from "lucide-react";
import Link from "next/link";

const rows = [
  { id: "restaurant-tipp", title: "Restaurant XYZ", place: "Locarno, Tessin", date: "30.08.2024", tag: "Restaurant", emoji: "🍽️", bg: "bg-[#e8eee0]" },
  { id: "grillstelle-wald", title: "Coole Grillstelle im Wald", place: "Nähe Morschach, SZ", date: "30.08.2024", tag: "Outdoor", emoji: "🔥", bg: "bg-[#e4ecd8]" },
  { id: "produktfoto", title: "Kabellose Kopfhörer", place: "Soundcore Space One", date: "29.08.2024", tag: "Produkt", emoji: "🎧", bg: "bg-[#f3e5e2]" },
];

export default function IdeasPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#fbfaf7] text-black">
      <header className="flex items-center justify-between px-5 pb-3 pt-7">
        <h1 className="text-[22px] font-semibold">Meine Ideen</h1>
        <div className="flex gap-4"><Filter className="h-5 w-5"/><Search className="h-5 w-5"/></div>
      </header>
      <div className="flex gap-2 overflow-hidden px-4 pb-4">
        {["Alle","Orte","Essen","Aktivitäten","Sonst."].map((x,i)=><span key={x} className={`whitespace-nowrap rounded-full px-4 py-2 text-[12px] ${i===0?"bg-black text-white":"bg-[#f0efeb]"}`}>{x}</span>)}
      </div>
      <section className="border-t border-black/5 px-4 pt-4">
        <p className="mb-2 text-[12px] font-semibold">Heute</p>
        <div className="space-y-2">
          {rows.map(row => <Link href={`/ideas/${row.id}`} key={row.id} className="flex gap-3 rounded-[14px] bg-white p-2 shadow-[0_2px_10px_rgba(0,0,0,.06)]">
            <div className={`flex h-[76px] w-[88px] shrink-0 items-center justify-center rounded-[10px] ${row.bg} text-[32px]`}>{row.emoji}</div>
            <div className="min-w-0 flex-1 py-1"><h2 className="text-[15px] font-semibold leading-5">{row.title}</h2><p className="mt-1 text-[12px] text-black/55">{row.place}</p><p className="text-[11px] text-black/45">{row.date}</p><div className="mt-1 text-right"><span className="rounded-full bg-[#f0efeb] px-2 py-1 text-[10px]">{row.tag}</span></div></div>
          </Link>)}
        </div>
        <p className="mb-2 mt-5 text-[12px] font-semibold">Gestern</p>
        <div className="flex gap-3 rounded-[14px] bg-white p-2 shadow-[0_2px_10px_rgba(0,0,0,.06)]"><div className="flex h-[76px] w-[88px] items-center justify-center rounded-[10px] bg-[#e4eef4] text-[32px]">🥾</div><div className="py-1"><h2 className="text-[15px] font-semibold">Hiking Trail</h2><p className="mt-1 text-[12px] text-black/55">Monte Brè, Lugano</p><p className="text-[11px] text-black/45">29.08.2024</p></div></div>
      </section>
      <nav className="mt-auto flex items-center justify-around border-t border-black/5 bg-white px-14 py-4"><Link href="/" className="rounded-full bg-white px-6 py-3 shadow-[0_3px_14px_rgba(0,0,0,.10)]"><Home className="h-5 w-5 fill-black"/></Link><UserRound className="h-5 w-5"/></nav>
    </main>
  );
}