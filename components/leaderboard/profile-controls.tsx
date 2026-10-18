"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CRITERION_BY_KEY } from "@/lib/suppliers/criteria";
import { COMPONENTS, parseComponent, type ComponentId, type Profile } from "@/lib/suppliers/profiles";

interface ProfileControlsProps {
  profile: Profile;
  onChange: (component: ComponentId) => void;
}

export function ProfileControls({ profile, onChange }: ProfileControlsProps) {
  return (
    <div className="flex flex-col gap-3 lg:items-end">
      <Select value={profile.component} onValueChange={(value) => onChange(parseComponent(value))}>
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
      {profile.boosts.length === 0 ? (
        <p className="blueprint-label">Siemens default weighting</p>
      ) : (
        <ul aria-label="Weighting for this component" className="flex flex-wrap gap-2">
          {profile.boosts.map((boost) => (
            <li key={boost.criterion}>
              <Tooltip>
                <TooltipTrigger className="rounded-full border border-[var(--blueprint-rule)] px-3 py-1 text-xs hover:bg-white/10">
                  {CRITERION_BY_KEY[boost.criterion].label} ×{boost.factor}
                </TooltipTrigger>
                <TooltipContent>{boost.reason}</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
