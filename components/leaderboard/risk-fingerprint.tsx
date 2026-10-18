import { riskLevel, type CriterionInfo, type CriterionKey, type Weights } from "@/lib/suppliers/criteria";
import type { Scores } from "@/lib/suppliers/types";
import { cn } from "@/lib/utils";
import { criterionColor } from "./risk-color";

/** The dataset's level cut-offs, drawn as rings; the outer one marks "critical". */
const LEVEL_RINGS = [25, 50, 75];

interface RiskFingerprintProps {
  scores: Scores;
  /** Drawing order, clockwise from 12 o'clock. */
  criteria: CriterionInfo[];
  /** Each wedge's angle is its weight, so what matters more takes more room. */
  weights: Weights;
  size: number;
  detailed?: boolean;
  activeCriterion?: CriterionKey | null;
  onCriterionHover?: (criterion: CriterionKey | null) => void;
}

/** Radius grows with the square root, so a wedge's area (what the eye compares) matches its score. */
const radiusShare = (score: number) => Math.sqrt(score / 100);

/** A polar area chart of the 18 scores: each wedge's area is the score, its angle the weight. */
export function RiskFingerprint({
  scores,
  criteria,
  weights,
  size,
  detailed = false,
  activeCriterion = null,
  onCriterionHover,
}: RiskFingerprintProps) {
  const center = size / 2;
  const radius = center - 1;
  const gap = detailed ? 0.012 : 0;
  const flagged = criteria.filter(({ key }) => (scores[key] ?? 0) >= 50).length;
  const wedges = layoutWedges(criteria, weights);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Risk fingerprint with ${flagged} high or critical criteria`}
      className="shrink-0 overflow-visible"
    >
      {detailed &&
        LEVEL_RINGS.map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={radius * radiusShare(level)}
            fill="none"
            stroke={level === 75 ? "var(--risk-critical)" : "var(--blueprint-rule)"}
            strokeOpacity={level === 75 ? 0.45 : 1}
            strokeDasharray="2 4"
          />
        ))}
      {wedges.map(({ criterion, start, end }) => {
        const score = scores[criterion.key];
        return (
          <path
            key={criterion.key}
            d={wedgePath(center, radius, start + gap, end - gap)}
            fill={criterionColor(score, "visible")}
            stroke={score === null ? "var(--blueprint-muted)" : "none"}
            strokeDasharray={score === null ? "2 2" : undefined}
            style={{
              transform: `scale(${score === null ? 1 : radiusShare(Math.max(score, 2))})`,
              transformOrigin: `${center}px ${center}px`,
            }}
            className={cn(
              "transition-[transform,opacity] duration-500 ease-out [transform-box:view-box]",
              activeCriterion !== null && activeCriterion !== criterion.key && "opacity-30",
            )}
            onMouseEnter={onCriterionHover && (() => onCriterionHover(criterion.key))}
            onMouseLeave={onCriterionHover && (() => onCriterionHover(null))}
          >
            {detailed && (
              <title>{`${criterion.label}: ${score ?? "unknown"}${score === null ? "" : ` (${riskLevel(score)})`}`}</title>
            )}
          </path>
        );
      })}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--blueprint-rule)" />
    </svg>
  );
}

function layoutWedges(criteria: CriterionInfo[], weights: Weights) {
  const wedges: { criterion: CriterionInfo; start: number; end: number }[] = [];
  let angle = -Math.PI / 2;
  for (const criterion of criteria) {
    const end = angle + weights[criterion.key] * 2 * Math.PI;
    wedges.push({ criterion, start: angle, end });
    angle = end;
  }
  return wedges;
}

function wedgePath(center: number, radius: number, start: number, end: number): string {
  const point = (angle: number) =>
    `${(center + radius * Math.cos(angle)).toFixed(2)} ${(center + radius * Math.sin(angle)).toFixed(2)}`;
  return `M${center} ${center}L${point(start)}A${radius} ${radius} 0 0 1 ${point(end)}Z`;
}
