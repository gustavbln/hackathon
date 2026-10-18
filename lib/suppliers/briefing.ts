import { CRITERIA, CRITERION_BY_KEY, riskLevel, type CriterionKey, type Weights } from "./criteria.ts";
import type { SupplierScoreMatrix } from "./score-matrix.ts";
import type { Scores } from "./types.ts";

export interface HiddenRisk {
  id: string;
  criterion: CriterionKey;
  score: number;
}

export interface SeatBriefing {
  top: { id: string; name: string; risk: number; scores: Scores } | null;
  /** Shortlisted suppliers whose worst single score is Critical, worst first. */
  hidden: HiddenRisk[];
  priorities: { key: CriterionKey; label: string; percent: number }[];
  shortlistSize: number;
  supplierCount: number;
}

/** What Gauge opens with for a seat: the top pick, Critical scores hiding in the shortlist, the heaviest priorities. */
export function buildBriefing(matrix: SupplierScoreMatrix, weights: Weights, supplierIds: readonly string[]): SeatBriefing {
  const rowById = new Map(matrix.ids.map((id, row) => [id, row]));
  const scoresOf = (row: number) =>
    Object.fromEntries(matrix.keys.map((key, column) => [key, matrix.scores[row * matrix.keys.length + column] ?? null])) as Scores;

  const rows = supplierIds.flatMap((id) => {
    const row = rowById.get(id);
    return row === undefined ? [] : [{ id, row, scores: scoresOf(row) }];
  });

  const hidden = rows.flatMap(({ id, scores }) => {
    const [criterion, score] = Object.entries(scores)
      .flatMap(([key, value]) => (value === null ? [] : [[key as CriterionKey, value] as const]))
      .sort((a, b) => b[1] - a[1])[0] ?? [];
    return criterion !== undefined && score !== undefined && riskLevel(score) === "critical" ? [{ id, criterion, score }] : [];
  }).sort((a, b) => b.score - a.score);

  const first = rows[0];
  const top = first
    ? {
        id: first.id,
        name: matrix.names[first.row] ?? first.id,
        risk: CRITERIA.reduce((sum, { key }) => sum + weights[key] * (first.scores[key] ?? 100), 0),
        scores: first.scores,
      }
    : null;

  const priorities = CRITERIA.map(({ key }) => ({ key, label: CRITERION_BY_KEY[key].label, percent: weights[key] * 100 }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3);

  return { top, hidden, priorities, shortlistSize: rows.length, supplierCount: matrix.ids.length };
}
