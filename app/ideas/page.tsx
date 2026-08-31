"use client";

import { Filter, Home, LoaderCircle, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ensureAnonymousSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

type IdeaRow = {
  id: string;
  title: string;
  summary: string | null;
  tags: string[];
  location_label: string | null;
  created_at: string;
  enrichment: { category?: string; image_url?: string | null };
};

function emojiFor(category?: string) {
  if (category === "Buch") return "📚";
  if (category === "Restaurant" || category === "Essen") return "🍽️";
  if (category === "Produkt") return "📦";
  if (category === "Idee") return "💡";
  if (category === "Film") return "🎬";
  return "📌";
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ensureAnonymousSession();
        const { data, error } = await getSupabaseBrowserClient()
          .from("ideas")
          .select("id,title,summary,tags,location_label,created_at,enrichment")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (active) setIdeas((data ?? []) as IdeaRow[]);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Ideen konnten nicht geladen werden.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#fbfaf7] text-black">
      <header className="flex items-center justify-between px-5 pb-3 pt-7">
        <h1 className="text-[22px] font-semibold">Meine Ideen</h1>
        <div className="flex gap-4"><Filter className="h-5 w-5" /><Link href="/search"><Search className="h-5 w-5" /></Link></div>
      </header>
      <div className="flex gap-2 overflow-hidden px-4 pb-4">
        {["Alle","Orte","Essen","Aktivitäten","Sonst."].map((x,i)=><span key={x} className={`whitespace-nowrap rounded-full px-4 py-2 text-[12px] ${i===0?"bg-black text-white":"bg-[#f0efeb]"}`}>{x}</span>)}
      </div>

      <section className="border-t border-black/5 px-4 pt-4">
        {loading && <div className="flex justify-center py-16"><LoaderCircle className="h-6 w-6 animate-spin" /></div>}
        {error && <div className="rounded-[14px] bg-[#fff0ef] p-4 text-[12px] text-[#9f3731]">{error}</div>}
        {!loading && !error && ideas.length === 0 && <div className="py-16 text-center"><p className="text-[14px] font-medium">Noch keine Ideen gespeichert.</p><p className="mt-2 text-[12px] text-black/45">Auf dem Homescreen kannst du deine erste Erinnerung erfassen.</p></div>}
        {!loading && ideas.length > 0 && <div className="space-y-2">
          {ideas.map((idea) => {
            const category = idea.enrichment?.category;
            const image = idea.enrichment?.image_url;
            const date = new Date(idea.created_at).toLocaleDateString("de-CH");
            return <Link href={`/ideas/${idea.id}`} key={idea.id} className="flex gap-3 rounded-[14px] bg-white p-2 shadow-[0_2px_10px_rgba(0,0,0,.06)]">
              <div className="flex h-[82px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#e8ece4] text-[30px]">
                {image ? <img src={image} alt="" className="h-full w-full object-contain p-1" referrerPolicy="no-referrer" /> : emojiFor(category)}
              </div>
              <div className="min-w-0 flex-1 py-1">
                <h2 className="line-clamp-2 text-[15px] font-semibold leading-5">{idea.title}</h2>
                <p className="mt-1 line-clamp-1 text-[12px] text-black/55">{idea.location_label || idea.summary || "Gespeicherte Idee"}</p>
                <p className="mt-1 text-[11px] text-black/40">{date}</p>
                <div className="mt-1 text-right">{(category || idea.tags?.[0]) && <span className="rounded-full bg-[#f0efeb] px-2 py-1 text-[10px]">{category || idea.tags[0]}</span>}</div>
              </div>
            </Link>;
          })}
        </div>}
      </section>

      <nav className="mt-auto flex items-center justify-around border-t border-black/5 bg-white px-14 py-4"><Link href="/" className="rounded-full bg-white px-6 py-3 shadow-[0_3px_14px_rgba(0,0,0,.10)]"><Home className="h-5 w-5 fill-black" /></Link><UserRound className="h-5 w-5" /></nav>
    </main>
  );
}
