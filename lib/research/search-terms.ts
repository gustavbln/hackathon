import type { CriterionKey } from "../suppliers/criteria.ts";

export interface ResearchDesk {
  id: string;
  label: string;
  /** The driver agents that read this desk's results. */
  drivers: CriterionKey[];
  /** Appended to the quoted company name. Fixed in code so every company gets the same, reviewable plan. */
  searches: readonly [string, string];
}

/**
 * Six desks search for related drivers together: 12 searches per company instead of 36, which keeps a run within
 * Tavily's rate limit and a third of the credits. Every driver still gets its own agent that reads and judges.
 */
export const RESEARCH_DESKS: ResearchDesk[] = [
  { id: "finance", label: "Finance desk", drivers: ["financialHealth", "creditRating"], searches: ["annual report revenue net income results 2025", "profit warning loss restructuring refinancing credit rating"] },
  { id: "legal", label: "Legal desk", drivers: ["compliance", "governance"], searches: ["lawsuit fine investigation court proceedings", "management board CEO change corporate governance"] },
  { id: "operations", label: "Operations desk", drivers: ["quality", "operationalResilience", "subTierVisibility", "digitalSecurity"], searches: ["recall defect quality production problems", "plant closure supply chain disruption cyber attack"] },
  { id: "people", label: "People & environment desk", drivers: ["workplaceSafety", "laborStability", "esg"], searches: ["sustainability report CO2 emissions EcoVadis", "workplace accident strike union layoffs"] },
  { id: "location", label: "Location desk", drivers: ["geopolitical", "politicalStability", "environmentalExposure"], searches: ["plants countries production locations", "geopolitical risk sanctions tariffs natural disaster"] },
  { id: "reputation", label: "Reputation desk", drivers: ["mediaSentiment", "marketSentiment", "externalIntelligence", "industryBenchmark"], searches: ["news controversy criticism reputation", "market share competitors analysts share price"] },
];
