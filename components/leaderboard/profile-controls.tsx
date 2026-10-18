"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CRITERION_BY_KEY, type CriterionKey } from "@/lib/suppliers/criteria";
import {
  COMPONENTS,
  TRAIN_TYPES,
  parseComponent,
  parseTrainType,
  type Boost,
  type ComponentId,
  type Profile,
  type TrainType,
} from "@/lib/suppliers/profiles";

interface ProfileControlsProps {
  profile: Profile;
  onChange: (component: ComponentId, trainType: TrainType) => void;
}

export function ProfileControls({ profile, onChange }: ProfileControlsProps) {
  return (
    <div className="flex flex-col gap-3 lg:items-end">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={profile.component}
          onValueChange={(value) => onChange(parseComponent(value), profile.trainType)}
        >
          <SelectTrigger aria-label="Component" className="border-[var(--blueprint-rule)] text-[var(--blueprint-ink)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPONENTS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          aria-label="Train type"
          value={profile.trainType}
          disabled={profile.component === "all"}
          onValueChange={(value) => value && onChange(profile.component, parseTrainType(value))}
          className="rounded-lg border border-[var(--blueprint-rule)] p-0.5"
          spacing={0}
        >
          {TRAIN_TYPES.map((option) => (
            <ToggleGroupItem
              key={option.id}
              value={option.id}
              className="px-3 text-[var(--blueprint-ink)] hover:bg-white/10 hover:text-[var(--blueprint-ink)] data-[state=on]:bg-[var(--blueprint-ink)] data-[state=on]:text-[var(--blueprint-paper-deep)]"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <BoostChips boosts={profile.boosts} />
    </div>
  );
}

function BoostChips({ boosts }: { boosts: Boost[] }) {
  if (boosts.length === 0) {
    return <p className="blueprint-label">Siemens default weighting</p>;
  }

  const byCriterion = new Map<CriterionKey, Boost[]>();
  for (const boost of boosts) byCriterion.set(boost.criterion, [...(byCriterion.get(boost.criterion) ?? []), boost]);

  return (
    <ul aria-label="Weighting for this profile" className="flex flex-wrap gap-2">
      {[...byCriterion].map(([criterion, criterionBoosts]) => {
        const factor = criterionBoosts.reduce((product, boost) => product * boost.factor, 1);
        return (
          <li key={criterion}>
            <Tooltip>
              <TooltipTrigger className="rounded-full border border-[var(--blueprint-rule)] px-3 py-1 text-xs hover:bg-white/10">
                {CRITERION_BY_KEY[criterion].label} ×{factor.toLocaleString("en", { maximumFractionDigits: 2 })}
              </TooltipTrigger>
              <TooltipContent className="flex-col items-start">
                {criterionBoosts.map((boost) => (
                  <span key={boost.reason}>{boost.reason}</span>
                ))}
              </TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
