import { Search } from "lucide-react";
import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function SearchPage() {
  return (
    <PlaceholderScreen eyebrow="Suche" title="Frag Kipu einfach so, wie du dich erinnerst." description="Später suchst du semantisch über deine eigenen Fundstücke – auch wenn du Titel, Datum oder Ort längst vergessen hast.">
      <div className="flex items-center gap-3 rounded-[24px] bg-[#1b1b19] px-4 py-4 text-[#8f8a82]">
        <Search className="h-5 w-5" />
        <span className="text-[14px]">Wo war nochmal diese Grillstelle?</span>
      </div>
      <div className="mt-4 space-y-2 text-[13px] text-[#8f8a82]">
        <p>„Welches Restaurant hat Marco empfohlen?“</p>
        <p>„Was habe ich im Tessin gespeichert?“</p>
        <p>„Zeig mir Ideen für mit den Kindern.“</p>
      </div>
    </PlaceholderScreen>
  );
}
