import {
  Camera,
  FileText,
  Keyboard,
  MapPin,
  Mic,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";

const actions = [
  { label: "Sprechen", icon: Mic, tone: "bg-[#e8dec8] text-[#171716]" },
  { label: "Schreiben", icon: Keyboard, tone: "bg-[#272725] text-[#f3ead8]" },
  { label: "Kamera", icon: Camera, tone: "bg-[#d8a15e] text-[#171716]" },
  { label: "Datei", icon: FileText, tone: "bg-[#38332d] text-[#f3ead8]" },
];

const ideas = [
  {
    title: "Grillstelle im Wald",
    meta: "Heute · 2.4 km entfernt",
    note: "Ruhige Feuerstelle am Waldrand, nicht offiziell ausgeschildert.",
    emoji: "🔥",
  },
  {
    title: "Restaurant-Tipp",
    meta: "Gestern · von Marco",
    note: "Unbedingt das Risotto probieren.",
    emoji: "🍽️",
  },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] px-5 pb-10 pt-6 sm:px-6">
      <header className="mb-9 flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium lowercase tracking-[0.22em] text-[#b7b0a4]">
            kipu
          </p>
          <h1 className="mt-3 max-w-[340px] text-[42px] font-semibold leading-[0.98] tracking-[-0.045em] text-[#f3ead8]">
            Was möchtest du dir merken?
          </h1>
        </div>
        <button
          aria-label="Mehr"
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-[#171716] text-[#b7b0a4]"
          type="button"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3">
        {actions.map(({ label, icon: Icon, tone }) => (
          <button
            key={label}
            className={`flex min-h-[154px] flex-col items-start justify-between rounded-[30px] p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-transform active:scale-[0.985] ${tone}`}
            type="button"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-current/10 bg-black/5">
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="text-[20px] font-semibold tracking-[-0.02em]">{label}</span>
          </button>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-[13px] font-medium text-[#b7b0a4]">In meiner Nähe</p>
            <h2 className="mt-1 text-[23px] font-semibold tracking-[-0.025em]">
              Gespeicherte Fundstücke
            </h2>
          </div>
          <button
            aria-label="Karte öffnen"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#242422] text-[#f3ead8]"
            type="button"
          >
            <MapPin className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-white/[0.04] bg-[#1b1b19] p-5">
          <div className="pointer-events-none absolute -right-12 -top-10 h-36 w-36 rounded-full bg-[#d8a15e]/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-[#2b2b28] px-3 py-1 text-[12px] text-[#c8c0b2]">
                2.4 km entfernt
              </span>
              <h3 className="mt-4 text-[25px] font-semibold tracking-[-0.03em]">
                Grillstelle im Wald
              </h3>
              <p className="mt-2 max-w-[260px] text-[14px] leading-5 text-[#b7b0a4]">
                Ruhiger Platz am Waldrand. Für später gespeichert.
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[#30271e] text-[30px]">
              🔥
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-[13px] font-medium text-[#b7b0a4]">Meine Ideen</p>
            <h2 className="mt-1 text-[23px] font-semibold tracking-[-0.025em]">Zuletzt gespeichert</h2>
          </div>
          <Sparkles className="h-5 w-5 text-[#8e887f]" strokeWidth={1.6} />
        </div>

        <div className="space-y-3">
          {ideas.map((idea) => (
            <article
              key={idea.title}
              className="flex items-start gap-4 rounded-[26px] border border-white/[0.04] bg-[#181817] p-4"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[19px] bg-[#242321] text-[26px]">
                {idea.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-[#8f8a82]">{idea.meta}</p>
                <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.02em]">{idea.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-[#aaa399]">{idea.note}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="pt-10 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-[#6f6b65]">
        save now. find later.
      </footer>
    </main>
  );
}
