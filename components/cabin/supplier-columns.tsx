"use client";

import { PlusIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CRITERION_BY_KEY, type CriterionKey } from "@/lib/suppliers/criteria";

export interface ColumnSupplier {
  id: string;
  name: string;
  risk: number;
  /** Risk points the active driver adds (weight × score); null when no driver is active. */
  activePoints: number | null;
}

/** A real company the agents researched: a range, because drivers without evidence count as unknown. */
export interface ResearchedColumn {
  id: string;
  name: string;
  /** Weighted risk from the drivers with evidence only. */
  best: number;
  /** As if every driver without evidence were at maximum risk. */
  worst: number;
  rankBest: number;
  rankWorst: number;
  unknownDrivers: number;
  activePoints: number | null;
}

interface SupplierColumnsProps {
  suppliers: ColumnSupplier[];
  researched: ResearchedColumn[];
  supplierCount: number;
  active: CriterionKey | null;
  onOpen: (id: string) => void;
  onAdd: () => void;
}

const ROW = "grid grid-cols-[1.25rem_minmax(0,10rem)_minmax(0,1fr)_2.25rem] items-center gap-3";

/** The top suppliers as ranked bars, re-sorted live as the weighting changes, then researched companies. Lower is better. */
export function SupplierColumns({ suppliers, researched, supplierCount, active, onOpen, onAdd }: SupplierColumnsProps) {
  const axisMax = Math.ceil(Math.max(...suppliers.map(({ risk }) => risk), ...researched.map(({ best }) => best), 1) / 5) * 5;
  const clip = (value: number) => `${(Math.min(value, axisMax) / axisMax) * 100}%`;
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
          {researched.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-3 rounded-[2px] bg-[var(--series-3)]" /> Researched, estimated range
            </span>
          )}
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

      <div className="flex flex-col">
        {researched.length > 0 && <p className="blueprint-label border-b border-[var(--blueprint-rule)] pb-1.5">Researched companies · public sources</p>}
        {researched.map((company) => (
          <Tooltip key={company.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onOpen(company.id)}
                aria-label={`${company.name}, researched: estimated weighted risk ${company.best.toFixed(1)} to ${company.worst.toFixed(1)}. Open the research.`}
                className={`${ROW} h-8 w-full border-b border-[var(--blueprint-grid)] text-left text-xs outline-none hover:bg-[var(--blueprint-grid)] focus-visible:ring-2 focus-visible:ring-[var(--blueprint-ink)]`}
              >
                <span className="font-mono text-[10px] text-[var(--blueprint-muted)]">≈</span>
                <span className="truncate font-medium">{company.name}</span>
                <span className="relative h-2.5 rounded-[2px] bg-[var(--blueprint-grid)]">
                  <span
                    className="absolute inset-y-0 rounded-r-[2px] border border-l-0 border-dashed border-[var(--series-3)] bg-[color-mix(in_oklab,var(--series-3)_22%,transparent)]"
                    style={{ left: clip(company.best), width: `calc(${clip(company.worst)} - ${clip(company.best)})` }}
                  />
                  <span className="absolute inset-y-0 left-0 rounded-l-[2px] bg-[var(--series-3)]" style={{ width: clip(company.best) }} />
                </span>
                <span className="text-right font-mono text-[10px] tabular-nums">
                  {company.best.toFixed(0)}–{company.worst.toFixed(0)}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="flex-col items-start gap-0.5">
              <span>
                <strong>{company.best.toFixed(1)}–{company.worst.toFixed(1)}</strong> estimated weighted risk
              </span>
              <span>{company.name} · researched from public sources</span>
              <span>
                Would rank #{company.rankBest.toLocaleString("en")}–#{company.rankWorst.toLocaleString("en")} of {supplierCount.toLocaleString("en")}
              </span>
              <span>{company.unknownDrivers} weighted drivers without public evidence</span>
            </TooltipContent>
          </Tooltip>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 flex h-9 items-center justify-center gap-2 rounded-sm border border-dashed border-[var(--blueprint-muted)] text-xs text-[var(--blueprint-muted)] transition-colors hover:border-[var(--blueprint-ink)] hover:text-[var(--blueprint-ink)] focus-visible:ring-2 focus-visible:ring-[var(--blueprint-ink)] focus-visible:outline-none"
        >
          <PlusIcon className="size-3.5" strokeWidth={1.75} aria-hidden="true" /> Add a supplier: the agents research a real company
        </button>
      </div>
    </figure>
  );
}
