"use client";

import { riskLevel, type CriterionInfo, type Weights } from "@/lib/suppliers/criteria";
import { cn } from "@/lib/utils";
import type { BoardRow } from "./board-view";
import { LEVEL_COLOR } from "./risk-color";
import { RiskFingerprint } from "./risk-fingerprint";

interface RankingListProps {
  rows: BoardRow[];
  supplierCount: number;
  criteria: CriterionInfo[];
  weights: Weights;
  focusedId: string;
  onSelect: (row: BoardRow) => void;
  onPreview: (row: BoardRow | null) => void;
}

export function RankingList({ rows, supplierCount, criteria, weights, focusedId, onSelect, onPreview }: RankingListProps) {
  return (
    <nav aria-label="Supplier ranking" className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Ranking</h2>
        <span className="blueprint-label">
          Top {rows.length} of {supplierCount.toLocaleString("en")}
        </span>
      </div>
      <ol className="max-h-[42rem] overflow-y-auto rounded-lg border border-[var(--blueprint-rule)]">
        {rows.map((row) => (
          <li key={row.id} className="border-b border-[var(--blueprint-rule)] last:border-0">
            <button
              type="button"
              aria-current={row.id === focusedId ? "true" : undefined}
              onClick={() => onSelect(row)}
              onMouseEnter={() => onPreview(row)}
              onMouseLeave={() => onPreview(null)}
              onFocus={() => onPreview(row)}
              onBlur={() => onPreview(null)}
              className={cn(
                "grid w-full grid-cols-[1.75rem_28px_minmax(0,1fr)_auto_2.25rem] items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5",
                row.id === focusedId && "bg-white/10",
              )}
            >
              <span className="text-xs tabular-nums text-[var(--blueprint-muted)]">{row.rank}</span>
              <RiskFingerprint scores={row.scores} criteria={criteria} weights={weights} size={28} />
              <span className="min-w-0">
                <span className="block truncate text-sm">{row.name}</span>
                <span className="blueprint-label">{row.id}</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm tabular-nums">
                <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: LEVEL_COLOR[riskLevel(row.risk)] }} />
                {row.risk.toFixed(1)}
              </span>
              <RankChange value={row.rankChange} />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function RankChange({ value }: { value: number | null }) {
  if (value === null || value === 0) return <span className="text-right text-xs text-[var(--blueprint-muted)]">–</span>;
  const up = value > 0;
  return (
    <span
      aria-label={`${up ? "Up" : "Down"} ${Math.abs(value)} places against the Siemens default ranking`}
      className="text-right text-xs tabular-nums"
      style={{ color: up ? "var(--risk-low)" : "var(--risk-critical)" }}
    >
      {up ? "▲" : "▼"}
      {Math.abs(value)}
    </span>
  );
}
