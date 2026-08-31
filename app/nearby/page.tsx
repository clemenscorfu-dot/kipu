import { MapPin } from "lucide-react";
import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function NearbyPage() {
  return (
    <PlaceholderScreen eyebrow="In meiner Nähe" title="Was hast du hier schon einmal entdeckt?" description="Später zeigt Kipu hier deine gespeicherten Fundstücke nach Distanz und auf einer Karte.">
      <div className="relative h-72 overflow-hidden rounded-[30px] border border-white/[0.04] bg-[#1b1b19]">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, #d8a15e 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, #e8dec8 0 2px, transparent 3px)" }} />
        <div className="absolute left-[45%] top-[42%] flex h-14 w-14 items-center justify-center rounded-full bg-[#d8a15e] text-[#171716] shadow-xl"><MapPin className="h-6 w-6" /></div>
        <div className="absolute bottom-4 left-4 right-4 rounded-[22px] bg-[#242321]/95 p-4">
          <p className="text-[12px] text-[#aaa399]">2.4 km entfernt</p>
          <p className="mt-1 font-semibold">Grillstelle im Wald</p>
        </div>
      </div>
    </PlaceholderScreen>
  );
}
