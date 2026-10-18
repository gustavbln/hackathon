import type { Metadata } from "next";
import { TrainScene } from "@/components/train/train-scene";

export const metadata: Metadata = {
  title: "Financial Risk Assessment | ComplyDo Solutions",
  description: "Supply chain financial risk assessment by ComplyDo Solutions.",
};

export default function Home() {
  return (
    <main className="blueprint-page flex min-h-svh flex-col px-5 sm:px-10 lg:px-16">
      <section className="space-y-3 border-b border-[var(--blueprint-rule)] pt-7 pb-6 text-left sm:pt-9" aria-labelledby="landing-heading">
        <p className="blueprint-label">ComplyDo Solutions / Supplier intelligence</p>
        <h1 id="landing-heading" className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.08] font-medium tracking-[-0.035em]">
          Financial Risk Assessment
        </h1>
        <p className="text-sm text-[var(--blueprint-muted)] sm:text-base">
          Know your suppliers. Keep production moving.
        </p>
      </section>

      <TrainScene cabinHref="/cabin" />

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--blueprint-rule)] py-5">
        <span className="blueprint-label">01 / High-speed rail</span>
        <span className="blueprint-label">ComplyDo Solutions</span>
      </footer>
    </main>
  );
}
