import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function PlaceholderScreen({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1b1b19]" aria-label="Zurück">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="text-[13px] tracking-[0.22em] text-[#8f8a82]">kipu</p>
        <div className="h-10 w-10" />
      </header>

      <section className="pt-16">
        <p className="text-[13px] font-medium text-[#9b958c]">{eyebrow}</p>
        <h1 className="mt-3 text-[40px] font-semibold leading-[0.98] tracking-[-0.045em]">{title}</h1>
        <p className="mt-5 max-w-[350px] text-[15px] leading-6 text-[#aaa399]">{description}</p>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}
