import { TOTAL_RISK_WEIGHTS } from "@/lib/suppliers/criteria";
import { loadDatasetSuppliers } from "@/lib/suppliers/dataset";
import { buildProfile, parseComponent, parseTrainType } from "@/lib/suppliers/profiles";
import { rankSuppliers } from "@/lib/suppliers/scoring";
import { BoardView, type BoardRow } from "./board-view";

const LEADERBOARD_SIZE = 100;

interface SupplierBoardProps {
  component: unknown;
  trainType: unknown;
}

export async function SupplierBoard({ component, trainType }: SupplierBoardProps) {
  const profile = buildProfile(parseComponent(component), parseTrainType(trainType));
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

  const rows: BoardRow[] = ranked.slice(0, LEADERBOARD_SIZE).map(({ supplier, rank, risk }) => ({
    id: supplier.id,
    name: supplier.name,
    origin: supplier.origin,
    rank,
    risk: Math.round(risk.worst * 10) / 10,
    rankChange: defaultRanks ? (defaultRanks.get(supplier.id) ?? rank) - rank : null,
    scores: supplier.scores,
  }));

  return <BoardView profile={profile} rows={rows} supplierCount={loaded.suppliers.length} />;
}
