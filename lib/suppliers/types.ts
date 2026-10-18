import type { CriterionKey } from "./criteria";

/** `null` means unknown. Only suppliers researched outside the dataset have unknown scores. */
export type Scores = Record<CriterionKey, number | null>;

export const SOURCING_RISK_LEVELS = ["Low", "Medium", "High"] as const;
export const COMPLEXITY_LEVELS = ["Simple", "Moderate", "Complex"] as const;

export interface Operations {
  purchaseOrderVolumeEur: number;
  /** Percentages from 0 to 100. Delivery and confirmation are good when high. */
  orderChangeRate: number;
  deliveryRating: number;
  confirmationRate: number;
  /** How hard the supplier is to replace. */
  sourcingRisk: (typeof SOURCING_RISK_LEVELS)[number];
  complexity: (typeof COMPLEXITY_LEVELS)[number];
}

export interface Supplier {
  id: string;
  name: string;
  /** `dataset`: the anonymized Siemens data. `market`: a real company we researched ourselves. */
  origin: "dataset" | "market";
  scores: Scores;
  operations: Operations | null;
}
