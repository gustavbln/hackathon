import { CRITERIA } from "@/lib/suppliers/criteria";
import { loadDatasetSuppliers } from "@/lib/suppliers/dataset";
import type { SupplierScoreMatrix } from "@/lib/suppliers/score-matrix";

/** Every dataset supplier's 18 scores as one flat matrix, so the browser can re-rank on every drag frame. */
export async function GET() {
  const suppliers = await loadDatasetSuppliers().catch(() => null);
  if (!suppliers) {
    return Response.json({ error: { message: "The supplier dataset is missing." } }, { status: 503 });
  }
  const body: SupplierScoreMatrix = {
    keys: CRITERIA.map(({ key }) => key),
    ids: suppliers.map(({ id }) => id),
    names: suppliers.map(({ name }) => name),
    scores: suppliers.flatMap(({ scores }) => CRITERIA.map(({ key }) => scores[key] ?? 0)),
  };
  return Response.json(body, { headers: { "Cache-Control": "private, max-age=3600" } });
}
