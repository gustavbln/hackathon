import { z } from "zod";
import { CRITERIA } from "./criteria.ts";

/** All dataset suppliers in one compact payload: `scores` is row-major, one row per supplier, columns in `keys` order. */
export const supplierScoreMatrixSchema = z
  .object({
    keys: z.array(z.enum(CRITERIA.map(({ key }) => key))).length(CRITERIA.length),
    ids: z.array(z.string()),
    names: z.array(z.string()),
    scores: z.array(z.number().min(0).max(100)),
  })
  .refine(({ ids, names, scores, keys }) => names.length === ids.length && scores.length === ids.length * keys.length, {
    message: "The score matrix does not match its supplier list",
  });

export type SupplierScoreMatrix = z.infer<typeof supplierScoreMatrixSchema>;
