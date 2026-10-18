import { CRITERIA, TOTAL_RISK_WEIGHTS, type CriterionKey, type Weights } from "./criteria.ts";

/** `seats` is the demo component; `all` is the dataset's own weighting. */
export type ComponentId = "seats" | "all";

/** Multiplies one criterion's weight, with the reason a buyer sees. */
export interface Boost {
  criterion: CriterionKey;
  factor: number;
  reason: string;
}

export interface Profile {
  component: ComponentId;
  /** Sums to 1. Without boosts it equals the dataset's Total_Risk_Index weights. */
  weights: Weights;
  boosts: Boost[];
}

const COMPONENT_BOOSTS: Record<ComponentId, Boost[]> = {
  all: [],
  seats: [
    {
      criterion: "compliance",
      factor: 2,
      reason: "Every seat needs fire certificates (EN 45545-2) and a complete-seat fire test (EN 16989).",
    },
    { criterion: "quality", factor: 1.5, reason: "A train has hundreds of identical seats: one defect repeats across the fleet." },
    { criterion: "esg", factor: 1.5, reason: "Foams, fabrics and plastics drive the material footprint of the interior." },
  ],
};

export function buildProfile(component: ComponentId): Profile {
  const boosts = COMPONENT_BOOSTS[component];
  if (boosts.length === 0) return { component, weights: TOTAL_RISK_WEIGHTS, boosts };
  const raw = { ...TOTAL_RISK_WEIGHTS };
  for (const boost of boosts) raw[boost.criterion] *= boost.factor;
  const total = CRITERIA.reduce((sum, criterion) => sum + raw[criterion.key], 0);
  const weights = Object.fromEntries(
    CRITERIA.map((criterion) => [criterion.key, raw[criterion.key] / total]),
  ) as Weights;
  return { component, weights, boosts };
}

/** Weights as a compact URL value (percent, CRITERIA order), so detail pages rank like the view they came from. */
export function encodeWeights(weights: Weights): string {
  return CRITERIA.map(({ key }) => Math.round(weights[key] * 1000) / 10).join("_");
}

/** The inverse of `encodeWeights`; null for anything malformed, so callers fall back to a known profile. */
export function parseWeights(value: unknown): Weights | null {
  if (typeof value !== "string") return null;
  const parts = value.split("_").map(Number);
  const total = parts.reduce((sum, part) => sum + part, 0);
  if (parts.length !== CRITERIA.length || parts.some((part) => !Number.isFinite(part) || part < 0) || total <= 0) return null;
  return Object.fromEntries(CRITERIA.map(({ key }, index) => [key, parts[index] / total])) as Weights;
}
