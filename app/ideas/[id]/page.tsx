"use client";

import { ArrowLeft, ExternalLink, LoaderCircle, Map, MapPin, MoreHorizontal, Pencil, Share2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { mockIdeas } from "@/lib/mock-ideas";
import { ensureAnonymousSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Enrichment = {
  category?: string;
  entity_type?: string | null;
  entity_name?: string | null;
  research_used?: boolean;
  research_summary?: string | null;
  facts?: Array<{ label: string; value: string }>;
  sources?: Array<{ title?: string; url: string }>;
};

type StoredIdea = {
  id: string;
  original_input: string;
  input_type: string;
  title: string;
  summary: string | null;
  tags: string[];
  people: string[];
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  enrichment: Enrichment;
  created_at: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function IdeaDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [storedIdea, setStoredIdea] = useState<StoredIdea | null>(null);
  const [loading, setLoading] = useState(uuidPattern.test(id));
  const [error, setError] = useState<string | null>(null);

  const mock = useMemo(() => mockIdeas.find((item) => item.id === id) ?? mockIdeas[0], [id]);

  useEffect(() => {
    if (!uuidPattern.test(id)) return;
    let active = true;

    (async () => {
      try {
        await ensureAnonymousSession();
        const supabase = getSupabaseBrowserClient();
        const { data, error: queryError } = await supabase.from("ideas").select("*").eq("id", id).single();
        if (queryError) throw queryError;
        if (active) setStoredIdea(data as StoredIdea);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Idee konnte nicht geladen werden.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <main className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center bg-[#fbfaf7]"><LoaderCircle className="h-7 w-7 animate-spin" /></main>;
  }

  if (error && uuidPattern.test(id)) {
    return <main className="mx-auto min-h-screen w-full max-w-[430px] bg-[#fbfaf7] px-5 pt-7 text-black"><Link href="/ideas"><ArrowLeft className="h-5 w-5" /></Link><p className="mt-12 rounded-[14px] bg-[#fff0ef] p-4 text-[13px] text-[#a33b34]">{error}</p></main>;
  }

  const title = storedIdea?.title ?? mock.title;
  const summary = storedIdea?.summary ?? mock.summary;
  const original = storedIdea?.original_input ?? mock.originalInput;
  const tags = storedIdea?.tags ?? mock.tags;
  const location = storedIdea?.location_label ?? mock.location?.label ?? null;
  const latitude = storedIdea?.latitude ?? mock.location?.latitude ?? null;
  const longitude = storedIdea?.longitude ?? mock.location?.longitude ?? null;
  const enrichment = storedIdea?.enrichment ?? {};
  const createdAt = storedIdea?.created_at ? new Date(storedIdea.created_at).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" }) : "30.08.2024, 16:42";
  const category = enrichment.category;
  const emoji = category === "Restaurant" || category === "Essen" || id === "restaurant-tipp" ? "🍽️" : category === "Buch" ? "📚" : category === "Produkt" || id === "produktfoto" ? "📦" : category === "Idee" ? "💡" : "🔥";
  const facts = enrichment.facts ?? [];
  const sources = enrichment.sources ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] bg-[#fbfaf7] text-black">
      <header className="flex items-center justify-between bg-white px-5 py-6">
        <Link href="/ideas"><ArrowLeft className="h-5 w-5" /></Link>
        <MoreHorizontal className="h-5 w-5" />
      </header>

      <div className="relative flex h-[205px] items-center justify-center bg-[#e5eadf]">
        <span className="text-[72px]">{emoji}</span>
        <button className="absolute -bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow"><Pencil className="h-5 w-5" /></button>
      </div>

      <section className="relative -mt-1 rounded-t-[26px] bg-[#fbfaf7] px-5 pb-28 pt-5">
        <h1 className="text-[25px] font-semibold">{title}</h1>
        {location && <p className="mt-2 flex items-center gap-2 text-[12px] text-black/55"><MapPin className="h-4 w-4" />{location}</p>}
        {latitude != null && longitude != null && <p className="mt-1 flex items-center gap-2 text-[11px] text-black/45"><MapPin className="h-4 w-4" />{latitude.toFixed(4)}, {longitude.toFixed(4)}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => <span key={tag} className="rounded-full bg-[#eeecef] px-3 py-1.5 text-[11px]">{tag}</span>)}
          <span className="rounded-full bg-[#eeecef] px-3 py-1.5 text-[11px]">+</span>
        </div>

        <div className="mt-4 rounded-[14px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,.05)]">
          <p className="text-[11px] font-semibold text-black/45">Original</p>
          <p className="mt-2 text-[13px] leading-5">{original}</p>
          <p className="mt-2 text-[10px] text-black/40">{createdAt}</p>
        </div>

        <div className="mt-3 rounded-[14px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,.05)]">
          <h2 className="text-[12px] font-semibold">Kipu hat verstanden</h2>
          <p className="mt-2 text-[12px] leading-5">{summary}</p>
          {typeof category === "string" && <p className="mt-2 text-[10px] text-black/40">Kategorie: {category}</p>}
        </div>

        {(enrichment.research_summary || facts.length > 0) && (
          <div className="mt-3 rounded-[14px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,.05)]">
            <h2 className="text-[12px] font-semibold">Gefundene Informationen</h2>
            {enrichment.research_summary && <p className="mt-2 text-[12px] leading-5">{enrichment.research_summary}</p>}
            {facts.length > 0 && (
              <dl className="mt-3 divide-y divide-black/5">
                {facts.map((fact, index) => (
                  <div key={`${fact.label}-${index}`} className="grid grid-cols-[92px_1fr] gap-3 py-2 text-[11px] leading-4">
                    <dt className="text-black/45">{fact.label}</dt>
                    <dd className="font-medium">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {sources.length > 0 && (
              <div className="mt-3 border-t border-black/5 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-black/35">Quellen</p>
                <div className="mt-2 space-y-2">
                  {sources.slice(0, 3).map((source, index) => (
                    <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-[11px] leading-4 text-[#5d61c9]">
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{source.title || source.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-[430px] -translate-x-1/2 items-center gap-3 border-t border-black/5 bg-[#fbfaf7]/95 px-5 py-3 backdrop-blur">
        <button className="flex h-12 w-16 items-center justify-center rounded-full bg-white shadow"><Map className="h-5 w-5" /></button>
        <button className="flex h-12 w-16 items-center justify-center rounded-full bg-white shadow"><Share2 className="h-5 w-5" /></button>
        <Link href="/" className="flex h-12 flex-1 items-center justify-center rounded-full bg-black text-[14px] font-semibold text-white">Fertig</Link>
      </nav>
    </main>
  );
}
