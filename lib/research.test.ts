import assert from "node:assert/strict";
import { test } from "node:test";
import { researchedIdFor, researchedSupplierSchema, toSupplier, type ResearchedSupplier } from "./research/contract.ts";
import { extractJson, isVerbatim, mentionsCompany } from "./research/evidence.ts";

test("quotes count only when they appear verbatim in the fetched text", () => {
  const page = "In 2025 the group reported   a net loss of EUR 12 million.\nRevenue grew 4%.";
  assert.equal(isVerbatim("reported a net loss of EUR 12 million", page), true);
  assert.equal(isVerbatim("reported a net profit of EUR 12 million", page), false);
  assert.equal(isVerbatim("net loss", page), false);
});

test("ids are stable slugs that never look like dataset suppliers", () => {
  assert.equal(researchedIdFor("Grammer AG"), "EXT_grammer-ag");
  assert.equal(researchedIdFor("Compin-Fainsa S.A."), "EXT_compin-fainsa-s-a");
  assert.doesNotMatch(researchedIdFor("SUPP 00001"), /^SUPP_/);
});

function researched(overrides: Partial<ResearchedSupplier> = {}): ResearchedSupplier {
  return {
    id: "EXT_example",
    name: "Example",
    legalName: null,
    website: null,
    country: null,
    brief: "",
    researchedAt: "2026-10-18T12:00:00.000Z",
    summary: "Fictional test company.",
    insights: [],
    agents: {
      quality: { status: "estimated", estimate: { value: 30, confidence: "medium", rationale: "Recall in 2025.", sourceIds: [1] }, thread: [] },
      compliance: { status: "no_evidence", estimate: null, thread: [] },
    },
    sources: [{ id: 1, url: "https://example.com/news", title: "News", publishedAt: null, quote: "A recall was announced in 2025." }],
    run: { seconds: 1, costUsd: 0, tavilyCredits: 0, models: [] },
    ...overrides,
  };
}

test("a researched company ranks with its evidence and leaves unresearched drivers unknown", () => {
  const supplier = toSupplier(researched());
  assert.equal(supplier.scores.quality, 30);
  assert.equal(supplier.scores.compliance, null);
  assert.equal(supplier.scores.financialHealth, null);
});

test("estimates must cite sources that exist", () => {
  assert.equal(researchedSupplierSchema.safeParse(researched()).success, true);
  const broken = researched({ insights: [{ headline: "Unbacked claim", criterion: null, sourceIds: [9] }] });
  assert.equal(researchedSupplierSchema.safeParse(broken).success, false);
});

test("evidence must name the company, not just share its industry", () => {
  assert.equal(mentionsCompany("GRAMMER AG reported a loss", ["GRAMMER AG"]), true);
  assert.equal(mentionsCompany("JPMorgan credit risk exposure", ["GRAMMER AG"]), false);
  assert.equal(mentionsCompany("The AG group announced", ["GRAMMER AG"]), false);
});

test("model replies with reasoning around the JSON still parse, and prose alone does not", () => {
  assert.deepEqual(extractJson('We need to answer.\n```json\n{"value": 3}\n```'), { value: 3 });
  assert.equal(extractJson("We need to think about this first."), null);
});
