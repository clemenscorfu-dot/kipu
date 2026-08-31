import { PlaceholderScreen } from "@/components/placeholder-screen";
import { mockIdeas } from "@/lib/mock-ideas";
import Link from "next/link";

export default function IdeasPage() {
  return (
    <PlaceholderScreen eyebrow="Meine Ideen" title="Alles, was du dir merken wolltest." description="Noch Mockdaten. Später wird diese Liste automatisch aus deinen gespeicherten Fundstücken aufgebaut.">
      <div className="space-y-3">
        {mockIdeas.map((idea) => (
          <Link key={idea.id} href={`/ideas/${idea.id}`} className="block rounded-[26px] border border-white/[0.04] bg-[#181817] p-4">
            <p className="text-[12px] text-[#8f8a82]">{idea.inputType} · {idea.tags.slice(0, 2).join(" · ")}</p>
            <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.02em]">{idea.title}</h2>
            <p className="mt-1 text-[13px] leading-5 text-[#aaa399]">{idea.summary}</p>
          </Link>
        ))}
      </div>
    </PlaceholderScreen>
  );
}
