import {
  Camera,
  ChevronRight,
  Home as HomeIcon,
  MapPin,
  Mic,
  Paperclip,
  Pencil,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";

const actions = [
  { label: "Sprechen", icon: Mic, href: "/voice", color: "text-[#6f78f6]" },
  { label: "Schreiben", icon: Pencil, href: "/search", color: "text-[#f2a23b]" },
  { label: "Kamera", icon: Camera, href: "/processing", color: "text-[#42b86a]" },
  { label: "Datei", icon: Paperclip, href: "/processing", color: "text-[#9a78df]" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#fbfaf7] px-5 pb-5 pt-5 text-[#111111]">
      <div className="flex h-8 items-center justify-end">
        <button
          aria-label="Einstellungen"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#111111]"
          type="button"
        >
          <Settings className="h-[19px] w-[19px]" strokeWidth={2} />
        </button>
      </div>

      <header className="mt-4">
        <h1 className="max-w-[310px] text-[32px] font-semibold leading-[1.06] tracking-[-0.035em]">
          Was möchtest
          <br />
          du dir merken?
        </h1>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3">
        {actions.map(({ label, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="flex h-[126px] flex-col items-center justify-center rounded-[18px] border border-[#ecebe7] bg-white shadow-[0_6px_18px_rgba(0,0,0,0.05)] active:scale-[0.99]"
          >
            <Icon className={`h-8 w-8 ${color}`} strokeWidth={2.2} />
            <span className="mt-4 text-[14px] font-medium">{label}</span>
          </Link>
        ))}
      </section>

      <section className="mt-7">
        <p className="mb-3 text-[14px] font-semibold">Schnellzugriff</p>
        <div className="overflow-hidden rounded-[18px] border border-[#ecebe7] bg-white shadow-[0_6px_18px_rgba(0,0,0,0.045)]">
          <Link
            href="/nearby"
            className="flex h-[58px] items-center border-b border-[#efefec] px-3"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#dff1c9] text-[#79aa36]">
              <MapPin className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <span className="ml-3 flex-1 text-[14px] font-medium">In meiner Nähe</span>
            <ChevronRight className="h-[18px] w-[18px] text-[#111111]" strokeWidth={1.9} />
          </Link>

          <Link href="/ideas" className="flex h-[58px] items-center px-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#d8e8ff] text-[#4c8df5]">
              <Camera className="h-[17px] w-[17px]" strokeWidth={2.2} />
            </span>
            <span className="ml-3 flex-1 text-[14px] font-medium">Meine Ideen</span>
            <ChevronRight className="h-[18px] w-[18px] text-[#111111]" strokeWidth={1.9} />
          </Link>
        </div>
      </section>

      <nav className="mt-auto flex items-center justify-center gap-[56px] pt-8">
        <Link
          href="/"
          aria-label="Home"
          className="flex h-[42px] w-[76px] items-center justify-center rounded-full border border-[#ecebe7] bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)]"
        >
          <HomeIcon className="h-[20px] w-[20px] fill-black" strokeWidth={2.1} />
        </Link>
        <button
          aria-label="Profil"
          type="button"
          className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-[#111111]"
        >
          <UserRound className="h-[21px] w-[21px]" strokeWidth={1.9} />
        </button>
      </nav>
    </main>
  );
}
