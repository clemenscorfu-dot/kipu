import { PlaceholderScreen } from "@/components/placeholder-screen";
import { mockIdeas } from "@/lib/mock-ideas";
import Link from "next/link";

export default function IdeasPage() {
  return (
    <PlaceholderScreen eyebrow="Meine Ideen" title="Alles, was du dir merken wolltest." description="Noch Mockdaten. Später wird diese Liste automatisch aus deinen gespeicherten Fundstücken aufgebaut.">
      <div className="space-y-3">
        {mockIdeas.map((idea) => (
          <Link key={idea.id} href={`/ideas/${idea.id}`} className="block rounded-[26px] border border-[#ded5c7] bg-[#fffdf8] p-4 shadow-[0_8px_24px_rgba(83,67,49,0.04)]">
            <p className="text-[12px] text-[#968b80]">{idea.inputType} · {idea.tags.slice(0, 2).join(" · ")}</p>
            <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.02em] text-[#302b27]">{idea.title}</h2>
            <p className="mt-1 text-[13px] leading-5 text-[#766d64]">{idea.summary}</p>
          </Link>
        ))}
      </div>
    </PlaceholderScreen>
  );
}
