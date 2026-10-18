import { CRITERIA, type CriterionKey, type Weights } from "./criteria.ts";
import type { Scores, Supplier } from "./types.ts";

/** A score only counts as "clearly better" on a criterion when it is at least this much lower. */
const CLEARLY_BETTER = 20;

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

/** Each known criterion's share of the risk score (weight × score), largest first. Answers "why". */
export function contributions(scores: Scores, weights: Weights): { criterion: CriterionKey; points: number }[] {
  return CRITERIA.flatMap(({ key }) => {
    const score = scores[key];
    return score === null ? [] : [{ criterion: key, points: weights[key] * score }];
  }).sort((a, b) => b.points - a.points);
}

/** The criterion that adds the most to a supplier's risk score. */
export function topDriver(scores: Scores, weights: Weights): CriterionKey | undefined {
  return contributions(scores, weights)[0]?.criterion;
}

export interface Alternatives {
  driver: CriterionKey;
  /** `better-on-driver`: clearly better where the target is weakest, lowest overall risk first.
   *  `different-driver`: nobody is clearly better there, so the closest overall risk with another weak spot. */
  kind: "better-on-driver" | "different-driver";
  alternatives: RankedSupplier[];
}

/** The buyer's "what alternative risk profiles exist?". `ranked` must be sorted by risk. */
export function findAlternatives(
  target: Supplier,
  ranked: readonly RankedSupplier[],
  weights: Weights,
  count: number,
): Alternatives | null {
  const driver = topDriver(target.scores, weights);
  const driverScore = driver ? target.scores[driver] : null;
  if (!driver || driverScore === null) return null;

  const better: RankedSupplier[] = [];
  for (const entry of ranked) {
    if (better.length === count) break;
    const score = entry.supplier.scores[driver];
    if (entry.supplier.id !== target.id && score !== null && score <= driverScore - CLEARLY_BETTER) {
      better.push(entry);
    }
  }
  if (better.length > 0) return { driver, kind: "better-on-driver", alternatives: better };

  const index = ranked.findIndex((entry) => entry.supplier.id === target.id);
  const neighbours: RankedSupplier[] = [];
  for (let step = 1; index !== -1 && neighbours.length < count && step < ranked.length; step++) {
    for (const candidate of [ranked[index + step], ranked[index - step]]) {
      if (candidate && neighbours.length < count && topDriver(candidate.supplier.scores, weights) !== driver) {
        neighbours.push(candidate);
      }
    }
  }
  return { driver, kind: "different-driver", alternatives: neighbours };
}

/** Lowest risk first. Ranks by the worst case, so missing data never helps a supplier. */
export function rankSuppliers(suppliers: readonly Supplier[], weights: Weights): RankedSupplier[] {
  return suppliers
    .map((supplier) => ({ supplier, risk: profileRisk(supplier.scores, weights) }))
    .sort((a, b) => a.risk.worst - b.risk.worst || a.supplier.id.localeCompare(b.supplier.id))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
