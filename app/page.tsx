import type { Metadata } from "next";
import { TrainScene } from "@/components/train/train-scene";
import { ChatWorkspace } from "@/components/chat/chat-dock";

export const metadata: Metadata = {
  title: "Financial Risk Assessment | ComplyDo Solutions",
  description: "Supply chain financial risk assessment by ComplyDo Solutions.",
};

export default function Home() {
  return (
    <ChatWorkspace>
      <div className="blueprint-page flex min-h-svh min-w-0 flex-1 flex-col">
        <TrainScene>
          <div className="flex items-center justify-end gap-4">
            <p className="blueprint-label rounded-full border border-[var(--blueprint-ink)] bg-[var(--blueprint-paper)]/70 px-3 py-1.5 text-[var(--blueprint-ink)]">
              Runs on NVIDIA Nemotron
            </p>
          </div>
          <section className="mt-[min(3svh,1.5rem)] max-w-3xl space-y-4" aria-labelledby="landing-heading">
            <p className="blueprint-label text-[var(--blueprint-ink)]">Financial Risk Assessment / Supplier intelligence for rail</p>
            <h1 id="landing-heading" className="text-[clamp(2rem,4.5vw,3.75rem)] leading-none font-medium tracking-[-0.035em]">
              Know your suppliers.<br />
              Keep production moving.
            </h1>
            <p className="max-w-md text-base text-[var(--blueprint-ink)] sm:text-lg">
              Weighted risk for 10,000 suppliers, part by part, from the train down to the seat.
            </p>
          </section>
        </TrainScene>
      </div>
    </ChatWorkspace>
  );
}
