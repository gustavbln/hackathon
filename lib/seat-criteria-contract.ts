import { z } from "zod";
import { CRITERIA } from "./suppliers/criteria.ts";

export const seatCriterionKeys = CRITERIA.map(({ key }) => key);
export const seatCriterionKeySchema = z.enum(seatCriterionKeys);
// Nebius supports explicit properties but rejects JSON Schema's propertyNames keyword.
export const seatEvaluationSchema = z.strictObject({
  criteria: z.strictObject(Object.fromEntries(seatCriterionKeys.map((key) => [key, z.strictObject({
    importance: z.number().int().min(0).max(10),
    reason: z.string().trim().min(1).max(240),
  })]))),
}).refine(({ criteria }) => Object.values(criteria).some(({ importance }) => importance > 0), "At least one criterion must matter");

export const seatCriteriaResponseSchema = z.object({
  component: z.literal("Train passenger seats"),
  status: z.literal("ai_suggestion"),
  runCount: z.literal(3),
  models: z.array(z.string().min(1)).length(3),
  weights: z.record(seatCriterionKeySchema, z.number().min(0).max(1)),
  criteria: z.array(z.object({
    key: seatCriterionKeySchema,
    column: z.enum(CRITERIA.map(({ column }) => column)),
    label: z.string(),
    direction: z.literal("lower"),
    scores: z.array(z.number().int().min(0).max(10)).length(3),
    meanImportance: z.number().min(0).max(10),
    weightPercent: z.number().min(0).max(100),
    reasons: z.array(z.string()).length(3),
  })).length(seatCriterionKeys.length),
  limitations: z.array(z.string()),
});
export type SeatCriteriaResponse = z.infer<typeof seatCriteriaResponseSchema>;
