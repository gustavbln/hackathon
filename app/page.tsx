import type { Metadata } from "next";
import { TrainScene } from "@/components/train/train-scene";

export const metadata: Metadata = {
  title: "Financial Risk Assessment | ComplyDo Solutions",
  description: "Supply chain financial risk assessment by ComplyDo Solutions.",
};

export default function Home() {
  return (
    <main className="blueprint-page flex min-h-svh flex-col px-5 sm:px-10 lg:px-16">
      <section className="flex items-center justify-between gap-4 pt-9 text-left sm:pt-12" aria-labelledby="landing-heading">
        <h1 id="landing-heading" className="text-[clamp(1.1rem,5.4vw,3rem)] leading-[1.12] font-medium tracking-[-0.035em] whitespace-nowrap">
          Financial Risk Assessment
        </h1>
      </section>

      <TrainScene cabinHref="/cabin">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-lg font-medium tracking-tight sm:text-2xl">
            Know your suppliers. Keep production moving.
          </p>
        </div>
      </TrainScene>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--blueprint-rule)] py-5">
        <span className="blueprint-label">01 / High-speed rail</span>
        <span className="blueprint-label">ComplyDo Solutions</span>
      </footer>
    </main>
  );
}
