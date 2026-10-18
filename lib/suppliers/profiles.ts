import { CRITERIA, TOTAL_RISK_WEIGHTS, type CriterionKey, type Weights } from "./criteria";

export const TRAIN_TYPES = [
  { id: "high-speed", label: "High-speed" },
  { id: "regional", label: "Regional" },
  { id: "metro", label: "Metro" },
] as const;

export const COMPONENTS = [
  { id: "seats", label: "Seats & interior" },
  { id: "all", label: "Any component" },
] as const;

export type TrainType = (typeof TRAIN_TYPES)[number]["id"];
export type ComponentId = (typeof COMPONENTS)[number]["id"];

/** Multiplies one criterion's weight, with the reason a buyer sees. */
export interface Boost {
  criterion: CriterionKey;
  factor: number;
  reason: string;
}

export interface Profile {
  component: ComponentId;
  trainType: TrainType;
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

const SEAT_TRAIN_TYPE_BOOSTS: Record<TrainType, Boost[]> = {
  "high-speed": [
    {
      criterion: "compliance",
      factor: 1.25,
      reason: "Long tunnels mean a long way to a place of safety (EN 45545 operation category 3).",
    },
  ],
  regional: [],
  metro: [
    {
      criterion: "compliance",
      factor: 1.5,
      reason: "Metro tunnels allow no side evacuation (operation category 4), which needs hazard level HL3.",
    },
  ],
};

export function buildProfile(component: ComponentId, trainType: TrainType): Profile {
  const boosts = [
    ...COMPONENT_BOOSTS[component],
    ...(component === "seats" ? SEAT_TRAIN_TYPE_BOOSTS[trainType] : []),
  ];
  const raw = { ...TOTAL_RISK_WEIGHTS };
  for (const boost of boosts) raw[boost.criterion] *= boost.factor;
  const total = CRITERIA.reduce((sum, criterion) => sum + raw[criterion.key], 0);
  const weights = Object.fromEntries(
    CRITERIA.map((criterion) => [criterion.key, raw[criterion.key] / total]),
  ) as Weights;
  return { component, trainType, weights, boosts };
}

export function parseComponent(value: unknown): ComponentId {
  return COMPONENTS.find((component) => component.id === value)?.id ?? "seats";
}

export function parseTrainType(value: unknown): TrainType {
  return TRAIN_TYPES.find((trainType) => trainType.id === value)?.id ?? "high-speed";
}
