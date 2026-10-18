"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, XIcon } from "lucide-react";

import { AssistantAvatar } from "@/components/chat/assistant-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { seatShortlistSchema, type SeatShortlist, type ShortlistSource } from "@/lib/seat-shortlist-contract";

const TOP_CRITERIA = 5;

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; shortlist: SeatShortlist };

async function fetchShortlist(source: ShortlistSource, signal: AbortSignal) {
  const response = await fetch(`/api/seat-shortlist?source=${source}`, { signal });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = (body as { error?: { message?: string } }).error?.message;
    throw new Error(message ?? "The seat shortlist failed. Please retry.");
  }
  return seatShortlistSchema.parse(body);
}

export function SeatShortlistPanel({ onClose }: { onClose: () => void }) {
  const [source, setSource] = useState<ShortlistSource>("rules");
  // A missing entry means "not fetched yet"; ready and failed results stay cached per source.
  const [loads, setLoads] = useState<Partial<Record<ShortlistSource, Load>>>({});
  const entry = loads[source];
  const load = entry ?? { state: "loading" };

  useEffect(() => {
    if (entry) return;
    const controller = new AbortController();
    fetchShortlist(source, controller.signal).then(
      (shortlist) => setLoads((current) => ({ ...current, [source]: { state: "ready", shortlist } })),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "The seat shortlist failed. Please retry.";
        setLoads((current) => ({ ...current, [source]: { state: "error", message } }));
      },
    );
    return () => controller.abort();
  }, [source, entry]);

  function retry() {
    setLoads((current) => {
      const next = { ...current };
      delete next[source];
      return next;
    });
  }

  return (
    <section
      aria-label="Seat supplier shortlist"
      onKeyDown={(event) => event.key === "Escape" && onClose()}
      className="@container/shortlist flex h-[40rem] min-w-0 flex-col border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] text-[var(--blueprint-ink)] animate-in fade-in-0 slide-in-from-right-4 duration-500 motion-reduce:animate-none"
    >
      <header className="flex items-center justify-between gap-4 border-b border-[var(--blueprint-rule)] py-2 pr-2 pl-5">
        <div className="min-w-0">
          <h2 className="text-sm font-medium tracking-tight">Seat sourcing</h2>
          <p className="blueprint-label mt-0.5">High-speed / Passenger seats</p>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={source}
            onValueChange={(value) => value && setSource(value as ShortlistSource)}
            aria-label="Weights"
            className="gap-4"
          >
            {(["rules", "nemotron"] as const).map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                className="h-auto rounded-none bg-transparent px-0 py-1 font-mono text-[10px] tracking-[0.13em] text-[var(--blueprint-muted)] uppercase hover:bg-transparent hover:text-[var(--blueprint-ink)] data-[state=on]:bg-transparent data-[state=on]:text-[var(--blueprint-ink)] data-[state=on]:underline data-[state=on]:underline-offset-[6px]"
              >
                {option === "rules" ? "EN standards" : "Nemotron"}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close seat shortlist"
            className="hover:bg-[var(--blueprint-grid)] hover:text-[var(--blueprint-ink)]"
          >
            <XIcon strokeWidth={1.5} />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {load.state === "loading" && <ShortlistLoading source={source} />}
        {load.state === "error" && (
          <div role="alert" className="flex flex-col items-start gap-3 p-5 text-sm">
            <p>{load.message}</p>
            <Button variant="outline" size="sm" className="rounded-none border-[var(--blueprint-rule)] bg-transparent" onClick={retry}>
              Retry
            </Button>
          </div>
        )}
        {load.state === "ready" && <ShortlistResult shortlist={load.shortlist} />}
      </div>
    </section>
  );
}

function ShortlistLoading({ source }: { source: ShortlistSource }) {
  return (
    <div className="flex flex-col gap-4 p-5" aria-busy="true">
      {source === "nemotron" && (
        <p className="flex items-center gap-2 text-sm text-[var(--blueprint-muted)]">
          <AssistantAvatar thinking className="size-5" />
          Nemotron rates every criterion three times…
        </p>
      )}
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-4 rounded-none bg-[var(--blueprint-grid)]" />
      ))}
    </div>
  );
}

function ShortlistResult({ shortlist }: { shortlist: SeatShortlist }) {
  const top = shortlist.criteria.slice(0, TOP_CRITERIA);
  const maxWeight = top[0]?.weightPercent ?? 1;

  return (
    <div className="grid @min-[680px]/shortlist:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section aria-labelledby="seat-criteria-heading" className="min-w-0 p-5">
        <h3 id="seat-criteria-heading" className="blueprint-label mb-4">Priorities</h3>
        <ol className="flex flex-col gap-4">
          {top.map((criterion) => (
            <li key={criterion.key} title={criterion.reason ?? undefined}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{criterion.label}</span>
                <span className="font-mono text-xs text-[var(--blueprint-muted)] tabular-nums">
                  {criterion.weightPercent.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1.5 h-px bg-[var(--blueprint-rule)]">
                <div className="h-px bg-[var(--blueprint-ink)]" style={{ width: `${(criterion.weightPercent / maxWeight) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--blueprint-muted)]">
                {criterion.reason ?? "Priority inherited from the dataset’s baseline weights."}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs leading-relaxed text-[var(--blueprint-muted)]">
          {shortlist.source === "rules"
            ? "Dataset weights, raised where EN 45545 and seat production demand it."
            : "AI suggestion, three Nemotron runs averaged. No supplier data was sent."}
        </p>
      </section>

      <section aria-labelledby="seat-shortlist-heading" className="min-w-0 p-5 @min-[680px]/shortlist:border-l @min-[680px]/shortlist:border-[var(--blueprint-rule)]">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 id="seat-shortlist-heading" className="blueprint-label">
            Top {shortlist.suppliers.length} of {shortlist.supplierCount.toLocaleString("en")}
          </h3>
          <span className="blueprint-label">Risk</span>
        </div>
        <ol className="divide-y divide-[var(--blueprint-rule)]">
          {shortlist.suppliers.map((supplier) => (
            <li key={supplier.id} className="flex items-baseline gap-3 py-2 text-sm">
              <span className="w-5 shrink-0 font-mono text-[10px] text-[var(--blueprint-muted)] tabular-nums">
                {String(supplier.rank).padStart(2, "0")}
              </span>
              <span className="shrink-0 font-mono text-xs">{supplier.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-[var(--blueprint-muted)]">
                {supplier.drivers[0]?.label}
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums">{supplier.risk.toFixed(1)}</span>
            </li>
          ))}
        </ol>
        <Link
          href="/suppliers?component=seats&train=high-speed"
          className="blueprint-label mt-5 inline-flex items-center gap-1 hover:text-[var(--blueprint-ink)]"
        >
          Full benchmark <ArrowUpRightIcon className="size-3" />
        </Link>
      </section>
    </div>
  );
}
