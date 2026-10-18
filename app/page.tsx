import { ChatDock } from "@/components/chat/chat-dock";
import type { Metadata } from "next";
import { TrainFront } from "lucide-react";
import { TrainScene } from "@/components/train/train-scene";

export const metadata: Metadata = {
  title: "Financial Risk Assessment | ComplyDo Solutions",
  description: "Supply chain financial risk assessment by ComplyDo Solutions.",
};

export default function Home() {
  return (
    <main className="blueprint-page flex min-h-svh flex-col px-5 sm:px-10 lg:px-16">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--blueprint-rule)] py-6">
        <div className="flex items-center gap-3 text-sm font-medium tracking-tight">
          <TrainFront className="size-5" strokeWidth={1.5} aria-hidden="true" />
          ComplyDo Solutions
        </div>
        <div className="flex items-center gap-6">
          <span className="blueprint-label max-w-32 text-right sm:max-w-none">Supply Chain Financials</span>
          <ChatDock />
        </div>
      </header>

      <section className="pt-9 text-left sm:pt-12" aria-labelledby="landing-heading">
        <h1 id="landing-heading" className="text-[clamp(1.1rem,5.4vw,3rem)] leading-[1.12] font-medium tracking-[-0.035em] whitespace-nowrap">
          Financial Risk Assessment
        </h1>
      </section>

      <TrainScene />

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--blueprint-rule)] py-5">
        <span className="blueprint-label">01 / High-speed rail</span>
        <span className="blueprint-label">A system of connected parts</span>
      </footer>
    </main>
  );
}
