import { z } from "zod";
import { CRITERIA } from "../suppliers/criteria.ts";

/** Events that hurt a whole company group when they pile up (Siemens' "18 of 20 defaulted" case). */
export const DISTRESS_EVENTS = ["insolvency", "credit_default"] as const;

export const EVENT_KINDS = [
  ...DISTRESS_EVENTS,
  "restructuring",
  "recall",
  "fine",
  "lawsuit",
  "strike",
  "accident",
  "ownership_change",
] as const;

const sourceSchema = z.strictObject({
  url: z.url(),
  title: z.string().trim().min(1),
  date: z.iso.date().optional(),
});

/** Same scale and cut-offs as the dataset: 0 = no risk, 100 = maximum risk. */
const scoreSchema = z.strictObject({
  value: z.number().int().min(0).max(100),
  note: z.string().trim().min(1).max(280),
  sources: z.array(sourceSchema).min(1),
});

const eventSchema = z.strictObject({
  kind: z.enum(EVENT_KINDS),
  date: z.iso.date(),
  summary: z.string().trim().min(1).max(280),
  source: sourceSchema,
});

const companySchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/, "Use lowercase letters, digits and dashes"),
  name: z.string().trim().min(1),
  /** ISO 3166-1 alpha-2, e.g. "DE". */
  country: z.string().regex(/^[A-Z]{2}$/),
  website: z.url().optional(),
  /** The direct parent company in this file, or null for the top of a group. */
  parentId: z.string().nullable(),
  /** False for holding companies that are only listed to complete the group. */
  makesComponent: z.boolean(),
  /** Only criteria with evidence; everything else stays unknown. */
  scores: z.partialRecord(z.enum(CRITERIA.map(({ key }) => key)), scoreSchema),
  events: z.array(eventSchema),
});

export const marketFileSchema = z
  .strictObject({
    component: z.literal("seats"),
    researchedAt: z.iso.date(),
    companies: z.array(companySchema),
  })
  .superRefine(({ companies }, context) => {
    const byId = new Map(companies.map((company) => [company.id, company]));
    if (byId.size !== companies.length) context.addIssue({ code: "custom", message: "Company ids must be unique" });
    for (const company of companies) {
      const seen = new Set([company.id]);
      for (let parentId = company.parentId; parentId !== null; parentId = byId.get(parentId)?.parentId ?? null) {
        if (!byId.has(parentId)) {
          context.addIssue({ code: "custom", message: `${company.id}: parent "${parentId}" is not in the file` });
          break;
        }
        if (seen.has(parentId)) {
          context.addIssue({ code: "custom", message: `${company.id}: the parent chain loops` });
          break;
        }
        seen.add(parentId);
      }
    }
  });

export type MarketFile = z.infer<typeof marketFileSchema>;
export type MarketCompany = MarketFile["companies"][number];
