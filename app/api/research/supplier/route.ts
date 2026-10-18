import { researchSupplier } from "@/lib/research/agents";
import { researchInputSchema, toSupplier, type ResearchedRow } from "@/lib/research/contract";
import { listResearched } from "@/lib/research/store";
import { CRITERIA } from "@/lib/suppliers/criteria";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Researched companies as ranking rows: scores in CRITERIA order, null where no evidence was found. */
export async function GET() {
  const rows: ResearchedRow[] = (await listResearched()).map((researched) => {
    const supplier = toSupplier(researched);
    return { id: supplier.id, name: supplier.name, scores: CRITERIA.map(({ key }) => supplier.scores[key]) };
  });
  return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
}

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
