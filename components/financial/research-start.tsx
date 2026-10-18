"use client";

import { useRef, useState, type FormEvent } from "react";
import { HistoryIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { researchInputSchema, type ResearchInput } from "@/lib/market/model";

import { formatDateTime, formatScore, STOP_REASON_LABEL } from "./labels";
import type { RecordedRuns } from "./use-research";

/** The spec's development cases. They only fill the input; the agent has no stored answers for them. */
const PILOTS = ["GRAMMER", "KIEL", "RECARO Rail"];

const URL_LIKE = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i;

type Category = ResearchInput["category"];

/** A website becomes the research website and, by its hostname, the name the agent starts from. */
function toInput(text: string, category: Category) {
  const value = text.trim();
  const website = URL_LIKE.test(value) ? new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`) : null;
  return researchInputSchema.safeParse({
    name: website ? website.hostname.replace(/^www\./, "") : value,
    website: website?.origin ?? null,
    category,
  });
}

interface ResearchFormProps {
  running: boolean;
  onStart: (input: ResearchInput) => void;
}

export function ResearchForm({ running, onStart }: ResearchFormProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category>(null);
  const [error, setError] = useState<string | null>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = toInput(text, category);
    if (!parsed.success) {
      setError("Enter a company name (2 to 120 characters) or its website.");
      return;
    }
    setError(null);
    onStart(parsed.data);
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Research a supplier" className="flex flex-col gap-3">
      <label htmlFor="research-company" className="blueprint-label">
        Seat maker / name or website
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="research-company"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Company name or website"
          autoComplete="organization"
          aria-invalid={error !== null}
          aria-describedby={error ? "research-company-error" : undefined}
          className="h-10 min-w-0 flex-1 rounded-md border-[var(--blueprint-rule)] bg-[var(--train-surface)] px-3 text-[var(--blueprint-ink)] placeholder:text-[var(--blueprint-muted)]"
        />
        <NativeSelect
          aria-label="Seat type"
          value={category ?? ""}
          onChange={(event) => setCategory(event.target.value === "" ? null : (event.target.value as Category))}
          className="h-10 rounded-md border-[var(--blueprint-rule)] bg-[var(--train-surface)] sm:w-44"
        >
          <NativeSelectOption value="">Any seat type</NativeSelectOption>
          <NativeSelectOption value="passenger">Passenger seats</NativeSelectOption>
          <NativeSelectOption value="driver_cab">Driver&apos;s cab seats</NativeSelectOption>
        </NativeSelect>
        <Button
          ref={submitRef}
          type="submit"
          disabled={running}
          className="h-10 rounded-md bg-[var(--blueprint-ink)] px-5 text-[var(--blueprint-paper)] hover:bg-[var(--blueprint-ink)]/90"
        >
          {running ? <Spinner /> : <SearchIcon aria-hidden="true" />}
          {running ? "Researching" : "Research"}
        </Button>
      </div>
      {error && (
        <p id="research-company-error" role="alert" className="text-sm text-[var(--risk-critical)]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="blueprint-label">Try</span>
        {PILOTS.map((pilot) => (
          <Button
            key={pilot}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setText(pilot);
              setError(null);
              submitRef.current?.focus();
            }}
            className="rounded-full border-[var(--blueprint-rule)] bg-transparent text-[var(--blueprint-ink)] hover:bg-[var(--blueprint-paper-deep)] hover:text-[var(--blueprint-ink)]"
          >
            {pilot}
          </Button>
        ))}
      </div>
    </form>
  );
}

interface RecordedRunListProps {
  runs: RecordedRuns;
  activeRunId: string | null;
  disabled: boolean;
  onReplay: (runId: string) => void;
  onRetry: () => void;
}

export function RecordedRunList({ runs, activeRunId, disabled, onReplay, onRetry }: RecordedRunListProps) {
  return (
    <section aria-labelledby="recorded-runs-heading" className="flex flex-col gap-3">
      <h2 id="recorded-runs-heading" className="blueprint-label">
        Recorded runs / replay from cache
      </h2>
      {runs.state === "loading" && (
        <div aria-busy="true" className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-52 rounded-md bg-[var(--blueprint-grid)]" />
          ))}
        </div>
      )}
      {runs.state === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p>{runs.message}</p>
          <Button variant="outline" size="sm" onClick={onRetry} className="border-[var(--blueprint-rule)] bg-transparent">
            Retry
          </Button>
        </div>
      )}
      {runs.state === "ready" && runs.runs.length === 0 && (
        <p className="text-sm text-[var(--blueprint-muted)]">
          No recorded runs yet. Every finished run is saved here and replays in seconds.
        </p>
      )}
      {runs.state === "ready" && runs.runs.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {runs.runs.map((run) => (
            <li key={run.runId}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onReplay(run.runId)}
                aria-current={run.runId === activeRunId}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-md border border-[var(--blueprint-rule)] bg-[var(--train-surface)] px-3 py-2 text-left transition-colors hover:border-[var(--blueprint-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 sm:w-auto",
                  run.runId === activeRunId && "border-[var(--blueprint-ink)]",
                )}
              >
                <HistoryIcon className="size-4 shrink-0 text-[var(--blueprint-muted)]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{run.supplierName}</span>
                  <span className="block text-xs text-[var(--blueprint-muted)]">
                    {formatDateTime(run.recordedAt)} · {STOP_REASON_LABEL[run.stopReason]}
                  </span>
                </span>
                <span className="shrink-0 text-right font-mono text-xs tabular-nums">
                  {run.score === null ? "Not scorable" : formatScore(run.score)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
