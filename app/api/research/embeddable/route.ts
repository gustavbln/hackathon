import { checkEmbedding } from "@/lib/research/embeddable";
import { listResearched } from "@/lib/research/store";

export const runtime = "nodejs";

/** Whether a source can open inside the app. Only URLs the agents cited are checked, so this never fetches arbitrary addresses. */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  const cited = url !== null && (await listResearched()).some(({ sources }) => sources.some((source) => source.url === url));
  if (!cited) return Response.json({ embeddable: false, pdf: false });
  return Response.json(await checkEmbedding(url, AbortSignal.timeout(5_000)));
}
