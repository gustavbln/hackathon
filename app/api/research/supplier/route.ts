import { researchSupplier } from "@/lib/research/agents";
import { researchInputSchema } from "@/lib/research/contract";

export const runtime = "nodejs";
export const maxDuration = 200;

/** Researches a real company and streams every agent's progress as Server-Sent Events. */
export async function POST(request: Request) {
  const parsed = researchInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { message: "Name the company (2–120 characters); website and notes are optional." } }, { status: 400 });
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const event of researchSupplier(parsed.data, request.signal)) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
}
