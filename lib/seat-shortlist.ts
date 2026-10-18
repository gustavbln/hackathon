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
  return rankSuppliers(suppliers, weights).slice(0, SHORTLIST_SIZE).map(({ supplier, rank, risk }) => {
    const parts = contributions(supplier.scores, weights);
    return {
      id: supplier.id,
      name: supplier.name,
      rank,
      risk: round(risk.worst),
      drivers: parts.slice(0, 3).map(({ criterion, points }) => ({
        key: criterion, label: CRITERION_BY_KEY[criterion].label, points: round(points),
      })),
      contributions: Object.fromEntries(parts.map(({ criterion, points }) => [criterion, points])),
    };
  });
}

/** IDs ranked by the weights, skipping the first `offset`: the next-best candidates after a shortlist. */
export async function nextSeatSupplierIds(weights: Weights, offset: number, limit: number) {
  const suppliers = await loadDatasetSuppliers();
  return rankSuppliers(suppliers, weights).slice(offset, offset + limit).map(({ supplier }) => supplier.id);
}

async function seatWeights(source: ShortlistSource, instruction: string | null, signal: AbortSignal) {
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
  const evaluation = await evaluateSeatCriteria(signal, instruction);
  return {
    weights: evaluation.weights,
    models: evaluation.models,
    criteria: evaluation.criteria.map(({ key, label, weightPercent, reasons }) => ({ key, label, weightPercent, reason: reasons[0] })),
  };
}

export async function seatShortlist(source: ShortlistSource, instruction: string | null, signal: AbortSignal): Promise<SeatShortlist> {
  // Re-ranking is a Nemotron feature; the EN-standard profile is fixed.
  const steer = source === "nemotron" ? instruction : null;
  const [suppliers, { weights, models, criteria }] = await Promise.all([loadDatasetSuppliers(), seatWeights(source, steer, signal)]);
  return seatShortlistSchema.parse({
    source,
    instruction: steer,
    models,
    criteria: criteria.toSorted((a, b) => b.weightPercent - a.weightPercent),
    suppliers: buildShortlist(suppliers, weights),
    supplierCount: suppliers.length,
  });
}
