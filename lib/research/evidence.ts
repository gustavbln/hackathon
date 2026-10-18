/** Longest quote kept; longer passages are summaries in disguise. */
export const MAX_QUOTE_LENGTH = 300;

const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

/** A quote only counts as evidence when it appears word for word in the fetched text. */
export function isVerbatim(quote: string, text: string): boolean {
  const needle = normalize(quote);
  return needle.length >= 12 && needle.length <= MAX_QUOTE_LENGTH && normalize(text).includes(needle);
}

/** Legal forms and filler words that say nothing about which company is meant. */
const GENERIC = new Set(["ag", "gmbh", "se", "sa", "spa", "inc", "ltd", "llc", "plc", "kg", "co", "group", "holding", "the", "and", "und", "company"]);

/** True when the text names the company by a distinctive part of its name, e.g. "grammer" for "GRAMMER AG". */
export function mentionsCompany(text: string, names: string[]): boolean {
  const haystack = normalize(text);
  const tokens = names.flatMap((name) => normalize(name).split(/[^a-z0-9]+/)).filter((token) => token.length >= 4 && !GENERIC.has(token));
  return tokens.some((token) => haystack.includes(token));
}

/** The JSON object in a model reply, ignoring code fences or stray text around it; null when there is none. */
export function extractJson(content: string): unknown {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * The lines of a long page that matter for one risk: ranked by how many of the topic's words they contain, kept in
 * page order up to the limit. Long reports put the relevant part far below their navigation.
 */
export function relevantPassages(text: string, topic: string[], limit: number): string[] {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter((line) => line.length > 0);
  if (text.length <= limit) return lines;
  const words = [...new Set(topic.flatMap((part) => part.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []))];
  const scored = lines.map((line, index) => ({ line, index, score: words.filter((word) => line.toLowerCase().includes(word)).length }));
  const kept = new Set<number>();
  let length = 0;
  for (const { line, index, score } of [...scored].sort((a, b) => b.score - a.score)) {
    if (score === 0) break;
    if (length + line.length > limit) continue;
    kept.add(index);
    length += line.length;
  }
  return kept.size > 0 ? scored.filter(({ index }) => kept.has(index)).map(({ line }) => line) : [text.slice(0, limit)];
}
