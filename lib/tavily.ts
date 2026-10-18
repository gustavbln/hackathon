import "server-only";
import { z } from "zod";

const httpUrl = z.url({ protocol: /^https?$/ });
const responseSchema = z.object({
  results: z.array(z.object({ url: httpUrl, title: z.string(), content: z.string(), published_date: z.string().nullish() })),
  usage: z.object({ credits: z.number().int().min(0) }).optional(),
});
const envSchema = z.object({ TAVILY_API_KEY: z.string().trim().min(1) });

export interface WebResult {
  url: string;
  title: string;
  content: string;
  publishedDate: string | null;
}

const CACHE_MS = 24 * 60 * 60 * 1_000;
// ponytail: per-process cache, lost on restart; a shared store once the app runs on several instances.
const cache = new Map<string, { at: number; results: WebResult[] }>();

/** One basic Tavily search (1 credit, five results), cached for a day per normalized query. */
export async function searchWeb(query: string, signal: AbortSignal): Promise<{ results: WebResult[]; credits: number }> {
  const key = query.trim().toLowerCase().replace(/\s+/g, " ");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return { results: cached.results, credits: 0 };
  const config = envSchema.safeParse(process.env);
  if (!config.success) throw new Error("TAVILY_API_KEY is not set");
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST", signal, cache: "no-store",
    headers: { Authorization: `Bearer ${config.data.TAVILY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query, search_depth: "basic", max_results: 5, auto_parameters: false, include_usage: true,
      exclude_domains: ["reddit.com", "quora.com"],
    }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Tavily answered ${response.status}`);
  }
  const parsed = responseSchema.parse(await response.json());
  const results = parsed.results.map(({ url, title, content, published_date }) => ({ url, title, content, publishedDate: published_date ?? null }));
  cache.set(key, { at: Date.now(), results });
  return { results, credits: parsed.usage?.credits ?? 1 };
}
