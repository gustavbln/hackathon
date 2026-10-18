"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlobeIcon, MessageCircleQuestionIcon } from "lucide-react";
import { useChatFocus } from "@/components/chat/chat-focus";
import { Button } from "@/components/ui/button";
import { CRITERIA, CRITERION_BY_KEY, riskLevel, type CriterionKey, type Weights } from "@/lib/suppliers/criteria";
import { contributions } from "@/lib/suppliers/scoring";
import type { Scores } from "@/lib/suppliers/types";
import { cn } from "@/lib/utils";
import { LEVEL_COLOR } from "./risk-color";
import { RiskDonut, type DonutSlice } from "./risk-donut";

/** The biggest drivers get the chart series in order; the rest fold into "Other". */
const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];
const OTHER = "other" as const;

interface SupplierDetailProps {
  scores: Scores;
  weights: Weights;
  /** Carries the seat and weighting on to the driver pages. */
  query: string;
}

/** Answers "what are the biggest risks for this supplier, and why?" under the page's weighting. */
export function SupplierDetail({ scores, weights, query }: SupplierDetailProps) {
  // A driver, or "other" while the folded slice is hovered.
  const [active, setActive] = useState<CriterionKey | typeof OTHER | null>(null);
  const { onAction, ask } = useChatFocus();
  useEffect(() => onAction((action) => action.type === "highlight_driver" && setActive(action.driverKey)), [onAction]);

  const parts = contributions(scores, weights).filter(({ points }) => points > 0);
  const total = parts.reduce((sum, part) => sum + part.points, 0);
  const top = parts.slice(0, SERIES.length);
  const rest = parts.slice(SERIES.length);
  const restPoints = rest.reduce((sum, part) => sum + part.points, 0);
  const share = (points: number) => `${Math.round((points / total) * 100)}%`;

  const slices: DonutSlice<CriterionKey | typeof OTHER>[] = top.map(({ criterion, points }, index) => ({
    key: criterion,
    label: CRITERION_BY_KEY[criterion].label,
    points,
    color: SERIES[index],
    detail: `Score ${scores[criterion]} × weight ${(weights[criterion] * 100).toFixed(1)}% = ${points.toFixed(1)} of ${total.toFixed(1)} points`,
  }));
  if (restPoints > 0) {
    slices.push({
      key: OTHER,
      label: `${rest.length} other drivers`,
      points: restPoints,
      color: "var(--series-other)",
      detail: `${restPoints.toFixed(1)} of ${total.toFixed(1)} points, each at most ${share(top.at(-1)?.points ?? 0)}`,
    });
  }
  const activeKey = active === null || top.some(({ criterion }) => criterion === active) ? active : OTHER;
  const hiddenCritical = rest.filter(({ criterion }) => (scores[criterion] ?? 0) >= 75);
  const topLabel = top[0] ? CRITERION_BY_KEY[top[0].criterion].label.toLowerCase() : "supplier";

  return (
    <div className="grid max-w-5xl gap-x-10 gap-y-8 rounded-sm border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] p-5 sm:p-7 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <figure className="flex min-w-0 flex-col gap-4">
        <figcaption className="blueprint-label">Where the risk comes from</figcaption>
        <RiskDonut slices={slices} activeKey={activeKey} onActive={setActive}>
          <span className="text-4xl font-medium tracking-tight">{total.toFixed(1)}</span>
          <span className="blueprint-label mt-1">Weighted risk</span>
          <Level score={total} className="mt-1" />
        </RiskDonut>
        <ul aria-label="Legend" className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-[var(--blueprint-muted)]">
          {slices.map((slice) => (
            <li key={slice.key} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ backgroundColor: slice.color }} />
              {slice.key === OTHER ? "Other" : slice.label}
            </li>
          ))}
        </ul>
      </figure>

      <section aria-labelledby="risks-heading" className="flex min-w-0 flex-col gap-5">
        <h2 id="risks-heading" className="blueprint-label">Biggest risks · why</h2>
        <ol className="flex flex-col">
          {top.map(({ criterion, points }, index) => {
            const info = CRITERION_BY_KEY[criterion];
            const score = scores[criterion] ?? 0;
            return (
              <li
                key={criterion}
                onPointerEnter={() => setActive(criterion)}
                onPointerLeave={() => setActive(null)}
                className={cn(
                  "-mx-2 grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-sm border-t border-[var(--blueprint-rule)] p-2 py-3 transition-colors first:border-t-0",
                  active === criterion && "bg-[var(--blueprint-grid)]",
                )}
              >
                <span aria-hidden="true" className="size-2.5 translate-y-px rounded-[2px]" style={{ backgroundColor: SERIES[index] }} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <Link href={`/drivers/${criterion}?${query}`} className="font-medium hover:underline">
                      {info.label}
                    </Link>
                    <span className="font-mono text-[11px] whitespace-nowrap text-[var(--blueprint-muted)] tabular-nums">{share(points)} of the risk</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--blueprint-muted)]">{info.description}</p>
                </div>
                <p className="flex flex-col items-end">
                  <span className="text-lg tabular-nums">{score}</span>
                  <Level score={score} />
                </p>
              </li>
            );
          })}
        </ol>
        {hiddenCritical.length > 0 && (
          <p className="text-xs text-[var(--blueprint-muted)]">
            Also critical, but weighted lightly for seats:{" "}
            {hiddenCritical.map(({ criterion }) => `${CRITERION_BY_KEY[criterion].label} ${scores[criterion]}`).join(" · ")}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => ask("Why is there this risk?")}
            className="h-9 rounded-md bg-[var(--blueprint-ink)] px-4 text-[var(--blueprint-paper)] hover:bg-[var(--blueprint-ink)]/90"
          >
            <MessageCircleQuestionIcon aria-hidden="true" /> Why is there this risk?
          </Button>
          <Button
            variant="outline"
            onClick={() => ask(`Context from the web: what does a high ${topLabel} risk mean for a seat supplier?`)}
            className="h-9 rounded-md border-[var(--blueprint-rule)] bg-transparent px-4 hover:bg-[var(--blueprint-grid)]"
          >
            <GlobeIcon aria-hidden="true" /> Context from the web
          </Button>
        </div>

        <details className="text-xs">
          <summary className="blueprint-label cursor-pointer hover:text-[var(--blueprint-ink)]">All {CRITERIA.length} drivers as a table</summary>
          <table className="mt-2 w-full">
            <caption className="sr-only">Score, weight and share of the weighted risk per driver</caption>
            <thead className="blueprint-label">
              <tr>
                <th scope="col" className="py-1 text-left font-normal">Driver</th>
                <th scope="col" className="py-1 text-right font-normal">Score</th>
                <th scope="col" className="py-1 text-right font-normal">Weight</th>
                <th scope="col" className="py-1 text-right font-normal">Share</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {contributions(scores, weights).map(({ criterion, points }) => (
                <tr key={criterion} className="border-t border-[var(--blueprint-rule)]">
                  <th scope="row" className="py-1 text-left font-sans font-normal">{CRITERION_BY_KEY[criterion].label}</th>
                  <td className="py-1 text-right">{scores[criterion]}</td>
                  <td className="py-1 text-right">{(weights[criterion] * 100).toFixed(1)}%</td>
                  <td className="py-1 text-right">{total > 0 ? share(points) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
    </div>
  );
}

/** The dataset's level, always as a word; the dot only helps scanning. */
function Level({ score, className }: { score: number; className?: string }) {
  const level = riskLevel(score);
  return (
    <span className={cn("blueprint-label flex items-center gap-1.5", className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: LEVEL_COLOR[level] }} />
      {level}
    </span>
  );
}
