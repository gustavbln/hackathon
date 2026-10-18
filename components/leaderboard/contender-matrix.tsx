"use client";

import type { CriterionInfo, CriterionKey } from "@/lib/suppliers/criteria";
import { cn } from "@/lib/utils";
import type { BoardRow } from "./board-view";
import { criterionColor } from "./risk-color";

interface ContenderMatrixProps {
  contenders: BoardRow[];
  criteria: CriterionInfo[];
  focusedId: string;
  activeCriterion: CriterionKey | null;
  onCriterionHover: (criterion: CriterionKey | null) => void;
  onSelect: (row: BoardRow) => void;
  onPreview: (row: BoardRow | null) => void;
}

/** Contenders × criteria. Only high and critical scores carry colour and a number. */
export function ContenderMatrix({
  contenders,
  criteria,
  focusedId,
  activeCriterion,
  onCriterionHover,
  onSelect,
  onPreview,
}: ContenderMatrixProps) {
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Top {contenders.length} side by side</span>
        <span className="blueprint-label">Only high and critical scores are coloured</span>
      </figcaption>
      <div className="overflow-x-auto rounded-lg border border-[var(--blueprint-rule)] p-4">
        <table className="mx-auto border-separate border-spacing-1" onMouseLeave={() => onCriterionHover(null)}>
          <thead>
            <tr>
              <th scope="col" className="sr-only">Supplier</th>
              {criteria.map((criterion) => (
                <th
                  key={criterion.key}
                  scope="col"
                  onMouseEnter={() => onCriterionHover(criterion.key)}
                  className="h-32 w-6 align-bottom font-normal"
                >
                  <span
                    className={cn(
                      "blueprint-label inline-block rotate-180 whitespace-nowrap transition-colors [writing-mode:vertical-rl]",
                      activeCriterion === criterion.key && "text-[var(--blueprint-ink)]",
                    )}
                  >
                    {criterion.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contenders.map((row) => (
              <tr
                key={row.id}
                onClick={() => onSelect(row)}
                onMouseEnter={() => onPreview(row)}
                onMouseLeave={() => onPreview(null)}
                className="cursor-pointer"
              >
                <th
                  scope="row"
                  className={cn(
                    "pr-3 text-left font-mono text-[11px] font-normal whitespace-nowrap text-[var(--blueprint-muted)] transition-colors",
                    row.id === focusedId && "text-[var(--blueprint-ink)]",
                  )}
                >
                  {row.rank}. {row.id}
                </th>
                {criteria.map((criterion) => {
                  const score = row.scores[criterion.key];
                  const flagged = score !== null && score >= 50;
                  return (
                    <td key={criterion.key} onMouseEnter={() => onCriterionHover(criterion.key)} className="p-0">
                      <span
                        title={`${criterion.label}: ${score ?? "unknown"}`}
                        className={cn(
                          "flex size-6 items-center justify-center rounded-[4px] text-[9px] font-semibold tabular-nums text-[var(--blueprint-paper-deep)] transition-[opacity,box-shadow]",
                          activeCriterion !== null && activeCriterion !== criterion.key && "opacity-40",
                          row.id === focusedId && "ring-1 ring-[var(--blueprint-ink)]",
                        )}
                        style={{ backgroundColor: criterionColor(score) }}
                      >
                        {flagged ? score : null}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
