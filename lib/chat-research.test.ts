import assert from "node:assert/strict";
import { test } from "node:test";
import { pageActionSchema, pageContextSchema } from "./chat-contract.ts";
import { matchResearched, researchedFacts } from "./chat-research.ts";
import { hydrateAnswer } from "./chat.ts";
import { researchedSupplierSchema } from "./research/contract.ts";
import { TOTAL_RISK_WEIGHTS } from "./suppliers/criteria.ts";

const companies = [
  { id: "EXT_grammer-ag", name: "GRAMMER AG", legalName: "GRAMMER AG" },
  { id: "EXT_franz-kiel-gmbh", name: "Franz Kiel GmbH", legalName: "Franz Kiel GmbH & Co. KG" },
];

test("a researched company is found by id, by name with or without legal form, or by a unique part of it", () => {
  const find = (query: string) => matchResearched(companies, query)?.id ?? null;
  assert.equal(find("EXT_grammer-ag"), "EXT_grammer-ag");
  assert.equal(find("GRAMMER"), "EXT_grammer-ag");
  assert.equal(find("grammer ag"), "EXT_grammer-ag");
  assert.equal(find("Franz Kiel GmbH & Co. KG"), "EXT_franz-kiel-gmbh");
  assert.equal(find("Kiel"), "EXT_franz-kiel-gmbh");
  assert.equal(find("Recaro"), null);
  assert.equal(find("GmbH"), null);
  assert.equal(matchResearched([...companies, { id: "EXT_kiel-seating", name: "Kiel Seating", legalName: null }], "Kiel"), null);
});

test("researched pages and the added-supplier action take EXT ids only, dataset pages SUPP ids only", () => {
  const weights = TOTAL_RISK_WEIGHTS;
  assert.equal(pageContextSchema.safeParse({ page: "researched", supplierId: "EXT_grammer-ag", seatId: "2B", weights }).success, true);
  assert.equal(pageContextSchema.safeParse({ page: "researched", supplierId: "SUPP_00018", seatId: null, weights }).success, false);
  assert.equal(pageContextSchema.safeParse({ page: "supplier", supplierId: "EXT_grammer-ag", seatId: null, weights }).success, false);
  assert.equal(pageActionSchema.safeParse({ type: "supplier_added", supplierId: "EXT_franz-kiel-gmbh" }).success, true);
  assert.equal(pageActionSchema.safeParse({ type: "supplier_added", supplierId: "SUPP_00018" }).success, false);
});

// Parsed, so the research contract's defaults fill whatever this test does not care about.
const grammer = researchedSupplierSchema.parse({
  ...companies[0], website: "https://www.grammer.com", country: "DE", brief: "", researchedAt: "2026-10-18T14:36:56.497Z",
  summary: "Seat maker with a supplier quality bottleneck.", insights: [], agents: {},
  sources: [1, 2].map((id) => ({ id, url: `https://example.org/${id}`, title: `Source ${id}`, publishedAt: null, quote: "A verbatim passage." })),
  run: { seconds: 30, costUsd: 0.012, tavilyCredits: 13, models: [] },
});

test("an answer about a researched company may cite only that company's sources", () => {
  const evidence = new Map([["page", researchedFacts(grammer, TOTAL_RISK_WEIGHTS)]]);
  const recipe = { text: "Sub-tier visibility is its weak spot [2].", resultId: "page", supplierIds: [], metricKeys: [], webText: null };
  const response = hydrateAnswer(recipe, evidence, "test", []);
  assert.deepEqual(response.researchSources.map(({ n, url }) => [n, url]), [[2, "https://example.org/2"]]);
  assert.equal(response.webContext, null);
  assert.throws(() => hydrateAnswer({ ...recipe, text: "It had a recall [7]." }, evidence, "test", []), { code: "ungrounded_answer" });
});
