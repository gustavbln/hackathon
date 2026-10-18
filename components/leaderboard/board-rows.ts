import type { Weights } from "@/lib/suppliers/criteria";
import { findAlternatives, type RankedSupplier } from "@/lib/suppliers/scoring";
import type { BoardRow } from "./board-view";

const ALTERNATIVE_COUNT = 3;

interface RowContext {
  /** All suppliers ranked with `weights`, lowest risk first. */
  ranked: readonly RankedSupplier[];
  weights: Weights;
  /** Ranks under the dataset's default weighting, to show who moved; null when not compared. */
  defaultRanks: ReadonlyMap<string, number> | null;
}

/** One ranked supplier as the board shows it, optionally with its alternative risk profiles. */
export function toBoardRow(entry: RankedSupplier, context: RowContext, withAlternatives: boolean): BoardRow {
  const { supplier, rank, risk } = entry;
  const found = withAlternatives ? findAlternatives(supplier, context.ranked, context.weights, ALTERNATIVE_COUNT) : null;
  return {
    id: supplier.id,
    name: supplier.name,
    origin: supplier.origin,
    rank,
    risk: Math.round(risk.worst * 10) / 10,
    rankChange: context.defaultRanks ? (context.defaultRanks.get(supplier.id) ?? rank) - rank : null,
    scores: supplier.scores,
    alternatives: found && {
      driver: found.driver,
      kind: found.kind,
      rows: found.alternatives.map((alternative) => toBoardRow(alternative, context, false)),
    },
  };
}
