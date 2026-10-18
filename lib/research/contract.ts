import { z } from "zod";
import { CRITERIA, type CriterionKey } from "../suppliers/criteria.ts";
import type { Scores, Supplier } from "../suppliers/types.ts";

export const criterionKeySchema = z.enum(CRITERIA.map(({ key }) => key));

/** Researched companies get ids that can never collide with the anonymized `SUPP_00001` rows. */
export const researchedIdSchema = z.string().regex(/^EXT_[a-z0-9-]{2,60}$/);

export const researchInputSchema = z.strictObject({
  name: z.string().trim().min(2).max(120),
  website: z.url().nullable().default(null),
  /** What the buyer already knows; context for the agents, never evidence. */
  brief: z.string().trim().max(600).default(""),
});

export const researchSourceSchema = z.strictObject({
  id: z.number().int().min(1),
  url: z.url(),
  title: z.string().trim().min(1).max(300),
  publishedAt: z.string().max(40).nullable(),
  /** Verbatim from the search result; code checks it before saving. */
  quote: z.string().trim().min(1).max(400),
});

/** One driver estimated from public evidence on the dataset's scale (0 = no risk, 100 = maximum). */
export const criterionEstimateSchema = z.strictObject({
  value: z.number().int().min(0).max(100),
  confidence: z.enum(["low", "medium", "high"]),
  rationale: z.string().trim().min(1).max(500),
  sourceIds: z.array(z.number().int().min(1)).min(1).max(6),
});

/** One line of a driver agent's visible thread: what it planned, searched, kept and concluded. */
export const threadEntrySchema = z.strictObject({
  kind: z.enum(["plan", "search", "evidence", "verdict", "note"]),
  text: z.string().trim().min(1).max(600),
  sourceIds: z.array(z.number().int().min(1)).max(10),
  model: z.string().nullable(),
});

export const driverAgentSchema = z.strictObject({
  status: z.enum(["estimated", "no_evidence", "failed"]),
  estimate: criterionEstimateSchema.nullable(),
  thread: z.array(threadEntrySchema).max(40),
});

export const researchedSupplierSchema = z
  .strictObject({
    id: researchedIdSchema,
    name: z.string().trim().min(1).max(120),
    legalName: z.string().trim().min(1).max(200).nullable(),
    website: z.url().nullable(),
    country: z.string().regex(/^[A-Z]{2}$/).nullable(),
    brief: z.string().max(600),
    researchedAt: z.iso.datetime(),
    summary: z.string().trim().min(1).max(1500),
    insights: z
      .array(
        z.strictObject({
          headline: z.string().trim().min(1).max(240),
          criterion: criterionKeySchema.nullable(),
          sourceIds: z.array(z.number().int().min(1)).min(1).max(6),
        }),
      )
      .max(12),
    /** One agent per risk driver; drivers without public evidence stay unscored, never guessed. */
    agents: z.partialRecord(criterionKeySchema, driverAgentSchema),
    sources: z.array(researchSourceSchema).max(120),
    run: z.strictObject({
      seconds: z.number().min(0),
      costUsd: z.number().min(0),
      tavilyCredits: z.number().min(0),
      models: z.array(z.string()),
    }),
  })
  .superRefine(({ sources, agents, insights }, context) => {
    const known = new Set(sources.map(({ id }) => id));
    if (known.size !== sources.length) context.addIssue({ code: "custom", message: "Source ids must be unique" });
    const cited = [
      ...Object.values(agents).flatMap((agent) => [...(agent?.estimate?.sourceIds ?? []), ...(agent?.thread.flatMap(({ sourceIds }) => sourceIds) ?? [])]),
      ...insights.flatMap(({ sourceIds }) => sourceIds),
    ];
    for (const id of new Set(cited)) {
      if (!known.has(id)) context.addIssue({ code: "custom", message: `Source ${id} is cited but missing` });
    }
  });

/** What the research stream sends, one per Server-Sent Event, so every agent's progress is visible live. */
export const researchEventSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("scout"), status: z.enum(["running", "done"]), text: z.string(), model: z.string().nullable() }),
  z.strictObject({ type: z.literal("agent"), criterion: criterionKeySchema, status: z.enum(["queued", "running", "estimated", "no_evidence", "failed"]), entry: threadEntrySchema.nullable(), estimate: criterionEstimateSchema.nullable() }),
  z.strictObject({ type: z.literal("source"), source: researchSourceSchema }),
  z.strictObject({ type: z.literal("editor"), status: z.enum(["running", "done"]), model: z.string().nullable() }),
  z.strictObject({ type: z.literal("done"), supplier: researchedSupplierSchema }),
  z.strictObject({ type: z.literal("error"), message: z.string() }),
]);

/** A researched company as the seat view ranks it: scores in CRITERIA order, null where no evidence was found. */
export const researchedRowSchema = z.strictObject({
  id: researchedIdSchema,
  name: z.string(),
  scores: z.array(z.number().min(0).max(100).nullable()).length(CRITERIA.length),
});

export type ResearchedRow = z.infer<typeof researchedRowSchema>;
export type ResearchInput = z.infer<typeof researchInputSchema>;
export type ResearchSource = z.infer<typeof researchSourceSchema>;
export type CriterionEstimate = z.infer<typeof criterionEstimateSchema>;
export type ThreadEntry = z.infer<typeof threadEntrySchema>;
export type DriverAgent = z.infer<typeof driverAgentSchema>;
export type ResearchedSupplier = z.infer<typeof researchedSupplierSchema>;
export type ResearchEvent = z.infer<typeof researchEventSchema>;

/** A researched company as a ranking row: drivers without evidence stay unknown (`null`). */
export function toSupplier(researched: ResearchedSupplier): Supplier {
  const scores = Object.fromEntries(
    CRITERIA.map(({ key }) => [key, researched.agents[key as CriterionKey]?.estimate?.value ?? null]),
  ) as Scores;
  return { id: researched.id, name: researched.name, origin: "market", scores };
}

/** A stable, readable id from the company name, e.g. "Grammer AG" → "EXT_grammer-ag". */
export function researchedIdFor(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `EXT_${slug.length >= 2 ? slug : "company"}`;
}
