import { TOTAL_RISK_WEIGHTS } from "@/lib/suppliers/criteria";
import { loadDatasetSuppliers } from "@/lib/suppliers/dataset";
import { buildProfile, parseComponent } from "@/lib/suppliers/profiles";
import { rankSuppliers } from "@/lib/suppliers/scoring";
import { BoardView } from "./board-view";
import { toBoardRow } from "./board-rows";

const LEADERBOARD_SIZE = 100;

export async function SupplierBoard({ component }: { component: unknown }) {
  const profile = buildProfile(parseComponent(component));
  const loaded = await loadDatasetSuppliers().then(
    (suppliers) => ({ suppliers }),
    (error: unknown) => ({
      error: error instanceof Error ? error.message : "The supplier dataset could not be loaded.",
    }),
  );
  if ("error" in loaded) {
    return (
      <p role="alert" className="rounded-lg border border-[var(--risk-critical)] p-6 text-sm">
        {loaded.error}
      </p>
    );
  }

  const ranked = rankSuppliers(loaded.suppliers, profile.weights);
  const defaultRanks =
    profile.boosts.length > 0
      ? new Map(rankSuppliers(loaded.suppliers, TOTAL_RISK_WEIGHTS).map((entry) => [entry.supplier.id, entry.rank]))
      : null;
  const context = { ranked, weights: profile.weights, defaultRanks };

  return (
    <BoardView
      key={profile.component}
      profile={profile}
      rows={ranked.slice(0, LEADERBOARD_SIZE).map((entry) => toBoardRow(entry, context, true))}
      supplierCount={loaded.suppliers.length}
    />
  );
}
