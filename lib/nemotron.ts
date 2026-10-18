import "server-only";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { ChatError } from "./chat-contract.ts";

const toolCallSchema = z.object({ id: z.string().min(1).max(200), type: z.literal("function"), function: z.object({ name: z.string().max(100), arguments: z.string().max(8_000) }) });
export const assistantMessageSchema = z.object({ role: z.literal("assistant"), content: z.string().max(50_000).nullable().optional(), tool_calls: z.array(toolCallSchema).max(4).nullish() });
export type AssistantMessage = z.infer<typeof assistantMessageSchema>;
export type ModelMessage = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_call_id?: string; tool_calls?: AssistantMessage["tool_calls"] };
export type ModelTool = { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } };
const responseSchema = z.object({ model: z.string(), choices: z.array(z.object({ message: assistantMessageSchema, finish_reason: z.string().nullable() })).min(1).max(1) });
const envSchema = z.object({ NEBIUS_API_KEY: z.string().trim().min(1), NEBIUS_MODEL: z.string().trim().min(1).default("nvidia/Nemotron-3-Ultra-550b-a55b") });

export async function completeNemotron(messages: ModelMessage[], tools: ModelTool[], signal: AbortSignal, outputSchema?: Record<string, unknown>) {
  signal.throwIfAborted();
  const config = envSchema.safeParse(process.env);
  if (!config.success) throw new ChatError("ai_not_configured", "Set NEBIUS_API_KEY in the server environment.", 503);
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    let response: Response;
    try {
      response = await fetch("https://api.tokenfactory.nebius.com/v1/chat/completions", {
        method: "POST", signal, cache: "no-store",
        headers: { Authorization: `Bearer ${config.data.NEBIUS_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.data.NEBIUS_MODEL, messages, ...(tools.length ? { tools, tool_choice: "auto" } : {}),
          ...(outputSchema ? { response_format: { type: "json_schema", json_schema: { name: "response", strict: true, schema: outputSchema } } } : {}), temperature: 0.1,
          max_tokens: 4_096, stream: false, chat_template_kwargs: { enable_thinking: false } }),
      });
    } catch {
      signal.throwIfAborted();
      if (attempt === 0) { await delay(300, undefined, { signal }); continue; }
      throw new ChatError("provider_unavailable", "Nemotron could not be reached. Please retry.");
    }
    if (!response.ok) {
      const retryAfter = response.headers.get("retry-after");
      const seconds = retryAfter ? Number(retryAfter) : 0.3;
      await response.body?.cancel();
      if (attempt === 0 && (response.status === 429 || response.status >= 500) && Number.isFinite(seconds) && seconds >= 0 && seconds <= 3) {
        await delay(seconds * 1_000, undefined, { signal }); continue;
      }
      throw new ChatError("provider_unavailable", "Nemotron rejected the request. Check the server configuration or retry.");
    }
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new ChatError("invalid_provider_response", "Nemotron returned an invalid response. Please retry.");
    const choice = parsed.data.choices[0];
    if (!choice || choice.finish_reason === "length") throw new ChatError("incomplete_answer", "Nemotron could not finish its answer. Try a narrower question.");
    return { message: choice.message, model: parsed.data.model };
  }
  throw new ChatError("provider_unavailable", "Nemotron could not be reached. Please retry.");
}
