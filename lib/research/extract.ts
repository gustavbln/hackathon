import "server-only";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";

const responseSchema = z.object({
  results: z.array(z.object({ url: z.string(), raw_content: z.string().nullish() })),
  failed_results: z.array(z.object({ url: z.string() }).passthrough()).optional(),
  usage: z.object({ credits: z.number().min(0) }).optional(),
});
const envSchema = z.object({ TAVILY_API_KEY: z.string().trim().min(1) });
const RETRIES = [1_000, 2_000, 4_000];
const MAX_PAGE_CHARS = 80_000;

export interface Page {
  url: string;
  content: string;
}

/** Reads up to five pages in full with Tavily extract (1 credit per five pages); unreadable pages are skipped. */
export async function readPages(urls: string[], signal: AbortSignal): Promise<{ pages: Page[]; credits: number }> {
  if (urls.length === 0) return { pages: [], credits: 0 };
  const config = envSchema.safeParse(process.env);
  if (!config.success) throw new Error("TAVILY_API_KEY is not set");
  for (let attempt = 0; ; attempt++) {
    const response = await fetch("https://api.tavily.com/extract", {
      method: "POST", signal, cache: "no-store",
      headers: { Authorization: `Bearer ${config.data.TAVILY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ urls: urls.slice(0, 5), extract_depth: "basic", include_usage: true }),
    });
    const wait = RETRIES[attempt];
    if (response.status === 429 && wait !== undefined) {
      await response.body?.cancel();
      await delay(wait, undefined, { signal });
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Tavily extract answered ${response.status}`);
    }
    const parsed = responseSchema.parse(await response.json());
    return {
      pages: parsed.results.flatMap(({ url, raw_content }) => (raw_content ? [{ url, content: raw_content.slice(0, MAX_PAGE_CHARS) }] : [])),
      credits: parsed.usage?.credits ?? 1,
    };
  }
}
