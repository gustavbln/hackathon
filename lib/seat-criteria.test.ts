import assert from "node:assert/strict";
import { test } from "node:test";
import { seatCriterionKeys } from "./seat-criteria-contract.ts";
import { averageSeatCriteria, evaluateSeatCriteria } from "./seat-criteria.ts";

function evaluation(score: number) {
  return { criteria: Object.fromEntries(seatCriterionKeys.map((key) => [key, { importance: score, reason: "Consider reliability for seat procurement." }])) };
}

test("average all three importance scores, normalize weights and sort most important first", () => {
  const runs = [2, 4, 6].map(evaluation);
  for (const run of runs) run.criteria.quality = { importance: 10, reason: "Seat quality matters." };
  const result = averageSeatCriteria(runs);
  const quality = result[0];
  assert.equal(quality?.key, "quality");
  assert.deepEqual(quality?.scores, [10, 10, 10]);
  assert.equal(quality?.meanImportance, 10);
  assert.ok(Math.abs((quality?.weightPercent ?? 0) - 100 / 7.8) < 1e-10);
  const financial = result.find(({ key }) => key === "financialHealth");
  assert.deepEqual(financial?.scores, [2, 4, 6]);
  assert.equal(financial?.meanImportance, 4);
  assert.equal(financial?.direction, "lower");
  assert.equal(quality?.direction, "lower");
  assert.ok(Math.abs(result.reduce((sum, { weightPercent }) => sum + weightPercent, 0) - 100) < 1e-10);
});

test("require exactly three complete runs with known criteria and valid scores", () => {
  assert.throws(() => averageSeatCriteria([evaluation(5), evaluation(5)]), { code: "invalid_criteria" });
  assert.throws(() => averageSeatCriteria([evaluation(5), evaluation(5), evaluation(11)]), { code: "invalid_criteria" });
  assert.throws(() => averageSeatCriteria([evaluation(0), evaluation(0), evaluation(0)]), { code: "invalid_criteria" });
  const missing = evaluation(5);
  delete missing.criteria.quality;
  assert.throws(() => averageSeatCriteria([evaluation(5), evaluation(5), missing]), { code: "invalid_criteria" });
  const extra = evaluation(5);
  extra.criteria.Total_Risk_Index = { importance: 10, reason: "Double counting" };
  assert.throws(() => averageSeatCriteria([extra, extra, extra]), { code: "invalid_criteria" });
});

test("three separate Nebius calls share the prompt and do not see earlier answers", async (t) => {
  const env = process.env;
  process.env = { ...env, NEBIUS_API_KEY: "fixture-key" };
  t.after(() => { process.env = env; });
  const requests: { messages: unknown[] }[] = [];
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    const request = JSON.parse(String(init.body));
    requests.push(request);
    assert.equal("tools" in request, false);
    assert.equal(request.response_format.type, "json_schema");
    assert.equal(request.response_format.json_schema.strict, true);
    assert.equal(request.response_format.json_schema.schema.properties.criteria.required.length, 18);
    assert.equal("propertyNames" in request.response_format.json_schema.schema.properties.criteria, false);
    assert.equal(JSON.stringify(request.messages).includes("SUPP_"), false);
    return Response.json({ model: "test", choices: [{ finish_reason: "stop", message: {
      role: "assistant", content: JSON.stringify(evaluation(requests.length * 2)), tool_calls: null,
    } }] });
  });
  const result = await evaluateSeatCriteria(AbortSignal.timeout(1_000));
  assert.equal(requests.length, 3);
  assert.deepEqual(requests[0]?.messages, requests[1]?.messages);
  assert.deepEqual(requests[1]?.messages, requests[2]?.messages);
  assert.equal(result.runCount, 3);
  assert.equal(result.status, "ai_suggestion");
  assert.ok(Math.abs(Object.values(result.weights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-10);
  assert.equal(result.criteria.length, 18);
  assert.deepEqual(result.criteria[0]?.scores, [2, 4, 6]);
  assert.deepEqual(result.models, ["test", "test", "test"]);
  t.mock.restoreAll();
});

test("one bad evaluation fails the whole batch rather than averaging two", async (t) => {
  const env = process.env;
  process.env = { ...env, NEBIUS_API_KEY: "fixture-key" };
  t.after(() => { process.env = env; });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => Response.json({ model: "test", choices: [{ finish_reason: "stop",
    message: { role: "assistant", content: JSON.stringify(++calls === 3 ? { criteria: {} } : evaluation(5)) },
  }] }));
  await assert.rejects(evaluateSeatCriteria(AbortSignal.timeout(1_000)), { code: "invalid_criteria" });
  assert.equal(calls, 3);
  t.mock.restoreAll();
});
