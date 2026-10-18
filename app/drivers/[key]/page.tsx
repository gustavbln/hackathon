import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatWorkspace } from "@/components/chat/chat-dock";
import { DriverShortlist } from "@/components/drivers/driver-shortlist";
import type { DriverSupplier } from "@/components/drivers/driver-types";
import { AskButtons } from "@/components/leaderboard/ask-buttons";
import { detailContext } from "@/components/leaderboard/detail-context";
import { DetailShell } from "@/components/leaderboard/detail-shell";
import { CRITERIA, CRITERION_BY_KEY } from "@/lib/suppliers/criteria";
import { loadDatasetSuppliers } from "@/lib/suppliers/dataset";
import { buildProfile } from "@/lib/suppliers/profiles";
import { rankSuppliers } from "@/lib/suppliers/scoring";

const SHORTLIST_SIZE = 20;
const percent = (weight: number) => `${(weight * 100).toFixed(1)}%`;

export const metadata: Metadata = {
  title: "Risk driver | ComplyDo Solutions",
  description: "What a risk driver means for seats, how much it weighs, and who is strongest on it.",
};

export default async function DriverPage({ params, searchParams }: PageProps<"/drivers/[key]">) {
  const { key } = await params;
  const criterion = CRITERIA.find((candidate) => candidate.key === key);
  if (!criterion) notFound();
  const { seat, w } = await searchParams;
  const context = detailContext(seat, w);

  const suppliers = await loadDatasetSuppliers();
  const shortlist: DriverSupplier[] = rankSuppliers(suppliers, context.weights)
    .slice(0, SHORTLIST_SIZE)
    .map(({ supplier, rank, risk }) => ({
      id: supplier.id,
      name: supplier.name,
      rank,
      risk: Math.round(risk.worst * 10) / 10,
      score: supplier.scores[criterion.key],
    }));

  const scores = suppliers.flatMap(({ scores: values }) => (values[criterion.key] === null ? [] : [values[criterion.key] ?? 0]));
  const sorted = scores.toSorted((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const critical = scores.filter((score) => score >= 75).length;
  const known = shortlist.flatMap(({ score }) => (score === null ? [] : [score]));
  const shortlistAverage = known.reduce((sum, score) => sum + score, 0) / Math.max(known.length, 1);

  const weightRank = [...CRITERIA].sort((a, b) => context.weights[b.key] - context.weights[a.key]).findIndex(({ key: k }) => k === criterion.key) + 1;
  const seatProfile = buildProfile("seats");
  const boosts = seatProfile.boosts.filter((boost) => boost.criterion === criterion.key);
  const boostedLabels = new Intl.ListFormat("en").format(seatProfile.boosts.map((boost) => CRITERION_BY_KEY[boost.criterion].label));

  return (
    <ChatWorkspace>
      <DetailShell
        backHref={context.backHref}
        section="Risk driver / Seats"
        page={{ page: "driver", driverKey: criterion.key, seatId: context.seatId, weights: context.weights }}
      >
        <section className="pt-7 pb-6 sm:pt-9" aria-labelledby="driver-heading">
          <p className="blueprint-label mb-2">03 / Risk driver · {criterion.group === "location" ? "location risk" : "company risk"}</p>
          <h1 id="driver-heading" className="text-3xl font-medium tracking-tight sm:text-4xl">{criterion.label}</h1>
        </section>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-[var(--blueprint-rule)] bg-[var(--blueprint-rule)] lg:grid-cols-4">
          <StatTile label="Weight for this seat" value={percent(context.weights[criterion.key])} note={`#${weightRank} of ${CRITERIA.length} drivers`} />
          <StatTile label="Median of all suppliers" value={String(median)} note="On the 0–100 risk scale" />
          <StatTile label="Critical (75 or more)" value={critical.toLocaleString("en")} note={`${Math.round((critical / scores.length) * 100)}% of all suppliers`} />
          <StatTile label={`Your top ${shortlist.length}, average`} value={shortlistAverage.toFixed(1)} note={shortlistAverage < median ? "Better than the median" : "Not better than the median"} />
        </dl>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="meaning-heading" className="flex min-w-0 flex-col gap-6 rounded-sm border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] p-5 sm:p-6">
            <h2 id="meaning-heading" className="sr-only">What {criterion.label.toLowerCase()} means for seats</h2>
            <div>
              <h3 className="blueprint-label mb-2">What it measures</h3>
              <p className="text-lg leading-relaxed">{criterion.description}</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--blueprint-muted)]">
                {criterion.group === "location"
                  ? "A location risk: it follows where the supplier operates, not how the company is run. "
                  : "A company risk: it follows how the supplier itself is run. "}
                Scored from 0 (no risk) to 100 (maximum risk) in the dataset column {criterion.column}.
              </p>
            </div>
            <div>
              <h3 className="blueprint-label mb-2">Why it matters for seats</h3>
              {boosts.length > 0 ? (
                <ul className="flex flex-col gap-2 text-base leading-relaxed">
                  {boosts.map((boost) => (
                    <li key={boost.reason} className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-[var(--blueprint-muted)] tabular-nums">×{boost.factor}</span>
                      {boost.reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base leading-relaxed">
                  No seat-specific boost: the EN-standard seat profile raises only {boostedLabels}. This driver keeps its
                  Siemens weight, which those boosts dilute slightly.
                </p>
              )}
            </div>
            <div>
              <h3 className="blueprint-label mb-2">How much it weighs</h3>
              <dl className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 text-sm">
                <WeightRow label="Siemens Total Risk Index" weight={criterion.weight} />
                <WeightRow label="EN-standard seat profile" weight={seatProfile.weights[criterion.key]} note={boosts.map((boost) => `×${boost.factor}`).join(" ")} />
                {context.fromSeatView && <WeightRow label="Your seat view" weight={context.weights[criterion.key]} note={`#${weightRank} of ${CRITERIA.length}`} />}
              </dl>
            </div>
            <div className="mt-auto">
              <AskButtons
                explain={{ label: "What does it mean for seats?", question: `What does ${criterion.label} mean for seats?` }}
                webQuestion={`Context from the web: which standards and regulations relate to ${criterion.label.toLowerCase()} risk for train seat suppliers?`}
              />
            </div>
          </section>
          <DriverShortlist label={criterion.label} shortlist={shortlist} median={median} query={context.query} />
        </div>
        <p className="blueprint-label mt-4">
          Weighted with {context.fromSeatView ? "the seat view's priorities" : "the EN-standard seat profile"} · anonymized Siemens dataset
        </p>
      </DetailShell>
    </ChatWorkspace>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-[var(--blueprint-paper-deep)] p-4">
      <dt className="text-xs text-[var(--blueprint-muted)]">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight">{value}</dd>
      <dd className="mt-1 text-[11px] text-[var(--blueprint-muted)]">{note}</dd>
    </div>
  );
}

function WeightRow({ label, weight, note = "" }: { label: string; weight: number; note?: string }) {
  return (
    <>
      <dt className="text-[var(--blueprint-muted)]">{label}</dt>
      <dd className="text-right font-mono tabular-nums">{percent(weight)}</dd>
      <dd className="font-mono text-xs text-[var(--blueprint-muted)]">{note}</dd>
    </>
  );
}
