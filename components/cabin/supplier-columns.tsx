"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CRITERION_BY_KEY, type CriterionKey } from "@/lib/suppliers/criteria";

export interface ColumnSupplier {
  id: string;
  name: string;
  risk: number;
  /** Risk points the active driver adds (weight × score); null when no driver is active. */
  activePoints: number | null;
}

interface SupplierColumnsProps {
  suppliers: ColumnSupplier[];
  supplierCount: number;
  active: CriterionKey | null;
  onOpen: (id: string) => void;
}

const PLOT_HEIGHT = 168;

/** The top suppliers as columns, re-sorted live as the weighting changes. Lower weighted risk is better. */
export function SupplierColumns({ suppliers, supplierCount, active, onOpen }: SupplierColumnsProps) {
  const axisMax = Math.ceil(Math.max(...suppliers.map(({ risk }) => risk), 1) / 5) * 5;
  const ticks = Array.from({ length: axisMax / 5 + 1 }, (_, index) => index * 5);
  const slot = 100 / Math.max(suppliers.length, 1);

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">
          Top {suppliers.length} of {supplierCount.toLocaleString("en")} · weighted risk
        </span>
        <span className="flex items-center gap-3 text-[11px] text-[var(--blueprint-muted)]">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-3 rounded-[2px] bg-[var(--series-1)]" /> Weighted risk, lower is better
          </span>
          {active && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-3 rounded-[2px] bg-[var(--series-2)]" /> {CRITERION_BY_KEY[active].label}
            </span>
          )}
        </span>
      </figcaption>

      <div className="relative ml-6" style={{ height: PLOT_HEIGHT }}>
        {ticks.map((tick) => (
          <div key={tick} aria-hidden="true" className="absolute inset-x-0 border-t border-[var(--blueprint-rule)]" style={{ bottom: `${(tick / axisMax) * 100}%` }}>
            <span className="absolute -left-6 -translate-y-1/2 font-mono text-[9px] text-[var(--blueprint-muted)] tabular-nums">{tick}</span>
          </div>
        ))}
        <ol aria-label="Suppliers ranked by weighted risk">
          {suppliers.map((supplier, index) => {
            const height = (supplier.risk / axisMax) * 100;
            const activeHeight = supplier.activePoints === null ? 0 : (supplier.activePoints / axisMax) * 100;
            return (
              <li
                key={supplier.id}
                className="absolute bottom-0 flex h-full justify-center transition-[left] duration-500 ease-out animate-in fade-in-0 motion-reduce:transition-none"
                style={{ left: `${index * slot}%`, width: `${slot}%` }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onOpen(supplier.id)}
                      aria-label={`${index + 1}. ${supplier.name}, weighted risk ${supplier.risk.toFixed(1)}. Open supplier details.`}
                      className="group relative flex h-full w-full max-w-6 flex-col justify-end outline-none"
                    >
                      <span
                        className="relative flex w-full flex-col justify-end overflow-hidden rounded-t-[4px] bg-[var(--series-1)] transition-[height] duration-500 ease-out group-hover:brightness-110 group-focus-visible:ring-2 group-focus-visible:ring-[var(--blueprint-ink)]"
                        style={{ height: `${height}%` }}
                      >
                        <span className="absolute inset-x-0 top-1 text-center font-mono text-[9px] font-semibold text-white tabular-nums">
                          {supplier.risk.toFixed(1)}
                        </span>
                        <span className="w-full bg-[var(--series-2)] transition-[height] duration-300" style={{ height: `${height > 0 ? (activeHeight / height) * 100 : 0}%` }} />
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="flex-col items-start gap-0.5">
                    <span>
                      <strong>{supplier.risk.toFixed(1)}</strong> weighted risk · #{index + 1}
                    </span>
                    <span>{supplier.name} · {supplier.id}</span>
                    {active && supplier.activePoints !== null && (
                      <span>{CRITERION_BY_KEY[active].label} adds {supplier.activePoints.toFixed(1)}</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ol>
      </div>

      <div aria-hidden="true" className="relative ml-6 h-20">
        {suppliers.map((supplier, index) => (
          // Each name ends under its column and runs down-left, so long names never collide.
          <span
            key={supplier.id}
            className="absolute top-1 max-w-[7.5rem] truncate text-[10px] whitespace-nowrap text-[var(--blueprint-muted)] transition-[left] duration-500 ease-out"
            style={{ left: `${(index + 0.5) * slot}%`, transform: "translateX(-100%) rotate(-45deg)", transformOrigin: "100% 0" }}
          >
            {supplier.name}
          </span>
        ))}
      </div>
    </figure>
  );
}
