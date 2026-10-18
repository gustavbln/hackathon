import assert from "node:assert/strict";
import { test } from "node:test";
import { companyGroup } from "./market/groups.ts";
import type { Evidence, FinancialEvent, FinancialStatement, Relationship } from "./market/model.ts";
import { assess } from "./market/score.ts";

function statement(metrics: Partial<Record<keyof FinancialStatement["metrics"], number>>, fiscalYearEnd = "2025-12-31"): FinancialStatement {
  return {
    id: "fs-1",
    entityId: "supplier",
    scope: "consolidated",
    fiscalYearEnd,
    currency: "EUR",
    unit: "millions",
    audited: true,
    metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, { value, evidenceId: "ev-1" }])),
    evidenceIds: ["ev-1"],
  };
}

const specExample = {
  currentAssets: 12,
  currentLiabilities: 10,
  equity: 8,
  totalAssets: 40,
  netIncome: -1,
  revenue: 50,
  operatingCashFlow: 3,
};

function run(input: Partial<Parameters<typeof assess>[0]>) {
  return assess({ entityId: "supplier", asOf: "2026-10-18", statement: null, events: [], groupHint: null, openQuestions: [], ...input });
}

test("the spec's fictional example scores exactly 50.0 from 50, 50, 100 and 0 points", () => {
  const result = run({ statement: statement(specExample) });
  assert.deepEqual(
    [result.components.liquidity.points, result.components.equity.points, result.components.profitability.points, result.components.cashFlow.points],
    [50, 50, 100, 0],
  );
  assert.equal(result.score, 50);
  assert.equal(result.level, "high");
  assert.equal(result.coverage, 100);
});

test("a missing value leaves the score null instead of averaging the rest", () => {
  const withoutCashFlow = Object.fromEntries(Object.entries(specExample).filter(([key]) => key !== "operatingCashFlow"));
  const result = run({ statement: statement(withoutCashFlow) });
  assert.equal(result.score, null);
  assert.equal(result.coverage, 75);
  assert.deepEqual(result.components.cashFlow.missing, ["operatingCashFlow"]);
});

test("a non-positive denominator is explained, not scored as low risk", () => {
  const result = run({ statement: statement({ ...specExample, currentLiabilities: 0 }) });
  assert.equal(result.components.liquidity.points, null);
  assert.match(result.components.liquidity.note ?? "", /not positive/);
  assert.equal(result.score, null);
});

test("statements older than 24 months only count as historic", () => {
  const result = run({ statement: statement(specExample, "2024-06-30") });
  assert.equal(result.historic, true);
  assert.equal(result.score, null);
  assert.equal(result.components.liquidity.points, 50);
});

test("an ongoing insolvency at the supplier is critical, one at another company is not", () => {
  const event = (id: string, entityId: string): FinancialEvent => ({
    id, entityId, kind: "insolvency", eventDate: null, publishedAt: "2024-10-01", status: "ongoing", summary: "Insolvency filed.", evidenceIds: ["ev-1"],
  });
  const result = run({ statement: statement(specExample), events: [event("e-own", "supplier"), event("e-other", "licensee")] });
  assert.deepEqual(result.criticalEventIds, ["e-own"]);
});

test("the group follows current ownership only and counts confirmed incidents at related companies", () => {
  const link = (fromId: string, toId: string, type: Relationship["type"], status: Relationship["status"] = "current"): Relationship => ({
    fromId, toId, type, sharePercent: null, status, evidenceIds: ["ev-1"],
  });
  const evidence = [{ id: "ev-1", status: "confirmed" }, { id: "ev-weak", status: "insufficient" }] as Evidence[];
  const insolvency = (entityId: string, evidenceId: string): FinancialEvent => ({
    id: `e-${entityId}`, entityId, kind: "insolvency", eventDate: null, publishedAt: null, status: "historic", summary: "Insolvency.", evidenceIds: [evidenceId],
  });
  const group = companyGroup(
    "supplier",
    [link("holding", "supplier", "ownership"), link("holding", "sister", "ownership"), link("holding", "rumoured", "ownership", "announced"), link("licensor", "supplier", "license")],
    [insolvency("sister", "ev-1"), insolvency("licensor", "ev-1"), insolvency("rumoured", "ev-1")],
    evidence,
  );
  assert.deepEqual(group.memberIds.sort(), ["holding", "sister", "supplier"]);
  assert.deepEqual(group.rootIds, ["holding"]);
  assert.deepEqual(group.incidentIds, ["sister"]);
  assert.match(group.hint ?? "", /^1 confirmed financial incident at related companies; completeness/);
});
