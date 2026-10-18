import { z } from "zod";
import { CRITERIA } from "./suppliers/criteria.ts";

const criterionKeySchema = z.enum(CRITERIA.map(({ key }) => key));

/** `rules`: the EN-standard seat profile. `nemotron`: three averaged Nemotron importance runs. */
export const shortlistSourceSchema = z.enum(["rules", "nemotron"]);
export type ShortlistSource = z.infer<typeof shortlistSourceSchema>;

/** The buyer's own re-ranking request, sent to Nemotron with the weights prompt. */
export const shortlistInstructionSchema = z.string().trim().min(1).max(300);

export const seatShortlistSchema = z.object({
  source: shortlistSourceSchema,
  instruction: z.string().nullable(),
  models: z.array(z.string()),
  criteria: z.array(z.object({
    key: criterionKeySchema,
    label: z.string(),
    weightPercent: z.number().min(0).max(100),
    reason: z.string().nullable(),
  })).length(CRITERIA.length),
  suppliers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    rank: z.number().int().positive(),
    risk: z.number().min(0).max(100),
    drivers: z.array(z.object({ key: criterionKeySchema, label: z.string(), points: z.number() })).max(3),
  })).max(20),
  supplierCount: z.number().int().nonnegative(),
});
export type SeatShortlist = z.infer<typeof seatShortlistSchema>;
