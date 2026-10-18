import assert from "node:assert/strict";
import { test } from "node:test";
import { allowsFraming } from "./research/embeddable.ts";
import { researchedIdFor, researchedSupplierSchema, toSupplier, type ResearchedSupplier } from "./research/contract.ts";
import { excerptAround, extractJson, isVerbatim, keepKnownCitations, mentionsCompany, mentionsNamePart, relevantPassages } from "./research/evidence.ts";

test("quotes count only when they appear verbatim in the fetched text", () => {
  const page = "In 2025 the group reported   a net loss of EUR 12 million.\nRevenue grew 4%.";
  assert.equal(isVerbatim("reported a net loss of EUR 12 million", page), true);
  assert.equal(isVerbatim("reported a net profit of EUR 12 million", page), false);
  assert.equal(isVerbatim("net loss", page), false);
  assert.equal(isVerbatim("Kiel opened a new plant in North Macedonia", "**Kiel** opened a [new plant](https://kiel.example/news) in North Macedonia."), true);
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
      quality: { status: "estimated", estimate: { value: 30, confidence: "medium", rationale: "Recall in 2025.", sourceIds: [1] }, report: { headline: "One recall in 2025.", findings: [{ text: "A recall was announced in 2025.", sourceIds: [1] }], openQuestions: [] }, thread: [] },
      compliance: { status: "no_evidence", estimate: null, report: null, thread: [] },
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
  const quality = researched().agents.quality;
  const unbackedReport = researched({ agents: { quality: quality && { ...quality, report: { headline: "Recall", findings: [{ text: "Unbacked", sourceIds: [9] }], openQuestions: [] } } } });
  assert.equal(researchedSupplierSchema.safeParse(unbackedReport).success, false);
  assert.equal(researchedSupplierSchema.safeParse(researched({ summary: "A recall in 2025 [9]." })).success, false);
});

test("briefing citations keep only sources that exist", () => {
  assert.equal(keepKnownCitations("Dividends are suspended until 2027 [2, 9]. Revenue fell [7].", new Set([2])), "Dividends are suspended until 2027 [2]. Revenue fell.");
});

test("evidence must name the company, not just share its industry", () => {
  assert.equal(mentionsCompany("GRAMMER AG reported a loss", ["GRAMMER AG"]), true);
  assert.equal(mentionsCompany("JPMorgan credit risk exposure", ["GRAMMER AG"]), false);
  assert.equal(mentionsCompany("The AG group announced", ["GRAMMER AG"]), false);
  assert.equal(mentionsCompany("Kiel Institute for the World Economy report", ["Franz Kiel GmbH"]), false);
  assert.equal(mentionsCompany("Franz Müller, Kiel: annual report", ["Franz Kiel GmbH"]), false);
  assert.equal(mentionsNamePart("Kiel employs 900 people", ["Franz Kiel GmbH"]), true);
  assert.equal(mentionsCompany("Franz Kiel GmbH opens a plant in Nördlingen", ["Franz Kiel GmbH"]), true);
});

test("model replies with reasoning around the JSON still parse, and prose alone does not", () => {
  assert.deepEqual(extractJson('We need to answer.\n```json\n{"value": 3}\n```'), { value: 3 });
  assert.equal(extractJson("We need to think about this first."), null);
});

test("long pages are read where they talk about the risk, not where their navigation is", () => {
  const page = ["Home | Investors | Careers", ...Array.from({ length: 200 }, (_, index) => `Product line ${index} for seating.`), "Net income fell after a refinancing of the syndicated loan."].join("\n");
  const passages = relevantPassages(page, ["refinancing liquidity equity ratio", "net income results"], 400);
  assert.deepEqual(passages, ["Net income fell after a refinancing of the syndicated loan."]);
});

test("a quote is shown with the readable text around it, cut at whole words", () => {
  const page = "Intro words here. See [the report](https://x.example/r.pdf) for details.\nGRAMMER secured EUR 762 million of financing. | Next | row";
  assert.deepEqual(excerptAround("grammer secured EUR 762 million", page, 40), { before: "here. See the report for details.", after: "of financing. Next row" });
  assert.equal(excerptAround("not on the page at all", page, 40), null);
});

test("only sites that allow framing open inside the app", () => {
  assert.equal(allowsFraming(new Headers()), true);
  assert.equal(allowsFraming(new Headers({ "X-Frame-Options": "SAMEORIGIN" })), false);
  assert.equal(allowsFraming(new Headers({ "Content-Security-Policy": "default-src 'self'; frame-ancestors 'self' https://partner.example" })), false);
  assert.equal(allowsFraming(new Headers({ "Content-Security-Policy": "frame-ancestors *" })), true);
});
