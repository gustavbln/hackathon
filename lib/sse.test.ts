import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { encodeEvent, readEvents } from "./sse.ts";

test("SSE preserves events across byte chunks and validates every event", async () => {
  const schema = z.object({ message: z.string() });
  const expected = [{ message: "Kiel ü 🚆" }, { message: "Done" }];
  const bytes = expected.flatMap((event) => [...encodeEvent(event)]);
  bytes.push(...encodeEvent({ message: 42 }));
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      controller.close();
    },
  });
  const events = readEvents(body, schema);

  for (const event of expected) assert.deepEqual(await events.next(), { done: false, value: event });
  await assert.rejects(events.next(), z.ZodError);
});
