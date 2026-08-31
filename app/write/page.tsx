"use client";

import { ArrowLeft, LoaderCircle, MapPin, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ensureAnonymousSession } from "@/lib/supabase-browser";

export default function WritePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function capture() {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);

    try {
      const session = await ensureAnonymousSession();
      let latitude: number | null = null;
      let longitude: number | null = null;

      if ("geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 4500,
              maximumAge: 60000,
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch {
          // Location is optional. Capture still works when permission is denied.
        }
      }

      const response = await fetch("/api/ideas/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: trimmed, latitude, longitude }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || data?.error || "Speichern fehlgeschlagen.");

      router.push(`/ideas/${data.idea.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
      if (message.toLowerCase().includes("anonymous")) {
        setError("Anonyme Anmeldung ist in Supabase noch nicht aktiviert.");
      } else {
        setError(message);
      }
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#fbfaf7] px-5 pb-6 pt-7 text-black">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Zurück" className="flex h-9 w-9 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="text-[15px] font-semibold">Schreiben</p>
        <div className="h-9 w-9" />
      </header>

      <section className="mt-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0d7] text-[#f2a23b]">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-[30px] font-semibold leading-[1.08] tracking-[-0.03em]">Was soll Kipu sich merken?</h1>
        <p className="mt-2 text-[13px] leading-5 text-black/50">Schreib es so, wie es dir gerade in den Sinn kommt. Kipu ordnet den Rest.</p>
      </section>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={5000}
        autoFocus
        placeholder="z. B. Marco empfiehlt Restaurant XYZ in Locarno. Unbedingt das Risotto probieren."
        className="mt-6 min-h-[220px] resize-none rounded-[20px] border border-black/[0.06] bg-white p-4 text-[16px] leading-6 outline-none placeholder:text-black/30 focus:border-black/15"
      />

      <div className="mt-3 flex items-center gap-2 text-[11px] text-black/40">
        <MapPin className="h-4 w-4" />
        Standort wird beim Speichern mitgenommen, wenn du ihn freigibst.
      </div>

      {error && <p className="mt-4 rounded-[14px] bg-[#fff0ef] px-4 py-3 text-[12px] leading-5 text-[#a33b34]">{error}</p>}

      <button
        type="button"
        onClick={capture}
        disabled={!text.trim() || saving}
        className="mt-auto flex h-14 items-center justify-center gap-2 rounded-full bg-black text-[14px] font-semibold text-white disabled:opacity-35"
      >
        {saving ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Kipu merkt es sich...</> : <><Send className="h-4 w-4" /> Merken</>}
      </button>
    </main>
  );
}
