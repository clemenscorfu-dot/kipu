import { Check, CircleDashed, MapPin, Search, Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";

const steps = [
  { label: "Sprache verstanden", icon: Check, done: true },
  { label: "Ort zugeordnet", icon: MapPin, done: true },
  { label: "Infos ergänzt", icon: Search, done: true },
  { label: "Idee gespeichert", icon: Sparkles, done: false },
];

export default function ProcessingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-9 pt-6 sm:px-6">
      <header className="flex items-center justify-between">
        <p className="text-[13px] font-medium lowercase tracking-[0.22em] text-[#8d8378]">kipu</p>
        <span className="rounded-full border border-[#ded5c7] bg-[#fffaf3] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8d8378]">verarbeitet</span>
      </header>

      <section className="flex flex-1 flex-col justify-center py-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#d7b891] bg-[#e6c59e] text-[#352e27] shadow-sm">
          <WandSparkles className="h-7 w-7" strokeWidth={1.7} />
        </div>

        <h1 className="mt-7 max-w-[340px] text-[42px] font-semibold leading-[0.99] tracking-[-0.05em] text-[#26221f]">Ich mache daraus etwas, das du wiederfindest.</h1>

        <section className="mt-9 rounded-[30px] border border-[#ded5c7] bg-[#fffaf3] p-5 shadow-[0_10px_30px_rgba(83,67,49,0.04)]">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#9a8f84]">Original</p>
          <p className="mt-3 text-[16px] leading-6 text-[#4a433c]">„Hier oben im Wald ist eine richtig coole Grillstelle. Mit den Kindern mal hingehen.“</p>
        </section>

        <div className="mt-5 space-y-2.5">
          {steps.map(({ label, icon: Icon, done }) => (
            <div key={label} className="flex items-center gap-4 rounded-[24px] border border-[#e1d8cb] bg-[#fffdf8] px-4 py-4 shadow-[0_6px_18px_rgba(83,67,49,0.03)]">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${done ? "bg-[#ead8c0] text-[#332d27]" : "bg-[#f1e6d8] text-[#b98244]"}`}>
                {done ? <Check className="h-5 w-5" strokeWidth={2} /> : <CircleDashed className="h-5 w-5" strokeWidth={1.8} />}
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <p className="text-[15px] font-medium text-[#403a34]">{label}</p>
                <Icon className="h-4 w-4 shrink-0 text-[#9a8f84]" strokeWidth={1.7} />
              </div>
            </div>
          ))}
        </div>

        <Link href="/ideas/grillstelle-wald" className="mt-7 flex min-h-14 items-center justify-center rounded-full bg-[#2f2a25] px-6 text-[15px] font-semibold text-[#fffaf2] transition-transform active:scale-[0.985]">Gespeicherte Idee ansehen</Link>
        <p className="mt-3 text-center text-[11px] leading-4 text-[#9b9187]">Später passiert dieser Schritt automatisch – ohne Bestätigungsformular.</p>
      </section>
    </main>
  );
}
