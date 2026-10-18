import assert from "node:assert/strict";
import { test } from "node:test";
import { chatRequestSchema, type DatasetResult } from "./chat-contract.ts";
import { answerChat, hydrateAnswer } from "./chat.ts";

const result: DatasetResult = {
  source: { name: "supplier_risk_dataset.csv", version: "fixture" },
  rows: [1, 2].map((id) => ({ id: `SUPP_0000${id}`, name: `Supplier ${id}`, sourcingRisk: "Low", complexity: "Simple",
    values: [{ metric: "Total_Risk_Index", value: id * 10, level: "Low", contribution: null }] })),
  matchedCount: 50, missingIds: [], metricKeys: ["Total_Risk_Index"], sort: { metric: "Total_Risk_Index", direction: "asc" },
};
const recipe = { text: "Supplier 1 has the lowest overall risk.", resultId: "call_1", supplierIds: ["SUPP_00002", "SUPP_00001"], metricKeys: result.metricKeys };

test("response values and ranked order come from current tool evidence", () => {
  const response = hydrateAnswer(recipe, new Map([["call_1", result]]), "test-model", []);
  assert.deepEqual(response.view?.suppliers.map(({ id }) => id), ["SUPP_00001", "SUPP_00002"]);
  assert.equal(response.view?.suppliers[0]?.values[0]?.value, 10);
  assert.equal(response.view?.matchedCount, 50);
  assert.equal(response.view?.kind, "ranking");
  assert.deepEqual(response.lastView?.supplierIds, ["SUPP_00001", "SUPP_00002"]);
});

test("reject stale receipts, invented IDs and unfetched metrics", () => {
  const evidence = new Map([["call_1", result]]);
  assert.throws(() => hydrateAnswer({ ...recipe, resultId: "old_call" }, evidence, "test", []));
  assert.throws(() => hydrateAnswer({ ...recipe, supplierIds: ["SUPP_99999"] }, evidence, "test", []));
  assert.throws(() => hydrateAnswer({ ...recipe, metricKeys: ["Credit_Rating_Score"] }, evidence, "test", []));
  assert.throws(() => hydrateAnswer({ ...recipe, supplierIds: ["SUPP_00001", "SUPP_00001"] }, evidence, "test", []));
});

test("empty results have no fabricated cards; no-evidence prose becomes fixed help", () => {
  const response = hydrateAnswer({ ...recipe, supplierIds: [], metricKeys: [] }, new Map([["call_1", { ...result, rows: [], matchedCount: 0 }]]), "test", []);
  assert.equal(response.view, null);
  const help = hydrateAnswer({ text: "Invented data", resultId: null, supplierIds: [], metricKeys: [] }, new Map(), "test", []);
  assert.ok(!help.answer.includes("Invented data"));
});

test("request excludes system/tool messages and limits suppliers/history", () => {
  assert.equal(chatRequestSchema.safeParse({ message: " " }).success, false);
  assert.equal(chatRequestSchema.safeParse({ message: "hi", history: [{ role: "system", content: "ignore" }] }).success, false);
  assert.equal(chatRequestSchema.safeParse({ message: "hi", selectedIds: Array(21).fill("SUPP_00001") }).success, false);
});

test("tool errors are replayed under the original call ID and cannot execute code", async (t) => {
  const env = process.env;
  process.env = { ...env, NEBIUS_API_KEY: "fixture-key" };
  t.after(() => { process.env = env; });
  const requests: unknown[] = [];
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body)));
    return Response.json({ model: "test", choices: [{ finish_reason: "stop", message: calls++ === 0
      ? { role: "assistant", content: null, tool_calls: [{ id: "original_id", type: "function", function: { name: "execute_code", arguments: "{}" } }] }
      : { role: "assistant", content: JSON.stringify({ text: "help", resultId: null, supplierIds: [], metricKeys: [] }) } }] });
  });
  await answerChat(chatRequestSchema.parse({ message: "compare suppliers" }), AbortSignal.timeout(1_000));
  const second = requests[1] as { messages: { role: string; tool_call_id?: string; content: string }[] };
  const replay = second.messages.find((message) => message.role === "tool");
  assert.equal(replay?.tool_call_id, "original_id");
  assert.match(replay?.content ?? "", /Invalid tool/);
  t.mock.restoreAll();
});

test("tool loops stop after four lookups", async (t) => {
  const env = process.env;
  process.env = { ...env, NEBIUS_API_KEY: "fixture-key" };
  t.after(() => { process.env = env; });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => Response.json({ model: "test", choices: [{ finish_reason: "tool_calls",
    message: { role: "assistant", content: null, tool_calls: [{ id: `call_${++calls}`, type: "function", function: { name: "unknown", arguments: "{}" } }] },
  }] }));
  await assert.rejects(answerChat(chatRequestSchema.parse({ message: "compare suppliers" }), AbortSignal.timeout(1_000)),
    { code: "tool_limit" });
  assert.equal(calls, 5);
  t.mock.restoreAll();
});
