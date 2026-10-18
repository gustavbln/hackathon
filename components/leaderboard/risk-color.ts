import { riskLevel, type RiskLevel } from "@/lib/suppliers/criteria";

/** Overall scores use the full level palette. */
export const LEVEL_COLOR: Record<RiskLevel, string> = {
  low: "var(--risk-low)",
  medium: "var(--risk-medium)",
  high: "var(--risk-high)",
  critical: "var(--risk-critical)",
};

const ink = (percent: number) => `color-mix(in oklab, var(--blueprint-ink) ${percent}%, transparent)`;

/** Single criteria keep low and medium in ink, so high and critical scores stand out. */
const CRITERION_COLOR = {
  quiet: { low: ink(18), medium: ink(42), high: "var(--risk-high)", critical: "var(--risk-critical)" },
  visible: { low: ink(40), medium: ink(68), high: "var(--risk-high)", critical: "var(--risk-critical)" },
} satisfies Record<string, Record<RiskLevel, string>>;

export function criterionColor(score: number | null, tone: keyof typeof CRITERION_COLOR = "quiet"): string {
  return score === null ? "transparent" : CRITERION_COLOR[tone][riskLevel(score)];
}

export function inkColor(percent: number): string {
  return ink(percent);
}
