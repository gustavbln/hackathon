import { ChatError } from "@/lib/chat-contract";
import { shortlistInstructionSchema, shortlistSourceSchema } from "@/lib/seat-shortlist-contract";
import { seatShortlist } from "@/lib/seat-shortlist";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function GET(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(80_000)]);
  try {
    const params = new URL(request.url).searchParams;
    const source = shortlistSourceSchema.safeParse(params.get("source") ?? "rules");
    if (!source.success) throw new ChatError("invalid_request", "Use source=rules or source=nemotron.", 400);
    const rawInstruction = params.get("instruction");
    const instruction = rawInstruction === null ? null : shortlistInstructionSchema.safeParse(rawInstruction);
    if (instruction && !instruction.success) throw new ChatError("invalid_request", "Keep the re-ranking request between 1 and 300 characters.", 400);
    const result = await seatShortlist(source.data, instruction?.data ?? null, signal);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure = signal.aborted
      ? new ChatError("request_timeout", "The seat shortlist timed out or was cancelled. Please retry.", 504)
      : error instanceof ChatError ? error : new ChatError("shortlist_failed", "The seat shortlist failed. Please retry.", 500);
    return Response.json({ error: { code: failure.code, message: failure.message } }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
  }
}
