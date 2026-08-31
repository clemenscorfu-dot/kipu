import { Bookmark, Camera, Home, SlidersHorizontal, Trees, UserRound, Utensils } from "lucide-react";
import Link from "next/link";

export default function NearbyPage() {
  return <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#fbfaf7] text-black">
    <header className="flex items-center justify-between bg-white px-5 pb-4 pt-7"><h1 className="text-[22px] font-semibold">In meiner Nähe</h1><SlidersHorizontal className="h-5 w-5"/></header>
    <section className="relative flex-1 overflow-hidden bg-[#dfe9d4]">
      <div className="absolute inset-0 opacity-60" style={{backgroundImage:"linear-gradient(22deg,transparent 48%,#c7d7bd 49%,#c7d7bd 51%,transparent 52%),linear-gradient(110deg,transparent 48%,#c9dbc7 49%,#c9dbc7 51%,transparent 52%)",backgroundSize:"90px 80px"}}/>
      <div className="absolute left-[45%] top-[38%] h-4 w-4 rounded-full border-[3px] border-white bg-[#4285f4] shadow"/>
      <div className="absolute left-[15%] top-[15%] flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-[#ff8c42] text-white shadow"><Utensils className="h-5 w-5"/></div>
      <div className="absolute right-[16%] top-[22%] flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-[#7aaa42] text-white shadow"><Trees className="h-5 w-5"/></div>
      <div className="absolute bottom-[38%] left-[43%] flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-[#7767e8] text-white shadow"><Camera className="h-5 w-5"/></div>
      <div className="absolute bottom-[28%] right-[13%] flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-[#3999e8] text-white shadow">⌁</div>
      <Link href="/ideas/grillstelle-wald" className="absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-white px-5 pb-6 pt-4 shadow-[0_-4px_18px_rgba(0,0,0,.08)]">
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-black/15"/>
        <div className="flex items-center gap-3"><div className="flex h-[82px] w-[82px] items-center justify-center rounded-[12px] bg-[#dfe8d4] text-[36px]">🔥</div><div className="flex-1"><h2 className="text-[15px] font-semibold">Coole Grillstelle im Wald</h2><p className="mt-1 text-[12px] text-black/55">Nähe Morschach, SZ</p><p className="text-[12px] text-black/55">ca. 1.2 km entfernt</p><span className="mt-2 inline-block rounded-full bg-[#edf2df] px-3 py-1 text-[10px]">Outdoor</span></div><Bookmark className="h-5 w-5"/></div>
      </Link>
    </section>
    <nav className="flex items-center justify-around bg-white px-14 py-4"><Link href="/" className="rounded-full px-6 py-3 shadow-[0_3px_14px_rgba(0,0,0,.10)]"><Home className="h-5 w-5 fill-black"/></Link><UserRound className="h-5 w-5"/></nav>
  </main>
}