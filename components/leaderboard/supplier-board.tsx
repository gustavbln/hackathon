import { TOTAL_RISK_WEIGHTS } from "@/lib/suppliers/criteria";
import { loadDatasetSuppliers } from "@/lib/suppliers/dataset";
import { buildProfile, parseComponent } from "@/lib/suppliers/profiles";
import { findAlternatives, rankSuppliers, type RankedSupplier } from "@/lib/suppliers/scoring";
import { BoardView, type BoardRow } from "./board-view";

const LEADERBOARD_SIZE = 100;
const ALTERNATIVE_COUNT = 3;

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

  const toRow = ({ supplier, rank, risk }: RankedSupplier, withAlternatives: boolean): BoardRow => {
    const found = withAlternatives ? findAlternatives(supplier, ranked, profile.weights, ALTERNATIVE_COUNT) : null;
    return {
      id: supplier.id,
      name: supplier.name,
      origin: supplier.origin,
      rank,
      risk: Math.round(risk.worst * 10) / 10,
      rankChange: defaultRanks ? (defaultRanks.get(supplier.id) ?? rank) - rank : null,
      scores: supplier.scores,
      alternatives: found && {
        driver: found.driver,
        kind: found.kind,
        rows: found.alternatives.map((entry) => toRow(entry, false)),
      },
    };
  };

  return (
    <BoardView
      key={profile.component}
      profile={profile}
      rows={ranked.slice(0, LEADERBOARD_SIZE).map((entry) => toRow(entry, true))}
      supplierCount={loaded.suppliers.length}
    />
  );
}
