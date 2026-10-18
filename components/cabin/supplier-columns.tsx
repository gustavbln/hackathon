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

const ROW = "grid grid-cols-[1.25rem_minmax(0,10rem)_minmax(0,1fr)_2.25rem] items-center gap-3";

/** The top suppliers as ranked bars, re-sorted live as the weighting changes. Lower weighted risk is better. */
export function SupplierColumns({ suppliers, supplierCount, active, onOpen }: SupplierColumnsProps) {
  const axisMax = Math.ceil(Math.max(...suppliers.map(({ risk }) => risk), 1) / 5) * 5;
  const ticks = Array.from({ length: axisMax / 5 + 1 }, (_, index) => index * 5);
  const slot = 100 / Math.max(suppliers.length, 1);

  return (
    <figure className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">
          Top {suppliers.length} of {supplierCount.toLocaleString("en")} · weighted risk
        </span>
        <span className="flex items-center gap-3 text-[11px] text-[var(--blueprint-muted)]">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-3 rounded-[2px] bg-[var(--series-1)]" /> Lower is better
          </span>
          {active && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-3 rounded-[2px] bg-[var(--series-2)]" /> {CRITERION_BY_KEY[active].label}
            </span>
          )}
        </span>
      </figcaption>

      <div aria-hidden="true" className={`${ROW} border-b border-[var(--blueprint-rule)] pb-1.5 blueprint-label`}>
        <span>#</span>
        <span>Supplier</span>
        <span className="relative h-3">
          {ticks.map((tick) => (
            <span key={tick} className="absolute -translate-x-1/2 font-mono text-[9px] tabular-nums" style={{ left: `${(tick / axisMax) * 100}%` }}>{tick}</span>
          ))}
        </span>
        <span className="text-right">Risk</span>
      </div>

      <ol aria-label="Suppliers ranked by weighted risk" className="relative min-h-[30rem] flex-1">
        {suppliers.map((supplier, index) => {
          const width = (supplier.risk / axisMax) * 100;
          const activeWidth = supplier.activePoints === null ? 0 : (supplier.activePoints / axisMax) * 100;
          return (
            <li
              key={supplier.id}
              className="absolute inset-x-0 transition-[top] duration-500 ease-out animate-in fade-in-0 motion-reduce:transition-none"
              style={{ top: `${index * slot}%`, height: `${slot}%` }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onOpen(supplier.id)}
                    aria-label={`${index + 1}. ${supplier.name}, weighted risk ${supplier.risk.toFixed(1)}. Open supplier details.`}
                    className={`${ROW} group h-full w-full border-b border-[var(--blueprint-grid)] text-left text-xs outline-none hover:bg-[var(--blueprint-grid)] focus-visible:ring-2 focus-visible:ring-[var(--blueprint-ink)]`}
                  >
                    <span className="font-mono text-[10px] text-[var(--blueprint-muted)] tabular-nums">{index + 1}</span>
                    <span className="truncate">{supplier.name}</span>
                    <span className="h-2.5 overflow-hidden rounded-[2px] bg-[var(--blueprint-grid)]">
                      <span className="flex h-full rounded-[2px] bg-[var(--series-1)] transition-[width] duration-500 ease-out group-hover:brightness-110" style={{ width: `${width}%` }}>
                        <span className="h-full bg-[var(--series-2)] transition-[width] duration-300" style={{ width: `${width > 0 ? (activeWidth / width) * 100 : 0}%` }} />
                      </span>
                    </span>
                    <span className="text-right font-mono tabular-nums">{supplier.risk.toFixed(1)}</span>
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
    </figure>
  );
}
