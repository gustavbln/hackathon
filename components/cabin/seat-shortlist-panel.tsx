"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpIcon, XIcon } from "lucide-react";

import { AssistantAvatar } from "@/components/chat/assistant-avatar";
import { useChatFocus } from "@/components/chat/chat-focus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PageContext } from "@/lib/chat-contract";
import { seatShortlistSchema, type SeatShortlist, type ShortlistSource } from "@/lib/seat-shortlist-contract";
import { CRITERION_BY_KEY, type CriterionKey, type Weights } from "@/lib/suppliers/criteria";
import { encodeWeights } from "@/lib/suppliers/profiles";
import { topByWeights } from "@/lib/suppliers/scoring";
import { SupplierColumns, type ColumnSupplier } from "./supplier-columns";
import { useSupplierScores } from "./use-supplier-scores";
import { WeightSpider } from "./weight-spider";

const SHORTLIST_SIZE = 20;
const START_SHARE = 0.6;

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; shortlist: SeatShortlist };

type ShortlistRequest = { source: ShortlistSource; instruction: string | null };

const requestKey = ({ source, instruction }: ShortlistRequest) => `${source}:${instruction ?? ""}`;

async function fetchShortlist({ source, instruction }: ShortlistRequest, signal: AbortSignal) {
  const params = new URLSearchParams({ source, ...(instruction && { instruction }) });
  const response = await fetch(`/api/seat-shortlist?${params}`, { signal });
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
  const [request, setRequest] = useState<ShortlistRequest>({ source: "nemotron", instruction: null });
  const [startWeights, setStartWeights] = useState(initialWeights);
  // A missing entry means "not fetched yet"; ready and failed results stay cached per request.
  const [loads, setLoads] = useState<Record<string, Load>>({});
  const key = requestKey(request);
  const entry = loads[key];
  const load = entry ?? { state: "loading" };
  const { setPage } = useChatFocus();
  useEffect(() => () => setPage(null), [setPage]);

  useEffect(() => {
    if (entry) return;
    const controller = new AbortController();
    fetchShortlist(request, controller.signal).then(
      (shortlist) => setLoads((current) => ({ ...current, [key]: { state: "ready", shortlist } })),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "The seat shortlist failed. Please retry.";
        setLoads((current) => ({ ...current, [key]: { state: "error", message } }));
      },
    );
    return () => controller.abort();
  }, [request, key, entry]);

  function retry() {
    setLoads((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  return (
    <section
      aria-label="Seat supplier shortlist"
      onKeyDown={(event) => event.key === "Escape" && onClose()}
      className="@container/shortlist flex min-h-[40rem] min-w-0 flex-col border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] text-[var(--blueprint-ink)] animate-in fade-in-0 slide-in-from-right-4 duration-500 motion-reduce:animate-none"
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

      <RerankForm
        instruction={request.instruction}
        disabled={load.state === "loading"}
        onRerank={(instruction) => {
          // An explicit Nemotron re-rank replaces the buyer's dragged weights.
          setStartWeights(null);
          setRequest({ source: "nemotron", instruction });
        }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {load.state === "loading" && <ShortlistLoading source={request.source} />}
        {load.state === "error" && (
          <div role="alert" className="flex flex-col items-start gap-3 p-5 text-sm">
            <p>{load.message}</p>
            <Button variant="outline" size="sm" className="rounded-none border-[var(--blueprint-rule)] bg-transparent" onClick={retry}>
              Retry
            </Button>
          </div>
        )}
        {load.state === "ready" && (
          // A new weighting from the server or the assistant starts a fresh drag state.
          <ShortlistResult
            key={load.shortlist.criteria.map(({ key: criterion, weightPercent }) => `${criterion}${weightPercent.toFixed(2)}`).join()}
            shortlist={load.shortlist}
            seatId={seatId}
            startWeights={startWeights}
          />
        )}
      </div>
    </section>
  );
}

/** The buyer steers the weights in their own words; Nemotron re-scores, the ranking follows. */
function RerankForm({ instruction, disabled, onRerank }: {
  instruction: string | null; disabled: boolean; onRerank: (instruction: string | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const text = draft.trim();

  if (instruction) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-[var(--blueprint-rule)] py-2 pr-2 pl-5 text-xs">
        <p className="min-w-0 truncate">
          <span className="blueprint-label mr-2">Re-ranked</span>
          {instruction}
        </p>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 rounded-none text-xs hover:bg-[var(--blueprint-grid)]" onClick={() => onRerank(null)}>
          Reset
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex items-center gap-2 border-b border-[var(--blueprint-rule)] py-1.5 pr-2 pl-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!text || disabled) return;
        onRerank(text.slice(0, 300));
        setDraft("");
      }}
    >
      <label htmlFor="seat-rerank" className="blueprint-label shrink-0">Re-rank</label>
      <input
        id="seat-rerank"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={300}
        placeholder="e.g. ESG matters most, sentiment barely matters"
        className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--blueprint-muted)]"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={!text || disabled}
        aria-label="Re-rank with Nemotron"
        className="rounded-none hover:bg-[var(--blueprint-grid)] hover:text-[var(--blueprint-ink)]"
      >
        <ArrowUpIcon strokeWidth={1.5} />
      </Button>
    </form>
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

/** Spider values for a weighting: the top driver sits at 60% of the radius, so any driver can be pulled out past it. */
function toSpiderValues(weights: Record<CriterionKey, number>): Record<CriterionKey, number> {
  const max = Math.max(...Object.values(weights)) || 1;
  return Object.fromEntries(Object.entries(weights).map(([key, weight]) => [key, (weight / max) * START_SHARE])) as Record<CriterionKey, number>;
}

function ShortlistResult({ shortlist, seatId, startWeights }: { shortlist: SeatShortlist; seatId: string; startWeights: Weights | null }) {
  const router = useRouter();
  const { setPage, onAction } = useChatFocus();
  const matrix = useSupplierScores();
  const keys = useMemo(() => shortlist.criteria.map(({ key }) => key), [shortlist]);
  const initial = useMemo(
    () => toSpiderValues(Object.fromEntries(shortlist.criteria.map(({ key, weightPercent }) => [key, weightPercent])) as Record<CriterionKey, number>),
    [shortlist],
  );
  const [values, setValues] = useState(() => (startWeights ? toSpiderValues(startWeights) : initial));
  const [committed, setCommitted] = useState(values);
  const [instruction, setInstruction] = useState(startWeights ? null : shortlist.instruction);
  const [active, setActive] = useState<CriterionKey | null>(null);

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
        activePoints: active ? weights[active] * (matrix.scores[row * matrix.keys.length + matrix.keys.indexOf(active)] ?? 0) : null,
      }))
    : shortlist.suppliers.map(({ id, name, risk, contributions }) => ({
        id,
        name,
        risk,
        activePoints: active ? (contributions[active] ?? 0) : null,
      }));

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
      const next = toSpiderValues(action.weights as Record<CriterionKey, number>);
      setValues(next);
      commit(next, action.instruction);
    } else if (action.type === "highlight_driver") {
      setActive(action.driverKey);
    }
  }), [onAction, commit]);
  const activeCriterion = shortlist.criteria.find(({ key }) => key === active);

  return (
    <div className="flex flex-col gap-6 p-5">
      <SupplierColumns
        suppliers={top}
        supplierCount={shortlist.supplierCount}
        active={active}
        onOpen={(id) => router.push(`/suppliers/${id}?${query}`)}
      />

      <div className="grid gap-6 border-t border-[var(--blueprint-rule)] pt-5 @min-[680px]/shortlist:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <section aria-labelledby="seat-criteria-heading" className="flex min-w-0 flex-col items-center gap-2">
          <h3 id="seat-criteria-heading" className="blueprint-label self-start">Priorities · drag a point to reweight</h3>
          <WeightSpider
            keys={keys}
            values={values}
            active={active}
            onActive={setActive}
            onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
            onCommit={() => commit(values)}
            hrefFor={(key) => `/drivers/${key}?${query}`}
          />
        </section>

        <aside className="flex min-w-0 flex-col gap-4 text-sm" aria-live="polite">
          <div>
            <p className="blueprint-label mb-1">
              {edited ? "Your weighting" : shortlist.source === "nemotron" ? "Nemotron's weighting" : "EN-standard weighting"}
            </p>
            {activeCriterion ? (
              <>
                <p className="font-medium">
                  {activeCriterion.label} · {(weights[activeCriterion.key] * 100).toFixed(1)}%
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--blueprint-muted)]">
                  {activeCriterion.reason ?? CRITERION_BY_KEY[activeCriterion.key].description}
                </p>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-[var(--blueprint-muted)]">
                Drag a point outward to weight a driver more, inward to weight it less. The columns re-rank across
                all {shortlist.supplierCount.toLocaleString("en")} suppliers as you drag. Click a driver for its details.
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
          <details className="text-xs">
            <summary className="blueprint-label cursor-pointer hover:text-[var(--blueprint-ink)]">
              All {keys.length} weights as a table
            </summary>
            <table className="mt-2 w-full">
              <caption className="sr-only">Current risk driver weights</caption>
              <tbody>
                {keys.map((key) => (
                  <tr key={key} className="border-t border-[var(--blueprint-rule)]">
                    <th scope="row" className="py-1 text-left font-normal">
                      <Link href={`/drivers/${key}?${query}`} className="hover:underline">{CRITERION_BY_KEY[key].label}</Link>
                    </th>
                    <td className="py-1 text-right font-mono tabular-nums">{(weights[key] * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </aside>
      </div>
    </div>
  );
}
