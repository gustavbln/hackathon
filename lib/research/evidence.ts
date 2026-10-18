/** Longest quote kept; longer passages are summaries in disguise. */
export const MAX_QUOTE_LENGTH = 400;

const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

/** A quote only counts as evidence when it appears word for word in the fetched text, read without its Markdown. */
export function isVerbatim(quote: string, text: string): boolean {
  const needle = normalize(readable(quote));
  return needle.length >= 12 && needle.length <= MAX_QUOTE_LENGTH && normalize(readable(text)).includes(needle);
}

/** Legal forms and filler words that say nothing about which company is meant. */
const GENERIC = new Set(["ag", "gmbh", "se", "sa", "spa", "inc", "ltd", "llc", "plc", "kg", "co", "group", "holding", "the", "and", "und", "company"]);

/**
 * True when the text names the company by the distinctive part of one of its names, as a phrase: "grammer" for
 * "GRAMMER AG", but "franz kiel" for "Franz Kiel GmbH", since "Kiel" alone is a city and "Franz" a first name.
 */
export function mentionsCompany(text: string, names: string[]): boolean {
  const words = ` ${normalize(text).replace(/[^a-z0-9]+/g, " ")} `;
  return names.some((name) => {
    const tokens = normalize(name).split(/[^a-z0-9]+/).filter((token) => token.length >= 2 && !GENERIC.has(token));
    return tokens.some((token) => token.length >= 4) && words.includes(` ${tokens.join(" ")} `);
  });
}

/** Looser than mentionsCompany: any distinctive part of a name, e.g. "kiel". Only safe on a page already about the company. */
export function mentionsNamePart(text: string, names: string[]): boolean {
  const words = ` ${normalize(text).replace(/[^a-z0-9]+/g, " ")} `;
  return names.some((name) => normalize(name).split(/[^a-z0-9]+/).some((token) => token.length >= 4 && !GENERIC.has(token) && words.includes(` ${token} `)));
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
  const lines = text.split(/\n+/).map(readable).filter((line) => line.length > 0);
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

/** The readable page text around a verbatim quote, cut at word boundaries; null when the quote is not found. */
export function excerptAround(quote: string, text: string, chars: number): { before: string; after: string } | null {
  const page = readable(text);
  const needle = readable(quote).toLowerCase();
  const at = page.toLowerCase().indexOf(needle);
  if (needle.length === 0 || at === -1) return null;
  const start = Math.max(0, at - chars);
  const end = Math.min(page.length, at + needle.length + chars);
  const before = page.slice(start, at);
  const after = page.slice(at + needle.length, end);
  return {
    before: (start > 0 ? before.replace(/^\S*\s/, "") : before).trim(),
    after: (end < page.length ? after.replace(/\s\S*$/, "") : after).trim(),
  };
}

/** Keeps inline citations that name known sources, normalising "[2, 5]" to "[2][5]" and dropping the rest. */
export function keepKnownCitations(text: string, known: ReadonlySet<number>): string {
  return text
    .replace(/\s*\[(\d+(?:\s*,\s*\d+)*)\]/g, (_, ids: string) => {
      const kept = ids.split(/\s*,\s*/).filter((id) => known.has(Number(id)));
      return kept.length > 0 ? ` ${kept.map((id) => `[${id}]`).join("")}` : "";
    })
    .trim();
}

/** Page text as extracted is Markdown; a reader wants the words, not link targets and table pipes. */
function readable(markdown: string): string {
  return markdown.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#*_|>]+/g, " ").replace(/\s+/g, " ").trim();
}
