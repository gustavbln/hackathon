"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CABIN_COMPONENTS, type CabinComponentId } from "@/components/train/cabin-layout";

// What a buyer would weigh for each part. Describes the idea only: no scores are shown for these.
const PREVIEWS: Record<CabinComponentId, { focus: string[]; note: string }> = {
  windows: {
    focus: ["Quality", "Compliance", "Operational resilience"],
    note: "Laminated glass with long lead times: one supplier delay stops the whole carriage.",
  },
  door: {
    focus: ["Quality", "Compliance", "Sub-tier visibility"],
    note: "Mechanics, electronics and seals come from many sub-suppliers.",
  },
  flooring: {
    focus: ["Compliance", "ESG", "Financial health"],
    note: "Fire behaviour and material footprint dominate flooring choices.",
  },
};

export function ComponentPreviewPanel({ componentId, onClose }: { componentId: CabinComponentId; onClose: () => void }) {
  const label = CABIN_COMPONENTS.find(({ id }) => id === componentId)?.label ?? componentId;
  const { focus, note } = PREVIEWS[componentId];

  return (
    <section
      aria-label={`${label} preview`}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
      className="absolute top-24 left-5 z-30 w-[min(26rem,calc(100%-2.5rem))] border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)]/95 text-[var(--blueprint-ink)] backdrop-blur-sm animate-in fade-in-0 slide-in-from-left-2 sm:left-10 sm:w-[min(26rem,calc(100%-5rem))] lg:left-16 lg:w-[min(26rem,calc(100%-8rem))]"
    >
      <header className="flex items-center justify-between border-b border-[var(--blueprint-rule)] py-1 pr-1 pl-4">
        <span className="blueprint-label">Passenger cabin / {label} / Preview</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={`Close ${label} preview`}
          className="hover:bg-[var(--blueprint-grid)] hover:text-[var(--blueprint-ink)]"
        >
          <XIcon strokeWidth={1.5} />
        </Button>
      </header>
      <div className="flex flex-col gap-4 p-4 text-sm">
        <div>
          <h2 className="text-base font-medium tracking-tight">{label}</h2>
          <p className="mt-1 text-[var(--blueprint-muted)]">{note}</p>
        </div>
        <div>
          <p className="blueprint-label mb-2">Criteria a buyer would weigh first</p>
          <ul className="flex flex-wrap gap-2">
            {focus.map((criterion) => (
              <li key={criterion} className="border border-[var(--blueprint-rule)] px-2 py-1 text-xs">
                {criterion}
              </li>
            ))}
          </ul>
        </div>
        <p className="border-l-2 border-[var(--blueprint-rule)] pl-3 text-xs text-[var(--blueprint-muted)]">
          Mockup: suppliers for this part are not analysed in this demo. Select a seat to see the full
          supplier analysis.
        </p>
      </div>
    </section>
  );
}
