import { Bot, CheckCircle2, Circle, Clock3, MapPin, Search, Sparkles } from "lucide-react";
import Link from "next/link";

const steps = [
  { label: "Transkribiere", icon: Bot, done: true },
  { label: "Suche Informationen", icon: Search, done: false },
  { label: "Finde Ort & Details", icon: MapPin, done: false },
  { label: "Speichere Idee", icon: Clock3, done: false },
];

export default function ProcessingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#fbfaf8] px-7 pb-10 pt-7 text-[#111111]">
      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#eeecff]" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#7d78f6] text-white shadow-[0_12px_30px_rgba(125,120,246,0.25)]">
            <Bot className="h-9 w-9" strokeWidth={1.8} />
          </div>
          <Sparkles className="absolute -right-2 top-1 h-4 w-4 text-[#7d78f6]" />
          <Sparkles className="absolute -left-3 top-6 h-3.5 w-3.5 text-[#a09cf9]" />
        </div>

        <h1 className="max-w-[280px] text-[32px] font-semibold leading-[1.08] tracking-[-0.035em]">
          Ich kümmere mich darum...
        </h1>

        <div className="mt-12 w-full max-w-[300px] space-y-5 text-left">
          {steps.map(({ label, icon: Icon, done }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="h-4.5 w-4.5 shrink-0 text-[#444]" strokeWidth={1.7} />
              <span className="flex-1 text-[14px] font-medium text-[#2d2d2d]">{label}</span>
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-[#70b86b]" strokeWidth={1.8} />
              ) : (
                <Circle className="h-5 w-5 text-[#c9c9c9]" strokeWidth={1.5} />
              )}
            </div>
          ))}
        </div>

        <p className="mt-20 text-[12px] text-[#666]">Einen Moment bitte.</p>

        <Link href="/ideas/restaurant-tipp" className="mt-5 text-[11px] text-transparent" aria-label="Weiter zur gespeicherten Idee">
          Weiter
        </Link>
      </section>
    </main>
  );
}
