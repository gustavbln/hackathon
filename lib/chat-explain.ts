import "server-only";
import { CRITERIA, CRITERION_BY_KEY, riskLevel, type CriterionKey, type Weights } from "./suppliers/criteria.ts";
import { buildShortlist } from "./seat-shortlist.ts";
import { loadDatasetSuppliers } from "./suppliers/dataset.ts";
import { buildProfile } from "./suppliers/profiles.ts";
import { contributions, findAlternatives, rankSuppliers, type RankedSupplier } from "./suppliers/scoring.ts";

/** The supplier page shows three alternatives; the chat names the same ones. */
const ALTERNATIVE_COUNT = 3;
const WATCH_OUT_SCORE = 50;
const CRITICAL_SCORE = 75;

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Why a supplier carries its risk under the given weights, rounded exactly like the supplier page: weighted risk and
 * rank, each driver's risk points and share, watch-outs (score 50 or more) and the page's alternatives.
 */
export function explainSupplier(target: RankedSupplier, ranked: readonly RankedSupplier[], weights: Weights) {
  const { supplier } = target;
  const parts = contributions(supplier.scores, weights);
  const total = parts.reduce((sum, part) => sum + part.points, 0);
  const found = findAlternatives(supplier, ranked, weights, ALTERNATIVE_COUNT);
  return {
    kind: "supplier_explanation" as const,
    supplier: { id: supplier.id, name: supplier.name, rank: target.rank, of: ranked.length, risk: round(target.risk.worst) },
    drivers: parts.map(({ criterion, points }) => ({
      key: criterion,
      label: CRITERION_BY_KEY[criterion].label,
      score: supplier.scores[criterion],
      weightPercent: round(weights[criterion] * 100),
      points: round(points),
      sharePercent: total > 0 ? Math.round((points / total) * 100) : 0,
    })),
    // Heaviest weight first, like the page's watch-out chips.
    watchOuts: CRITERIA.toSorted((a, b) => weights[b.key] - weights[a.key]).flatMap(({ key, label }) => {
      const score = supplier.scores[key];
      return score !== null && score >= WATCH_OUT_SCORE ? [{ key, label, score, level: riskLevel(score) }] : [];
    }),
    alternatives: found && {
      driver: found.driver,
      kind: found.kind,
      suppliers: found.alternatives.map((entry) => ({
        id: entry.supplier.id,
        name: entry.supplier.name,
        rank: entry.rank,
        risk: round(entry.risk.worst),
        driverScore: entry.supplier.scores[found.driver],
      })),
    },
  };
}
export type SupplierExplanation = ReturnType<typeof explainSupplier>;

export async function explainDatasetSupplier(supplierId: string, weights: Weights) {
  const ranked = rankSuppliers(await loadDatasetSuppliers(), weights);
  const target = ranked.find(({ supplier }) => supplier.id === supplierId);
  if (!target) throw new Error(`Unknown supplier ${supplierId}`);
  return explainSupplier(target, ranked, weights);
}

/** What a risk driver means and why it carries its weight: the description, the seat profile's reasons, the weights. */
export function explainDriver(driverKey: CriterionKey, weights: Weights) {
  const criterion = CRITERION_BY_KEY[driverKey];
  const seats = buildProfile("seats");
  const byWeight = CRITERIA.toSorted((a, b) => weights[b.key] - weights[a.key]).map(({ key }) => key);
  return {
    kind: "driver_explanation" as const,
    driver: { key: driverKey, label: criterion.label, column: criterion.column, description: criterion.description },
    weightPercent: {
      page: round(weights[driverKey] * 100),
      seatProfile: round(seats.weights[driverKey] * 100),
      dataset: round(criterion.weight * 100),
    },
    weightRank: byWeight.indexOf(driverKey) + 1,
    seatProfileReasons: seats.boosts.filter((boost) => boost.criterion === driverKey).map(({ reason, factor }) => ({ reason, factor })),
  };
}
export type DriverExplanation = ReturnType<typeof explainDriver>;

/** The seat shortlist as the cabin shows it: rank, weighted risk, top three drivers, plus any Critical score. */
export async function shortlistFacts(weights: Weights) {
  const suppliers = await loadDatasetSuppliers();
  const byId = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  return {
    kind: "shortlist_facts" as const,
    suppliers: buildShortlist(suppliers, weights).map(({ id, name, rank, risk, drivers }) => ({
      id, name, rank, risk,
      topDrivers: drivers.map(({ label, points }) => ({ label, points })),
      critical: CRITERIA.flatMap(({ key, label }) => {
        const score = byId.get(id)?.scores[key] ?? null;
        return score !== null && score >= CRITICAL_SCORE ? [{ label, score }] : [];
      }),
    })),
  };
}
export type ShortlistFacts = Awaited<ReturnType<typeof shortlistFacts>>;
