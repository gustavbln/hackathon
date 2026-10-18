import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatWorkspace } from "@/components/chat/chat-dock";
import { DriverDistribution } from "@/components/drivers/driver-distribution";
import { DriverShortlist } from "@/components/drivers/driver-shortlist";
import type { DriverSupplier } from "@/components/drivers/driver-types";
import { detailContext } from "@/components/leaderboard/detail-context";
import { DetailShell } from "@/components/leaderboard/detail-shell";
import { CRITERIA } from "@/lib/suppliers/criteria";
import { loadDatasetSuppliers } from "@/lib/suppliers/dataset";
import { buildProfile } from "@/lib/suppliers/profiles";
import { rankSuppliers } from "@/lib/suppliers/scoring";

const SHORTLIST_SIZE = 20;
const BIN_WIDTH = 5;

export const metadata: Metadata = {
  title: "Risk driver | ComplyDo Solutions",
  description: "How suppliers compare on one risk driver.",
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
  const bins = Array.from({ length: 100 / BIN_WIDTH }, () => 0);
  for (const score of scores) bins[Math.min(bins.length - 1, Math.floor(score / BIN_WIDTH))] += 1;
  const critical = scores.filter((score) => score >= 75).length;
  const known = shortlist.flatMap(({ score }) => (score === null ? [] : [score]));
  const shortlistAverage = known.reduce((sum, score) => sum + score, 0) / Math.max(known.length, 1);

  const weightRank = [...CRITERIA].sort((a, b) => context.weights[b.key] - context.weights[a.key]).findIndex(({ key: k }) => k === criterion.key) + 1;
  const reasons = context.fromSeatView ? [] : buildProfile("seats").boosts.filter((boost) => boost.criterion === criterion.key);
  const focus = context.seatId
    ? { seatId: context.seatId, weights: context.weights, supplierIds: shortlist.map(({ id }) => id), instruction: null }
    : null;

  return (
    <ChatWorkspace>
      <DetailShell backHref={context.backHref} section="Risk driver / Seats" focus={focus}>
        <section className="pt-7 pb-6 sm:pt-9" aria-labelledby="driver-heading">
          <p className="blueprint-label mb-2">03 / Risk driver · {criterion.group === "location" ? "location risk" : "company risk"}</p>
          <h1 id="driver-heading" className="text-3xl font-medium tracking-tight sm:text-4xl">{criterion.label}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--blueprint-muted)]">
            {criterion.description} Scores run from 0 (no risk) to 100 (maximum risk).
            {reasons.map((boost) => ` ${boost.reason}`)}
          </p>
        </section>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-[var(--blueprint-rule)] bg-[var(--blueprint-rule)] lg:grid-cols-4">
          <StatTile label="Weight for this seat" value={`${(context.weights[criterion.key] * 100).toFixed(1)}%`} note={`#${weightRank} of ${CRITERIA.length} drivers`} />
          <StatTile label="Median of all suppliers" value={String(median)} note="On the 0–100 risk scale" />
          <StatTile label="Critical (75 or more)" value={critical.toLocaleString("en")} note={`${Math.round((critical / scores.length) * 100)}% of all suppliers`} />
          <StatTile label={`Your top ${shortlist.length}, average`} value={shortlistAverage.toFixed(1)} note={shortlistAverage < median ? "Better than the median" : "Not better than the median"} />
        </dl>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <DriverDistribution label={criterion.label} bins={bins} median={median} shortlist={shortlist} query={context.query} />
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
