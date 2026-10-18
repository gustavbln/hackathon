import assert from "node:assert/strict";
import { test } from "node:test";
import { explainSupplier } from "./chat-explain.ts";
import { hydrateAnswer } from "./chat.ts";
import { CRITERIA, type Weights } from "./suppliers/criteria.ts";
import { buildProfile } from "./suppliers/profiles.ts";
import { rankSuppliers } from "./suppliers/scoring.ts";
import type { Scores, Supplier } from "./suppliers/types.ts";

function supplier(id: string, scores: Partial<Scores>, rest = 10): Supplier {
  return { id, name: `Supplier ${id}`, origin: "dataset", scores: { ...Object.fromEntries(CRITERIA.map(({ key }) => [key, rest])) as Scores, ...scores } };
}

const weights: Weights = buildProfile("seats").weights;
const target = supplier("SUPP_00001", { compliance: 98, quality: 60, esg: 50 });
const suppliers = [target, supplier("SUPP_00002", { compliance: 5 }), supplier("SUPP_00003", { compliance: 90 }, 5)];
const ranked = rankSuppliers(suppliers, weights);
const entry = ranked.find(({ supplier: { id } }) => id === target.id);

test("explain a supplier with the page's weights and rounding", () => {
  assert.ok(entry);
  const explanation = explainSupplier(entry, ranked, weights);
  assert.equal(explanation.supplier.rank, 3);
  const total = CRITERIA.reduce((sum, { key }) => sum + weights[key] * (target.scores[key] ?? 0), 0);
  assert.equal(explanation.supplier.weightedRisk, Math.round(total * 10) / 10);
  // Compliance is doubled for seats, so it leads; shares are rounded like the page's "x% of the risk".
  assert.deepEqual(explanation.drivers[0], {
    key: "compliance", label: "Compliance", score: 98,
    weightPercent: Math.round(weights.compliance * 1000) / 10,
    points: Math.round(weights.compliance * 98 * 10) / 10,
    sharePercent: Math.round((weights.compliance * 98 / total) * 100),
  });
  assert.equal(explanation.drivers.length, CRITERIA.length);
});

test("watch-outs are scores of 50 or more, heaviest weight first", () => {
  assert.ok(entry);
  assert.deepEqual(explainSupplier(entry, ranked, weights).watchOuts.map(({ key, level }) => [key, level]),
    [["compliance", "critical"], ["quality", "high"], ["esg", "high"]]);
});

test("alternatives are the page's: clearly better on the top driver, lowest risk first", () => {
  assert.ok(entry);
  const { alternatives } = explainSupplier(entry, ranked, weights);
  assert.equal(alternatives?.driver, "compliance");
  assert.equal(alternatives?.kind, "better-on-driver");
  assert.deepEqual(alternatives?.suppliers.map(({ id, driverScore }) => [id, driverScore]), [["SUPP_00002", 5]]);
});

test("a prose answer may only name suppliers its explanation covers", () => {
  assert.ok(entry);
  const evidence = new Map([["call_1", explainSupplier(entry, ranked, weights)]]);
  const recipe = { text: "Compliance drives the risk.", resultId: "call_1", supplierIds: ["SUPP_00001", "SUPP_00002"], metricKeys: [] };
  assert.equal(hydrateAnswer(recipe, evidence, "test", []).view, null);
  assert.throws(() => hydrateAnswer({ ...recipe, supplierIds: ["SUPP_00003"] }, evidence, "test", []), { code: "ungrounded_answer" });
});
