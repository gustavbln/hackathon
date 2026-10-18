import type {
  Assessment,
  ComponentKey,
  EVENT_KINDS,
  MetricKey,
  MODEL_ROLES,
  RELATIONSHIP_TYPES,
  ResearchRun,
  STEP_IDS,
} from "@/lib/market/model";

export type StepId = (typeof STEP_IDS)[number];
export type ModelRole = (typeof MODEL_ROLES)[number];
export type EventKind = (typeof EVENT_KINDS)[number];
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
export type ScoreLevel = NonNullable<Assessment["level"]>;

export const STEP_LABEL: Record<StepId, string> = {
  resolve: "Identify the legal entity",
  group: "Map the company group",
  research: "Search public sources",
  deepen: "Follow up on leads",
  judge: "Check contested claims",
  read: "Read the annual report",
  score: "Compute the screening score",
};

export const ROLE_LABEL: Record<ModelRole, string> = {
  triage: "Triage",
  planner: "Follow-up planner",
  judge: "Judge",
  reader: "Statement readers",
};

export const METRIC_LABEL: Record<MetricKey, string> = {
  revenue: "Revenue",
  netIncome: "Net income",
  currentAssets: "Current assets",
  currentLiabilities: "Current liabilities",
  equity: "Equity",
  totalAssets: "Total assets",
  operatingCashFlow: "Operating cash flow",
};

export const COMPONENT_LABEL: Record<ComponentKey, string> = {
  liquidity: "Liquidity",
  equity: "Equity ratio",
  profitability: "Profitability",
  cashFlow: "Cash flow",
};

export const LEVEL_LABEL: Record<ScoreLevel, string> = {
  low: "Low ratio warnings",
  medium: "Medium ratio warnings",
  high: "High ratio warnings",
  very_high: "Very high ratio warnings",
};

export const LEVEL_COLOR: Record<ScoreLevel, string> = {
  low: "var(--risk-low)",
  medium: "var(--risk-medium)",
  high: "var(--risk-high)",
  very_high: "var(--risk-critical)",
};

export const EVENT_LABEL: Record<EventKind, string> = {
  insolvency: "Insolvency",
  going_concern_doubt: "Going-concern doubt",
  payment_default: "Payment default",
  covenant_breach: "Covenant breach",
  financing_gap: "Financing gap",
  restructuring: "Restructuring",
  loss: "Loss",
  profit_warning: "Profit warning",
  site_closure: "Site closure",
  refinancing: "Refinancing",
  capital_injection: "Capital injection",
  recovery: "Recovery",
};

/** Events that speak for the supplier (spec §5B counter-evidence). */
export const COUNTER_EVENTS: readonly EventKind[] = ["refinancing", "capital_injection", "recovery"];

export const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  ownership: "Ownership",
  joint_venture: "Joint venture",
  license: "Licence",
  management: "Management",
  cooperation: "Cooperation",
};

export const STOP_REASON_LABEL: Record<ResearchRun["stopReason"], string> = {
  checklist_complete: "Checklist complete",
  budget_exhausted: "Budget used up",
  needs_choice: "Needs your choice",
  error: "Stopped by an error",
};

/** "nvidia/Nemotron-3_5-Lightning" → "Nemotron 3.5 Lightning"; parameter counts like "550b" are dropped. */
export function modelName(model: string): string {
  const name = model.split("/").pop() ?? model;
  return name
    .replaceAll("_", ".")
    .split("-")
    .filter((part) => !/^a?\d+b$/i.test(part))
    .join(" ");
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** ISO dates from the contract are calendar days, so they are shown in UTC. */
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(isoDate.length === 10 ? `${isoDate}T00:00:00Z` : isoDate));
}

export function formatDateTime(isoDateTime: string): string {
  return dateTimeFormat.format(new Date(isoDateTime));
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}
