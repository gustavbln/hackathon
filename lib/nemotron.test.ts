import assert from "node:assert/strict";
import { test } from "node:test";
import { ChatError } from "./chat-contract.ts";
import { completeNemotron } from "./nemotron.ts";

test("transient provider errors retry once; request stays on Nebius and hides reasoning", async (t) => {
  const env = process.env;
  process.env = { ...env, NEBIUS_API_KEY: "fixture-key" };
  t.after(() => { process.env = env; });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "https://api.tokenfactory.nebius.com/v1/chat/completions");
    const body = JSON.parse(String(init.body));
    assert.equal(body.chat_template_kwargs.enable_thinking, false);
    assert.equal("tool_choice" in body, false);
    return calls++ === 0 ? new Response("unavailable", { status: 503, headers: { "retry-after": "0" } })
      : Response.json({ model: "test", choices: [{ finish_reason: "stop", message: { role: "assistant", content: "answer", tool_calls: null, reasoning_content: "private" } }] });
  });
  const response = await completeNemotron([{ role: "user", content: "hello" }], [], AbortSignal.timeout(1_000));
  assert.equal(calls, 2);
  assert.equal("reasoning_content" in response.message, false);
  t.mock.restoreAll();
});

test("provider bodies and secrets are not exposed on errors", async (t) => {
  const env = process.env;
  process.env = { ...env, NEBIUS_API_KEY: "fixture-key" };
  t.after(() => { process.env = env; });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return new Response("sensitive upstream details", { status: 401 }); });
  await assert.rejects(completeNemotron([], [], AbortSignal.timeout(1_000)), (error: unknown) => error instanceof ChatError
    && error.code === "provider_unavailable" && !error.message.includes("sensitive"));
  assert.equal(calls, 1);
  t.mock.restoreAll();
});

test("cancelled requests never call the provider", async () => {
  await assert.rejects(completeNemotron([], [], AbortSignal.abort()), { name: "AbortError" });
});
