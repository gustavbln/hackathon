import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatWorkspace } from "@/components/chat/chat-dock";
import { detailContext } from "@/components/leaderboard/detail-context";
import { DetailShell } from "@/components/leaderboard/detail-shell";
import { SupplierDetail } from "@/components/leaderboard/supplier-detail";
import { ResearchedProfile } from "@/components/research/researched-profile";
import { findResearched } from "@/lib/research/store";
import { CRITERION_BY_KEY, type Weights } from "@/lib/suppliers/criteria";
import { loadDatasetSuppliers } from "@/lib/suppliers/dataset";
import { findAlternatives, rankSuppliers, topDriver, type Alternatives } from "@/lib/suppliers/scoring";
import type { Supplier } from "@/lib/suppliers/types";

const ALTERNATIVE_COUNT = 3;

export const metadata: Metadata = {
  title: "Supplier | ComplyDo Solutions",
  description: "The biggest risks of a supplier, why they weigh, and which suppliers offer a different risk profile.",
};

export default async function SupplierPage({ params, searchParams }: PageProps<"/suppliers/[id]">) {
  const { id } = await params;
  const { seat, w } = await searchParams;
  const context = detailContext(seat, w);
  if (id.startsWith("EXT_")) {
    const researched = await findResearched(id);
    if (!researched) notFound();
    return (
      <ChatWorkspace>
        <DetailShell backHref={context.backHref} section="Researched supplier / Seats" page={{ page: "researched", supplierId: researched.id, seatId: context.seatId, weights: context.weights }}>
          <section className="pt-7 pb-6 sm:pt-9" aria-labelledby="supplier-heading">
            <p className="blueprint-label mb-2">03 / Researched supplier · public sources</p>
            <h1 id="supplier-heading" className="text-3xl font-medium tracking-tight sm:text-4xl">{researched.name}</h1>
          </section>
          <ResearchedProfile researched={researched} weights={context.weights} query={context.query} />
        </DetailShell>
      </ChatWorkspace>
    );
  }
  const suppliers = await loadDatasetSuppliers();
  const ranked = rankSuppliers(suppliers, context.weights);
  const entry = ranked.find(({ supplier }) => supplier.id === id);
  if (!entry) notFound();
  const { supplier, rank } = entry;

  return (
    <ChatWorkspace>
      <DetailShell
        backHref={context.backHref}
        section="Supplier / Seats"
        page={{ page: "supplier", supplierId: supplier.id, seatId: context.seatId, weights: context.weights }}
      >
        <section className="pt-7 pb-6 sm:pt-9" aria-labelledby="supplier-heading">
          <p className="blueprint-label mb-2">03 / Supplier · {supplier.id}</p>
          <h1 id="supplier-heading" className="text-3xl font-medium tracking-tight sm:text-4xl">
            {supplier.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--blueprint-muted)]">
            Ranked {rank.toLocaleString("en")} of {suppliers.length.toLocaleString("en")} with{" "}
            {context.fromSeatView ? "the seat view's priorities" : "the EN-standard seat profile"}. Anonymized Siemens dataset.
          </p>
        </section>
        <SupplierDetail scores={supplier.scores} weights={context.weights} query={context.query} />
        <AlternativeRow
          supplier={supplier}
          found={findAlternatives(supplier, ranked, context.weights, ALTERNATIVE_COUNT)}
          weights={context.weights}
          query={context.query}
        />
      </DetailShell>
    </ChatWorkspace>
  );
}

function AlternativeRow({ supplier, found, weights, query }: {
  supplier: Supplier; found: Alternatives | null; weights: Weights; query: string;
}) {
  if (!found || found.alternatives.length === 0) return null;
  const driverLabel = CRITERION_BY_KEY[found.driver].label;

  return (
    <nav aria-labelledby="alternatives-heading" className="mt-8 max-w-5xl">
      <h2 id="alternatives-heading" className="blueprint-label mb-2">
        {found.kind === "better-on-driver"
          ? `Alternatives · clearly lower ${driverLabel.toLowerCase()} risk`
          : `Alternatives · similar risk, a weak spot other than ${driverLabel.toLowerCase()}`}
      </h2>
      <div className="flex flex-wrap gap-2">
        {found.alternatives.map(({ supplier: alternative, risk }) => {
          const shown = found.kind === "better-on-driver" ? found.driver : (topDriver(alternative.scores, weights) ?? found.driver);
          return (
            <Link
              key={alternative.id}
              href={`/suppliers/${alternative.id}?${query}`}
              className="rounded-sm border border-[var(--blueprint-rule)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--blueprint-grid)]"
            >
              {alternative.name}
              <span className="ml-2 inline-block font-mono text-[11px] whitespace-nowrap text-[var(--blueprint-muted)] tabular-nums">
                risk {risk.worst.toFixed(1)} · {CRITERION_BY_KEY[shown].label.toLowerCase()} {alternative.scores[shown]}
                {found.kind === "better-on-driver" && ` vs ${supplier.scores[found.driver]}`}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
