import "server-only";

const CACHE = new Map<string, Embedding>();

export interface Embedding {
  embeddable: boolean;
  /** PDFs need an unsandboxed frame: browsers refuse to run their PDF viewer in a sandbox. */
  pdf: boolean;
}

/** Whether a site lets other sites show it in a frame. Any X-Frame-Options value blocks us; so does a CSP frame-ancestors list without a wildcard. */
export function allowsFraming(headers: Headers): boolean {
  if (headers.has("x-frame-options")) return false;
  const ancestors = headers.get("content-security-policy")?.match(/frame-ancestors([^;]*)/i)?.[1];
  return ancestors === undefined || ancestors.trim().split(/\s+/).some((source) => source === "*" || source === "https:");
}

/** Asks the site itself and judges its headers, not its status: a site may rate-limit our server but still serve the buyer. */
export async function checkEmbedding(url: string, signal: AbortSignal): Promise<Embedding> {
  const cached = CACHE.get(url);
  if (cached) return cached;
  const response = await fetch(url, { signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } }).catch(() => null);
  await response?.body?.cancel();
  const result = {
    embeddable: response !== null && response.url.startsWith("https:") && allowsFraming(response.headers),
    pdf: response?.headers.get("content-type")?.includes("pdf") ?? false,
  };
  CACHE.set(url, result);
  return result;
}
