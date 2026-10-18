import assert from "node:assert/strict";
import { test } from "node:test";
import { hydrateAnswer } from "./chat.ts";
import { explainDriver, type DriverExplanation } from "./chat-explain.ts";
import { tracer } from "./chat-trace.ts";
import { TOTAL_RISK_WEIGHTS } from "./suppliers/criteria.ts";
import { guardedSearchSchema, searchContext, verifiedQuote, type WebContext } from "./web-context.ts";

test("the query guard rejects dataset supplier ids and names, and allows the driver in general", () => {
  const schema = guardedSearchSchema(["Global Logistics 175"]);
  const search = (queries: string[]) => schema.safeParse({ driverKey: "compliance", queries }).success;
  assert.equal(search(["EN 45545-2 fire safety requirements for train seats"]), true);
  assert.equal(search(["SUPP_00018 lawsuits"]), false);
  assert.equal(search(["supp 00018 fines"]), false);
  assert.equal(search(["Apex Technologies 491 recall"]), false);
  assert.equal(search(["global logistics regulatory fines"]), false);
  assert.equal(search(["rail seat fire standards", "Global Logistics 175 news"]), false);
});

test("a quote counts only as an exact passage of 20 to 300 characters", () => {
  const content = "EN 45545-2 is the mandatory European standard\nfor materials used in railway vehicles.";
  assert.equal(verifiedQuote(content, "EN 45545-2 is the mandatory European standard for materials"), "EN 45545-2 is the mandatory European standard for materials");
  assert.equal(verifiedQuote(content, "EN 45545-2 is a mandatory European standard"), null);
  assert.equal(verifiedQuote(content, "railway"), null);
  assert.equal(verifiedQuote(`${content} ${"x".repeat(300)}`, `vehicles. ${"x".repeat(300)}`), null);
});

const web: WebContext = {
  kind: "web_context", status: "ok", driver: "Compliance", note: "",
  sources: [1, 2, 3].map((n) => ({ n, title: `Source ${n}`, url: `https://example.org/${n}`, domain: "example.org", publishedDate: null, quote: "A passage long enough to count." })),
};
const evidence = new Map<string, DriverExplanation | WebContext>([["page", explainDriver("compliance", TOTAL_RISK_WEIGHTS)], ["web_1", web]]);
const recipe = { text: "Compliance carries 8% of the dataset weighting.", resultId: "page", supplierIds: [], metricKeys: [], webText: "EN 45545-2 sets fire rules [1, 3]." };

test("web text may only cite sources the search kept, next to a dataset answer", () => {
  assert.deepEqual(hydrateAnswer(recipe, evidence, "test", []).webContext?.sources.map(({ n }) => n), [1, 3]);
  assert.throws(() => hydrateAnswer({ ...recipe, webText: "Fire rules apply [4]." }, evidence, "test", []), { code: "ungrounded_answer" });
  assert.throws(() => hydrateAnswer({ ...recipe, webText: "Fire rules apply." }, evidence, "test", []), { code: "ungrounded_answer" });
  assert.throws(() => hydrateAnswer({ ...recipe, resultId: "web_1" }, evidence, "test", []), { code: "ungrounded_answer" });
  assert.equal(hydrateAnswer({ ...recipe, webText: null }, evidence, "test", []).webContext, null);
});

test("a failing web search falls back to the dataset instead of failing the chat", async (t) => {
  const env = process.env;
  process.env = { ...env, TAVILY_API_KEY: "fixture-key" };
  t.after(() => { process.env = env; });
  t.mock.method(globalThis, "fetch", async () => new Response("unavailable", { status: 503 }));
  const result = await searchContext({ driverKey: "compliance", queries: ["seat fire standards outage test"] }, "Which standards apply?", AbortSignal.timeout(1_000), tracer(() => {}));
  assert.equal(result.status, "failed");
  assert.deepEqual(result.sources, []);
  t.mock.restoreAll();
});
