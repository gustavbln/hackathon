"use client";

import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const WIDTH = 280;
const HEIGHT = 240;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const OUTER = 92;
const INNER = 66;
const LABEL_RADIUS = OUTER + 13;
/** Slices below this share get no direct label; the legend and tooltip still carry them. */
const MIN_LABELLED_SHARE = 0.05;

export interface DonutSlice<K extends string> {
  key: K;
  label: string;
  points: number;
  color: string;
  /** Tooltip line under the share, e.g. how the points come about. */
  detail: string;
}

interface RiskDonutProps<K extends string> {
  /** Drawn clockwise from 12 o'clock in the given order. */
  slices: DonutSlice<K>[];
  activeKey: K | null;
  onActive: (key: K | null) => void;
  /** Shown in the hole. */
  children: ReactNode;
}

/** Each slice's share of the whole. Slices touch with a 2px gap in the card colour, so no borders are needed. */
export function RiskDonut<K extends string>({ slices, activeKey, onActive, children }: RiskDonutProps<K>) {
  const arcs = layoutArcs(slices);

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full overflow-visible" role="group" aria-label="Share of the weighted risk per driver">
        {arcs.length === 0 && <circle cx={CX} cy={CY} r={(OUTER + INNER) / 2} fill="none" stroke="var(--series-other)" strokeWidth={OUTER - INNER} />}
        {arcs.map((arc) => (
          <Tooltip key={arc.key}>
            <TooltipTrigger asChild>
              <path
                d={ringPath(arc.start, arc.end)}
                fill={arc.color}
                stroke="var(--blueprint-paper-deep)"
                strokeWidth={2}
                tabIndex={0}
                aria-label={`${arc.label}: ${Math.round(arc.share * 100)}% of the weighted risk. ${arc.detail}`}
                onPointerEnter={() => onActive(arc.key)}
                onPointerLeave={() => onActive(null)}
                onFocus={() => onActive(arc.key)}
                onBlur={() => onActive(null)}
                className={cn(
                  "cursor-default outline-none transition-opacity duration-200",
                  activeKey !== null && activeKey !== arc.key && "opacity-35",
                )}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="flex-col items-start gap-0.5">
              <span>
                <strong className="text-sm">{Math.round(arc.share * 100)}%</strong> {arc.label}
              </span>
              <span className="opacity-70">{arc.detail}</span>
            </TooltipContent>
          </Tooltip>
        ))}
        {arcs.map((arc) => {
          if (arc.share < MIN_LABELLED_SHARE) return null;
          const middle = (arc.start + arc.end) / 2;
          const cos = Math.cos(middle);
          return (
            <text
              key={arc.key}
              x={CX + LABEL_RADIUS * cos}
              y={CY + LABEL_RADIUS * Math.sin(middle)}
              dy="0.35em"
              textAnchor={Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end"}
              aria-hidden="true"
              className={cn(
                "pointer-events-none fill-[var(--blueprint-muted)] font-mono text-[10px] tabular-nums transition-colors",
                activeKey === arc.key && "fill-[var(--blueprint-ink)] font-semibold",
              )}
            >
              {Math.round(arc.share * 100)}%
            </text>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

function layoutArcs<K extends string>(slices: DonutSlice<K>[]) {
  const total = slices.reduce((sum, slice) => sum + slice.points, 0);
  const arcs: (DonutSlice<K> & { share: number; start: number; end: number })[] = [];
  let angle = -Math.PI / 2;
  for (const slice of slices) {
    const share = total > 0 ? slice.points / total : 0;
    arcs.push({ ...slice, share, start: angle, end: angle + share * 2 * Math.PI });
    angle += share * 2 * Math.PI;
  }
  return arcs;
}

/** A ring segment between two angles (radians, clockwise from 3 o'clock). */
function ringPath(start: number, end: number): string {
  // A full circle has no distinct start and end point, so a 100% slice stops just short of closing.
  const stop = Math.min(end, start + 2 * Math.PI - 1e-4);
  const large = stop - start > Math.PI ? 1 : 0;
  const point = (radius: number, angle: number) =>
    `${(CX + radius * Math.cos(angle)).toFixed(2)} ${(CY + radius * Math.sin(angle)).toFixed(2)}`;
  return [
    `M${point(OUTER, start)}`,
    `A${OUTER} ${OUTER} 0 ${large} 1 ${point(OUTER, stop)}`,
    `L${point(INNER, stop)}`,
    `A${INNER} ${INNER} 0 ${large} 0 ${point(INNER, start)}`,
    "Z",
  ].join("");
}
