import { z } from "zod";
import { CRITERIA, type CriterionKey } from "./criteria.ts";

const riskLabels: Partial<Record<CriterionKey, string>> = {
  workplaceSafety: "Workplace safety incident risk",
  creditRating: "Credit risk",
};

export const riskDefinitions = CRITERIA.map(({ key, column, label, weight }) =>
  [column, riskLabels[key] ?? `${label} risk`, weight * 100] as const,
);

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
export const metricsSchema = z.array(metricKeySchema).min(1).max(24).refine((keys) => new Set(keys).size === keys.length, "Duplicate metrics");
export const idsSchema = z.array(supplierIdSchema).min(1).max(20).refine((ids) => new Set(ids).size === ids.length, "Duplicate supplier IDs");

export const datasetSupplierSchema = z.object({
  id: supplierIdSchema,
  name: z.string().trim().min(1).max(200),
  metrics: z.record(metricKeySchema, z.number().finite()),
  sourcingRisk: z.enum(["Low", "Medium", "High"]),
  complexity: z.enum(["Simple", "Moderate", "Complex"]),
});
export type DatasetSupplier = z.infer<typeof datasetSupplierSchema>;

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
