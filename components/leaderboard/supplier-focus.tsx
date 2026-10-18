"use client";

import { CRITERION_BY_KEY, riskLevel, type CriterionInfo, type CriterionKey, type Weights } from "@/lib/suppliers/criteria";
import { contributions, topDriver } from "@/lib/suppliers/scoring";
import { cn } from "@/lib/utils";
import type { BoardRow } from "./board-view";
import { criterionColor, inkColor, LEVEL_COLOR } from "./risk-color";
import { RiskFingerprint } from "./risk-fingerprint";

const TOP_DRIVERS = 3;

interface SupplierFocusProps {
  supplier: BoardRow;
  supplierCount: number;
  criteria: CriterionInfo[];
  weights: Weights;
  activeCriterion: CriterionKey | null;
  onCriterionHover: (criterion: CriterionKey | null) => void;
  onSelect: (supplier: BoardRow) => void;
  /** 1 when the supplier is the page's subject, 2 inside the board. */
  headingLevel?: 1 | 2;
}

export function SupplierFocus({
  supplier,
  supplierCount,
  criteria,
  weights,
  activeCriterion,
  onCriterionHover,
  onSelect,
  headingLevel = 2,
}: SupplierFocusProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const parts = contributions(supplier.scores, weights);
  const total = parts.reduce((sum, part) => sum + part.points, 0);
  const watchOuts = criteria.filter(({ key }) => (supplier.scores[key] ?? 0) >= 50);
  const active = activeCriterion === null ? null : CRITERION_BY_KEY[activeCriterion];
  const activeScore = activeCriterion === null ? null : supplier.scores[activeCriterion];

  return (
    <article aria-live="polite" className="flex min-w-0 flex-col gap-6 rounded-lg border border-[var(--blueprint-rule)] p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="blueprint-label">
            #{supplier.rank} of {supplierCount.toLocaleString("en")} · {supplier.id}
          </p>
          <Heading className="mt-1 truncate text-2xl font-medium tracking-[-0.02em]">{supplier.name}</Heading>
        </div>
        <div className="text-right">
          <p className="blueprint-label">Weighted risk</p>
          <p className="mt-1 flex items-center justify-end gap-2 text-2xl tabular-nums">
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: LEVEL_COLOR[riskLevel(supplier.risk)] }} />
            {supplier.risk.toFixed(1)}
          </p>
        </div>
      </header>

      <div className="grid items-center gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <figure className="mx-auto flex flex-col items-center gap-3">
          <RiskFingerprint
            scores={supplier.scores}
            criteria={criteria}
            weights={weights}
            size={240}
            detailed
            activeCriterion={activeCriterion}
            onCriterionHover={onCriterionHover}
          />
          <figcaption className="blueprint-label h-4 text-center">
            {active
              ? `${active.label} · ${activeScore ?? "unknown"}${activeScore === null ? "" : ` · ${riskLevel(activeScore)}`}`
              : "Area = risk · width = weight"}
          </figcaption>
        </figure>

        <div className="flex min-w-0 flex-col gap-5">
          <section aria-labelledby="why-heading">
            <h3 id="why-heading" className="blueprint-label mb-2">Why this score</h3>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10">
              {parts.map((part, index) => (
                <span
                  key={part.criterion}
                  onMouseEnter={() => onCriterionHover(part.criterion)}
                  onMouseLeave={() => onCriterionHover(null)}
                  className={cn(
                    "h-full border-r border-[var(--blueprint-paper)] transition-[width,opacity] duration-500 last:border-0",
                    activeCriterion !== null && activeCriterion !== part.criterion && "opacity-30",
                  )}
                  style={{ width: `${(part.points / total) * 100}%`, backgroundColor: driverColor(supplier.scores[part.criterion], index) }}
                />
              ))}
            </div>
            <ol className="mt-3 flex flex-col gap-1.5 text-sm">
              {parts.slice(0, TOP_DRIVERS).map((part) => (
                <li
                  key={part.criterion}
                  onMouseEnter={() => onCriterionHover(part.criterion)}
                  onMouseLeave={() => onCriterionHover(null)}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span>{CRITERION_BY_KEY[part.criterion].label}</span>
                  <span className="tabular-nums text-[var(--blueprint-muted)]">
                    {Math.round((part.points / total) * 100)}% of the risk · score {supplier.scores[part.criterion]}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="watch-heading">
            <h3 id="watch-heading" className="blueprint-label mb-2">Watch-outs</h3>
            {watchOuts.length === 0 ? (
              <p className="text-sm text-[var(--blueprint-muted)]">Nothing high or critical. A clean profile.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {watchOuts.map((criterion) => {
                  const score = supplier.scores[criterion.key] ?? 0;
                  return (
                    <li
                      key={criterion.key}
                      onMouseEnter={() => onCriterionHover(criterion.key)}
                      onMouseLeave={() => onCriterionHover(null)}
                      className="rounded-full px-3 py-1 text-xs font-medium text-[var(--blueprint-paper-deep)]"
                      style={{ backgroundColor: criterionColor(score) }}
                    >
                      {criterion.label} {score}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <Alternatives supplier={supplier} criteria={criteria} weights={weights} onSelect={onSelect} />
    </article>
  );
}

/** High and critical keep their colour; otherwise the top drivers stand out in ink. */
function driverColor(score: number | null, index: number): string {
  if (score !== null && score >= 50) return criterionColor(score);
  return inkColor(index < TOP_DRIVERS ? 80 - index * 15 : 18);
}

function Alternatives({
  supplier,
  criteria,
  weights,
  onSelect,
}: Pick<SupplierFocusProps, "supplier" | "criteria" | "weights" | "onSelect">) {
  if (supplier.alternatives === null) {
    return <p className="blueprint-label">Open a supplier from the ranking to see its alternatives.</p>;
  }
  const { driver, kind, rows } = supplier.alternatives;
  const driverLabel = CRITERION_BY_KEY[driver].label.toLowerCase();

  return (
    <section aria-labelledby="alternatives-heading" className="border-t border-[var(--blueprint-rule)] pt-5">
      <h3 id="alternatives-heading" className="blueprint-label mb-3">
        {kind === "better-on-driver"
          ? `A different risk profile: clearly better on ${driverLabel}`
          : `Nobody is clearly better on ${driverLabel}. Similar risk, a different weak spot:`}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--blueprint-muted)]">No comparable supplier found.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3">
          {rows.map((row) => {
            const shown = kind === "better-on-driver" ? driver : (topDriver(row.scores, weights) ?? driver);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect(row)}
                  className="flex w-full items-center gap-3 rounded-lg border border-[var(--blueprint-rule)] p-3 text-left transition-colors hover:bg-white/10"
                >
                  <RiskFingerprint scores={row.scores} criteria={criteria} weights={weights} size={40} />
                  <span className="min-w-0 text-sm">
                    <span className="block truncate">{row.name}</span>
                    <span className="blueprint-label block">
                      Risk {row.risk.toFixed(1)} · {CRITERION_BY_KEY[shown].label} {row.scores[shown]}
                      {kind === "better-on-driver" && ` vs ${supplier.scores[driver]}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
