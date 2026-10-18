import "server-only";
import { loadSuppliers } from "../suppliers.ts";
import { CRITERIA } from "./criteria.ts";
import type { Scores, Supplier } from "./types.ts";

/** The dataset rows from the shared, validated loader, keyed by criterion for scoring. */
export async function loadDatasetSuppliers(): Promise<Supplier[]> {
  const { rows } = await loadSuppliers();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    origin: "dataset",
    scores: Object.fromEntries(CRITERIA.map(({ key, column }) => [key, row.metrics[column]])) as Scores,
  }));
}
