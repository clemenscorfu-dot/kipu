import { Search } from "lucide-react";
import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function SearchPage() {
  return (
    <PlaceholderScreen eyebrow="Suche" title="Frag Kipu einfach so, wie du dich erinnerst." description="Später suchst du semantisch über deine eigenen Fundstücke – auch wenn du Titel, Datum oder Ort längst vergessen hast.">
      <div className="flex items-center gap-3 rounded-[24px] border border-[#ded5c7] bg-[#fffdf8] px-4 py-4 text-[#8d8378] shadow-[0_8px_24px_rgba(83,67,49,0.04)]">
        <Search className="h-5 w-5" />
        <span className="text-[14px]">Wo war nochmal diese Grillstelle?</span>
      </div>
      <div className="mt-4 space-y-2 text-[13px] text-[#8d8378]">
        <p>„Welches Restaurant hat Marco empfohlen?“</p>
        <p>„Was habe ich im Tessin gespeichert?“</p>
        <p>„Zeig mir Ideen für mit den Kindern.“</p>
      </div>
    </PlaceholderScreen>
  );
}
