"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { CRITERIA } from "@/lib/suppliers/criteria";
import {
  COMPONENT_LABEL,
  TRAIN_TYPE_LABEL,
  type ComponentId,
  type Profile,
  type TrainType,
} from "@/lib/suppliers/profiles";
import type { Supplier } from "@/lib/suppliers/types";
import { CriterionCharts } from "./criterion-charts";
import { LeaderboardTable } from "./leaderboard-table";
import { ProfileControls } from "./profile-controls";

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
}

interface BoardViewProps {
  profile: Profile;
  rows: BoardRow[];
  supplierCount: number;
}

export function BoardView({ profile, rows, supplierCount }: BoardViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  const criteria = [...CRITERIA].sort((a, b) => profile.weights[b.key] - profile.weights[a.key]);
  const isDefault = profile.component === "all";

  function selectProfile(component: ComponentId, trainType: TrainType) {
    startTransition(() => router.replace(`?component=${component}&train=${trainType}`, { scroll: false }));
  }

  return (
    <section aria-labelledby="board-heading" className="flex flex-col gap-8">
      <header className="flex flex-col gap-6 border-b border-[var(--blueprint-rule)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="blueprint-label mb-3">Supplier benchmark</p>
          <h1 id="board-heading" className="text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
            {isDefault
              ? "Which suppliers carry the least risk?"
              : `Who should build the ${COMPONENT_LABEL[profile.component].toLowerCase()}?`}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--blueprint-muted)]">
            {supplierCount.toLocaleString("en")} suppliers from the Siemens dataset, ranked{" "}
            {isDefault
              ? "with the dataset's own risk weighting"
              : `for ${TRAIN_TYPE_LABEL[profile.trainType].toLowerCase()} trains`}
            . Lower risk ranks higher.
          </p>
        </div>
        <ProfileControls profile={profile} onChange={selectProfile} />
      </header>

      <div
        aria-busy={isPending}
        className={cn(
          "grid gap-8 transition-opacity xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
          isPending && "opacity-60",
        )}
      >
        <LeaderboardTable
          rows={rows}
          criteria={criteria}
          supplierCount={supplierCount}
          activeId={activeId}
          onActivate={setActiveId}
        />
        <CriterionCharts
          contenders={rows.slice(0, CONTENDER_COUNT)}
          criteria={criteria}
          weights={profile.weights}
          activeId={activeId}
          onActivate={setActiveId}
        />
      </div>
    </section>
  );
}
