import type { CriterionKey } from "./criteria.ts";

/** `null` means unknown. Only suppliers researched outside the dataset have unknown scores. */
export type Scores = Record<CriterionKey, number | null>;

export interface Supplier {
  id: string;
  name: string;
  /** `dataset`: the anonymized Siemens data. `market`: a real company we researched ourselves. */
  origin: "dataset" | "market";
  scores: Scores;
}
