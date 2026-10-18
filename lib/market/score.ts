import {
  COMPONENT_KEYS,
  CRITICAL_EVENTS,
  MODEL_VERSION,
  type Assessment,
  type ComponentKey,
  type FinancialEvent,
  type FinancialStatement,
  type MetricKey,
} from "./model.ts";

/** Statements older than this before the assessment date only count as historic. */
const MAX_AGE_MONTHS = 24;

/**
 * The four equally weighted screening components (spec §8): a ratio at or above `zeroAt` scores 0
 * risk points, at or above `fiftyAt` 50, below it 100. A simple hackathon heuristic, not calibrated
 * on defaults.
 */
const COMPONENTS: Record<ComponentKey, { numerator: MetricKey; denominator: MetricKey; zeroAt: number; fiftyAt: number }> = {
  liquidity: { numerator: "currentAssets", denominator: "currentLiabilities", zeroAt: 1.5, fiftyAt: 1 },
  equity: { numerator: "equity", denominator: "totalAssets", zeroAt: 0.3, fiftyAt: 0.15 },
  profitability: { numerator: "netIncome", denominator: "revenue", zeroAt: 0.05, fiftyAt: 0 },
  cashFlow: { numerator: "operatingCashFlow", denominator: "revenue", zeroAt: 0.05, fiftyAt: 0 },
};

type Component = Assessment["components"][ComponentKey];

export function scoreComponent(key: ComponentKey, metrics: FinancialStatement["metrics"]): Component {
  const { numerator, denominator, zeroAt, fiftyAt } = COMPONENTS[key];
  const top = metrics[numerator]?.value;
  const bottom = metrics[denominator]?.value;
  const missing = [numerator, denominator].filter((metric) => metrics[metric] === undefined);
  if (top === undefined || bottom === undefined) return { ratio: null, points: null, missing, note: null };
  if (bottom <= 0) {
    return { ratio: null, points: null, missing: [], note: `${denominator} is not positive, so the ratio is not meaningful` };
  }
  const ratio = top / bottom;
  return { ratio, points: ratio >= zeroAt ? 0 : ratio >= fiftyAt ? 50 : 100, missing: [], note: null };
}

interface AssessInput {
  entityId: string;
  asOf: string;
  /** The newest suitable annual statement of the supplier's own reporting unit, if any. */
  statement: FinancialStatement | null;
  events: FinancialEvent[];
  groupHint: string | null;
  openQuestions: string[];
}

export function assess({ entityId, asOf, statement, events, groupHint, openQuestions }: AssessInput): Assessment {
  const components = Object.fromEntries(
    COMPONENT_KEYS.map((key) => [key, scoreComponent(key, statement?.metrics ?? {})]),
  ) as Assessment["components"];
  const points = COMPONENT_KEYS.map((key) => components[key].points);
  const computable = points.filter((value) => value !== null);
  const historic = statement !== null && isOlderThan(statement.fiscalYearEnd, asOf, MAX_AGE_MONTHS);
  const score = !historic && computable.length === COMPONENT_KEYS.length ? computable.reduce<number>((sum, value) => sum + value, 0) / 4 : null;

  return {
    modelVersion: MODEL_VERSION,
    asOf,
    entityId,
    statementId: statement?.id ?? null,
    components,
    coverage: (computable.length / COMPONENT_KEYS.length) * 100,
    score,
    level: score === null ? null : score < 25 ? "low" : score < 50 ? "medium" : score < 75 ? "high" : "very_high",
    historic,
    criticalEventIds: events
      .filter(
        (event) =>
          event.entityId === entityId &&
          event.status === "ongoing" &&
          (CRITICAL_EVENTS as readonly string[]).includes(event.kind),
      )
      .map((event) => event.id),
    groupHint,
    openQuestions,
  };
}

function isOlderThan(fiscalYearEnd: string, asOf: string, months: number): boolean {
  const cutoff = new Date(`${asOf}T00:00:00Z`);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return new Date(`${fiscalYearEnd}T00:00:00Z`) < cutoff;
}
