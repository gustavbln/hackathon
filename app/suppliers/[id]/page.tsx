import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatWorkspace } from "@/components/chat/chat-dock";
import { toBoardRow } from "@/components/leaderboard/board-rows";
import { detailContext } from "@/components/leaderboard/detail-context";
import { DetailShell } from "@/components/leaderboard/detail-shell";
import { SupplierDetail } from "@/components/leaderboard/supplier-detail";
import { loadDatasetSuppliers } from "@/lib/suppliers/dataset";
import { rankSuppliers } from "@/lib/suppliers/scoring";

export const metadata: Metadata = {
  title: "Supplier | ComplyDo Solutions",
  description: "Why a supplier carries its risk, and which suppliers offer a different risk profile.",
};

export default async function SupplierPage({ params, searchParams }: PageProps<"/suppliers/[id]">) {
  const { id } = await params;
  const { seat, w } = await searchParams;
  const context = detailContext(seat, w);
  const suppliers = await loadDatasetSuppliers();
  const ranked = rankSuppliers(suppliers, context.weights);
  const entry = ranked.find(({ supplier }) => supplier.id === id);
  if (!entry) notFound();

  const row = toBoardRow(entry, { ranked, weights: context.weights, defaultRanks: null }, true);

  return (
    <ChatWorkspace>
      <DetailShell
        backHref={context.backHref}
        section="Supplier / Seats"
        page={{ page: "supplier", supplierId: row.id, seatId: context.seatId, weights: context.weights }}
      >
        <section className="pt-7 pb-6 sm:pt-9">
          <p className="blueprint-label mb-2">03 / Supplier details</p>
          <p className="text-sm text-[var(--blueprint-muted)]">
            Ranked {row.rank} of {suppliers.length.toLocaleString("en")} with{" "}
            {context.fromSeatView ? "the seat view's priorities" : "the EN-standard seat profile"}. Anonymized Siemens
            dataset.
          </p>
        </section>
        <SupplierDetail supplier={row} supplierCount={suppliers.length} weights={context.weights} query={context.query} />
      </DetailShell>
    </ChatWorkspace>
  );
}
