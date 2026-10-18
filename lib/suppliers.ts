import "server-only";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import {
  ChatError, riskDefinitions, metricDefinitions, metricKeySchema, riskLevelSchema,
  supplierIdSchema, querySuppliersSchema, getSuppliersSchema, datasetResultSchema,
  type MetricKey, type SupplierFacts,
} from "./chat-contract.ts";

const supplierSchema = z.object({
  id: supplierIdSchema,
  name: z.string().trim().min(1).max(200),
  metrics: z.record(metricKeySchema, z.number().finite()),
  sourcingRisk: z.enum(["Low", "Medium", "High"]),
  complexity: z.enum(["Simple", "Moderate", "Complex"]),
});
export type Supplier = z.infer<typeof supplierSchema>;
export function riskLevel(value: number) {
  return riskLevelSchema.parse(value < 25 ? "Low" : value < 50 ? "Medium" : value < 75 ? "High" : "Critical");
}
export function weightedRisk(supplier: Supplier) {
  const hundredths = riskDefinitions.reduce((total, [key, , weight]) => total + supplier.metrics[key] * weight, 0);
  const floor = Math.floor(hundredths / 100);
  const remainder = hundredths % 100;
  return floor + (remainder > 50 || (remainder === 50 && floor % 2 === 1) ? 1 : 0);
}
export function parseSupplierCsv(content: string): Supplier[] {
  const raw: unknown = parse(content, { columns: true, skip_empty_lines: true, bom: true });
  const rows = z.array(z.record(z.string(), z.string())).min(1).parse(raw);
  const ids = new Set<string>();
  return rows.map((row) => {
    const values = Object.fromEntries(metricDefinitions.filter(({ key }) => key !== "criticalRiskCount").map(({ key, unit }) => {
      const number = z.string().trim().min(1).pipe(z.coerce.number<string>().finite().nonnegative()).parse(row[key]);
      if (unit !== "EUR" && number > 100) throw new Error("Invalid metric range");
      return [key, number];
    }));
    values.criticalRiskCount = riskDefinitions.filter(([key]) => (values[key] ?? 0) >= 75).length;
    const supplier = supplierSchema.parse({
      id: row.supplierID, name: row["Supplier Name"], metrics: values,
      sourcingRisk: row["Sourcing Risk Level"], complexity: row["Supply Chain Complexity"],
    });
    if (ids.has(supplier.id)) throw new Error("Duplicate supplier ID");
    ids.add(supplier.id);
    for (const key of [...riskDefinitions.map(([key]) => key), "Total_Risk_Index"] as const) {
      if (riskLevel(supplier.metrics[key]) !== riskLevelSchema.parse(row[`${key}_Level`])) throw new Error("Invalid risk level");
    }
    return supplier;
  });
}

type Dataset = { rows: Supplier[]; source: { name: "supplier_risk_dataset.csv"; version: string } };
let dataset: Promise<Dataset> | undefined;
export function loadSuppliers(): Promise<Dataset> {
  dataset ??= readFile(join(process.cwd(), "data/supplier_risk_dataset.csv"), "utf8").then((content) => ({
    rows: parseSupplierCsv(content),
    source: { name: "supplier_risk_dataset.csv" as const, version: createHash("sha256").update(content).digest("hex").slice(0, 16) },
  })).catch(() => {
    dataset = undefined;
    throw new ChatError("dataset_unavailable", "Supplier data is missing or invalid. Check data/supplier_risk_dataset.csv.", 503);
  });
  return dataset;
}
export function supplierFacts(supplier: Supplier, metrics: MetricKey[]): SupplierFacts {
  return {
    id: supplier.id, name: supplier.name, sourcingRisk: supplier.sourcingRisk, complexity: supplier.complexity,
    values: metrics.map((metric) => {
      const definition = metricDefinitions.find(({ key }) => key === metric);
      const value = supplier.metrics[metric];
      return {
        metric, value,
        level: metric.endsWith("_Score") || metric === "Total_Risk_Index" ? riskLevel(value) : null,
        contribution: definition?.weight ? value * definition.weight / 100 : null,
      };
    }),
  };
}
export function filterAndRankSuppliers(rows: Supplier[], input: unknown) {
  const query = querySuppliersSchema.parse(input);
  const matches = rows.filter((row) => (!query.ids || query.ids.includes(row.id))
    && (!query.sourcingRisk || row.sourcingRisk === query.sourcingRisk)
    && (!query.complexity || row.complexity === query.complexity)
    && query.filters.every(({ metric, operator, value }) => {
      const actual = row.metrics[metric];
      switch (operator) {
        case "eq": return actual === value;
        case "lt": return actual < value;
        case "lte": return actual <= value;
        case "gt": return actual > value;
        case "gte": return actual >= value;
      }
    }));
  matches.sort((a, b) => {
    const delta = a.metrics[query.sort.metric] - b.metrics[query.sort.metric];
    return (query.sort.direction === "asc" ? delta : -delta) || a.id.localeCompare(b.id);
  });
  return { rows: matches.slice(0, query.limit).map((row) => supplierFacts(row, query.metrics)), matchedCount: matches.length, query };
}
export async function querySuppliers(input: unknown) {
  const { rows, source } = await loadSuppliers();
  const result = filterAndRankSuppliers(rows, input);
  return datasetResultSchema.parse({
    source, rows: result.rows, matchedCount: result.matchedCount, metricKeys: result.query.metrics,
    missingIds: result.query.ids?.filter((id) => !rows.some((row) => row.id === id)) ?? [], sort: result.query.sort,
  });
}
export async function getSuppliers(input: unknown) {
  const args = getSuppliersSchema.parse(input);
  const { rows, source } = await loadSuppliers();
  const found = args.ids.flatMap((id) => {
    const row = rows.find((row) => row.id === id);
    return row ? [supplierFacts(row, args.metrics)] : [];
  });
  return datasetResultSchema.parse({ source, rows: found, matchedCount: found.length, metricKeys: args.metrics,
    missingIds: args.ids.filter((id) => !found.some((row) => row.id === id)), sort: null });
}
