"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, XIcon } from "lucide-react";

import { AssistantAvatar } from "@/components/chat/assistant-avatar";
import { LEVEL_COLOR } from "@/components/leaderboard/risk-color";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { riskLevel } from "@/lib/suppliers/criteria";
import { seatShortlistSchema, type SeatShortlist, type ShortlistSource } from "@/lib/seat-shortlist-contract";

const TOP_CRITERIA = 6;

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
      <header className="flex items-center justify-between border-b border-[var(--blueprint-rule)] py-1 pr-1 pl-4">
        <span className="blueprint-label">Passenger cabin / Seats / High-speed</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close seat shortlist"
          className="hover:bg-[var(--blueprint-grid)] hover:text-[var(--blueprint-ink)]"
        >
          <XIcon strokeWidth={1.5} />
        </Button>
      </header>

      <div className="flex items-center justify-between gap-3 border-b border-[var(--blueprint-rule)] px-4 py-2.5">
        <span className="blueprint-label">Weights</span>
        <ToggleGroup
          type="single"
          value={source}
          onValueChange={(value) => value && setSource(value as ShortlistSource)}
          className="gap-0 border border-[var(--blueprint-rule)]"
        >
          {(["rules", "nemotron"] as const).map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              className="h-7 rounded-none px-3 font-mono text-[10px] tracking-[0.13em] text-[var(--blueprint-muted)] uppercase hover:bg-[var(--blueprint-grid)] hover:text-[var(--blueprint-ink)] data-[state=on]:bg-[var(--blueprint-ink)] data-[state=on]:text-[var(--blueprint-paper-deep)]"
            >
              {option === "rules" ? "EN standards" : "Nemotron"}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {load.state === "loading" && <ShortlistLoading source={source} />}
        {load.state === "error" && (
          <div role="alert" className="flex flex-col items-start gap-3 p-4 text-sm">
            <p className="border-l-2 border-[var(--blueprint-ink)] pl-3">{load.message}</p>
            <Button variant="outline" size="sm" className="rounded-none" onClick={retry}>
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
    <div className="flex flex-col gap-3 p-4" aria-busy="true">
      {source === "nemotron" && (
        <p className="flex items-center gap-2 text-sm text-[var(--blueprint-muted)]">
          <AssistantAvatar thinking className="size-5" />
          Nemotron rates every criterion three times, then we average…
        </p>
      )}
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-6 rounded-none bg-[var(--blueprint-grid)]" />
      ))}
    </div>
  );
}

function ShortlistResult({ shortlist }: { shortlist: SeatShortlist }) {
  const top = shortlist.criteria.slice(0, TOP_CRITERIA);
  const maxWeight = top[0]?.weightPercent ?? 1;

  return (
    <div className="grid @min-[680px]/shortlist:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section aria-labelledby="seat-criteria-heading" className="min-w-0 border-b border-[var(--blueprint-rule)] p-4 @min-[680px]/shortlist:border-r @min-[680px]/shortlist:border-b-0">
        <h2 id="seat-criteria-heading" className="blueprint-label mb-3">
          What matters most for seats
        </h2>
        <ol className="flex flex-col gap-3">
          {top.map((criterion) => (
            <li key={criterion.key} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span>{criterion.label}</span>
                <span className="font-mono text-xs tabular-nums">{criterion.weightPercent.toFixed(1)}%</span>
              </div>
              <div className="mt-1 h-1 bg-[var(--blueprint-grid)]">
                <div className="h-full bg-[var(--blueprint-ink)]" style={{ width: `${(criterion.weightPercent / maxWeight) * 100}%` }} />
              </div>
              {criterion.reason && (
                <p className="mt-1 text-xs leading-relaxed text-[var(--blueprint-muted)]">{criterion.reason}</p>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-[var(--blueprint-muted)]">
          {shortlist.source === "rules"
            ? "Dataset weights, raised where EN 45545 and seat production demand it."
            : "AI suggestion: three Nemotron runs averaged. No supplier data was sent to the model."}
        </p>
      </section>

      <section aria-labelledby="seat-shortlist-heading" className="min-w-0 p-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 id="seat-shortlist-heading" className="blueprint-label">
            Top {shortlist.suppliers.length} of {shortlist.supplierCount.toLocaleString("en")} suppliers
          </h2>
          <span className="blueprint-label">Weighted risk</span>
        </div>
        <ol className="divide-y divide-[var(--blueprint-rule)] border-y border-[var(--blueprint-rule)]">
          {shortlist.suppliers.map((supplier) => (
            <li key={supplier.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="blueprint-label w-6 shrink-0 tabular-nums">{String(supplier.rank).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs">{supplier.id}</p>
                <p className="truncate text-xs text-[var(--blueprint-muted)]">
                  Most risk from {supplier.drivers.map((driver) => driver.label.toLowerCase()).join(", ")}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums">
                <span className="size-2 rounded-full" style={{ background: LEVEL_COLOR[riskLevel(supplier.risk)] }} aria-hidden="true" />
                {supplier.risk.toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
        <Link
          href="/suppliers?component=seats&train=high-speed"
          className="blueprint-label mt-4 inline-flex items-center gap-1 hover:text-[var(--blueprint-ink)]"
        >
          Open the full seat benchmark <ArrowUpRightIcon className="size-3" />
        </Link>
      </section>
    </div>
  );
}
