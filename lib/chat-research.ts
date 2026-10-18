import "server-only";
import type { WebSource } from "./chat-contract.ts";
import { toSupplier, type ResearchedSupplier } from "./research/contract.ts";
import { CRITERIA, riskLevel, type Weights } from "./suppliers/criteria.ts";
import { profileRisk } from "./suppliers/scoring.ts";

const round = (value: number) => Math.round(value * 10) / 10;
const LEGAL_FORMS = /\b(gmbh|ag|se|kg|kgaa|co|inc|ltd|llc|plc|sa|sas|spa|srl|bv|nv|oy|ab|as)\b/g;

/** "Franz Kiel GmbH & Co. KG" reads "franz kiel": lowercase, no accents, legal forms or punctuation. */
function normalizeName(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ")
    .replace(LEGAL_FORMS, " ").replace(/\s+/g, " ").trim();
}

/**
 * The researched company a buyer means: its id, its name with or without legal form, or a part of the name that fits
 * exactly one company ("GRAMMER", "Kiel"). Null when nothing or several fit.
 */
export function matchResearched<T extends Pick<ResearchedSupplier, "id" | "name" | "legalName">>(suppliers: readonly T[], query: string): T | null {
  const wanted = normalizeName(query);
  if (wanted === "") return null;
  const names = (supplier: T) => [supplier.name, supplier.legalName].flatMap((name) => (name ? [normalizeName(name)] : []));
  const exact = suppliers.find((supplier) => supplier.id.toLowerCase() === query.trim().toLowerCase() || names(supplier).includes(wanted));
  if (exact) return exact;
  const partial = suppliers.filter((supplier) => names(supplier).some((name) => ` ${name} `.includes(` ${wanted} `) || ` ${wanted} `.includes(` ${name} `)));
  return partial.length === 1 ? (partial[0] ?? null) : null;
}

/** Words in company names too generic to show that a question means that company. */
const GENERIC_WORDS = new Set(["group", "holding", "industries", "international", "manufacturing", "seating", "seats", "systems", "solutions", "technologies", "components", "interiors", "interior", "automotive", "rail"]);

/** The researched companies a message names, by a distinctive word of their name ("GRAMMER", "Kiel"). */
export function mentionedResearched<T extends Pick<ResearchedSupplier, "id" | "name" | "legalName">>(message: string, suppliers: readonly T[]): T[] {
  const words = new Set(normalizeName(message).split(" "));
  return suppliers.filter((supplier) => [supplier.name, supplier.legalName].some((name) =>
    name !== null && normalizeName(name).split(" ").some((word) => word.length >= 4 && !GENERIC_WORDS.has(word) && words.has(word))));
}

/**
 * What the chat may say about a researched company: the agents' estimates with confidence and rationale, its weighted
 * risk range under the page's weights (unscored drivers count 0 in the best and 100 in the worst case), findings and
 * numbered sources. Drivers without evidence stay unscored.
 */
export function researchedFacts(researched: ResearchedSupplier, weights: Weights) {
  const risk = profileRisk(toSupplier(researched).scores, weights);
  const drivers = CRITERIA.flatMap(({ key, label }) => {
    const agent = researched.agents[key];
    if (!agent) return [];
    const estimate = agent.estimate;
    return [{
      key, label, weightPercent: round(weights[key] * 100), status: agent.status,
      value: estimate?.value ?? null, level: estimate ? riskLevel(estimate.value) : null,
      confidence: estimate?.confidence ?? null, rationale: estimate?.rationale ?? null, sourceIds: estimate?.sourceIds ?? [],
      report: agent.report,
    }];
  });
  return {
    kind: "researched_supplier" as const,
    supplier: {
      id: researched.id, name: researched.name, legalName: researched.legalName, country: researched.country,
      website: researched.website, researchedAt: researched.researchedAt,
    },
    note: "Estimated by Nemotron agents from public sources on the dataset's 0–100 scale; not Siemens data. Unscored drivers had no public evidence.",
    weightedRisk: { best: round(risk.best), worst: round(risk.worst) },
    coverage: { driversResearched: drivers.length, driversScored: drivers.filter(({ value }) => value !== null).length },
    summary: researched.summary,
    drivers,
    insights: researched.insights,
    sources: researched.sources.map(({ id, url, title, publishedAt, quote }): WebSource => ({
      n: id, title, url, domain: new URL(url).hostname.replace(/^www\./, ""), publishedDate: publishedAt, quote,
    })),
    run: researched.run,
  };
}
export type ResearchedFacts = ReturnType<typeof researchedFacts>;

/** A company nobody researched yet; the buyer can add it with the "+" under the top 20. */
export interface ResearchedMissing {
  kind: "researched_missing";
  query: string;
  researched: { id: string; name: string }[];
}
