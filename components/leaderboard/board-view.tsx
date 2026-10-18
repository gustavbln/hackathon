"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CRITERIA, type CriterionKey } from "@/lib/suppliers/criteria";
import { COMPONENT_LABEL, type ComponentId, type Profile } from "@/lib/suppliers/profiles";
import type { Alternatives } from "@/lib/suppliers/scoring";
import type { Supplier } from "@/lib/suppliers/types";
import { cn } from "@/lib/utils";
import { ContenderMatrix } from "./contender-matrix";
import { ProfileControls } from "./profile-controls";
import { RankingList } from "./ranking-list";
import { LEVEL_COLOR } from "./risk-color";
import { SupplierFocus } from "./supplier-focus";

const CONTENDER_COUNT = 20;

export interface BoardRow {
  id: string;
  name: string;
  origin: Supplier["origin"];
  rank: number;
  risk: number;
  /** Places gained against the dataset's default ranking; null when the profile is the default. */
  rankChange: number | null;
  scores: Supplier["scores"];
  /** Suppliers clearly better on this one's biggest risk driver; null when not computed. */
  alternatives: { driver: CriterionKey; kind: Alternatives["kind"]; rows: BoardRow[] } | null;
}

interface BoardViewProps {
  profile: Profile;
  rows: BoardRow[];
  supplierCount: number;
}

export function BoardView({ profile, rows, supplierCount }: BoardViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<BoardRow | null>(null);
  const [preview, setPreview] = useState<BoardRow | null>(null);
  const [activeCriterion, setActiveCriterion] = useState<CriterionKey | null>(null);

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--blueprint-muted)]">No suppliers to rank.</p>;
  }

  const criteria = [...CRITERIA].sort((a, b) => profile.weights[b.key] - profile.weights[a.key]);
  const focused = preview ?? selected ?? rows[0];

  function selectComponent(component: ComponentId) {
    startTransition(() => router.replace(`?component=${component}`, { scroll: false }));
  }

  return (
    <section aria-labelledby="board-heading" className="flex flex-col gap-8">
      <header className="flex flex-col gap-6 border-b border-[var(--blueprint-rule)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="blueprint-label mb-3">Supplier benchmark</p>
          <h1 id="board-heading" className="text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
            {profile.component === "all"
              ? "Which suppliers carry the least risk?"
              : `Who should build the ${COMPONENT_LABEL[profile.component].toLowerCase()}?`}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--blueprint-muted)]">
            {supplierCount.toLocaleString("en")} suppliers from the Siemens dataset, weighted for what this component
            needs. Lower risk ranks higher.
          </p>
        </div>
        <ProfileControls profile={profile} onChange={selectComponent} />
      </header>

      <div aria-busy={isPending} className={cn("flex flex-col gap-10 transition-opacity", isPending && "opacity-60")}>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <RankingList
            rows={rows}
            supplierCount={supplierCount}
            criteria={criteria}
            weights={profile.weights}
            focusedId={focused.id}
            onSelect={setSelected}
            onPreview={setPreview}
          />
          <div className="flex min-w-0 flex-col gap-3">
            <Legend />
            <SupplierFocus
              supplier={focused}
              supplierCount={supplierCount}
              criteria={criteria}
              weights={profile.weights}
              activeCriterion={activeCriterion}
              onCriterionHover={setActiveCriterion}
              onSelect={setSelected}
            />
          </div>
        </div>
        <ContenderMatrix
          contenders={rows.slice(0, CONTENDER_COUNT)}
          criteria={criteria}
          focusedId={focused.id}
          activeCriterion={activeCriterion}
          onCriterionHover={setActiveCriterion}
          onSelect={setSelected}
          onPreview={setPreview}
        />
      </div>
    </section>
  );
}

function Legend() {
  return (
    <ul aria-label="Risk levels" className="blueprint-label flex flex-wrap items-center justify-end gap-4">
      {(["low", "medium", "high", "critical"] as const).map((level) => (
        <li key={level} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: LEVEL_COLOR[level] }} />
          {level}
        </li>
      ))}
    </ul>
  );
}
