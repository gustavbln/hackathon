"use client";

import { cn } from "@/lib/utils";
import { riskLevel, type CriterionInfo } from "@/lib/suppliers/criteria";
import type { BoardRow } from "./board-view";
import { LEVEL_COLOR, scoreColor } from "./risk-color";

interface LeaderboardTableProps {
  rows: BoardRow[];
  criteria: CriterionInfo[];
  supplierCount: number;
  activeId: string | null;
  onActivate: (id: string | null) => void;
}

export function LeaderboardTable({ rows, criteria, supplierCount, activeId, onActivate }: LeaderboardTableProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-6 xl:self-start">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Overall ranking</h2>
        <span className="blueprint-label">
          Top {rows.length} of {supplierCount.toLocaleString("en")}
        </span>
      </div>
      <div className="max-h-[36rem] overflow-auto rounded-lg border border-[var(--blueprint-rule)]">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Suppliers ranked by weighted risk for the selected profile</caption>
          <thead className="blueprint-label sticky top-0 z-10 bg-[var(--blueprint-paper-deep)] text-left">
            <tr>
              <th scope="col" className="px-3 py-2 font-normal">#</th>
              <th scope="col" className="px-3 py-2 font-normal">Supplier</th>
              <th scope="col" className="px-3 py-2 text-right font-normal">Risk</th>
              <th scope="col" className="px-3 py-2 text-right font-normal">Moved</th>
              <th scope="col" className="hidden px-3 py-2 font-normal md:table-cell">Profile</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={0}
                onMouseEnter={() => onActivate(row.id)}
                onMouseLeave={() => onActivate(null)}
                onFocus={() => onActivate(row.id)}
                onBlur={() => onActivate(null)}
                className={cn(
                  "border-t border-[var(--blueprint-rule)] outline-none transition-colors",
                  activeId === row.id && "bg-white/10",
                )}
              >
                <td className="px-3 py-2 tabular-nums text-[var(--blueprint-muted)]">{row.rank}</td>
                <td className="px-3 py-2">
                  <span className="block truncate">{row.name}</span>
                  <span className="blueprint-label">{row.id}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full"
                      style={{ backgroundColor: LEVEL_COLOR[riskLevel(row.risk)] }}
                    />
                    {row.risk.toFixed(1)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <RankChange value={row.rankChange} />
                </td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <span className="flex gap-0.5">
                    {criteria.map((criterion) => {
                      const score = row.scores[criterion.key];
                      return (
                        <span
                          key={criterion.key}
                          title={`${criterion.label}: ${score ?? "unknown"}`}
                          className="size-2.5 rounded-[2px] border border-white/10"
                          style={{ backgroundColor: scoreColor(score) }}
                        />
                      );
                    })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankChange({ value }: { value: number | null }) {
  if (value === null || value === 0) return <span className="text-[var(--blueprint-muted)]">–</span>;
  const up = value > 0;
  return (
    <span
      aria-label={`${up ? "Up" : "Down"} ${Math.abs(value)} places against the Siemens default ranking`}
      style={{ color: up ? "var(--risk-low)" : "var(--risk-critical)" }}
    >
      {up ? "▲" : "▼"}
      {Math.abs(value)}
    </span>
  );
}
