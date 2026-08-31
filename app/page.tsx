import { Camera, FileText, Keyboard, MapPin, Mic, MoreHorizontal, Search, Sparkles } from "lucide-react";
import Link from "next/link";

const actions = [
  { label: "Sprechen", icon: Mic, href: "/voice", tone: "bg-[#efe3cf]" },
  { label: "Schreiben", icon: Keyboard, href: "/search", tone: "bg-[#fffaf2]" },
  { label: "Kamera", icon: Camera, href: "/processing", tone: "bg-[#e6c59e]" },
  { label: "Datei", icon: FileText, href: "/processing", tone: "bg-[#e9e0d2]" },
];

const ideas = [
  { id: "grillstelle-wald", title: "Grillstelle im Wald", meta: "Heute · 2.4 km entfernt", note: "Ruhige Feuerstelle am Waldrand, nicht offiziell ausgeschildert.", emoji: "🔥" },
  { id: "restaurant-tipp", title: "Restaurant-Tipp", meta: "Gestern · von Marco", note: "Unbedingt das Risotto probieren.", emoji: "🍽️" },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] px-5 pb-10 pt-6 sm:px-6">
      <header className="mb-9 flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium lowercase tracking-[0.22em] text-[#8d8378]">kipu</p>
          <h1 className="mt-3 max-w-[340px] text-[42px] font-semibold leading-[0.98] tracking-[-0.045em] text-[#26221f]">Was möchtest du dir merken?</h1>
        </div>
        <Link href="/search" aria-label="Suche" className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#ded5c7] bg-[#fffdf8] text-[#615950] shadow-sm">
          <Search className="h-5 w-5" />
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3">
        {actions.map(({ label, icon: Icon, href, tone }) => (
          <Link key={label} href={href} className={`flex min-h-[154px] flex-col items-start justify-between rounded-[30px] border border-[#ded5c7]/80 p-5 text-left shadow-[0_10px_30px_rgba(83,67,49,0.05)] transition-transform active:scale-[0.985] ${tone}`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#5a5046]/10 bg-white/35 text-[#3a342e]">
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="text-[20px] font-semibold tracking-[-0.02em] text-[#302b27]">{label}</span>
          </Link>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-[13px] font-medium text-[#8d8378]">In meiner Nähe</p>
            <h2 className="mt-1 text-[23px] font-semibold tracking-[-0.025em] text-[#302b27]">Gespeicherte Fundstücke</h2>
          </div>
          <Link href="/nearby" aria-label="Karte öffnen" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ded5c7] bg-[#fffdf8] text-[#514941] shadow-sm">
            <MapPin className="h-5 w-5" strokeWidth={1.8} />
          </Link>
        </div>

        <Link href="/ideas/grillstelle-wald" className="relative block overflow-hidden rounded-[30px] border border-[#ded5c7] bg-[#fffaf3] p-5 shadow-[0_10px_30px_rgba(83,67,49,0.05)]">
          <div className="pointer-events-none absolute -right-12 -top-10 h-36 w-36 rounded-full bg-[#d7ad78]/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-[#eee4d7] px-3 py-1 text-[12px] text-[#766d64]">2.4 km entfernt</span>
              <h3 className="mt-4 text-[25px] font-semibold tracking-[-0.03em] text-[#302b27]">Grillstelle im Wald</h3>
              <p className="mt-2 max-w-[260px] text-[14px] leading-5 text-[#766d64]">Ruhiger Platz am Waldrand. Für später gespeichert.</p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[#f0dfc9] text-[30px]">🔥</div>
          </div>
        </Link>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-[13px] font-medium text-[#8d8378]">Meine Ideen</p>
            <h2 className="mt-1 text-[23px] font-semibold tracking-[-0.025em] text-[#302b27]">Zuletzt gespeichert</h2>
          </div>
          <Link href="/ideas"><Sparkles className="h-5 w-5 text-[#a0805d]" strokeWidth={1.6} /></Link>
        </div>

        <div className="space-y-3">
          {ideas.map((idea) => (
            <Link key={idea.id} href={`/ideas/${idea.id}`} className="flex items-start gap-4 rounded-[26px] border border-[#ded5c7] bg-[#fffdf8] p-4 shadow-[0_8px_24px_rgba(83,67,49,0.04)]">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[19px] bg-[#f0e6d8] text-[26px]">{idea.emoji}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-[#968b80]">{idea.meta}</p>
                <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#302b27]">{idea.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-[#766d64]">{idea.note}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="pt-10 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-[#a69b90]">save now. find later.</footer>
    </main>
  );
}
