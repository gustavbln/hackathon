import { z } from "zod";

/** Version of the screening model in score.ts. Bump it whenever thresholds or weights change. */
export const MODEL_VERSION = "financial-screening-1";

const id = z.string().trim().min(1).max(120);
const date = z.iso.date();

export const EVIDENCE_STATUSES = ["confirmed", "contradictory", "insufficient"] as const;

export const evidenceSchema = z.strictObject({
  id,
  url: z.url(),
  title: z.string().trim().min(1).max(300),
  publisher: z.string().trim().min(1).max(200),
  retrievedAt: z.iso.datetime(),
  publishedAt: date.nullable(),
  /** Page, section or table inside the source. */
  locator: z.string().trim().min(1).max(200).nullable(),
  quote: z.string().trim().min(1).max(600),
  /** The company speaking about itself, as opposed to independent reporting. */
  companyStatement: z.boolean(),
  status: z.enum(EVIDENCE_STATUSES),
});

export const entitySchema = z.strictObject({
  id,
  legalName: z.string().trim().min(1).max(300),
  country: z.string().regex(/^[A-Z]{2}$/).nullable(),
  lei: z.string().regex(/^[A-Z0-9]{20}$/).nullable(),
  /** Register number and court, e.g. "HRB 27295, Amtsgericht Landshut". */
  registerId: z.string().trim().min(1).max(200).nullable(),
  website: z.url().nullable(),
  evidenceIds: z.array(id),
});

/** Only ownership and joint ventures make a company group; the others are shown, never merged. */
export const RELATIONSHIP_TYPES = ["ownership", "joint_venture", "license", "management", "cooperation"] as const;
export const GROUP_RELATIONSHIPS = ["ownership", "joint_venture"] as const;

export const relationshipSchema = z.strictObject({
  /** Parent, licensor or managing company. */
  fromId: id,
  toId: id,
  type: z.enum(RELATIONSHIP_TYPES),
  sharePercent: z.number().min(0).max(100).nullable(),
  /** An announced acquisition is not completed; only `current` relationships form a group. */
  status: z.enum(["current", "announced", "historic", "unconfirmed"]),
  evidenceIds: z.array(id),
});

export const METRIC_KEYS = [
  "revenue",
  "netIncome",
  "currentAssets",
  "currentLiabilities",
  "equity",
  "totalAssets",
  "operatingCashFlow",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

/** Metrics live inside their statement, so they share one reporting unit, period, currency and unit. */
export const financialStatementSchema = z.strictObject({
  id,
  entityId: id,
  scope: z.enum(["consolidated", "single"]),
  fiscalYearEnd: date,
  currency: z.string().regex(/^[A-Z]{3}$/),
  unit: z.enum(["units", "thousands", "millions"]),
  audited: z.boolean().nullable(),
  metrics: z.partialRecord(z.enum(METRIC_KEYS), z.strictObject({ value: z.number(), evidenceId: id })),
  evidenceIds: z.array(id),
});

export const EVENT_KINDS = [
  "insolvency",
  "going_concern_doubt",
  "payment_default",
  "covenant_breach",
  "financing_gap",
  "restructuring",
  "loss",
  "profit_warning",
  "site_closure",
  "refinancing",
  "capital_injection",
  "recovery",
] as const;
/** At the supplier itself these outrank a favourable score (spec §9). */
export const CRITICAL_EVENTS = ["insolvency", "going_concern_doubt"] as const;
/** Financial failures that count as incidents inside a company group. */
export const GROUP_INCIDENT_EVENTS = ["insolvency", "payment_default"] as const;

export const financialEventSchema = z.strictObject({
  id,
  entityId: id,
  kind: z.enum(EVENT_KINDS),
  eventDate: date.nullable(),
  publishedAt: date.nullable(),
  status: z.enum(["ongoing", "resolved", "historic", "unclear"]),
  summary: z.string().trim().min(1).max(400),
  evidenceIds: z.array(id).min(1),
});

export const COMPONENT_KEYS = ["liquidity", "equity", "profitability", "cashFlow"] as const;
export type ComponentKey = (typeof COMPONENT_KEYS)[number];

const componentSchema = z.strictObject({
  ratio: z.number().nullable(),
  points: z.union([z.literal(0), z.literal(50), z.literal(100)]).nullable(),
  missing: z.array(z.enum(METRIC_KEYS)),
  note: z.string().nullable(),
});

export const assessmentSchema = z.strictObject({
  modelVersion: z.string(),
  asOf: date,
  entityId: id,
  statementId: id.nullable(),
  components: z.strictObject({
    liquidity: componentSchema,
    equity: componentSchema,
    profitability: componentSchema,
    cashFlow: componentSchema,
  }),
  /** Share of computable components in percent: completeness, not truth or creditworthiness. */
  coverage: z.number().min(0).max(100),
  /** Only with all four components from a current statement; otherwise null, never an average. */
  score: z.number().min(0).max(100).nullable(),
  level: z.enum(["low", "medium", "high", "very_high"]).nullable(),
  /** The statement is older than 24 months before `asOf`. */
  historic: z.boolean(),
  criticalEventIds: z.array(id),
  groupHint: z.string().nullable(),
  openQuestions: z.array(z.string()),
});

export const STEP_IDS = ["resolve", "group", "research", "deepen", "judge", "read", "score"] as const;
export const MODEL_ROLES = ["triage", "planner", "judge", "reader"] as const;

export const researchInputSchema = z.strictObject({
  name: z.string().trim().min(2).max(120),
  website: z.url().nullable().default(null),
  country: z.string().regex(/^[A-Z]{2}$/).nullable().default(null),
  category: z.enum(["passenger", "driver_cab"]).nullable().default(null),
  asOf: date.nullable().default(null),
});

const usageSchema = z.strictObject({
  calls: z.number().int().min(0),
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  reasoningTokens: z.number().int().min(0),
  costUsd: z.number().min(0),
});

export const researchRunSchema = z.strictObject({
  id,
  input: researchInputSchema,
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime(),
  queries: z.array(z.strictObject({ tool: z.enum(["tavily_search", "tavily_extract", "gleif"]), query: z.string() })),
  openedSources: z.array(z.url()),
  failedSources: z.array(z.strictObject({ url: z.string(), reason: z.string() })),
  followUps: z.array(z.string()),
  stopReason: z.enum(["checklist_complete", "budget_exhausted", "needs_choice", "error"]),
  usage: z.partialRecord(z.enum(MODEL_ROLES), usageSchema),
  tavilyCredits: z.number().min(0),
});

export const researchReportSchema = z.strictObject({
  run: researchRunSchema,
  /** The supplier's legal entity, or null when the buyer still has to choose a candidate. */
  entityId: id.nullable(),
  candidates: z.array(entitySchema),
  entities: z.array(entitySchema),
  relationships: z.array(relationshipSchema),
  evidence: z.array(evidenceSchema),
  statements: z.array(financialStatementSchema),
  events: z.array(financialEventSchema),
  assessment: assessmentSchema.nullable(),
});

/** One line in the list of recorded runs, which double as the labelled cache (spec §6). */
export const researchRunSummarySchema = z.strictObject({
  runId: id,
  supplierName: z.string(),
  recordedAt: z.iso.datetime(),
  stopReason: researchRunSchema.shape.stopReason,
  score: z.number().nullable(),
});

/** What the research route streams to the UI, one event per Server-Sent Event. */
export const researchEventSchema = z.discriminatedUnion("type", [
  /** First event of a replayed recording, so the UI can label it as cache. */
  z.strictObject({ type: z.literal("cached"), runId: id, recordedAt: z.iso.datetime() }),
  z.strictObject({
    type: z.literal("step"),
    step: z.enum(STEP_IDS),
    status: z.enum(["running", "done", "skipped"]),
    message: z.string(),
    model: z.string().nullable(),
  }),
  z.strictObject({
    type: z.literal("source"),
    url: z.string(),
    title: z.string(),
    verdict: z.enum(["relevant", "other_entity", "irrelevant", "failed"]),
  }),
  z.strictObject({
    type: z.literal("finding"),
    severity: z.enum(["info", "warning", "critical"]),
    message: z.string(),
    evidenceId: id.nullable(),
  }),
  z.strictObject({ type: z.literal("report"), report: researchReportSchema }),
  z.strictObject({ type: z.literal("error"), message: z.string() }),
]);

export type Evidence = z.infer<typeof evidenceSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type FinancialStatement = z.infer<typeof financialStatementSchema>;
export type FinancialEvent = z.infer<typeof financialEventSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type ResearchInput = z.infer<typeof researchInputSchema>;
export type ResearchRun = z.infer<typeof researchRunSchema>;
export type ResearchReport = z.infer<typeof researchReportSchema>;
export type ResearchEvent = z.infer<typeof researchEventSchema>;
export type ResearchRunSummary = z.infer<typeof researchRunSummarySchema>;
