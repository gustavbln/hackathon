import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBriefing } from "./suppliers/briefing.ts";
import { CRITERIA, TOTAL_RISK_WEIGHTS } from "./suppliers/criteria.ts";
import type { SupplierScoreMatrix } from "./suppliers/score-matrix.ts";

const keys = CRITERIA.map(({ key }) => key);

function matrix(rows: Record<string, (key: string) => number>): SupplierScoreMatrix {
  const ids = Object.keys(rows);
  return { keys, ids, names: ids.map((id) => `${id} name`), scores: ids.flatMap((id) => keys.map((key) => rows[id](key))) };
}

test("flag shortlisted suppliers whose worst score is Critical, worst first", () => {
  const data = matrix({
    A: () => 10,
    B: (key) => (key === "compliance" ? 80 : 20),
    C: (key) => (key === "esg" ? 95 : key === "quality" ? 76 : 5),
    D: (key) => (key === "quality" ? 99 : 0),
  });
  const briefing = buildBriefing(data, TOTAL_RISK_WEIGHTS, ["A", "B", "C"]);
  assert.deepEqual(briefing.hidden, [
    { id: "C", criterion: "esg", score: 95 },
    { id: "B", criterion: "compliance", score: 80 },
  ]);
  assert.equal(briefing.shortlistSize, 3);
  assert.equal(briefing.supplierCount, 4);
});

test("describe the first shortlisted supplier with its weighted risk and scores", () => {
  const briefing = buildBriefing(matrix({ A: () => 10, B: () => 50 }), TOTAL_RISK_WEIGHTS, ["B", "A"]);
  assert.equal(briefing.top?.id, "B");
  assert.equal(briefing.top?.name, "B name");
  assert.ok(Math.abs((briefing.top?.risk ?? 0) - 50) < 1e-9);
  assert.equal(briefing.top?.scores.quality, 50);
});

test("list the three heaviest priorities and skip unknown supplier IDs", () => {
  const briefing = buildBriefing(matrix({ A: () => 0 }), TOTAL_RISK_WEIGHTS, ["MISSING", "A"]);
  assert.deepEqual(briefing.priorities.map(({ key }) => key), ["financialHealth", "operationalResilience", "quality"]);
  assert.equal(briefing.top?.id, "A");
  assert.equal(briefing.shortlistSize, 1);
});
