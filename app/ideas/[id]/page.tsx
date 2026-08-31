import { MapPin, Tag } from "lucide-react";
import { PlaceholderScreen } from "@/components/placeholder-screen";
import { mockIdeas } from "@/lib/mock-ideas";

export default async function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idea = mockIdeas.find((item) => item.id === id) ?? mockIdeas[0];

  return (
    <PlaceholderScreen eyebrow="Gespeicherte Idee" title={idea.title} description={idea.summary}>
      <div className="space-y-3">
        <section className="rounded-[26px] border border-[#ded5c7] bg-[#fffdf8] p-5 shadow-[0_8px_24px_rgba(83,67,49,0.04)]">
          <p className="text-[12px] text-[#968b80]">Original</p>
          <p className="mt-2 text-[15px] leading-6 text-[#4a433c]">{idea.originalInput}</p>
        </section>
        {idea.location?.label && (
          <section className="flex items-center gap-3 rounded-[26px] border border-[#ded5c7] bg-[#fffdf8] p-5 shadow-[0_8px_24px_rgba(83,67,49,0.04)]">
            <MapPin className="h-5 w-5 text-[#b98244]" />
            <div><p className="text-[12px] text-[#968b80]">Ort</p><p className="mt-1 text-[15px] text-[#403a34]">{idea.location.label}</p></div>
          </section>
        )}
        <section className="rounded-[26px] border border-[#ded5c7] bg-[#fffdf8] p-5 shadow-[0_8px_24px_rgba(83,67,49,0.04)]">
          <div className="flex items-center gap-2 text-[12px] text-[#968b80]"><Tag className="h-4 w-4" /> Tags</div>
          <div className="mt-3 flex flex-wrap gap-2">{idea.tags.map((tag) => <span key={tag} className="rounded-full bg-[#efe5d8] px-3 py-1 text-[12px] text-[#6f665d]">{tag}</span>)}</div>
        </section>
      </div>
    </PlaceholderScreen>
  );
}
