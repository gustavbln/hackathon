import { CRITERIA, TOTAL_RISK_WEIGHTS, type CriterionKey, type Weights } from "./criteria.ts";

export const COMPONENTS = [
  { id: "seats", label: "Seats & interior" },
  { id: "all", label: "Any component" },
] as const;

export type ComponentId = (typeof COMPONENTS)[number]["id"];

export const COMPONENT_LABEL = Object.fromEntries(
  COMPONENTS.map((option) => [option.id, option.label]),
) as Record<ComponentId, string>;

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

export function parseComponent(value: unknown): ComponentId {
  return COMPONENTS.find((component) => component.id === value)?.id ?? "seats";
}
