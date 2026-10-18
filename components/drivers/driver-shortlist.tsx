"use client";

import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { riskLevel } from "@/lib/suppliers/criteria";
import { LEVEL_COLOR } from "@/components/leaderboard/risk-color";
import type { DriverSupplier } from "./driver-types";

interface DriverShortlistProps {
  label: string;
  shortlist: DriverSupplier[];
  median: number;
  query: string;
}

/** The seat's top 20, re-sorted by this one driver: who is strongest exactly here. */
export function DriverShortlist({ label, shortlist, median, query }: DriverShortlistProps) {
  const router = useRouter();
  const sorted = [...shortlist].sort((a, b) => (a.score ?? 101) - (b.score ?? 101) || a.rank - b.rank);

  return (
    <figure className="flex min-w-0 flex-col gap-3 rounded-sm border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] p-5">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Your top {shortlist.length} on {label.toLowerCase()}</span>
        <span className="blueprint-label">Score · lower is better</span>
      </figcaption>
      <ol className="relative flex flex-col">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px bg-[var(--blueprint-ink)] opacity-40"
          style={{ left: `calc(7.5rem + (100% - 10rem) * ${median / 100})` }}
        />
        {sorted.map((supplier) => {
          const level = supplier.score === null ? null : riskLevel(supplier.score);
          return (
            <li key={supplier.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => router.push(`/suppliers/${supplier.id}?${query}`)}
                    aria-label={`${supplier.name}: ${label} ${supplier.score ?? "unknown"}${level ? `, ${level}` : ""}. Open supplier details.`}
                    className="grid w-full grid-cols-[7rem_minmax(0,1fr)_2.5rem] items-center gap-2 py-[3px] text-left text-xs outline-none hover:bg-[var(--blueprint-grid)] focus-visible:bg-[var(--blueprint-grid)]"
                  >
                    <span className="truncate">{supplier.name}</span>
                    <span className="h-2.5">
                      <span
                        className="block h-full rounded-r-[4px]"
                        style={{
                          width: `${Math.max(supplier.score ?? 0, 1)}%`,
                          backgroundColor: level ? LEVEL_COLOR[level] : "transparent",
                        }}
                      />
                    </span>
                    <span className="text-right font-mono text-[11px] tabular-nums">{supplier.score ?? "?"}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <strong>{supplier.score ?? "?"}</strong>&nbsp;{level ?? "unknown"} · overall rank {supplier.rank} · weighted risk{" "}
                  {supplier.risk.toFixed(1)}
                </TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ol>
      <p className="text-[11px] text-[var(--blueprint-muted)]">The vertical line is the median of all suppliers ({median}).</p>
    </figure>
  );
}
