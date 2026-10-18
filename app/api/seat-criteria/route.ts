import { ChatError } from "@/lib/chat-contract";
import { evaluateSeatCriteria } from "@/lib/seat-criteria";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(80_000)]);
  try {
    const result = await evaluateSeatCriteria(signal);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure = signal.aborted
      ? new ChatError("request_timeout", "Seat criteria evaluation timed out or was cancelled. Please retry.", 504)
      : error instanceof ChatError ? error : new ChatError("evaluation_failed", "Seat criteria evaluation failed. Please retry.", 500);
    return Response.json({ error: { code: failure.code, message: failure.message } }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
  }
}
