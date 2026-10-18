import assert from "node:assert/strict";
import { test } from "node:test";
import { metricDefinitions, riskDefinitions } from "./chat-contract.ts";
import { filterAndRankSuppliers, parseSupplierCsv, riskLevel, weightedRisk, type Supplier } from "./suppliers.ts";

function supplier(index: number, score: number): Supplier {
  return {
    id: `SUPP_${String(index).padStart(5, "0")}`, name: `Supplier ${index}`,
    metrics: Object.fromEntries(metricDefinitions.map(({ key }) => [key, key === "criticalRiskCount" ? 0 : score])) as Supplier["metrics"],
    sourcingRisk: "Low", complexity: "Simple",
  };
}

function csv(rows: Supplier[]) {
  const headers = ["supplierID", "Supplier Name", "Sourcing Risk Level", "Supply Chain Complexity",
    ...metricDefinitions.filter(({ key }) => key !== "criticalRiskCount").map(({ key }) => key),
    ...[...riskDefinitions.map(([key]) => key), "Total_Risk_Index"].map((key) => `${key}_Level`)];
  const records = rows.map((row) => ({ supplierID: row.id, "Supplier Name": row.name,
    "Sourcing Risk Level": row.sourcingRisk, "Supply Chain Complexity": row.complexity, ...row.metrics,
    ...Object.fromEntries([...riskDefinitions.map(([key]) => key), "Total_Risk_Index" as const].map((key) => [`${key}_Level`, riskLevel(row.metrics[key])])),
  }));
  return [headers, ...records.map((record) => headers.map((key) => (record as Record<string, unknown>)[key]))]
    .map((cells) => cells.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}

test("risk metadata preserves the public metric order, labels and percentage weights", () => {
  assert.deepEqual(riskDefinitions, [
    ["Financial_Health_Score", "Financial health risk", 10],
    ["Operational_Resilience_Score", "Operational resilience risk", 10],
    ["Quality_Risk_Score", "Quality risk", 10],
    ["Compliance_Risk_Score", "Compliance risk", 8],
    ["Sub_Tier_Visibility_Score", "Sub-tier visibility risk", 6],
    ["Safety_Incident_Score", "Workplace safety incident risk", 6],
    ["Credit_Rating_Score", "Credit risk", 6],
    ["ESG_Performance_Score", "ESG risk", 5],
    ["Governance_Risk_Score", "Governance risk", 5],
    ["Geopolitical_Risk_Score", "Geopolitical risk", 5],
    ["Industry_Benchmark_Score", "Industry benchmark risk", 4],
    ["Labor_Stability_Score", "Labor stability risk", 4],
    ["Environmental_Exposure_Score", "Environmental exposure risk", 4],
    ["Digital_Security_Score", "Digital security risk", 4],
    ["Political_Stability_Score", "Political stability risk", 4],
    ["Media_Sentiment_Score", "Media sentiment risk", 3],
    ["External_Intelligence_Score", "External intelligence risk", 3],
    ["Market_Sentiment_Score", "Market sentiment risk", 3],
  ]);
});

test("CSV parses quoted names, derives critical categories and rejects invalid data", () => {
  const row = supplier(1, 80);
  row.name = 'Rail, "Example"';
  const parsed = parseSupplierCsv(csv([row]));
  assert.equal(parsed[0]?.name, row.name);
  assert.equal(parsed[0]?.metrics.criticalRiskCount, 18);
  assert.throws(() => parseSupplierCsv(csv([row, row])), /Duplicate/);
  assert.throws(() => parseSupplierCsv(csv([row]).replace('"80"', '"NaN"')));
  assert.throws(() => parseSupplierCsv(csv([row]).replace('"Critical"', '"Low"')), /Invalid risk level/);
});

test("weighted total uses all weights and rounds midpoint ties to even", () => {
  assert.equal(riskDefinitions.reduce((sum, [, , weight]) => sum + weight, 0), 100);
  const row = supplier(1, 0);
  row.metrics.Financial_Health_Score = 5;
  assert.equal(weightedRisk(row), 0);
  row.metrics.Financial_Health_Score = 15;
  assert.equal(weightedRisk(row), 2);
  for (const score of [0, 24, 25, 49, 50, 74, 75, 100]) assert.equal(weightedRisk(supplier(1, score)), score);
});

test("filter entire dataset before sorting and limiting, with stable ties", () => {
  const rows = Array.from({ length: 100 }, (_, i) => supplier(i + 1, 100 - i));
  const result = filterAndRankSuppliers(rows, { filters: [{ metric: "Total_Risk_Index", operator: "lt", value: 50 }], limit: 20 });
  assert.equal(result.matchedCount, 49);
  assert.equal(result.rows.length, 20);
  assert.equal(result.rows[0]?.id, "SUPP_00100");
  const tie = filterAndRankSuppliers([supplier(2, 20), supplier(1, 20)], {});
  assert.deepEqual(tie.rows.map(({ id }) => id), ["SUPP_00001", "SUPP_00002"]);
  const delivery = filterAndRankSuppliers(rows, { sort: { metric: "Supplier Delivery Rating", direction: "desc" }, limit: 1 });
  assert.equal(delivery.rows[0]?.id, "SUPP_00001");
  assert.throws(() => filterAndRankSuppliers(rows, { limit: 21 }));
  assert.throws(() => filterAndRankSuppliers(rows, { filters: [{ metric: "price", operator: "lt", value: 20 }] }));
});
