import type { z } from "zod";

const encoder = new TextEncoder();

/** One Server-Sent Event: a `data: <JSON>` block. */
export function encodeEvent(event: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

/** Parses a Server-Sent Events body into events validated by `schema`, one per `data:` block. */
export async function* readEvents<T>(body: ReadableStream<Uint8Array>, schema: z.ZodType<T>): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data !== "") yield schema.parse(JSON.parse(data));
    }
  }
}
