import { CRITERIA, type Weights } from "./criteria";
import type { Scores, Supplier } from "./types";

/** Best and worst case of a weighted risk score; they differ only when scores are unknown. */
export interface RiskRange {
  best: number;
  worst: number;
}

export interface RankedSupplier {
  supplier: Supplier;
  rank: number;
  risk: RiskRange;
}

export function profileRisk(scores: Scores, weights: Weights): RiskRange {
  let known = 0;
  let unknownWeight = 0;
  for (const { key } of CRITERIA) {
    const score = scores[key];
    if (score === null) unknownWeight += weights[key];
    else known += weights[key] * score;
  }
  return { best: known, worst: known + unknownWeight * 100 };
}

/** Lowest risk first. Ranks by the worst case, so missing data never helps a supplier. */
export function rankSuppliers(suppliers: readonly Supplier[], weights: Weights): RankedSupplier[] {
  return suppliers
    .map((supplier) => ({ supplier, risk: profileRisk(supplier.scores, weights) }))
    .sort((a, b) => a.risk.worst - b.risk.worst || a.supplier.id.localeCompare(b.supplier.id))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
