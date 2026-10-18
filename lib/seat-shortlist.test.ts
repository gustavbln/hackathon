import assert from "node:assert/strict";
import { test } from "node:test";
import { buildShortlist, SHORTLIST_SIZE } from "./seat-shortlist.ts";
import { CRITERIA, TOTAL_RISK_WEIGHTS, type Weights } from "./suppliers/criteria.ts";
import type { Scores, Supplier } from "./suppliers/types.ts";

function supplier(id: string, score: (key: string) => number): Supplier {
  const scores = Object.fromEntries(CRITERIA.map(({ key }) => [key, score(key)])) as Scores;
  return { id, name: id, origin: "dataset", scores };
}

const qualityOnly = Object.fromEntries(CRITERIA.map(({ key }) => [key, key === "quality" ? 1 : 0])) as Weights;

test("rank by the given weights, not by the overall risk index", () => {
  const steadyQuality = supplier("A", (key) => (key === "quality" ? 10 : 90));
  const lowOverall = supplier("B", (key) => (key === "quality" ? 60 : 5));
  assert.deepEqual(buildShortlist([lowOverall, steadyQuality], qualityOnly).map(({ id }) => id), ["A", "B"]);
  assert.deepEqual(buildShortlist([lowOverall, steadyQuality], TOTAL_RISK_WEIGHTS).map(({ id }) => id), ["B", "A"]);
});

test("cap the shortlist and number the ranks from one", () => {
  const many = Array.from({ length: 30 }, (_, index) => supplier(`S${String(index).padStart(2, "0")}`, () => index));
  const shortlist = buildShortlist(many, TOTAL_RISK_WEIGHTS);
  assert.equal(shortlist.length, SHORTLIST_SIZE);
  assert.deepEqual(shortlist.map(({ rank }) => rank), Array.from({ length: SHORTLIST_SIZE }, (_, index) => index + 1));
});

test("name the three criteria adding the most risk points", () => {
  const [entry] = buildShortlist([supplier("A", (key) => (key === "esg" ? 100 : key === "compliance" ? 50 : 0))], TOTAL_RISK_WEIGHTS);
  assert.deepEqual(entry.drivers.map(({ key, points }) => [key, points]), [["esg", 5], ["compliance", 4], ["financialHealth", 0]]);
  assert.equal(entry.risk, 9);
});
