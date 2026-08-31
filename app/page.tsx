import { Camera, FileText, Keyboard, MapPin, Mic, Sparkles } from "lucide-react";

const actions = [
  { label: "Sprechen", icon: Mic },
  { label: "Schreiben", icon: Keyboard },
  { label: "Kamera", icon: Camera },
  { label: "Datei", icon: FileText },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-7">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-muted">kipu</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight">Was möchtest du dir merken?</h1>
        </div>
        <Sparkles className="h-6 w-6 text-muted" />
      </header>

      <section className="grid grid-cols-2 gap-3">
        {actions.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex min-h-36 flex-col items-start justify-between rounded-4xl border border-white/5 bg-panel p-5 text-left transition active:scale-[0.98]"
            type="button"
          >
            <Icon className="h-7 w-7" />
            <span className="text-lg font-medium">{label}</span>
          </button>
        ))}
      </section>

      <section className="mt-8 rounded-4xl border border-white/5 bg-panel p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/5 p-3">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted">In meiner Nähe</p>
            <p className="mt-1 text-lg font-medium">Gespeicherte Fundstücke entdecken</p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-4xl border border-white/5 bg-panel p-5">
        <p className="text-sm text-muted">Meine Ideen</p>
        <p className="mt-1 text-lg font-medium">Noch keine Ideen gespeichert</p>
      </section>

      <footer className="mt-auto pt-8 text-center text-xs uppercase tracking-[0.28em] text-muted">
        save now. find later.
      </footer>
    </main>
  );
}
