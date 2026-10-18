import "server-only";
import { evaluateSeatCriteria } from "./seat-criteria.ts";
import { seatShortlistSchema, type SeatShortlist, type ShortlistSource } from "./seat-shortlist-contract.ts";
import { CRITERIA, CRITERION_BY_KEY, type Weights } from "./suppliers/criteria.ts";
import { loadDatasetSuppliers } from "./suppliers/dataset.ts";
import { buildProfile } from "./suppliers/profiles.ts";
import { contributions, rankSuppliers } from "./suppliers/scoring.ts";
import type { Supplier } from "./suppliers/types.ts";

export const SHORTLIST_SIZE = 20;

const round = (value: number) => Math.round(value * 10) / 10;

/** Top suppliers for the weights, each with the three criteria that add the most risk points. */
export function buildShortlist(suppliers: readonly Supplier[], weights: Weights): SeatShortlist["suppliers"] {
  return rankSuppliers(suppliers, weights).slice(0, SHORTLIST_SIZE).map(({ supplier, rank, risk }) => ({
    id: supplier.id,
    name: supplier.name,
    rank,
    risk: round(risk.worst),
    drivers: contributions(supplier.scores, weights).slice(0, 3).map(({ criterion, points }) => ({
      key: criterion, label: CRITERION_BY_KEY[criterion].label, points: round(points),
    })),
  }));
}

async function seatWeights(source: ShortlistSource, signal: AbortSignal) {
  if (source === "rules") {
    const { weights, boosts } = buildProfile("seats");
    return {
      weights,
      models: [],
      criteria: CRITERIA.map(({ key, label }) => ({
        key, label,
        weightPercent: weights[key] * 100,
        reason: boosts.filter((boost) => boost.criterion === key).map((boost) => boost.reason).join(" ") || null,
      })),
    };
  }
  const evaluation = await evaluateSeatCriteria(signal);
  return {
    weights: evaluation.weights,
    models: evaluation.models,
    criteria: evaluation.criteria.map(({ key, label, weightPercent, reasons }) => ({ key, label, weightPercent, reason: reasons[0] })),
  };
}

export async function seatShortlist(source: ShortlistSource, signal: AbortSignal): Promise<SeatShortlist> {
  const [suppliers, { weights, models, criteria }] = await Promise.all([loadDatasetSuppliers(), seatWeights(source, signal)]);
  return seatShortlistSchema.parse({
    source,
    models,
    criteria: criteria.toSorted((a, b) => b.weightPercent - a.weightPercent),
    suppliers: buildShortlist(suppliers, weights),
    supplierCount: suppliers.length,
  });
}
