"use client";

import { ExternalLinkIcon } from "lucide-react";
import { createContext, use, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ResearchSource } from "@/lib/research/contract";

const OpenSource = createContext<((source: ResearchSource) => void) | null>(null);
const embeddingSchema = z.object({ embeddable: z.boolean(), pdf: z.boolean() });

type View = "page" | "context";

/** Opens cited sources in a panel on the right: the live page where the site allows it, otherwise the passage the agent read. */
export function SourceViewerProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<ResearchSource | null>(null);
  return (
    <OpenSource value={setSource}>
      {children}
      <Sheet open={source !== null} onOpenChange={(open) => !open && setSource(null)}>
        <SheetContent className="gap-0 bg-[var(--blueprint-paper)] text-[var(--blueprint-ink)] data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
          {source && <SourcePanel key={`${source.id}-${source.url}`} source={source} />}
        </SheetContent>
      </Sheet>
    </OpenSource>
  );
}

/** A link to a source: opens the panel on a plain click, a new tab on Cmd/Ctrl-click. */
export function SourceLink({ source, className, children }: { source: ResearchSource; className?: string; children: ReactNode }) {
  const open = use(OpenSource);
  const onClick = (event: MouseEvent) => {
    if (!open || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(source);
  };
  return (
    <a href={source.url} target="_blank" rel="noreferrer" title={source.quote} onClick={onClick} className={className}>
      {children}
    </a>
  );
}

function SourcePanel({ source }: { source: ResearchSource }) {
  const [embedding, setEmbedding] = useState<z.infer<typeof embeddingSchema> | null>(null);
  const [chosen, setChosen] = useState<View | null>(null);
  const host = new URL(source.url).hostname.replace(/^www\./, "");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/research/embeddable?url=${encodeURIComponent(source.url)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((json: unknown) => setEmbedding(embeddingSchema.parse(json)))
      .catch(() => {
        if (!controller.signal.aborted) setEmbedding({ embeddable: false, pdf: false });
      });
    return () => controller.abort();
  }, [source.url]);

  const view: View = chosen ?? (embedding?.embeddable ? "page" : "context");

  return (
    <>
      <SheetHeader className="gap-2 border-b border-[var(--blueprint-rule)] pr-12">
        <p className="font-mono text-[11px] text-[var(--blueprint-muted)]">
          [{source.id}] {host}
          {source.publishedAt ? ` · ${source.publishedAt.slice(0, 10)}` : ""}
        </p>
        <SheetTitle className="leading-snug">{source.title}</SheetTitle>
        <SheetDescription className="border-l-2 border-[var(--series-4)] pl-3 text-[var(--blueprint-ink)] italic">“{source.quote}”</SheetDescription>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view}
            onValueChange={(value) => (value === "page" || value === "context") && setChosen(value)}
            aria-label="How to show the source"
          >
            <ToggleGroupItem value="page" disabled={!embedding?.embeddable}>
              Page
            </ToggleGroupItem>
            <ToggleGroupItem value="context">Quote in context</ToggleGroupItem>
          </ToggleGroup>
          <Button asChild variant="ghost" size="sm">
            <a href={withTextFragment(source.url, source.quote)} target="_blank" rel="noreferrer">
              Open original <ExternalLinkIcon aria-hidden="true" />
            </a>
          </Button>
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1">
        {embedding === null && chosen === null ? (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-[var(--blueprint-muted)]">
            <Spinner /> Opening {host}
          </div>
        ) : view === "page" ? (
          <iframe
            src={source.url}
            title={source.title}
            referrerPolicy="no-referrer"
            // Sandboxed so a page cannot navigate the app away; browsers refuse to render PDFs in a sandbox.
            sandbox={embedding?.pdf ? undefined : "allow-scripts allow-same-origin allow-popups allow-forms"}
            className="size-full border-0 bg-white"
          />
        ) : (
          <QuoteInContext
            source={source}
            note={embedding?.embeddable ? null : `${host} doesn't let other apps show its pages, so this is the passage the agent read. Open the original for the full page.`}
          />
        )}
      </div>
    </>
  );
}

function QuoteInContext({ source, note }: { source: ResearchSource; note: string | null }) {
  const mark = useRef<HTMLElement>(null);
  useEffect(() => {
    mark.current?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      {note && <p className="border-b border-[var(--blueprint-rule)] px-6 py-2 text-xs text-[var(--blueprint-muted)]">{note}</p>}
      <article className="mx-auto max-w-prose px-6 py-8 text-[15px] leading-relaxed">
        <p>
          {source.excerpt?.before && <>… {source.excerpt.before} </>}
          <mark ref={mark} className="rounded-[2px] bg-[color-mix(in_oklab,var(--series-4)_35%,transparent)] px-0.5 text-inherit">
            {source.quote}
          </mark>
          {source.excerpt?.after && <> {source.excerpt.after} …</>}
        </p>
      </article>
    </div>
  );
}

/** The original, scrolled to the quote and highlighted where the browser supports text fragments. */
function withTextFragment(url: string, quote: string): string {
  const words = quote.split(/\s+/);
  const encode = (part: string[]) => encodeURIComponent(part.join(" ")).replace(/-/g, "%2D");
  const text = words.length <= 8 ? encode(words) : `${encode(words.slice(0, 4))},${encode(words.slice(-4))}`;
  return `${url}${url.includes("#") ? "" : "#"}:~:text=${text}`;
}
