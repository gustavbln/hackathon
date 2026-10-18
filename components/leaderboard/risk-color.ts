import { riskLevel, type RiskLevel } from "@/lib/suppliers/criteria";

export const LEVEL_COLOR: Record<RiskLevel, string> = {
  low: "var(--risk-low)",
  medium: "var(--risk-medium)",
  high: "var(--risk-high)",
  critical: "var(--risk-critical)",
};

export function scoreColor(score: number | null): string {
  return score === null ? "transparent" : LEVEL_COLOR[riskLevel(score)];
}
