"use client";

import { useEffect, useState } from "react";
import { CircleCheckIcon, CircleMinusIcon, CircleXIcon, InfoIcon, OctagonAlertIcon, TriangleAlertIcon } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { MODEL_ROLES, type ResearchEvent, type ResearchReport } from "@/lib/market/model";

import { EvidenceLink, evidenceFor } from "./evidence";
import { formatDateTime, formatDuration, hostname, modelName, ROLE_LABEL, STEP_LABEL, type StepId } from "./labels";
import { cachedOf, type ResearchState } from "./use-research";

type SourceEvent = Extract<ResearchEvent, { type: "source" }>;
type FindingEvent = Extract<ResearchEvent, { type: "finding" }>;
type StepStatus = Extract<ResearchEvent, { type: "step" }>["status"];

interface StepView {
  id: StepId;
  status: StepStatus;
  messages: string[];
  models: string[];
  sources: SourceEvent[];
  findings: FindingEvent[];
}

/** One card per pipeline step; sources and findings belong to the step that was running when they arrived. */
export function groupSteps(events: readonly ResearchEvent[]): StepView[] {
  const steps: StepView[] = [];
  let current: StepView | undefined;
  const stepFor = (id: StepId) => {
    let step = steps.find((candidate) => candidate.id === id);
    if (step === undefined) {
      step = { id, status: "running", messages: [], models: [], sources: [], findings: [] };
      steps.push(step);
    }
    return step;
  };

  for (const event of events) {
    if (event.type === "step") {
      current = stepFor(event.step);
      current.status = event.status;
      if (event.message !== "" && current.messages.at(-1) !== event.message) current.messages.push(event.message);
      if (event.model !== null && !current.models.includes(event.model)) current.models.push(event.model);
    } else if (event.type === "source") {
      (current ?? stepFor("resolve")).sources.push(event);
    } else if (event.type === "finding") {
      (current ?? stepFor("resolve")).findings.push(event);
    }
  }
  return steps;
}

export function ResearchTimeline({ state, report }: { state: ResearchState; report: ResearchReport | null }) {
  const steps = groupSteps(state.events);
  return (
    <section aria-labelledby="trace-heading" className="flex flex-col gap-4">
      <TraceHeader state={state} report={report} />
      {steps.length === 0 && state.status === "running" && (
        <p role="status" className="flex items-center gap-2 text-sm text-[var(--blueprint-muted)]">
          <Spinner /> Starting the agent…
        </p>
      )}
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <StepCard key={step.id} step={step} index={index} runStatus={state.status} report={report} />
        ))}
      </ol>
      {report && <CostReceipt report={report} />}
    </section>
  );
}

function TraceHeader({ state, report }: { state: ResearchState; report: ResearchReport | null }) {
  const cached = cachedOf(state.events);
  const now = useNow(state.status === "running" && cached === null);
  const elapsed = state.startedAt === null ? 0 : now - state.startedAt;

  return (
    <header className="flex flex-col gap-2 border-b border-[var(--blueprint-rule)] pb-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="trace-heading" className="blueprint-label">
          Agent trace
        </h2>
        <p role="status" className="font-mono text-xs tabular-nums">
          {state.status === "running" && cached === null && `Live · ${formatDuration(elapsed)}`}
          {state.status === "running" && cached !== null && "Replaying…"}
          {state.status === "done" &&
            report &&
            `Took ${formatDuration(Date.parse(report.run.finishedAt) - Date.parse(report.run.startedAt))}`}
          {state.status === "error" && "Stopped"}
        </p>
      </div>
      {cached && (
        <p className="w-fit rounded-full border border-dashed border-[var(--blueprint-muted)] px-2.5 py-0.5 font-mono text-[10px] tracking-[0.13em] text-[var(--blueprint-muted)] uppercase">
          Cached · recorded {formatDateTime(cached.recordedAt)}
        </p>
      )}
    </header>
  );
}

/** Re-renders once a second while `active`, for the live timer. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function StepCard({
  step,
  index,
  runStatus,
  report,
}: {
  step: StepView;
  index: number;
  runStatus: ResearchState["status"];
  report: ResearchReport | null;
}) {
  // A step still "running" after the stream ended was cut short.
  const stopped = step.status === "running" && runStatus !== "running";
  const latest = step.messages.at(-1);

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-md border border-[var(--blueprint-rule)] bg-[var(--train-surface)] p-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none",
        step.status === "running" && !stopped && "border-[var(--blueprint-muted)]",
      )}
    >
      <div className="flex items-start gap-2.5">
        <StepIcon status={step.status} stopped={stopped} failed={runStatus === "error"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-sm font-medium">
              <span className="mr-2 font-mono text-[10px] text-[var(--blueprint-muted)]">{String(index + 1).padStart(2, "0")}</span>
              {STEP_LABEL[step.id]}
            </h3>
            {step.models.map((model) => (
              <span
                key={model}
                title={model}
                className="rounded-full bg-[var(--blueprint-ink)] px-2 py-0.5 font-mono text-[10px] text-[var(--blueprint-paper)]"
              >
                {modelName(model)}
              </span>
            ))}
          </div>
          {step.messages.slice(0, -1).map((message, messageIndex) => (
            <p key={messageIndex} className="mt-1 text-xs text-[var(--blueprint-muted)]">
              {message}
            </p>
          ))}
          {latest && <p className="mt-1 text-sm leading-snug">{latest}</p>}
          {step.status === "skipped" && <p className="blueprint-label mt-1">Skipped</p>}
        </div>
      </div>
      {step.findings.length > 0 && <FindingList findings={step.findings} report={report} />}
      {step.sources.length > 0 && <SourceList sources={step.sources} />}
    </li>
  );
}

function StepIcon({ status, stopped, failed }: { status: StepStatus; stopped: boolean; failed: boolean }) {
  const className = "mt-0.5 size-4 shrink-0";
  if (stopped) {
    return failed ? (
      <CircleXIcon className={cn(className, "text-[var(--risk-critical)]")} aria-label="Stopped by an error" />
    ) : (
      <CircleMinusIcon className={cn(className, "text-[var(--blueprint-muted)]")} aria-label="Ended early" />
    );
  }
  if (status === "running") return <Spinner className={className} aria-label="Running" />;
  if (status === "skipped") return <CircleMinusIcon className={cn(className, "text-[var(--blueprint-muted)]")} aria-label="Skipped" />;
  return <CircleCheckIcon className={className} aria-label="Done" />;
}

const FINDING_STYLE = {
  critical: { icon: OctagonAlertIcon, label: "Critical", color: "var(--risk-critical)" },
  warning: { icon: TriangleAlertIcon, label: "Warning", color: "var(--risk-high)" },
  info: { icon: InfoIcon, label: "Note", color: "var(--blueprint-muted)" },
} satisfies Record<FindingEvent["severity"], { icon: typeof InfoIcon; label: string; color: string }>;

function FindingList({ findings, report }: { findings: FindingEvent[]; report: ResearchReport | null }) {
  return (
    <ul aria-label="Findings" className="flex flex-col gap-1.5">
      {findings.map((finding, index) => {
        const style = FINDING_STYLE[finding.severity];
        const evidence = report && finding.evidenceId ? evidenceFor(report, [finding.evidenceId])[0] : undefined;
        return (
          <li
            key={index}
            className={cn(
              "flex items-start gap-2 text-sm leading-snug",
              finding.severity === "critical" &&
                "rounded-md border border-[var(--risk-critical)] bg-[color-mix(in_oklab,var(--risk-critical)_12%,transparent)] p-2 font-medium",
            )}
          >
            <style.icon className="mt-0.5 size-3.5 shrink-0" style={{ color: style.color }} aria-label={style.label} />
            <EvidenceLink evidence={evidence} className="min-w-0 text-left">
              {finding.message}
            </EvidenceLink>
          </li>
        );
      })}
    </ul>
  );
}

const VERDICT_STYLE: Record<SourceEvent["verdict"], string> = {
  relevant: "Used",
  other_entity: "Other company",
  irrelevant: "Not relevant",
  failed: "Could not open",
};

/** Used sources and other-company hits stay visible; the rest folds away. */
function SourceList({ sources }: { sources: SourceEvent[] }) {
  const shown = sources.filter((source) => source.verdict === "relevant" || source.verdict === "other_entity");
  const folded = sources.filter((source) => !shown.includes(source));
  return (
    <div className="flex flex-col gap-1">
      <ul aria-label="Sources" className="flex flex-col gap-1">
        {shown.map((source, index) => (
          <SourceRow key={`${source.url}-${index}`} source={source} />
        ))}
      </ul>
      {folded.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-xs text-[var(--blueprint-muted)] hover:text-[var(--blueprint-ink)] [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">+ {folded.length} more not used</span>
            <span className="hidden group-open:inline">Hide sources not used</span>
          </summary>
          <ul className="mt-1 flex flex-col gap-1">
            {folded.map((source, index) => (
              <SourceRow key={`${source.url}-${index}`} source={source} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function SourceRow({ source }: { source: SourceEvent }) {
  const otherEntity = source.verdict === "other_entity";
  const muted = source.verdict === "irrelevant" || source.verdict === "failed";
  return (
    <li
      className={cn(
        "flex items-baseline gap-2 text-xs",
        otherEntity && "rounded-md bg-[color-mix(in_oklab,var(--risk-high)_16%,transparent)] px-2 py-1",
        muted && "text-[var(--blueprint-muted)]",
      )}
    >
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        title={source.title}
        className="flex min-w-0 flex-1 items-baseline gap-2 hover:underline"
      >
        <span className="shrink-0 font-mono text-[10px]">{hostname(source.url)}</span>
        <span className={cn("min-w-0 truncate", muted && "line-through decoration-[var(--blueprint-rule)]")}>{source.title}</span>
      </a>
      <span
        className={cn(
          "shrink-0 font-mono text-[10px] tracking-[0.08em] uppercase",
          otherEntity ? "font-semibold text-[var(--blueprint-ink)]" : "text-[var(--blueprint-muted)]",
        )}
      >
        {VERDICT_STYLE[source.verdict]}
      </span>
    </li>
  );
}

const tokens = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** What the run cost, per model role, from the usage Nebius reported. */
function CostReceipt({ report }: { report: ResearchReport }) {
  const { usage, tavilyCredits, openedSources, failedSources, queries } = report.run;
  const rows = MODEL_ROLES.flatMap((role) => {
    const entry = usage[role];
    return entry ? [{ role, ...entry }] : [];
  });
  const totalCost = rows.reduce((sum, row) => sum + row.costUsd, 0);
  const totalCalls = rows.reduce((sum, row) => sum + row.calls, 0);

  return (
    <section aria-labelledby="receipt-heading" className="rounded-md border border-dashed border-[var(--blueprint-muted)] p-3">
      <h3 id="receipt-heading" className="blueprint-label mb-2">
        Receipt / Nemotron on Nebius
      </h3>
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-left text-[var(--blueprint-muted)]">
            <th scope="col" className="pb-1 font-normal">Role</th>
            <th scope="col" className="pb-1 text-right font-normal">Calls</th>
            <th scope="col" className="pb-1 text-right font-normal">
              <abbr title="Prompt tokens in / completion tokens out, reasoning tokens in brackets">Tokens</abbr>
            </th>
            <th scope="col" className="pb-1 text-right font-normal">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.role} className="border-t border-[var(--blueprint-rule)]">
              <th scope="row" className="py-1 text-left font-normal">{ROLE_LABEL[row.role]}</th>
              <td className="py-1 text-right">{row.calls}</td>
              <td className="py-1 text-right font-mono">
                {tokens.format(row.promptTokens)} / {tokens.format(row.completionTokens)}
                {row.reasoningTokens > 0 && ` (${tokens.format(row.reasoningTokens)})`}
              </td>
              <td className="py-1 text-right font-mono">{usd.format(row.costUsd)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[var(--blueprint-ink)] font-medium">
            <th scope="row" className="pt-1 text-left">Total</th>
            <td className="pt-1 text-right">{totalCalls}</td>
            <td />
            <td className="pt-1 text-right font-mono">{usd.format(totalCost)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 text-xs text-[var(--blueprint-muted)]">
        {tavilyCredits} Tavily credits · {queries.length} queries · {openedSources.length} sources opened
        {failedSources.length > 0 && ` · ${failedSources.length} failed`}
      </p>
    </section>
  );
}
