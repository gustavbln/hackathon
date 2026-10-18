import "server-only";
import type { z } from "zod";
import {
  ChatError, chatResponseSchema, metricDefinitions,
  type answerRecipeSchema, type ChatResponse, type DatasetResult, type WebSource,
} from "./chat-contract.ts";
import type { DriverExplanation, SupplierExplanation } from "./chat-explain.ts";
import type { ResearchedFacts, ResearchedMissing } from "./chat-research.ts";
import type { SeatCriteriaResponse } from "./seat-criteria-contract.ts";
import type { WebContext } from "./web-context.ts";

type NamedSuppliers = { kind: "named_suppliers"; suppliers: SupplierExplanation[] };
export type ChatEvidence =
  | DatasetResult | SeatCriteriaResponse | SupplierExplanation | DriverExplanation | NamedSuppliers | WebContext
  | ResearchedFacts | ResearchedMissing;

/** The suppliers a result covers: its rows, or the explained suppliers and their alternatives. */
export function coveredSuppliers(result: ChatEvidence): { id: string; name: string }[] {
  if ("rows" in result) return result.rows;
  if (!("kind" in result)) return [];
  if (result.kind === "supplier_explanation") return explainedSuppliers(result);
  if (result.kind === "named_suppliers") return result.suppliers.flatMap(explainedSuppliers);
  return [];
}

function explainedSuppliers({ supplier, alternatives }: SupplierExplanation) {
  return [supplier, ...alternatives?.suppliers ?? []];
}

export function webContextIn(evidence: ReadonlyMap<string, ChatEvidence>) {
  return [...evidence.values()].find((result): result is WebContext => "kind" in result && result.kind === "web_context");
}

/** The source numbers a text cites, as [3] or [1, 2]. */
function citations(text: string | null): Set<number> {
  return new Set([...(text ?? "").matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)].flatMap(([, numbers = ""]) => numbers.split(",").map(Number)));
}

/** The web block: every web citation must be a source the search kept, and web text must cite at least one. */
function citedWebContext(webText: string | null, cited: Set<number>, evidence: ReadonlyMap<string, ChatEvidence>): ChatResponse["webContext"] {
  if (webText === null && cited.size === 0) return null;
  const web = webContextIn(evidence);
  // Without a web search, [n] can only be a researched company's sources, cited through that result's resultId.
  if (!web) throw new ChatError("ungrounded_answer", "The answer cited sources as [n] without citing the result that holds them in resultId. Please retry.");
  const sources = web.sources.filter(({ n }) => cited.has(n));
  if (webText === null || cited.size === 0 || sources.length !== cited.size) {
    throw new ChatError("ungrounded_answer", "The answer cited web sources the search did not keep. Please retry.");
  }
  return { text: webText, sources };
}

/** An answer about a researched company may cite only that company's research sources. */
function citedResearchSources(text: string, research: ResearchedFacts): WebSource[] {
  const cited = citations(text);
  const sources = research.sources.filter(({ n }) => cited.has(n));
  if (sources.length !== cited.size) throw new ChatError("ungrounded_answer", "The answer cited sources the research does not have. Please retry.");
  return sources;
}

export function hydrateAnswer(answer: z.infer<typeof answerRecipeSchema>, evidence: ReadonlyMap<string, ChatEvidence>, model: string, receipts: ChatResponse["tools"]): ChatResponse {
  // Nemotron often quotes a researched company's research without citing its resultId. With exactly one researched
  // company in play, that is the result it means; its [n] are still checked against that research's sources.
  const researchIds = [...evidence].flatMap(([id, result]) => ("kind" in result && result.kind === "researched_supplier" ? [id] : []));
  const uncited = answer.resultId === null || !evidence.has(answer.resultId);
  // Without a web search there is no web context: text Nemotron put in webText belongs to the answer itself.
  const merged = !webContextIn(evidence) && answer.webText !== null ? { ...answer, text: `${answer.text}\n\n${answer.webText}`, webText: null } : answer;
  const recipe = uncited && researchIds.length === 1 ? { ...merged, resultId: researchIds[0] ?? null } : merged;
  const cited = recipe.resultId === null ? undefined : evidence.get(recipe.resultId);
  const research = cited && "kind" in cited && cited.kind === "researched_supplier" ? cited : null;
  // About a researched company the text cites that company's sources; everywhere else [n] means a web source.
  const webContext = citedWebContext(recipe.webText, citations(research ? recipe.webText : `${recipe.text}\n${recipe.webText ?? ""}`), evidence);
  // The dataset block always rests on dataset evidence; web text only adds general context to it.
  if (webContext && (cited === undefined || cited === webContextIn(evidence))) {
    throw new ChatError("ungrounded_answer", "The answer did not cite its dataset facts next to the web context. Please retry.");
  }
  const researchSources = research ? citedResearchSources(recipe.text, research) : [];
  return chatResponseSchema.parse({ ...hydrateDatasetAnswer(recipe, evidence, model, receipts), webContext, researchSources });
}

function hydrateDatasetAnswer(recipe: z.infer<typeof answerRecipeSchema>, evidence: ReadonlyMap<string, ChatEvidence>, model: string, receipts: ChatResponse["tools"]): ChatResponse {
  if (recipe.resultId === null) {
    if (recipe.supplierIds.length || recipe.metricKeys.length || evidence.size) throw new ChatError("ungrounded_answer", "The answer did not reference its supplier data. Please retry.");
    return chatResponseSchema.parse({
      answer: "I can filter, rank and compare up to 20 anonymized suppliers, explain their risk scores, suggest which risk criteria matter most for train seats, add web context about a risk driver, and answer about real companies you researched with the \"+\" under the top 20. Component qualifications are not available here.",
      model, view: null, lastView: null, tools: receipts,
    });
  }
  const result = evidence.get(recipe.resultId);
  // Seat priorities and explanations are prose about the page; supplier cards only come from dataset rows.
  if (result && !("rows" in result)) {
    // A researched company has no SUPP id to name, and prose shows no cards, so its supplierIds carry nothing.
    const researched = "kind" in result && (result.kind === "researched_supplier" || result.kind === "researched_missing");
    const named = coveredSuppliers(result).map(({ id }) => id);
    if (!researched && recipe.supplierIds.some((id) => !named.includes(id))) throw new ChatError("ungrounded_answer", "The answer named suppliers its explanation does not cover. Please retry.");
    return chatResponseSchema.parse({ answer: recipe.text, model, view: null, lastView: null, tools: receipts, ...("runCount" in result && { seatCriteria: result }) });
  }
  if (!result || new Set(recipe.supplierIds).size !== recipe.supplierIds.length
    || new Set(recipe.metricKeys).size !== recipe.metricKeys.length
    || recipe.supplierIds.some((id) => !result.rows.some((row) => row.id === id))
    || recipe.metricKeys.some((key) => !result.metricKeys.includes(key))) {
    throw new ChatError("ungrounded_answer", "The answer referenced unverified supplier data. Please retry.");
  }
  if (!result.rows.length) return chatResponseSchema.parse({ answer: recipe.text, model, view: null, lastView: null, tools: receipts });
  // Nemotron sometimes leaves the arrays empty; the cards then show the whole cited result.
  const supplierIds = recipe.supplierIds.length ? recipe.supplierIds : result.rows.map(({ id }) => id);
  const metricKeys = recipe.metricKeys.length ? recipe.metricKeys : result.metricKeys;
  const suppliers = result.rows.filter((row) => supplierIds.includes(row.id)).map((row) => ({
    ...row, values: row.values.filter(({ metric }) => metricKeys.includes(metric)),
  }));
  return chatResponseSchema.parse({
    answer: recipe.text, model, tools: receipts,
    view: receipts.some(({ name, status }) => name === "rerank_seat_priorities" && status === "ok") ? null : {
      kind: suppliers.length === 1 ? "profile" : result.sort ? "ranking" : "comparison",
      suppliers, metrics: metricKeys.map((key) => metricDefinitions.find((metric) => metric.key === key)),
      matchedCount: result.matchedCount, source: result.source, sort: result.sort },
    lastView: { supplierIds: suppliers.map(({ id }) => id), metricKeys },
  });
}
