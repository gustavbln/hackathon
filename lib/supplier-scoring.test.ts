import assert from "node:assert/strict";
import { test } from "node:test";
import { CRITERIA, TOTAL_RISK_WEIGHTS } from "./suppliers/criteria.ts";
import { buildProfile } from "./suppliers/profiles.ts";
import { contributions, findAlternatives, rankSuppliers, topByWeights } from "./suppliers/scoring.ts";
import type { Scores, Supplier } from "./suppliers/types.ts";

function supplier(id: string, overrides: Partial<Scores> = {}, base: number | null = 10): Supplier {
  const scores = Object.fromEntries(CRITERIA.map(({ key }) => [key, base])) as Scores;
  return { id, name: id, origin: "dataset", scores: { ...scores, ...overrides } };
}

test("profiles keep weights summing to 1 and the default profile is the dataset's weighting", () => {
  const seats = buildProfile("seats");
  assert.ok(Math.abs(Object.values(seats.weights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-12);
  assert.ok(seats.weights.compliance > TOTAL_RISK_WEIGHTS.compliance);
  assert.deepEqual(buildProfile("all").weights, TOTAL_RISK_WEIGHTS);
});

test("unknown scores rank by their worst case, so missing data never helps", () => {
  const ranked = rankSuppliers([supplier("unknown", {}, null), supplier("known", {}, 60)], TOTAL_RISK_WEIGHTS);
  assert.deepEqual(ranked.map((entry) => entry.supplier.id), ["known", "unknown"]);
  assert.equal(ranked[1]?.risk.best, 0);
  assert.ok(Math.abs((ranked[1]?.risk.worst ?? 0) - 100) < 1e-9);
});

test("alternatives are clearly better on the biggest risk driver, lowest overall risk first", () => {
  const target = supplier("target", { financialHealth: 90 });
  const candidates = [
    target,
    supplier("barely-better", { financialHealth: 75 }, 0),
    supplier("better-but-riskier", { financialHealth: 20 }, 40),
    supplier("better", { financialHealth: 30 }, 5),
  ];
  const ranked = rankSuppliers(candidates, TOTAL_RISK_WEIGHTS);
  const result = findAlternatives(target, ranked, TOTAL_RISK_WEIGHTS, 2);
  assert.equal(contributions(target.scores, TOTAL_RISK_WEIGHTS)[0]?.criterion, "financialHealth");
  assert.equal(result?.driver, "financialHealth");
  assert.equal(result?.kind, "better-on-driver");
  assert.deepEqual(result?.alternatives.map((entry) => entry.supplier.id), ["better", "better-but-riskier"]);
});

test("when nobody is clearly better, alternatives are the closest risk with a different weak spot", () => {
  const target = supplier("target", { quality: 15 }, 5);
  const ranked = rankSuppliers(
    [target, supplier("same-weak-spot", { quality: 16 }, 5), supplier("other-weak-spot", { compliance: 25 }, 5)],
    TOTAL_RISK_WEIGHTS,
  );
  const result = findAlternatives(target, ranked, TOTAL_RISK_WEIGHTS, 1);
  assert.equal(result?.kind, "different-driver");
  assert.deepEqual(result?.alternatives.map((entry) => entry.supplier.id), ["other-weak-spot"]);
});

test("the matrix ranking used while dragging weights matches the full ranking", () => {
  let seed = 7;
  const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const suppliers = Array.from({ length: 300 }, (_, index) =>
    supplier(`S${String(index).padStart(4, "0")}`, Object.fromEntries(CRITERIA.map(({ key }) => [key, Math.floor(random() * 101)]))),
  );
  const weights = Object.fromEntries(CRITERIA.map(({ key }, index) => [key, (index % 5) + 1])) as typeof TOTAL_RISK_WEIGHTS;
  const matrix = suppliers.flatMap((entry) => CRITERIA.map(({ key }) => entry.scores[key] ?? 0));
  const fast = topByWeights(matrix, CRITERIA.map(({ key }) => weights[key]), 20).map(({ row }) => suppliers[row]?.id);
  assert.deepEqual(fast, rankSuppliers(suppliers, weights).slice(0, 20).map((entry) => entry.supplier.id));
});
