import type { Metadata } from "next";
import { TrainFront } from "lucide-react";
import { TrainScene } from "@/components/train/train-scene";

export const metadata: Metadata = {
  title: "Supply Chain Risk Assessment",
  description: "A clearer perspective on rail procurement and supplier risk.",
};

export default function Home() {
  return (
    <main className="blueprint-page flex min-h-svh flex-col px-5 sm:px-10 lg:px-16">
      <header className="flex items-center justify-between border-b border-[var(--blueprint-rule)] py-6">
        <div className="flex items-center gap-3 text-sm font-medium tracking-tight">
          <TrainFront className="size-5" strokeWidth={1.5} aria-hidden="true" />
          Supply intelligence
        </div>
        <span className="blueprint-label hidden sm:block">Rail systems / Procurement</span>
      </header>

      <section className="pt-9 text-left sm:pt-12" aria-labelledby="landing-heading">
        <p className="blueprint-label mb-4">A clearer perspective</p>
        <h1 id="landing-heading" className="max-w-xl text-3xl leading-[1.12] font-medium tracking-[-0.035em] sm:text-4xl lg:text-5xl">
          Supply Chain<br />Risk Assessment
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--blueprint-muted)]">
          Understand the suppliers behind every component.{" "}<br className="hidden sm:block" />
          Make confident decisions across your supply chain.
        </p>
      </section>

      <TrainScene />

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--blueprint-rule)] py-5">
        <span className="blueprint-label">01 / High-speed rail</span>
        <span className="blueprint-label">A system of connected parts</span>
      </footer>
    </main>
  );
}
