import { ChatError, chatRequestSchema } from "@/lib/chat-contract";
import { answerChat } from "@/lib/chat";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(80_000)]);
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new ChatError("invalid_request", "Send application/json.", 415);
    }
    if (Number(request.headers.get("content-length")) > 64_000) throw new ChatError("request_too_large", "Chat request is too large.", 413);
    const reader = request.body?.getReader();
    if (!reader) throw new ChatError("invalid_request", "Send a JSON request body.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64_000) { await reader.cancel(); throw new ChatError("request_too_large", "Chat request is too large.", 413); }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new ChatError("invalid_request", "Send valid JSON.", 400); }
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) throw new ChatError("invalid_request", "Provide a message (1–4000 characters), up to 12 history messages and up to 20 supplier IDs.", 400);
    const result = await answerChat(parsed.data, signal);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure = signal.aborted
      ? new ChatError("request_timeout", "The chat request timed out or was cancelled. Please retry.", 504)
      : error instanceof ChatError ? error : new ChatError("chat_failed", "The chat request failed. Please retry.", 500);
    return Response.json({ error: { code: failure.code, message: failure.message } }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
  }
}
