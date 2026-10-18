"use client";

import type { CriterionKey } from "@/lib/suppliers/criteria";
import type { SeatShortlist } from "@/lib/seat-shortlist-contract";
import { cn } from "@/lib/utils";
import { seriesColor } from "./series-color";

const SIZE = 300;
const CENTER = SIZE / 2;
const INNER = 34;
const OUTER = 96;
/** Share of each slot the bar fills; the rest is air between spokes. */
const FILL = 0.62;

interface PriorityRadialProps {
  /** Sorted by weight, highest first. */
  criteria: SeatShortlist["criteria"];
  /** The first `focusCount` criteria carry a series colour and a direct label. */
  focusCount: number;
  highlighted: CriterionKey | null;
  onHighlight: (key: CriterionKey | null) => void;
  onOpen: (key: CriterionKey) => void;
}

/** A radial bar chart of the 18 risk drivers: spoke length is the driver's share of the weighting. */
export function PriorityRadial({ criteria, focusCount, highlighted, onHighlight, onOpen }: PriorityRadialProps) {
  const max = criteria[0]?.weightPercent ?? 1;
  const ticks = [5, 10, 15, 20, 25, 30].filter((tick) => tick < max);
  const radius = (percent: number) => INNER + (percent / max) * (OUTER - INNER);
  const slot = (2 * Math.PI) / criteria.length;
  const active = criteria.find((criterion) => criterion.key === highlighted);

  return (
    <figure className="flex flex-col items-center gap-2">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[22rem] overflow-visible"
        role="group"
        aria-label="Risk driver priorities, highest first, clockwise from the top"
      >
        {ticks.map((tick) => (
          <g key={tick} aria-hidden="true">
            <circle cx={CENTER} cy={CENTER} r={radius(tick)} fill="none" stroke="var(--blueprint-rule)" strokeWidth={1} />
            {/* In the gap just left of 12 o'clock, where the smallest driver ends before the ring. */}
            <text
              x={CENTER + radius(tick) * Math.cos(-Math.PI / 2 - slot / 2)}
              y={CENTER + radius(tick) * Math.sin(-Math.PI / 2 - slot / 2)}
              dx={-2}
              textAnchor="end"
              className="fill-[var(--blueprint-muted)] font-mono text-[8px]"
            >
              {tick}%
            </text>
          </g>
        ))}
        {criteria.map((criterion, index) => {
          const middle = -Math.PI / 2 + index * slot;
          const half = (slot * FILL) / 2;
          const isFocus = index < focusCount;
          const outer = radius(criterion.weightPercent);
          return (
            <g key={criterion.key}>
              <path
                d={sectorPath(INNER, outer, middle - half, middle + half)}
                fill={isFocus ? seriesColor(index) : "var(--series-other)"}
                role="link"
                tabIndex={0}
                aria-label={`${criterion.label}: ${criterion.weightPercent.toFixed(0)}% of the weighting. Open details.`}
                onMouseEnter={() => onHighlight(criterion.key)}
                onMouseLeave={() => onHighlight(null)}
                onFocus={() => onHighlight(criterion.key)}
                onBlur={() => onHighlight(null)}
                onClick={() => onOpen(criterion.key)}
                onKeyDown={(event) => event.key === "Enter" && onOpen(criterion.key)}
                className={cn(
                  "cursor-pointer outline-none transition-opacity duration-200 focus-visible:stroke-[var(--blueprint-ink)] focus-visible:stroke-2",
                  highlighted !== null && highlighted !== criterion.key && "opacity-30",
                )}
              />
              {/* Transparent wedge over the whole slot: the hit target is bigger than the mark. */}
              <path
                d={sectorPath(INNER, OUTER + 6, middle - slot / 2, middle + slot / 2)}
                fill="transparent"
                aria-hidden="true"
                onMouseEnter={() => onHighlight(criterion.key)}
                onMouseLeave={() => onHighlight(null)}
                onClick={() => onOpen(criterion.key)}
                className="cursor-pointer"
              />
              {isFocus && <DirectLabel angle={middle} radius={outer + 8} text={`${criterion.label} ${criterion.weightPercent.toFixed(0)}%`} />}
            </g>
          );
        })}
        <text x={CENTER} y={CENTER - 2} textAnchor="middle" className="fill-[var(--blueprint-ink)] text-[13px] font-medium">
          {active ? `${active.weightPercent.toFixed(0)}%` : criteria.length}
        </text>
        <text x={CENTER} y={CENTER + 11} textAnchor="middle" className="fill-[var(--blueprint-muted)] font-mono text-[7px] tracking-[0.12em] uppercase">
          {active ? "of weight" : "drivers"}
        </text>
      </svg>
      <figcaption className="min-h-10 text-center text-xs leading-relaxed text-[var(--blueprint-muted)]" aria-live="polite">
        {active ? (
          <>
            <span className="font-medium text-[var(--blueprint-ink)]">{active.label}</span>
            {active.reason ? ` · ${active.reason}` : ""}
          </>
        ) : (
          "Longer spoke, higher priority. Click a driver for its details."
        )}
      </figcaption>
    </figure>
  );
}

function DirectLabel({ angle, radius, text }: { angle: number; radius: number; text: string }) {
  const x = CENTER + radius * Math.cos(angle);
  const y = CENTER + radius * Math.sin(angle);
  const anchor = Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
  return (
    <text
      x={x}
      y={y}
      dy={Math.sin(angle) < -0.9 ? -2 : 3}
      textAnchor={anchor}
      aria-hidden="true"
      className="pointer-events-none fill-[var(--blueprint-ink)] text-[9px]"
    >
      {text}
    </text>
  );
}

/** An annular sector between two radii and two angles (radians, 0 = 3 o'clock, clockwise). */
function sectorPath(inner: number, outer: number, start: number, end: number): string {
  const point = (r: number, angle: number) =>
    `${(CENTER + r * Math.cos(angle)).toFixed(2)} ${(CENTER + r * Math.sin(angle)).toFixed(2)}`;
  return `M${point(inner, start)}L${point(outer, start)}A${outer} ${outer} 0 0 1 ${point(outer, end)}L${point(inner, end)}A${inner} ${inner} 0 0 0 ${point(inner, start)}Z`;
}
