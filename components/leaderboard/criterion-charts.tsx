"use client";

import { cn } from "@/lib/utils";
import type { CriterionInfo, Weights } from "@/lib/suppliers/criteria";
import type { BoardRow } from "./board-view";
import { scoreColor } from "./risk-color";

interface CriterionChartsProps {
  contenders: BoardRow[];
  criteria: CriterionInfo[];
  weights: Weights;
  activeId: string | null;
  onActivate: (id: string | null) => void;
}

export function CriterionCharts({ contenders, criteria, weights, activeId, onActivate }: CriterionChartsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium">Top {contenders.length}, criterion by criterion</h2>
        <span className="blueprint-label hidden sm:block">Hover a supplier to follow it</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {criteria.map((criterion) => {
          // Unknown scores sort last; ties keep the overall ranking.
          const sorted = [...contenders].sort(
            (a, b) => (a.scores[criterion.key] ?? 101) - (b.scores[criterion.key] ?? 101) || a.rank - b.rank,
          );
          return (
            <figure key={criterion.key} className="rounded-lg border border-[var(--blueprint-rule)] p-4">
              <figcaption className="mb-3 flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{criterion.label}</span>
                <span className="blueprint-label">{Math.round(weights[criterion.key] * 100)}% weight</span>
              </figcaption>
              <ol className="flex flex-col gap-1">
                {sorted.map((row) => {
                  const score = row.scores[criterion.key];
                  return (
                    <li
                      key={row.id}
                      onMouseEnter={() => onActivate(row.id)}
                      onMouseLeave={() => onActivate(null)}
                      className={cn(
                        "grid grid-cols-[3.5rem_1fr_1.75rem] items-center gap-2 text-[11px] transition-opacity",
                        activeId !== null && activeId !== row.id && "opacity-30",
                      )}
                    >
                      <span className="truncate font-mono text-[var(--blueprint-muted)]">
                        {row.id.replace("SUPP_", "#")}
                      </span>
                      <span className="h-1.5 rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${Math.max(score ?? 0, 2)}%`, backgroundColor: scoreColor(score) }}
                        />
                      </span>
                      <span className="text-right tabular-nums">{score ?? "?"}</span>
                    </li>
                  );
                })}
              </ol>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
