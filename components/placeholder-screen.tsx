import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function PlaceholderScreen({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ded5c7] bg-[#fffdf8] shadow-sm" aria-label="Zurück">
          <ArrowLeft className="h-5 w-5 text-[#38322d]" />
        </Link>
        <p className="text-[13px] tracking-[0.22em] text-[#8d8378]">kipu</p>
        <div className="h-10 w-10" />
      </header>

      <section className="pt-16">
        <p className="text-[13px] font-medium text-[#9b8f82]">{eyebrow}</p>
        <h1 className="mt-3 text-[40px] font-semibold leading-[0.98] tracking-[-0.045em] text-[#26221f]">{title}</h1>
        <p className="mt-5 max-w-[350px] text-[15px] leading-6 text-[#766d64]">{description}</p>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}
