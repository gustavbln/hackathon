import { ChatError, chatRequestSchema, type ChatEvent, type ChatRequest } from "@/lib/chat-contract";
import { answerChat } from "@/lib/chat";
import { encodeEvent } from "@/lib/sse";

export const runtime = "nodejs";
export const maxDuration = 90;

async function readChatRequest(request: Request, signal: AbortSignal): Promise<ChatRequest> {
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
  return parsed.data;
}

function failureOf(error: unknown, signal: AbortSignal) {
  return signal.aborted
    ? new ChatError("request_timeout", "The chat request timed out or was cancelled. Please retry.", 504)
    : error instanceof ChatError ? error : new ChatError("chat_failed", "The chat request failed. Please retry.", 500);
}

/** Streams the answer's steps as Server-Sent Events, then the whole validated answer (or the error). */
export async function POST(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(80_000)]);
  let chat: ChatRequest;
  try {
    chat = await readChatRequest(request, signal);
  } catch (error) {
    const failure = failureOf(error, signal);
    return Response.json({ error: { code: failure.code, message: failure.message } }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
  }
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // A buyer who closed the chat gets nothing more; the aborted signal has already stopped the work.
      const send = (event: ChatEvent) => { if (!request.signal.aborted) controller.enqueue(encodeEvent(event)); };
      try {
        const response = await answerChat(chat, signal, (step) => send({ type: "step", step }));
        send({ type: "done", response });
      } catch (error) {
        const { code, message } = failureOf(error, signal);
        send({ type: "error", error: { code, message } });
      }
      if (!request.signal.aborted) controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" },
  });
}
