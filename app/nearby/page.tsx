import { MapPin } from "lucide-react";
import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function NearbyPage() {
  return (
    <PlaceholderScreen eyebrow="In meiner Nähe" title="Was hast du hier schon einmal entdeckt?" description="Später zeigt Kipu hier deine gespeicherten Fundstücke nach Distanz und auf einer Karte.">
      <div className="relative h-72 overflow-hidden rounded-[30px] border border-[#ded5c7] bg-[#efe7db] shadow-[0_10px_30px_rgba(83,67,49,0.04)]">
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, #c69258 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, #b6a38f 0 2px, transparent 3px)" }} />
        <div className="absolute left-[45%] top-[42%] flex h-14 w-14 items-center justify-center rounded-full bg-[#d6aa76] text-[#332d27] shadow-lg"><MapPin className="h-6 w-6" /></div>
        <div className="absolute bottom-4 left-4 right-4 rounded-[22px] border border-[#ded5c7] bg-[#fffaf3]/95 p-4 shadow-sm">
          <p className="text-[12px] text-[#968b80]">2.4 km entfernt</p>
          <p className="mt-1 font-semibold text-[#302b27]">Grillstelle im Wald</p>
        </div>
      </div>
    </PlaceholderScreen>
  );
}
