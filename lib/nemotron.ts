import "server-only";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { ChatError, type ModelCall } from "./chat-contract.ts";

const toolCallSchema = z.object({ id: z.string().min(1).max(200), type: z.literal("function"), function: z.object({ name: z.string().max(100), arguments: z.string().max(8_000) }) });
export const assistantMessageSchema = z.object({ role: z.literal("assistant"), content: z.string().max(50_000).nullable().optional(), tool_calls: z.array(toolCallSchema).max(4).nullish() });
export type AssistantMessage = z.infer<typeof assistantMessageSchema>;
export type ModelMessage = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_call_id?: string; tool_calls?: AssistantMessage["tool_calls"] };
export type ModelTool = { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } };
const usageSchema = z.object({ prompt_tokens: z.number(), completion_tokens: z.number(), completion_tokens_details: z.object({ reasoning_tokens: z.number().nullish() }).nullish() });
export type NemotronUsage = z.infer<typeof usageSchema>;
const responseSchema = z.object({ model: z.string(), choices: z.array(z.object({ message: assistantMessageSchema, finish_reason: z.string().nullable() })).min(1).max(1), usage: usageSchema.optional() });
const envSchema = z.object({ NEBIUS_API_KEY: z.string().trim().min(1), NEBIUS_MODEL: z.string().trim().min(1).default("nvidia/Nemotron-3-Ultra-550b-a55b") });

/** USD per token, from Nebius's authenticated /v1/models?verbose=true on 2026-10-18. */
const PRICES: Record<string, { prompt: number; completion: number }> = {
  "nvidia/Nemotron-3-Ultra-550b-a55b": { prompt: 1e-6, completion: 3e-6 },
  "nvidia/Nemotron-3_5-Lightning": { prompt: 6e-8, completion: 2.4e-7 },
};

/** One call's tokens and price; completion tokens include the reasoning tokens. Unlisted models count as free. */
export function priceCall(model: string, usage: NemotronUsage | null): ModelCall {
  const price = PRICES[model] ?? { prompt: 0, completion: 0 };
  const promptTokens = usage?.prompt_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? 0;
  return {
    model, promptTokens, completionTokens,
    reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    costUsd: promptTokens * price.prompt + completionTokens * price.completion,
  };
}

/** Receives every completed call, so callers several layers up can show what a request cost. */
export type UsageSink = (call: ModelCall) => void;

/** Per-call choices for pipelines that use several Nemotron models; defaults keep the chat's behaviour. */
export type NemotronOptions = {
  model?: string; thinking?: boolean; mediumEffort?: boolean; maxTokens?: number; onUsage?: UsageSink;
  /** "required" makes every reply a tool call, e.g. when the final answer is a tool too. */
  toolChoice?: "auto" | "required";
};

export async function completeNemotron(messages: ModelMessage[], tools: ModelTool[], signal: AbortSignal, outputSchema?: Record<string, unknown>, options: NemotronOptions = {}) {
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
        body: JSON.stringify({ model: options.model ?? config.data.NEBIUS_MODEL, messages, ...(tools.length ? { tools, tool_choice: options.toolChoice ?? "auto" } : {}),
          ...(outputSchema ? { response_format: { type: "json_schema", json_schema: { name: "response", strict: true, schema: outputSchema } } } : {}), temperature: 0.1,
          max_tokens: options.maxTokens ?? 4_096, stream: false,
          chat_template_kwargs: { enable_thinking: options.thinking ?? false, ...(options.mediumEffort ? { medium_effort: true } : {}) } }),
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
    options.onUsage?.(priceCall(parsed.data.model, parsed.data.usage ?? null));
    if (!choice || choice.finish_reason === "length") throw new ChatError("incomplete_answer", "Nemotron could not finish its answer. Try a narrower question.");
    return { message: choice.message, model: parsed.data.model, usage: parsed.data.usage ?? null };
  }
  throw new ChatError("provider_unavailable", "Nemotron could not be reached. Please retry.");
}
