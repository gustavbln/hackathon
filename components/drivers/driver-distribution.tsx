"use client";

import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DriverSupplier } from "./driver-types";

/** The dataset's level bands on the 0–100 scale. */
const LEVELS = [
  { label: "Low", from: 0, color: "var(--risk-low)" },
  { label: "Medium", from: 25, color: "var(--risk-medium)" },
  { label: "High", from: 50, color: "var(--risk-high)" },
  { label: "Critical", from: 75, color: "var(--risk-critical)" },
] as const;
const DOT_STEP = 11;

interface DriverDistributionProps {
  label: string;
  /** Supplier counts in 5-point bins: 0–4, 5–9, … 95–100. */
  bins: number[];
  median: number;
  shortlist: DriverSupplier[];
  query: string;
}

/** How every supplier scores on one driver, with the seat's top 20 placed on the same axis. */
export function DriverDistribution({ label, bins, median, shortlist, query }: DriverDistributionProps) {
  const router = useRouter();
  const tallest = Math.max(...bins, 1);
  const total = bins.reduce((sum, count) => sum + count, 0);

  // Dots with the same rounded score stack upwards instead of overlapping.
  const stackIndex = new Map<string, number>();
  const seen = new Map<number, number>();
  for (const supplier of shortlist) {
    if (supplier.score === null) continue;
    const bucket = Math.round(supplier.score / 2);
    stackIndex.set(supplier.id, seen.get(bucket) ?? 0);
    seen.set(bucket, (seen.get(bucket) ?? 0) + 1);
  }
  const stripHeight = (Math.max(...seen.values(), 1) + 1) * DOT_STEP;

  return (
    <figure className="flex min-w-0 flex-col gap-3 rounded-sm border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label} across all {total.toLocaleString("en")} suppliers</span>
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--blueprint-muted)]">
          <span aria-hidden="true" className="size-2 rounded-full bg-[var(--blueprint-ink)]" /> Your top {shortlist.length}
        </span>
      </figcaption>

      <div className="relative h-44" role="img" aria-label={`Histogram of ${label} scores in 5-point bins. Median ${median}.`}>
        <div className="flex h-full items-end gap-[2px]">
          {bins.map((count, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  className="flex h-full flex-1 items-end outline-none focus-visible:bg-[var(--blueprint-grid)]"
                  aria-label={`${index * 5} to ${index * 5 + 4}: ${count} suppliers`}
                >
                  <span
                    className="w-full rounded-t-[4px] bg-[var(--series-other)] transition-colors hover:bg-[var(--blueprint-muted)]"
                    style={{ height: `${(count / tallest) * 100}%` }}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <strong>{count.toLocaleString("en")}</strong>&nbsp;suppliers score {index * 5}–{index === 19 ? 100 : index * 5 + 4}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-px bg-[var(--blueprint-ink)]" style={{ left: `${median}%` }}>
          <span className="absolute -top-1 left-1.5 font-mono text-[10px] whitespace-nowrap">Median {median}</span>
        </div>
      </div>

      <div aria-hidden="true">
        <div className="flex h-1.5 gap-[2px]">
          {LEVELS.map((level) => (
            <span key={level.label} className="flex-1" style={{ backgroundColor: level.color }} />
          ))}
        </div>
        <div className="mt-1 grid grid-cols-4 text-center text-[10px]">
          {LEVELS.map((level) => (
            <span key={level.label}>{level.label}</span>
          ))}
        </div>
        <div className="relative mt-0.5 h-3 font-mono text-[9px] text-[var(--blueprint-muted)] tabular-nums">
          {[0, 25, 50, 75, 100].map((tick) => (
            <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${tick}%` }}>
              {tick}
            </span>
          ))}
        </div>
      </div>

      <div className="relative" style={{ height: stripHeight }}>
        {shortlist.map((supplier) =>
          supplier.score === null ? null : (
            <Tooltip key={supplier.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => router.push(`/suppliers/${supplier.id}?${query}`)}
                  aria-label={`${supplier.name}: ${label} ${supplier.score}. Open supplier details.`}
                  className="absolute flex size-6 -translate-x-1/2 items-center justify-center outline-none"
                  style={{ left: `${supplier.score}%`, bottom: (stackIndex.get(supplier.id) ?? 0) * DOT_STEP - 7 }}
                >
                  <span className="size-2.5 rounded-full bg-[var(--blueprint-ink)] ring-2 ring-[var(--blueprint-paper-deep)] transition-transform hover:scale-150" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <strong>{supplier.score}</strong>&nbsp;{supplier.name} · rank {supplier.rank}
              </TooltipContent>
            </Tooltip>
          ),
        )}
      </div>
    </figure>
  );
}
