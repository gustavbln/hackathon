import { ChatError } from "@/lib/chat-contract";
import { shortlistSourceSchema } from "@/lib/seat-shortlist-contract";
import { seatShortlist } from "@/lib/seat-shortlist";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function GET(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(80_000)]);
  try {
    const source = shortlistSourceSchema.safeParse(new URL(request.url).searchParams.get("source") ?? "rules");
    if (!source.success) throw new ChatError("invalid_request", "Use source=rules or source=nemotron.", 400);
    const result = await seatShortlist(source.data, signal);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure = signal.aborted
      ? new ChatError("request_timeout", "The seat shortlist timed out or was cancelled. Please retry.", 504)
      : error instanceof ChatError ? error : new ChatError("shortlist_failed", "The seat shortlist failed. Please retry.", 500);
    return Response.json({ error: { code: failure.code, message: failure.message } }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
  }
}
