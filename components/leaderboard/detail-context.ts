import { CABIN_SEATS } from "@/components/train/cabin-layout";
import type { Weights } from "@/lib/suppliers/criteria";
import { buildProfile, encodeWeights, parseWeights } from "@/lib/suppliers/profiles";

/** What a detail page inherits from the seat view: the seat to return to and the weighting to rank with. */
export interface DetailContext {
  seatId: string | null;
  weights: Weights;
  /** True when the weighting came from the seat view, false for the EN-standard seat profile fallback. */
  fromSeatView: boolean;
  /** Query string that carries this context to the next detail page. */
  query: string;
  backHref: string;
}

export function detailContext(seat: unknown, encodedWeights: unknown): DetailContext {
  const seatId = typeof seat === "string" && CABIN_SEATS.some(({ id }) => id === seat) ? seat : null;
  const parsed = parseWeights(encodedWeights);
  const weights = parsed ?? buildProfile("seats").weights;
  const query = new URLSearchParams({ ...(seatId && { seat: seatId }), w: encodeWeights(weights) }).toString();
  return { seatId, weights, fromSeatView: parsed !== null, query, backHref: seatId ? `/cabin?seat=${seatId}` : "/cabin" };
}
