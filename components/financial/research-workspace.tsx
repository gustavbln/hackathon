"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, RotateCcwIcon } from "lucide-react";

import { AssistantAvatar } from "@/components/chat/assistant-avatar";
import { ChatDock } from "@/components/chat/chat-dock";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ResearchInput } from "@/lib/market/model";

import { STEP_LABEL } from "./labels";
import { RecordedRunList, ResearchForm } from "./research-start";
import { ResearchTimeline } from "./research-timeline";
import { reportOf, useRecordedRuns, useResearch, type ResearchState } from "./use-research";

/** Keeps a replay linkable without a server round trip. */
function replaceUrl(runId: string | null) {
  window.history.replaceState(null, "", runId === null ? "/financial" : `/financial?run=${encodeURIComponent(runId)}`);
}

export function ResearchWorkspace({ initialRunId }: { initialRunId: string | null }) {
  const { state, run } = useResearch();
  const { runs, reload } = useRecordedRuns();
  const running = state.status === "running";
  const activeRunId = state.request?.kind === "replay" ? state.request.runId : null;

  useEffect(() => {
    if (initialRunId !== null) void run({ kind: "replay", runId: initialRunId });
  }, [initialRunId, run]);

  function start(input: ResearchInput) {
    replaceUrl(null);
    // A finished live run is saved as a recording, so the list grows.
    void run({ kind: "live", input }).then(reload);
  }

  function replay(runId: string) {
    replaceUrl(runId);
    void run({ kind: "replay", runId });
  }

  return (
    <main className="blueprint-page relative flex min-h-svh min-w-0 flex-1 flex-col px-4 sm:px-10 lg:px-16">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--blueprint-rule)] py-6">
        <Link
          href="/cabin"
          className="flex min-h-9 items-center gap-2 text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to cabin
        </Link>
        <div className="flex items-center gap-6">
          <span className="blueprint-label hidden sm:block">Research agent / NVIDIA Nemotron</span>
          <ChatDock />
        </div>
      </header>

      <section aria-labelledby="financial-heading" className="flex flex-col gap-6 pt-7 pb-6 sm:pt-9">
        <div className="max-w-2xl">
          <p className="blueprint-label mb-2">03 / Financial research</p>
          <h1 id="financial-heading" className="text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
            How risky is this supplier financially?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--blueprint-muted)]">
            Name a real seat maker. Nemotron agents identify the legal entity, map its company group, read its latest
            annual report and compute a screening score, with a source for every number.
          </p>
        </div>
        <div className="flex max-w-3xl flex-col gap-5">
          <ResearchForm running={running} onStart={start} />
          <RecordedRunList runs={runs} activeRunId={activeRunId} disabled={running} onReplay={replay} onRetry={reload} />
        </div>
      </section>

      {state.status !== "idle" && <ResearchResult state={state} onRetry={() => state.request && void run(state.request)} />}
    </main>
  );
}

function ResearchResult({ state, onRetry }: { state: ResearchState; onRetry: () => void }) {
  const report = reportOf(state.events);
  return (
    <div className="grid gap-8 border-t border-[var(--blueprint-rule)] py-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
      <section
        aria-label="Supplier profile"
        aria-busy={state.status === "running"}
        className={cn("flex min-w-0 flex-col gap-6", report === null && "order-2 lg:order-1")}
      >
        {state.status === "error" && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--risk-critical)] p-4 text-sm">
            <p className="min-w-0 flex-1">{state.error}</p>
            <Button variant="outline" size="sm" onClick={onRetry} className="border-[var(--blueprint-rule)] bg-transparent">
              <RotateCcwIcon aria-hidden="true" /> Retry
            </Button>
          </div>
        )}
        {report === null && state.status === "running" && <LiveSummary state={state} />}
        {report && <p className="text-sm">Report for {report.run.input.name} is ready.</p>}
      </section>
      <aside aria-label="Agent trace" className={cn("min-w-0", report === null && "order-1 lg:order-2")}>
        <ResearchTimeline state={state} report={report} />
      </aside>
    </div>
  );
}

/** While the agent works: what it is doing now and what it has found so far. */
function LiveSummary({ state }: { state: ResearchState }) {
  const lastStep = state.events.findLast((event) => event.type === "step");
  const sources = state.events.filter((event) => event.type === "source");
  const findings = state.events.filter((event) => event.type === "finding");
  const counters = [
    { label: "sources checked", value: sources.length },
    { label: "about another company", value: sources.filter((source) => source.verdict === "other_entity").length },
    { label: "findings", value: findings.length },
    { label: "critical", value: findings.filter((finding) => finding.severity === "critical").length },
  ];
  const name = state.request?.kind === "live" ? state.request.input.name : null;

  return (
    <div className="flex flex-col gap-5 rounded-md border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] p-5">
      <div className="flex items-start gap-3">
        <AssistantAvatar thinking className="size-9" />
        <div className="min-w-0" role="status" aria-live="polite">
          <p className="blueprint-label">{name ? `Researching “${name}”` : "Replaying a recorded run"}</p>
          <p className="mt-1 text-lg font-medium tracking-tight">
            {lastStep?.type === "step" ? STEP_LABEL[lastStep.step] : "Starting the agent"}
          </p>
          {lastStep?.type === "step" && <p className="text-sm text-[var(--blueprint-muted)]">{lastStep.message}</p>}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counters.map((counter) => (
          <div key={counter.label} className="border-t border-[var(--blueprint-rule)] pt-2">
            <dt className="blueprint-label">{counter.label}</dt>
            <dd className="mt-1 font-mono text-2xl tabular-nums">{counter.value}</dd>
          </div>
        ))}
      </dl>
      <div aria-hidden="true" className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-md bg-[var(--blueprint-grid)]" />
        ))}
      </div>
    </div>
  );
}
