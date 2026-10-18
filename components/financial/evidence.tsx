"use client";

import type { ReactNode } from "react";
import { ExternalLinkIcon } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Evidence, ResearchReport } from "@/lib/market/model";

import { formatDate, formatDateTime, hostname } from "./labels";

const STATUS_STYLE: Record<Evidence["status"], { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "var(--blueprint-ink)" },
  contradictory: { label: "Contradictory", color: "var(--risk-high)" },
  insufficient: { label: "Not sufficiently backed", color: "var(--blueprint-muted)" },
};

/** Looks evidence up by id, keeping the order of `ids` and skipping unknown ids. */
export function evidenceFor(report: ResearchReport, ids: readonly string[]): Evidence[] {
  const byId = new Map(report.evidence.map((item) => [item.id, item]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export function EvidenceDetail({ evidence }: { evidence: Evidence }) {
  const status = STATUS_STYLE[evidence.status];
  return (
    <div className="flex flex-col gap-2 text-[var(--blueprint-ink)]">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.13em] uppercase">
        <span className="flex items-center gap-1.5" style={{ color: status.color }}>
          <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: status.color }} />
          {status.label}
        </span>
        {evidence.companyStatement && <span className="text-[var(--blueprint-muted)]">Company statement</span>}
      </p>
      <blockquote className="border-l-2 border-[var(--blueprint-rule)] pl-3 text-sm leading-relaxed">
        “{evidence.quote}”
      </blockquote>
      <p className="text-xs text-[var(--blueprint-muted)]">
        {evidence.publisher}
        {evidence.publishedAt && ` · ${formatDate(evidence.publishedAt)}`}
        {evidence.locator && ` · ${evidence.locator}`}
      </p>
      <a
        href={evidence.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-start gap-1.5 text-xs underline underline-offset-4 hover:text-[var(--blueprint-muted)]"
      >
        <ExternalLinkIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">{evidence.title}</span>
      </a>
      <p className="font-mono text-[10px] text-[var(--blueprint-muted)]">
        {hostname(evidence.url)} · retrieved {formatDateTime(evidence.retrievedAt)}
      </p>
    </div>
  );
}

/** Opens the quote, locator and link behind a value. Falls back to plain text when nothing backs it. */
export function EvidenceLink({
  evidence,
  children,
  className,
}: {
  evidence: Evidence | undefined;
  children: ReactNode;
  className?: string;
}) {
  if (evidence === undefined) return <span className={className}>{children}</span>;
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "cursor-pointer rounded-sm underline decoration-[var(--blueprint-muted)] decoration-dotted underline-offset-4 hover:decoration-[var(--blueprint-ink)] focus-visible:outline-2 focus-visible:outline-offset-2",
          evidence.status !== "confirmed" && "decoration-[var(--risk-high)]",
          className,
        )}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] bg-[var(--train-surface)] p-4">
        <EvidenceDetail evidence={evidence} />
      </PopoverContent>
    </Popover>
  );
}

/** Compact source chips, one per piece of evidence. */
export function EvidenceChips({ evidence }: { evidence: readonly Evidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <ul aria-label="Sources" className="flex flex-wrap gap-1.5">
      {evidence.map((item) => (
        <li key={item.id}>
          <EvidenceLink
            evidence={item}
            className="inline-flex max-w-56 items-center rounded-full border border-[var(--blueprint-rule)] px-2 py-0.5 font-mono text-[10px] no-underline hover:border-[var(--blueprint-muted)]"
          >
            <span className="truncate">{hostname(item.url)}</span>
          </EvidenceLink>
        </li>
      ))}
    </ul>
  );
}
