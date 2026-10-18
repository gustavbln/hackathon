"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, XIcon } from "lucide-react";

import { AssistantAvatar } from "@/components/chat/assistant-avatar";
import { useChatFocus } from "@/components/chat/chat-focus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PageContext } from "@/lib/chat-contract";
import { seatShortlistSchema, type SeatShortlist } from "@/lib/seat-shortlist-contract";
import { CRITERION_BY_KEY, type CriterionKey, type Weights } from "@/lib/suppliers/criteria";
import { encodeWeights } from "@/lib/suppliers/profiles";
import { rankAmong, topByWeights } from "@/lib/suppliers/scoring";
import { SupplierColumns, type ColumnSupplier, type ResearchedColumn } from "./supplier-columns";
import { useResearchedSuppliers } from "./use-researched-suppliers";
import { useSupplierScores } from "./use-supplier-scores";
import { WeightSpider } from "./weight-spider";

const SHORTLIST_SIZE = 20;
const START_SHARE = 0.6;
/** A seat buyer tunes the few drivers that matter for seats; the rest weigh nothing. */
const SEAT_DRIVERS = 7;

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; shortlist: SeatShortlist };

async function fetchShortlist(signal: AbortSignal) {
  const response = await fetch("/api/seat-shortlist?source=nemotron", { signal });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = (body as { error?: { message?: string } }).error?.message;
    throw new Error(message ?? "The seat shortlist failed. Please retry.");
  }
  return seatShortlistSchema.parse(body);
}

interface SeatShortlistPanelProps {
  seatId: string;
  /** Weights the buyer set earlier, from `?w=`; they win over a fresh Nemotron weighting until reset. */
  initialWeights?: Weights | null;
  onClose: () => void;
}

export function SeatShortlistPanel({ seatId, initialWeights = null, onClose }: SeatShortlistPanelProps) {
  const [entry, setEntry] = useState<Load | null>(null);
  const load = entry ?? { state: "loading" };
  const { setPage } = useChatFocus();
  useEffect(() => () => setPage(null), [setPage]);

  useEffect(() => {
    if (entry) return;
    const controller = new AbortController();
    fetchShortlist(controller.signal).then(
      (shortlist) => setEntry({ state: "ready", shortlist }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "The seat shortlist failed. Please retry.";
        setEntry({ state: "error", message });
      },
    );
    return () => controller.abort();
  }, [entry]);

  return (
    <section
      aria-label="Seat supplier shortlist"
      onKeyDown={(event) => event.key === "Escape" && onClose()}
      className="@container/shortlist flex min-h-[40rem] min-w-0 flex-col @min-[720px]:h-full @min-[720px]:min-h-0 border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] text-[var(--blueprint-ink)] animate-in fade-in-0 slide-in-from-right-4 duration-500 motion-reduce:animate-none"
    >
      <header className="flex items-center justify-between gap-4 border-b border-[var(--blueprint-rule)] py-2 pr-2 pl-5">
        <div className="min-w-0">
          <h2 className="text-sm font-medium tracking-tight">Seat sourcing</h2>
          <p className="blueprint-label mt-0.5">Seat {seatId} / High-speed / Passenger seats</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="blueprint-label">Nemotron</span>
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

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {load.state === "loading" && <ShortlistLoading />}
        {load.state === "error" && (
          <div role="alert" className="flex flex-col items-start gap-3 p-5 text-sm">
            <p>{load.message}</p>
            <Button variant="outline" size="sm" className="rounded-none border-[var(--blueprint-rule)] bg-transparent" onClick={() => setEntry(null)}>
              Retry
            </Button>
          </div>
        )}
        {load.state === "ready" && (
          <ShortlistResult
            shortlist={load.shortlist}
            seatId={seatId}
            startWeights={initialWeights}
          />
        )}
      </div>
    </section>
  );
}

function ShortlistLoading() {
  return (
    <div className="flex flex-col gap-4 p-5" aria-busy="true">
      <p className="flex items-center gap-2 text-sm text-[var(--blueprint-muted)]">
        <AssistantAvatar thinking className="size-5" />
        Nemotron rates every criterion three times…
      </p>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-4 rounded-none bg-[var(--blueprint-grid)]" />
      ))}
    </div>
  );
}

/** Spider values for a weighting: the top driver sits at 60% of the radius, so any driver can be pulled out past it. */
function toSpiderValues(weights: Record<CriterionKey, number>): Record<CriterionKey, number> {
  const max = Math.max(...Object.values(weights)) || 1;
  return Object.fromEntries(Object.entries(weights).map(([key, weight]) => [key, (weight / max) * START_SHARE])) as Record<CriterionKey, number>;
}

/** The weighting restricted to the shown drivers; every other driver gets zero weight. */
function keepDrivers(weights: Record<CriterionKey, number>, shown: CriterionKey[]): Record<CriterionKey, number> {
  return Object.fromEntries(Object.entries(weights).map(([key, weight]) => [key, shown.includes(key as CriterionKey) ? weight : 0])) as Record<CriterionKey, number>;
}

function ShortlistResult({ shortlist, seatId, startWeights }: { shortlist: SeatShortlist; seatId: string; startWeights: Weights | null }) {
  const router = useRouter();
  const { setPage, onAction, ask } = useChatFocus();
  const matrix = useSupplierScores();
  const { researched } = useResearchedSuppliers();
  const keys = useMemo(() => shortlist.criteria.map(({ key }) => key), [shortlist]);
  // Nemotron's heaviest drivers for seats, kept in axis order so the spider reads the same every run.
  const shown = useMemo(() => {
    const heaviest = [...shortlist.criteria].sort((a, b) => b.weightPercent - a.weightPercent).slice(0, SEAT_DRIVERS).map(({ key }) => key);
    return keys.filter((key) => heaviest.includes(key));
  }, [shortlist, keys]);
  const initial = useMemo(
    () => toSpiderValues(keepDrivers(Object.fromEntries(shortlist.criteria.map(({ key, weightPercent }) => [key, weightPercent])) as Record<CriterionKey, number>, shown)),
    [shortlist, shown],
  );
  const [values, setValues] = useState(() => (startWeights ? toSpiderValues(keepDrivers(startWeights, shown)) : initial));
  const [committed, setCommitted] = useState(values);
  const [instruction, setInstruction] = useState(startWeights ? null : shortlist.instruction);
  const [active, setActive] = useState<CriterionKey | null>(null);
  // The driver the buyer clicked stays explained in the side area; hovering another one previews it.
  const [selected, setSelected] = useState<CriterionKey | null>(null);
  const focus = active ?? selected;

  const total = keys.reduce((sum, key) => sum + values[key], 0) || 1;
  const weights = Object.fromEntries(keys.map((key) => [key, values[key] / total])) as Weights;
  const edited = keys.some((key) => Math.abs(values[key] - initial[key]) > 1e-6);
  // Detail pages rank with exactly this weighting and know which seat to return to.
  const query = new URLSearchParams({ seat: seatId, w: encodeWeights(weights) }).toString();

  // Live ranking over all suppliers once their scores are loaded; the server's top 20 until then.
  const top: ColumnSupplier[] = matrix
    ? topByWeights(matrix.scores, matrix.keys.map((key) => weights[key]), SHORTLIST_SIZE).map(({ row, risk }) => ({
        id: matrix.ids[row] ?? "",
        name: matrix.names[row] ?? "",
        risk,
        activePoints: focus ? weights[focus] * (matrix.scores[row * matrix.keys.length + matrix.keys.indexOf(focus)] ?? 0) : null,
      }))
    : shortlist.suppliers.map(({ id, name, risk, contributions }) => ({
        id,
        name,
        risk,
        activePoints: focus ? (contributions[focus] ?? 0) : null,
      }));

  // Researched companies: drivers with evidence give the best case, the rest at maximum risk the worst case.
  const researchedColumns: ResearchedColumn[] = researched.map(({ id, name, scores }) => {
    const order = matrix?.keys ?? keys;
    let best = 0;
    let unknownWeight = 0;
    order.forEach((key, index) => {
      const score = scores[index] ?? null;
      if (score === null) unknownWeight += weights[key];
      else best += weights[key] * score;
    });
    const worst = best + unknownWeight * 100;
    const weightList = order.map((key) => weights[key]);
    const focusScore = focus ? (scores[order.indexOf(focus)] ?? null) : null;
    return {
      id,
      name,
      best,
      worst,
      rankBest: matrix ? rankAmong(matrix.scores, weightList, best) : 0,
      rankWorst: matrix ? rankAmong(matrix.scores, weightList, worst) : 0,
      unknownDrivers: scores.filter((score) => score === null).length,
      activePoints: focus && focusScore !== null ? weights[focus] * focusScore : null,
    };
  });

  const commit = useCallback((next: Record<CriterionKey, number>, nextInstruction: string | null = null) => {
    setCommitted(next);
    setInstruction(nextInstruction);
  }, []);

  // The committed weighting is the source of truth: the URL keeps it across pages, the assistant answers about it.
  useEffect(() => {
    const sum = keys.reduce((total, key) => total + committed[key], 0) || 1;
    const committedWeights = Object.fromEntries(keys.map((key) => [key, committed[key] / sum])) as Weights;
    const isInitial = keys.every((key) => Math.abs(committed[key] - initial[key]) < 1e-6);
    const url = isInitial ? `/cabin?seat=${seatId}` : `/cabin?seat=${seatId}&w=${encodeWeights(committedWeights)}`;
    window.history.replaceState(window.history.state, "", url);
    const page: PageContext = { page: "seat", seatId, weights: committedWeights, instruction };
    setPage(page);
  }, [committed, instruction, seatId, setPage, keys, initial]);

  useEffect(() => onAction((action) => {
    if (action.type === "set_weights") {
      const next = toSpiderValues(keepDrivers(action.weights as Record<CriterionKey, number>, shown));
      setValues(next);
      commit(next, action.instruction);
    } else if (action.type === "highlight_driver") {
      setActive(action.driverKey);
    }
  }), [onAction, commit, shown]);
  const focusCriterion = shortlist.criteria.find(({ key }) => key === focus);

  return (
    <div className="grid flex-1 gap-6 p-5 @min-[860px]/shortlist:min-h-0 @min-[860px]/shortlist:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <SupplierColumns
        suppliers={top}
        researched={researchedColumns}
        supplierCount={shortlist.supplierCount}
        active={focus}
        onOpen={(id) => router.push(`/suppliers/${id}?${query}`)}
        onAdd={() => ask("I want to add a new supplier.")}
      />

      <div className="flex min-w-0 flex-col gap-4 border-t border-[var(--blueprint-rule)] pt-5 @min-[860px]/shortlist:min-h-0 @min-[860px]/shortlist:overflow-y-auto @min-[860px]/shortlist:border-t-0 @min-[860px]/shortlist:border-l @min-[860px]/shortlist:pt-0 @min-[860px]/shortlist:pl-6">
        <section aria-labelledby="seat-criteria-heading" className="flex min-w-0 flex-col items-center gap-2">
          <h3 id="seat-criteria-heading" className="blueprint-label self-start">Priorities · drag a point to reweight</h3>
          <WeightSpider
            keys={shown}
            values={values}
            active={focus}
            onActive={setActive}
            onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
            onCommit={() => commit(values)}
            onSelect={setSelected}
          />
        </section>

        <aside className="flex min-w-0 flex-col gap-4 text-sm" aria-live="polite">
          <div>
            <p className="blueprint-label mb-1">
              {edited ? "Your weighting" : shortlist.source === "nemotron" ? "Nemotron's weighting" : "EN-standard weighting"}
            </p>
            {focusCriterion ? (
              <div className="mt-2 flex flex-col gap-2 border-l-2 border-[var(--series-2)] pl-3 animate-in fade-in-0 duration-200">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    {focusCriterion.label}
                    <span className="ml-2 font-mono text-xs font-normal tabular-nums">{(weights[focusCriterion.key] * 100).toFixed(1)}%</span>
                  </p>
                  {focusCriterion.key === selected && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setSelected(null)}
                      aria-label={`Close ${focusCriterion.label}`}
                      className="-mt-0.5 rounded-none hover:bg-[var(--blueprint-grid)] hover:text-[var(--blueprint-ink)]"
                    >
                      <XIcon strokeWidth={1.5} />
                    </Button>
                  )}
                </div>
                <p className="leading-relaxed">{CRITERION_BY_KEY[focusCriterion.key].description}</p>
                {focusCriterion.reason && (
                  <p className="text-xs leading-relaxed text-[var(--blueprint-muted)]">
                    <span className="blueprint-label mr-1.5">{shortlist.source === "nemotron" ? "Nemotron for seats" : "For seats"}</span>
                    {focusCriterion.reason}
                  </p>
                )}
                <Link
                  href={`/drivers/${focusCriterion.key}?${query}`}
                  className="mt-1 inline-flex w-fit items-center gap-1.5 text-xs font-medium underline-offset-4 hover:underline"
                >
                  Open the {focusCriterion.label.toLowerCase()} page <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-[var(--blueprint-muted)]">
                Drag a point outward to weight a driver more, inward to weight it less. The ranking re-sorts across
                all {shortlist.supplierCount.toLocaleString("en")} suppliers as you drag. Click a driver to see what it means.
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!edited}
            onClick={() => {
              setValues(initial);
              commit(initial, shortlist.instruction);
            }}
            className="w-fit rounded-none border-[var(--blueprint-rule)] bg-transparent"
          >
            Reset weighting
          </Button>
          <section aria-labelledby="seat-weights-heading" className="text-xs">
            <h3 id="seat-weights-heading" className="blueprint-label mb-1">The {shown.length} drivers that matter for seats</h3>
            <ul className="grid grid-cols-2 gap-x-5">
              {shown.map((key) => (
                <li key={key} className="flex justify-between gap-2 border-t border-[var(--blueprint-rule)] py-1">
                  <Link href={`/drivers/${key}?${query}`} className="truncate hover:underline">{CRITERION_BY_KEY[key].label}</Link>
                  <span className="font-mono tabular-nums">{(weights[key] * 100).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
