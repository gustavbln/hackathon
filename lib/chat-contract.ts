import { z } from "zod";
import { CRITERIA } from "./suppliers/criteria.ts";
import { seatCriteriaResponseSchema } from "./seat-criteria-contract.ts";
import { shortlistInstructionSchema } from "./seat-shortlist-contract.ts";

export const riskDefinitions = [
  ["Financial_Health_Score", "Financial health risk", 10],
  ["Operational_Resilience_Score", "Operational resilience risk", 10],
  ["Quality_Risk_Score", "Quality risk", 10],
  ["Compliance_Risk_Score", "Compliance risk", 8],
  ["Sub_Tier_Visibility_Score", "Sub-tier visibility risk", 6],
  ["Safety_Incident_Score", "Workplace safety incident risk", 6],
  ["Credit_Rating_Score", "Credit risk", 6],
  ["ESG_Performance_Score", "ESG risk", 5],
  ["Governance_Risk_Score", "Governance risk", 5],
  ["Geopolitical_Risk_Score", "Geopolitical risk", 5],
  ["Industry_Benchmark_Score", "Industry benchmark risk", 4],
  ["Labor_Stability_Score", "Labor stability risk", 4],
  ["Environmental_Exposure_Score", "Environmental exposure risk", 4],
  ["Digital_Security_Score", "Digital security risk", 4],
  ["Political_Stability_Score", "Political stability risk", 4],
  ["Media_Sentiment_Score", "Media sentiment risk", 3],
  ["External_Intelligence_Score", "External intelligence risk", 3],
  ["Market_Sentiment_Score", "Market sentiment risk", 3],
] as const;

export const metricDefinitions = [
  ...riskDefinitions.map(([key, label, weight]) => ({ key, label, unit: "risk points", direction: "lower", weight })),
  { key: "Total_Risk_Index", label: "Overall risk", unit: "risk points", direction: "lower", weight: null },
  { key: "Supplier Delivery Rating", label: "Delivery rating", unit: "%", direction: "higher", weight: null },
  { key: "Order Confirmation Rate", label: "Order confirmation rate", unit: "%", direction: "higher", weight: null },
  { key: "Order Change Rate", label: "Order change rate", unit: "%", direction: "lower", weight: null },
  { key: "Purchase Order Volume (EUR)", label: "Existing purchase order exposure", unit: "EUR", direction: "context", weight: null },
  { key: "criticalRiskCount", label: "Critical risk categories", unit: "categories", direction: "lower", weight: null },
] as const;

export const metricKeySchema = z.enum(metricDefinitions.map((metric) => metric.key));
export type MetricKey = z.infer<typeof metricKeySchema>;
export const supplierIdSchema = z.string().regex(/^SUPP_\d{5}$/);
export const riskLevelSchema = z.enum(["Low", "Medium", "High", "Critical"]);
export const defaultMetrics: MetricKey[] = ["Total_Risk_Index", "Financial_Health_Score", "Quality_Risk_Score", "Supplier Delivery Rating"];
const metricsSchema = z.array(metricKeySchema).min(1).max(24).refine((keys) => new Set(keys).size === keys.length, "Duplicate metrics");
const idsSchema = z.array(supplierIdSchema).min(1).max(20).refine((ids) => new Set(ids).size === ids.length, "Duplicate supplier IDs");

export const querySuppliersSchema = z.strictObject({
  ids: idsSchema.optional(),
  filters: z.array(z.strictObject({
    metric: metricKeySchema,
    operator: z.enum(["eq", "lt", "lte", "gt", "gte"]),
    value: z.number().finite(),
  })).max(12).default([]),
  sourcingRisk: z.enum(["Low", "Medium", "High"]).optional(),
  complexity: z.enum(["Simple", "Moderate", "Complex"]).optional(),
  sort: z.strictObject({ metric: metricKeySchema, direction: z.enum(["asc", "desc"]) })
    .default({ metric: "Total_Risk_Index", direction: "asc" }),
  metrics: metricsSchema.default(defaultMetrics),
  limit: z.number().int().min(1).max(20).default(20),
});
export const getSuppliersSchema = z.strictObject({ ids: idsSchema, metrics: metricsSchema.default(defaultMetrics) });
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
]);
export type PageContext = z.infer<typeof pageContextSchema>;

/** What the assistant may change on the page. Only tool code creates actions; the page on screen applies them. */
export const pageActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("set_weights"), weights: weightsSchema, instruction: z.string().trim().max(300).nullable() }),
  z.strictObject({ type: z.literal("highlight_driver"), driverKey: criterionKeySchema }),
  z.strictObject({ type: z.literal("open_supplier"), supplierId: supplierIdSchema }),
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
export const chatRequestSchema = z.strictObject({
  message: z.string().trim().min(1).max(4_000),
  history: z.array(z.strictObject({ role: z.enum(["user", "assistant"]), content: z.string().max(2_000) })).max(12).default([]),
  selectedIds: z.array(supplierIdSchema).max(20).default([]),
  lastView: lastViewSchema.optional(),
  page: pageContextSchema.optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const supplierFactsSchema = z.object({
  id: supplierIdSchema,
  name: z.string(),
  values: z.array(z.object({
    metric: metricKeySchema,
    value: z.number().finite(),
    level: riskLevelSchema.nullable(),
    contribution: z.number().nullable(),
  })),
  sourcingRisk: z.enum(["Low", "Medium", "High"]),
  complexity: z.enum(["Simple", "Moderate", "Complex"]),
});
export type SupplierFacts = z.infer<typeof supplierFactsSchema>;
export const datasetResultSchema = z.object({
  source: z.object({ name: z.literal("supplier_risk_dataset.csv"), version: z.string() }),
  rows: z.array(supplierFactsSchema).max(20),
  matchedCount: z.number().int().nonnegative(),
  missingIds: z.array(supplierIdSchema),
  metricKeys: metricsSchema,
  sort: z.object({ metric: metricKeySchema, direction: z.enum(["asc", "desc"]) }).nullable(),
});
export type DatasetResult = z.infer<typeof datasetResultSchema>;
export const answerRecipeSchema = z.strictObject({
  text: z.string().trim().min(1).max(2_000),
  resultId: z.string().max(200).nullable(),
  supplierIds: z.array(supplierIdSchema).max(20),
  metricKeys: z.array(metricKeySchema).max(24),
});
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
  source: z.enum(["dataset", "tavily", "nemotron"]),
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

export class ChatError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "ChatError";
    this.code = code;
    this.status = status;
  }
}
