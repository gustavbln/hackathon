import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CabinScene } from "@/components/train/cabin-scene";

export const metadata: Metadata = {
  title: "Passenger cabin | ComplyDo Solutions",
  description: "Explore the high-speed train cabin and select a seat.",
};

export default function CabinPage() {
  return (
    <main className="blueprint-page flex min-h-svh flex-col px-5 sm:px-10 lg:px-16">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--blueprint-rule)] py-6">
        <Link href="/" className="flex min-h-9 items-center gap-2 text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to train
        </Link>
        <span className="blueprint-label">HS—03 / Interior</span>
      </header>
      <section className="pt-7 sm:pt-9" aria-labelledby="cabin-heading">
        <p className="blueprint-label mb-2">02 / Passenger compartment</p>
        <h1 id="cabin-heading" className="text-3xl font-medium tracking-tight sm:text-4xl">Inside the cabin</h1>
        <p className="mt-2 text-sm text-[var(--blueprint-muted)]">Choose a seat to explore the train’s components.</p>
      </section>
      <CabinScene />
    </main>
  );
}
