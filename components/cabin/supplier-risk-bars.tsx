"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CRITERION_BY_KEY, type CriterionKey } from "@/lib/suppliers/criteria";
import type { SeatShortlist } from "@/lib/seat-shortlist-contract";
import { cn } from "@/lib/utils";
import { seriesColor } from "./series-color";

type Supplier = SeatShortlist["suppliers"][number];

interface SupplierRiskBarsProps {
  suppliers: Supplier[];
  supplierCount: number;
  /** The top-priority drivers that get their own coloured segment, in series order. */
  focusKeys: CriterionKey[];
  highlighted: CriterionKey | null;
  onHighlight: (key: CriterionKey | null) => void;
  onOpen: (supplierId: string) => void;
}

interface Segment {
  key: CriterionKey | "other";
  label: string;
  points: number;
  color: string;
}

/** Weighted risk per supplier, split into what each top-priority driver adds. Lower is better. */
export function SupplierRiskBars({ suppliers, supplierCount, focusKeys, highlighted, onHighlight, onOpen }: SupplierRiskBarsProps) {
  // A hovered driver outside the focus set gets pulled out of "other" so it can be followed too.
  const shown = highlighted && !focusKeys.includes(highlighted) ? [...focusKeys, highlighted] : focusKeys;
  const axisMax = Math.ceil(Math.max(...suppliers.map((supplier) => supplier.risk), 1) / 5) * 5;
  const ticks = Array.from({ length: axisMax / 5 + 1 }, (_, index) => index * 5);

  const segmentsOf = (supplier: Supplier): Segment[] => {
    const own = shown.map((key, index) => ({
      key,
      label: CRITERION_BY_KEY[key].label,
      points: supplier.contributions[key] ?? 0,
      color: index < focusKeys.length ? seriesColor(index) : "var(--blueprint-ink)",
    }));
    const rest = supplier.risk - own.reduce((sum, segment) => sum + segment.points, 0);
    return [...own, { key: "other", label: "Other drivers", points: Math.max(rest, 0), color: "var(--series-other)" }];
  };

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between gap-3">
          <span className="blueprint-label">Top {suppliers.length} of {supplierCount.toLocaleString("en")}</span>
          <span className="blueprint-label">Weighted risk · lower is better</span>
        </span>
        <ul aria-label="Legend" className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--blueprint-muted)]">
          {focusKeys.map((key, index) => (
            <li key={key} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-3 rounded-[2px]" style={{ backgroundColor: seriesColor(index) }} />
              {CRITERION_BY_KEY[key].label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-3 rounded-[2px]" style={{ backgroundColor: "var(--series-other)" }} />
            Other drivers
          </li>
        </ul>
      </figcaption>

      <ol className="flex flex-col">
        {suppliers.map((supplier) => {
          const segments = segmentsOf(supplier);
          return (
            <li key={supplier.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onOpen(supplier.id)}
                    aria-label={`${supplier.name}, rank ${supplier.rank}, weighted risk ${supplier.risk.toFixed(1)}. Open supplier details.`}
                    className="grid w-full grid-cols-[1.25rem_minmax(5.5rem,0.9fr)_minmax(0,2fr)_2rem] items-center gap-2 py-[3px] text-left text-xs outline-none hover:bg-[var(--blueprint-grid)] focus-visible:bg-[var(--blueprint-grid)]"
                  >
                    <span className="font-mono text-[10px] text-[var(--blueprint-muted)] tabular-nums">
                      {String(supplier.rank).padStart(2, "0")}
                    </span>
                    <span className="truncate">{supplier.name}</span>
                    <span className="flex h-3 gap-[2px]" style={{ width: `${(supplier.risk / axisMax) * 100}%` }}>
                      {segments.map((segment) => (
                        <span
                          key={segment.key}
                          onMouseEnter={segment.key === "other" ? undefined : () => onHighlight(segment.key as CriterionKey)}
                          onMouseLeave={() => onHighlight(null)}
                          className={cn(
                            "h-full transition-opacity duration-200 last:rounded-r-[4px]",
                            highlighted !== null && segment.key !== highlighted && "opacity-30",
                          )}
                          style={{ flexGrow: segment.points, flexBasis: 0, backgroundColor: segment.color }}
                        />
                      ))}
                    </span>
                    <span className="text-right font-mono text-[11px] tabular-nums">{supplier.risk.toFixed(1)}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="flex-col items-stretch gap-1">
                  <span className="flex items-baseline justify-between gap-4">
                    <strong className="text-sm">{supplier.risk.toFixed(1)}</strong>
                    <span>{supplier.name}</span>
                  </span>
                  {segments.map((segment) => (
                    <span key={segment.key} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-0.5 w-3" style={{ backgroundColor: segment.color }} />
                        {segment.label}
                      </span>
                      <span className="tabular-nums">{segment.points.toFixed(1)}</span>
                    </span>
                  ))}
                </TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ol>

      <div aria-hidden="true" className="grid grid-cols-[1.25rem_minmax(5.5rem,0.9fr)_minmax(0,2fr)_2rem] gap-2">
        <span />
        <span />
        <span className="relative h-4 border-t border-[var(--blueprint-rule)]">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute top-1 -translate-x-1/2 font-mono text-[9px] text-[var(--blueprint-muted)] tabular-nums"
              style={{ left: `${(tick / axisMax) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </span>
      </div>
    </figure>
  );
}
