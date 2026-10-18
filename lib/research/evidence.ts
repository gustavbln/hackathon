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
