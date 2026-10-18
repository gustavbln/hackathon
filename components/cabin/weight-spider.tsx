"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from "react";
import { CRITERION_BY_KEY, type CriterionKey } from "@/lib/suppliers/criteria";
import { cn } from "@/lib/utils";

const SIZE = 440;
const CENTER = SIZE / 2;
const RADIUS = 132;
const RINGS = [0.25, 0.5, 0.75, 1];
const KEY_STEP = 0.05;
/** Room left and right for the longest labels, so a phone-width panel never clips them. */
const LABEL_PAD = 44;

interface WeightSpiderProps {
  /** Axis order, clockwise from 12 o'clock; fixed while dragging so nothing jumps. */
  keys: CriterionKey[];
  /** Importance per driver from 0 to 1; the weighting is each value's share of the total. */
  values: Record<CriterionKey, number>;
  active: CriterionKey | null;
  onActive: (key: CriterionKey | null) => void;
  onChange: (key: CriterionKey, value: number) => void;
  /** Called when a drag or key press ends, to commit the weighting. */
  onCommit: () => void;
  /** A driver was clicked or grabbed: the panel explains it. */
  onSelect: (key: CriterionKey) => void;
}

/** A spider chart whose points are handles: drag a driver out to weight it more, in to weight it less. */
export function WeightSpider({ keys, values, active, onActive, onChange, onCommit, onSelect }: WeightSpiderProps) {
  const svg = useRef<SVGSVGElement>(null);
  const total = keys.reduce((sum, key) => sum + values[key], 0) || 1;
  const angle = (index: number) => -Math.PI / 2 + (index * 2 * Math.PI) / keys.length;
  const at = (index: number, share: number) => ({
    x: CENTER + share * RADIUS * Math.cos(angle(index)),
    y: CENTER + share * RADIUS * Math.sin(angle(index)),
  });
  const ring = (share: number) => keys.map((_, index) => at(index, share)).map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const shape = keys.map((key, index) => at(index, values[key])).map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const half = Math.PI / keys.length;
  const grab = (index: number) => ({
    onPointerDown: (event: ReactPointerEvent<SVGElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      onActive(keys[index]);
      onSelect(keys[index]);
      dragTo(event, index);
    },
    onPointerMove: (event: ReactPointerEvent<SVGElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) dragTo(event, index);
    },
    onPointerUp: (event: ReactPointerEvent<SVGElement>) => {
      event.currentTarget.releasePointerCapture(event.pointerId);
      onCommit();
    },
  });

  function dragTo(event: ReactPointerEvent, index: number) {
    const matrix = svg.current?.getScreenCTM()?.inverse();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    // Project the pointer onto the axis, so sideways movement never changes another driver.
    const along = (point.x - CENTER) * Math.cos(angle(index)) + (point.y - CENTER) * Math.sin(angle(index));
    onChange(keys[index], Math.min(1, Math.max(0, along / RADIUS)));
  }

  function nudge(event: KeyboardEvent, key: CriterionKey) {
    const steps: Record<string, number> = { ArrowUp: KEY_STEP, ArrowRight: KEY_STEP, ArrowDown: -KEY_STEP, ArrowLeft: -KEY_STEP };
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : steps[event.key] === undefined ? null : values[key] + steps[event.key];
    if (next === null) return;
    event.preventDefault();
    onChange(key, Math.min(1, Math.max(0, next)));
    onCommit();
  }

  return (
    <svg
      ref={svg}
      viewBox={`${-LABEL_PAD} 0 ${SIZE + 2 * LABEL_PAD} ${SIZE}`}
      className="max-h-[min(26rem,44svh)] w-full max-w-[36rem] touch-none overflow-visible select-none"
      aria-label="Risk driver weights"
    >
      {RINGS.map((share) => (
        <polygon key={share} points={ring(share)} fill="none" stroke="var(--blueprint-rule)" strokeWidth={1} />
      ))}
      {keys.map((key, index) => {
        const end = at(index, 1);
        return <line key={key} x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} stroke="var(--blueprint-rule)" strokeWidth={1} />;
      })}

      <polygon points={shape} fill="var(--series-1)" fillOpacity={0.1} stroke="var(--blueprint-ink)" strokeWidth={2} strokeLinejoin="round" />

      {/* One wedge per driver as its grab area: wedges never overlap, so the right driver moves even near the centre. */}
      {keys.map((key, index) => (
        <path
          key={key}
          d={wedgePath(RADIUS + 12, angle(index) - half, angle(index) + half)}
          fill="transparent"
          aria-hidden="true"
          className="cursor-pointer"
          onMouseEnter={() => onActive(key)}
          onMouseLeave={() => onActive(null)}
          {...grab(index)}
        />
      ))}

      {keys.map((key, index) => {
        const label = at(index, 1.13);
        const cos = Math.cos(angle(index));
        const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
        const percent = Math.round((values[key] / total) * 100);
        return (
          <text
            key={key}
            x={label.x}
            y={label.y}
            dy={Math.sin(angle(index)) > 0.9 ? 8 : 3}
            textAnchor={anchor}
            role="button"
            tabIndex={0}
            aria-label={`Explain ${CRITERION_BY_KEY[key].label}`}
            onClick={() => onSelect(key)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onSelect(key);
            }}
            onMouseEnter={() => onActive(key)}
            onMouseLeave={() => onActive(null)}
            className={cn(
              "cursor-pointer fill-[var(--blueprint-muted)] text-[10px] outline-none transition-colors hover:fill-[var(--blueprint-ink)] hover:underline focus-visible:underline",
              active === key && "fill-[var(--blueprint-ink)] font-medium",
            )}
          >
            {CRITERION_BY_KEY[key].label}
            <tspan className="font-mono text-[9px]"> {percent}%</tspan>
          </text>
        );
      })}

      {keys.map((key, index) => {
        const point = at(index, values[key]);
        const isActive = active === key;
        return (
          <g key={key}>
            <circle
              cx={point.x}
              cy={point.y}
              r={9}
              fill="transparent"
              role="slider"
              tabIndex={0}
              aria-label={`${CRITERION_BY_KEY[key].label} weight`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((values[key] / total) * 100)}
              aria-valuetext={`${Math.round((values[key] / total) * 100)}% of the weighting`}
              className="cursor-grab outline-none active:cursor-grabbing"
              {...grab(index)}
              onMouseEnter={() => onActive(key)}
              onMouseLeave={() => onActive(null)}
              onFocus={() => onActive(key)}
              onBlur={() => onActive(null)}
              onKeyDown={(event) => nudge(event, key)}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={isActive ? 6.5 : 4.5}
              fill={isActive ? "var(--series-2)" : "var(--blueprint-ink)"}
              stroke="var(--blueprint-paper-deep)"
              strokeWidth={2}
              className="pointer-events-none transition-[r,fill] duration-150"
            />
          </g>
        );
      })}
    </svg>
  );
}

/** A wedge from the centre between two angles (radians, 0 = 3 o'clock, clockwise). */
function wedgePath(radius: number, start: number, end: number): string {
  const point = (angle: number) =>
    `${(CENTER + radius * Math.cos(angle)).toFixed(1)} ${(CENTER + radius * Math.sin(angle)).toFixed(1)}`;
  return `M${CENTER} ${CENTER}L${point(start)}A${radius} ${radius} 0 0 1 ${point(end)}Z`;
}
