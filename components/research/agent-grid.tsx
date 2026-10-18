"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LEVEL_COLOR } from "@/components/leaderboard/risk-color";
import { CRITERIA, CRITERION_BY_KEY, riskLevel, type CriterionKey } from "@/lib/suppliers/criteria";
import type { DriverAgent, ResearchSource, ThreadEntry } from "@/lib/research/contract";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<DriverAgent["status"] | "queued" | "running", string> = {
  queued: "Queued",
  running: "Researching",
  estimated: "Scored",
  no_evidence: "No evidence",
  failed: "Failed",
};

const KIND_LABEL: Record<ThreadEntry["kind"], string> = {
  plan: "Plan",
  search: "Search",
  evidence: "Evidence",
  verdict: "Verdict",
  note: "Note",
};

export interface AgentState {
  status: DriverAgent["status"] | "queued" | "running";
  estimate: DriverAgent["estimate"];
  thread: ThreadEntry[];
}

interface AgentGridProps {
  agents: Partial<Record<CriterionKey, AgentState>>;
  sources: ResearchSource[];
  /** Compact cards for the narrow chat panel. */
  compact?: boolean;
}

/** One card per risk driver agent; a card opens that agent's thread: what it read, kept and concluded. */
export function AgentGrid({ agents, sources, compact = false }: AgentGridProps) {
  const [open, setOpen] = useState<CriterionKey | null>(null);
  const openAgent = open ? agents[open] : undefined;

  return (
    <>
      <ul className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6")}>
        {CRITERIA.map(({ key, label }) => {
          const agent = agents[key] ?? { status: "queued", estimate: null, thread: [] };
          const value = agent.estimate?.value;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setOpen(key)}
                className={cn(
                  "flex h-full w-full flex-col gap-1 rounded-sm border border-[var(--blueprint-rule)] p-2.5 text-left text-xs transition-colors hover:bg-[var(--blueprint-grid)] focus-visible:ring-2 focus-visible:ring-[var(--blueprint-ink)] focus-visible:outline-none",
                  agent.status === "running" && "animate-pulse",
                )}
              >
                <span className="font-medium">{label}</span>
                <span className="flex items-center gap-1.5 text-[var(--blueprint-muted)]">
                  {value !== undefined && (
                    <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: LEVEL_COLOR[riskLevel(value)] }} />
                  )}
                  {value !== undefined ? `${value} · ${riskLevel(value)} · ${agent.estimate?.confidence} confidence` : STATUS_LABEL[agent.status]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto bg-[var(--blueprint-paper)] text-[var(--blueprint-ink)] sm:max-w-md">
          {open && (
            <>
              <SheetHeader className="border-b border-[var(--blueprint-rule)]">
                <SheetTitle>{CRITERION_BY_KEY[open].label} agent</SheetTitle>
                <SheetDescription>{CRITERION_BY_KEY[open].description}</SheetDescription>
              </SheetHeader>
              <ol className="flex flex-col gap-3 p-4 text-sm">
                {(openAgent?.thread ?? []).map((entry, index) => (
                  <li key={index} className="flex flex-col gap-1">
                    <span className="blueprint-label">
                      {KIND_LABEL[entry.kind]}
                      {entry.model ? ` · ${entry.model.replace("nvidia/", "")}` : ""}
                    </span>
                    <p className={cn(entry.kind === "evidence" && "border-l-2 border-[var(--blueprint-rule)] pl-3 italic")}>{entry.text}</p>
                    {entry.sourceIds.length > 0 && <SourceChips ids={entry.sourceIds} sources={sources} />}
                  </li>
                ))}
                {(openAgent?.thread.length ?? 0) === 0 && <li className="text-[var(--blueprint-muted)]">This agent has not started yet.</li>}
              </ol>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Numbered links to the sources a claim rests on. */
export function SourceChips({ ids, sources }: { ids: number[]; sources: ResearchSource[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const source = sources.find((candidate) => candidate.id === id);
        if (!source) return null;
        return (
          <a
            key={id}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            title={source.quote}
            className="rounded-sm border border-[var(--blueprint-rule)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--blueprint-muted)] hover:text-[var(--blueprint-ink)]"
          >
            [{id}] {new URL(source.url).hostname.replace(/^www\./, "")}
          </a>
        );
      })}
    </span>
  );
}
