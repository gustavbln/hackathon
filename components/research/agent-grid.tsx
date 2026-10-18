"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LEVEL_COLOR } from "@/components/leaderboard/risk-color";
import { CRITERIA, CRITERION_BY_KEY, riskLevel, type CriterionKey } from "@/lib/suppliers/criteria";
import type { DriverAgent, ResearchSource, ThreadEntry } from "@/lib/research/contract";
import { cn } from "@/lib/utils";
import { SourceLink } from "./source-viewer";

const STATUS_LABEL: Record<AgentState["status"], string> = {
  queued: "Queued",
  running: "Researching",
  estimated: "Scored",
  no_evidence: "No evidence",
  failed: "Failed",
};

const KIND_LABEL: Record<ThreadEntry["kind"], string> = {
  plan: "Plan",
  search: "Search",
  read: "Read",
  evidence: "Evidence",
  follow_up: "Digging deeper",
  verdict: "Verdict",
  note: "Note",
};

export interface AgentState {
  status: DriverAgent["status"] | "queued" | "running";
  estimate: DriverAgent["estimate"];
  /** Arrives with the saved result; the live stream only carries the thread. */
  report?: DriverAgent["report"];
  thread: ThreadEntry[];
}

interface AgentGridProps {
  agents: Partial<Record<CriterionKey, AgentState>>;
  sources: ResearchSource[];
  /** Compact cards for the narrow chat panel. */
  compact?: boolean;
}

/** One card per driver agent that ran; a card opens that agent's report and how it got there. */
export function AgentGrid({ agents, sources, compact = false }: AgentGridProps) {
  const [open, setOpen] = useState<CriterionKey | null>(null);
  const openAgent = open ? agents[open] : undefined;
  const ran = CRITERIA.flatMap(({ key, label }) => {
    const agent = agents[key];
    return agent ? [{ key, label, agent }] : [];
  });

  return (
    <>
      <ul className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
        {ran.map(({ key, label, agent }) => {
          const value = agent.estimate?.value;
          const latest = agent.thread.at(-1);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setOpen(key)}
                className="flex h-full w-full flex-col gap-1 rounded-sm border border-[var(--blueprint-rule)] p-2.5 text-left text-xs transition-colors hover:bg-[var(--blueprint-grid)] focus-visible:ring-2 focus-visible:ring-[var(--blueprint-ink)] focus-visible:outline-none"
              >
                <span className="font-medium">{label}</span>
                <span className="flex items-center gap-1.5 text-[var(--blueprint-muted)]">
                  {value !== undefined && (
                    <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: LEVEL_COLOR[riskLevel(value)] }} />
                  )}
                  {agent.status === "running" && <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-[var(--series-1)]" />}
                  {value !== undefined ? `${value} · ${riskLevel(value)} · ${agent.estimate?.confidence} confidence` : STATUS_LABEL[agent.status]}
                </span>
                {agent.status === "running" && latest && <span className="line-clamp-1 text-[var(--blueprint-muted)]">{latest.text}</span>}
                {!compact && agent.report && <span className="line-clamp-2">{agent.report.headline}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto bg-[var(--blueprint-paper)] text-[var(--blueprint-ink)] sm:max-w-lg">
          {open && <AgentReport criterion={open} agent={openAgent} sources={sources} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Perplexity-style: the sources it used, the cited report, then every step it took. */
function AgentReport({ criterion, agent, sources }: { criterion: CriterionKey; agent: AgentState | undefined; sources: ResearchSource[] }) {
  const thread = agent?.thread ?? [];
  const used = [...new Set(thread.flatMap(({ sourceIds }) => sourceIds))].flatMap((id) => sources.find((source) => source.id === id) ?? []);
  const value = agent?.estimate?.value;

  return (
    <>
      <SheetHeader className="border-b border-[var(--blueprint-rule)]">
        <SheetTitle>{CRITERION_BY_KEY[criterion].label} agent</SheetTitle>
        <SheetDescription>{CRITERION_BY_KEY[criterion].description}</SheetDescription>
        <p className="flex items-center gap-1.5 text-xs">
          {value !== undefined && <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: LEVEL_COLOR[riskLevel(value)] }} />}
          {value !== undefined ? (
            <span>
              <strong className="font-mono tabular-nums">{value}</strong> · {riskLevel(value)} risk · {agent?.estimate?.confidence} confidence
            </span>
          ) : (
            <span className="text-[var(--blueprint-muted)]">{STATUS_LABEL[agent?.status ?? "queued"]}</span>
          )}
        </p>
      </SheetHeader>

      <div className="flex flex-col gap-6 p-4 text-sm">
        {used.length > 0 && (
          <section aria-label="Sources" className="flex flex-col gap-2">
            <h3 className="blueprint-label">Sources · {used.length}</h3>
            <ol className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
              {used.map((source) => (
                <li key={source.id} className="w-40 shrink-0 snap-start">
                  <SourceLink source={source} className="flex h-full flex-col gap-1 rounded-sm border border-[var(--blueprint-rule)] p-2 text-xs hover:bg-[var(--blueprint-grid)]">
                    <span className="line-clamp-2 font-medium">{source.title}</span>
                    <span className="mt-auto font-mono text-[10px] text-[var(--blueprint-muted)]">
                      [{source.id}] {new URL(source.url).hostname.replace(/^www\./, "")}
                    </span>
                  </SourceLink>
                </li>
              ))}
            </ol>
          </section>
        )}

        {agent?.report && (
          <section aria-label="Report" className="flex flex-col gap-3">
            <h3 className="text-base leading-snug font-medium">{agent.report.headline}</h3>
            <ul className="flex flex-col gap-3">
              {agent.report.findings.map((finding) => (
                <li key={finding.text} className="flex flex-col gap-1">
                  <p>{finding.text}</p>
                  <SourceChips ids={finding.sourceIds} sources={sources} />
                </li>
              ))}
            </ul>
            {agent.report.openQuestions.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-[var(--blueprint-rule)] pt-3">
                <h4 className="blueprint-label">Still worth asking the supplier</h4>
                <ul className="list-disc pl-4 text-[var(--blueprint-muted)]">
                  {agent.report.openQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <section aria-label="Research steps" className="flex flex-col gap-2">
          <h3 className="blueprint-label">How it researched</h3>
          <ol className="flex flex-col border-l border-[var(--blueprint-rule)]">
            {thread.map((entry, index) => (
              <li key={index} className="relative flex flex-col gap-1 pb-3 pl-4">
                <span aria-hidden="true" className="absolute top-1.5 -left-[3px] size-1.5 rounded-full bg-[var(--blueprint-muted)]" />
                <span className="blueprint-label">
                  {KIND_LABEL[entry.kind]}
                  {entry.model ? ` · ${entry.model.replace("nvidia/", "")}` : ""}
                </span>
                <p className={cn("text-xs", entry.kind === "evidence" && "border-l-2 border-[var(--blueprint-rule)] pl-3 italic")}>{entry.text}</p>
                {entry.sourceIds.length > 0 && <SourceChips ids={entry.sourceIds} sources={sources} />}
              </li>
            ))}
            {thread.length === 0 && <li className="pl-4 text-xs text-[var(--blueprint-muted)]">This agent has not started yet.</li>}
          </ol>
        </section>
      </div>
    </>
  );
}

/** Numbered links to the sources a claim rests on; each opens in the source panel. */
export function SourceChips({ ids, sources }: { ids: number[]; sources: ResearchSource[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const source = sources.find((candidate) => candidate.id === id);
        if (!source) return null;
        return (
          <SourceLink
            key={id}
            source={source}
            className="rounded-sm border border-[var(--blueprint-rule)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--blueprint-muted)] hover:text-[var(--blueprint-ink)]"
          >
            [{id}] {new URL(source.url).hostname.replace(/^www\./, "")}
          </SourceLink>
        );
      })}
    </span>
  );
}
