import { MapPin, Tag } from "lucide-react";
import { PlaceholderScreen } from "@/components/placeholder-screen";
import { mockIdeas } from "@/lib/mock-ideas";

export default async function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idea = mockIdeas.find((item) => item.id === id) ?? mockIdeas[0];

  return (
    <PlaceholderScreen eyebrow="Gespeicherte Idee" title={idea.title} description={idea.summary}>
      <div className="space-y-3">
        <section className="rounded-[26px] bg-[#181817] p-5">
          <p className="text-[12px] text-[#8f8a82]">Original</p>
          <p className="mt-2 text-[15px] leading-6 text-[#d8d0c2]">{idea.originalInput}</p>
        </section>
        {idea.location?.label && (
          <section className="flex items-center gap-3 rounded-[26px] bg-[#181817] p-5">
            <MapPin className="h-5 w-5 text-[#d8a15e]" />
            <div><p className="text-[12px] text-[#8f8a82]">Ort</p><p className="mt-1 text-[15px]">{idea.location.label}</p></div>
          </section>
        )}
        <section className="rounded-[26px] bg-[#181817] p-5">
          <div className="flex items-center gap-2 text-[12px] text-[#8f8a82]"><Tag className="h-4 w-4" /> Tags</div>
          <div className="mt-3 flex flex-wrap gap-2">{idea.tags.map((tag) => <span key={tag} className="rounded-full bg-[#272725] px-3 py-1 text-[12px] text-[#c8c0b2]">{tag}</span>)}</div>
        </section>
      </div>
    </PlaceholderScreen>
  );
}
