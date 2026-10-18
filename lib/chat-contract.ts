import { z } from "zod";
import { researchedIdSchema } from "./research/contract.ts";
import { CRITERIA } from "./suppliers/criteria.ts";
import { seatCriteriaResponseSchema } from "./seat-criteria-contract.ts";
import { shortlistInstructionSchema } from "./seat-shortlist-contract.ts";
import {
  datasetResultSchema, idsSchema, metricKeySchema, metricsSchema, supplierFactsSchema, supplierIdSchema,
} from "./suppliers/contract.ts";

export {
  riskDefinitions, metricDefinitions, metricKeySchema, supplierIdSchema, riskLevelSchema, defaultMetrics,
  querySuppliersSchema, getSuppliersSchema, supplierFactsSchema, datasetResultSchema,
  type MetricKey, type SupplierFacts, type DatasetResult,
} from "./suppliers/contract.ts";
export { ChatError } from "./errors.ts";

export const lastViewSchema = z.strictObject({ supplierIds: idsSchema, metricKeys: metricsSchema });
const criterionKeySchema = z.enum(CRITERIA.map(({ key }) => key));
const seatIdSchema = z.string().regex(/^\d{1,2}[A-Z]$/);
const weightsSchema = z.record(criterionKeySchema, z.number().min(0).max(1))
  .refine((weights) => Object.values(weights).some((weight) => weight > 0), "At least one weight must be positive");

/**
 * The page the buyer is on. Pages send only ids and the buyer's own inputs (the weights); the server loads every
 * fact again from these, so nothing on screen is trusted as evidence.
 */
export const pageContextSchema = z.discriminatedUnion("page", [
  z.strictObject({ page: z.literal("seat"), seatId: seatIdSchema, weights: weightsSchema, instruction: z.string().trim().max(300).nullable() }),
  z.strictObject({ page: z.literal("driver"), driverKey: criterionKeySchema, seatId: seatIdSchema.nullable(), weights: weightsSchema }),
  z.strictObject({ page: z.literal("supplier"), supplierId: supplierIdSchema, seatId: seatIdSchema.nullable(), weights: weightsSchema }),
  /** A real company the agents researched from public sources; not part of the anonymized dataset. */
  z.strictObject({ page: z.literal("researched"), supplierId: researchedIdSchema, seatId: seatIdSchema.nullable(), weights: weightsSchema }),
]);
export type PageContext = z.infer<typeof pageContextSchema>;

/** What the assistant may change on the page. Only tool code creates actions; the page on screen applies them. */
export const pageActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("set_weights"), weights: weightsSchema, instruction: z.string().trim().max(300).nullable() }),
  z.strictObject({ type: z.literal("highlight_driver"), driverKey: criterionKeySchema }),
  z.strictObject({ type: z.literal("open_supplier"), supplierId: supplierIdSchema }),
  /** The research agents saved a new real company; pages that list researched suppliers load them again. */
  z.strictObject({ type: z.literal("supplier_added"), supplierId: researchedIdSchema }),
]);
export type PageAction = z.infer<typeof pageActionSchema>;
export const nextSeatSuppliersSchema = z.strictObject({
  offset: z.number().int().min(0).max(500).default(20),
  limit: z.number().int().min(1).max(20).default(10),
});
export const rerankSeatSchema = z.strictObject({ instruction: shortlistInstructionSchema });
export const explainSupplierSchema = z.strictObject({
  supplierId: supplierIdSchema,
  /** The page opens the first alternative; only when the buyer asked to see one. */
  openAlternative: z.boolean().default(false),
});
export const explainDriverSchema = z.strictObject({ driverKey: criterionKeySchema });
/** A researched company by its EXT_ id or its name, with or without legal form. */
export const researchedSupplierQuerySchema = z.strictObject({ supplier: z.string().trim().min(2).max(120) });
/** Web context for one risk driver. Queries are guarded on the server against naming dataset suppliers. */
export const searchContextSchema = z.strictObject({
  driverKey: criterionKeySchema,
  queries: z.array(z.string().trim().min(3).max(120)).min(1).max(2),
});
export const chatRequestSchema = z.strictObject({
  message: z.string().trim().min(1).max(4_000),
  history: z.array(z.strictObject({ role: z.enum(["user", "assistant"]), content: z.string().max(2_000) })).max(12).default([]),
  selectedIds: z.array(supplierIdSchema).max(20).default([]),
  lastView: lastViewSchema.optional(),
  page: pageContextSchema.optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const answerRecipeSchema = z.strictObject({
  text: z.string().trim().min(1).max(2_000),
  resultId: z.string().max(200).nullable(),
  supplierIds: z.array(supplierIdSchema).max(20),
  metricKeys: z.array(metricKeySchema).max(24),
  /** General web context, citing search_context sources as [n]; null without web sources. */
  webText: z.string().trim().min(1).max(1_500).nullable().default(null),
});
/** A web source the answer cites as [n]; title, URL and date come from Tavily, the quote is checked against its text. */
export const webSourceSchema = z.object({
  n: z.number().int().positive(),
  title: z.string(),
  url: z.url({ protocol: /^https?$/ }),
  domain: z.string(),
  publishedDate: z.string().nullable(),
  quote: z.string().max(400),
});
export type WebSource = z.infer<typeof webSourceSchema>;
export const chatResponseSchema = z.object({
  answer: z.string(),
  model: z.string(),
  view: z.object({
    kind: z.enum(["profile", "comparison", "ranking"]),
    suppliers: z.array(supplierFactsSchema).min(1).max(20),
    metrics: z.array(z.object({ key: metricKeySchema, label: z.string(), unit: z.string(), direction: z.string(), weight: z.number().nullable() })),
    matchedCount: z.number().int().nonnegative(),
    source: datasetResultSchema.shape.source,
    sort: datasetResultSchema.shape.sort,
  }).nullable(),
  lastView: lastViewSchema.nullable(),
  tools: z.array(z.object({ name: z.string(), status: z.enum(["ok", "error"]), resultId: z.string() })),
  seatCriteria: seatCriteriaResponseSchema.optional(),
  /** Changes for the page on screen, e.g. new weights after the buyer re-ranked through the chat. */
  actions: z.array(pageActionSchema).default([]),
  /** General context from the web, labelled apart from the dataset answer; never about a dataset supplier. */
  webContext: z.object({ text: z.string(), sources: z.array(webSourceSchema).min(1) }).nullable().default(null),
  /** The researched company's sources the answer cites as [n]; about that company, from public research. */
  researchSources: z.array(webSourceSchema).default([]),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;

/** One Nemotron call, priced from the usage Nebius reported. */
export const modelCallSchema = z.object({
  model: z.string(),
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  reasoningTokens: z.number().int().min(0),
  costUsd: z.number().min(0),
});
export type ModelCall = z.infer<typeof modelCallSchema>;

/** One line of the live trace. It arrives as "running", then again under the same id as "done" or "error". */
export const chatStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Where the step gets its facts; model steps name their models through `calls`. */
  source: z.enum(["dataset", "research", "tavily", "nemotron"]),
  status: z.enum(["running", "done", "error"]),
  ms: z.number().int().min(0).nullable(),
  calls: z.array(modelCallSchema),
  /** Tavily credits spent; cached searches cost none. */
  credits: z.number().int().min(0),
});
export type ChatStep = z.infer<typeof chatStepSchema>;

/** What `POST /api/chat` streams, one Server-Sent Event each: steps, then the whole validated answer or an error. */
export const chatEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("step"), step: chatStepSchema }),
  z.object({ type: z.literal("done"), response: chatResponseSchema }),
  z.object({ type: z.literal("error"), error: z.object({ code: z.string(), message: z.string() }) }),
]);
export type ChatEvent = z.infer<typeof chatEventSchema>;
