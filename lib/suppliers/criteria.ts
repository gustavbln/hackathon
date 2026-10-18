export type CriterionGroup = "company" | "location";

interface Criterion {
  key: string;
  column: string;
  label: string;
  description: string;
  weight: number;
  group: CriterionGroup;
}

/**
 * The 18 risk criteria (0 = no risk, 100 = maximum risk). `weight` is each criterion's share of the
 * dataset's Total_Risk_Index: fitted on all 10,000 rows (R² 0.9996, differences are rounding only).
 * The location group (environment, geopolitics, politics) moves independently of the company group.
 */
export const CRITERIA = [
  { key: "financialHealth", column: "Financial_Health_Score", label: "Financial health", description: "Financial stability, liquidity and bankruptcy risk.", weight: 0.1, group: "company" },
  { key: "operationalResilience", column: "Operational_Resilience_Score", label: "Operational resilience", description: "Risks to day-to-day production and logistics.", weight: 0.1, group: "company" },
  { key: "quality", column: "Quality_Risk_Score", label: "Quality", description: "Product defects, recalls and failures in quality management.", weight: 0.1, group: "company" },
  { key: "compliance", column: "Compliance_Risk_Score", label: "Compliance", description: "Lawsuits, regulatory fines and legal disputes.", weight: 0.08, group: "company" },
  { key: "subTierVisibility", column: "Sub_Tier_Visibility_Score", label: "Sub-tier visibility", description: "Risks hidden in the supplier's own supply chain (Tier-N).", weight: 0.06, group: "company" },
  // Workplace accidents at the supplier, not product safety.
  { key: "workplaceSafety", column: "Safety_Incident_Score", label: "Workplace safety", description: "Frequency and severity of industrial accidents at the supplier.", weight: 0.06, group: "company" },
  { key: "creditRating", column: "Credit_Rating_Score", label: "Credit rating", description: "Creditworthiness by international rating standards.", weight: 0.06, group: "company" },
  { key: "esg", column: "ESG_Performance_Score", label: "ESG", description: "Sustainability and ethics: environment, social and governance.", weight: 0.05, group: "company" },
  { key: "governance", column: "Governance_Risk_Score", label: "Governance", description: "Leadership, ethics and internal controls.", weight: 0.05, group: "company" },
  { key: "geopolitical", column: "Geopolitical_Risk_Score", label: "Geopolitical", description: "Exposure to regional instability and humanitarian crises.", weight: 0.05, group: "location" },
  { key: "industryBenchmark", column: "Industry_Benchmark_Score", label: "Industry benchmark", description: "Risk performance compared with industry and regional peers.", weight: 0.04, group: "company" },
  { key: "laborStability", column: "Labor_Stability_Score", label: "Labor stability", description: "Strikes, protests and labour disputes at supplier sites.", weight: 0.04, group: "company" },
  { key: "environmentalExposure", column: "Environmental_Exposure_Score", label: "Environmental exposure", description: "Physical hazards such as earthquakes, floods and extreme weather.", weight: 0.04, group: "location" },
  { key: "digitalSecurity", column: "Digital_Security_Score", label: "Digital security", description: "Data breaches, hacking and IT infrastructure failures.", weight: 0.04, group: "company" },
  { key: "politicalStability", column: "Political_Stability_Score", label: "Political stability", description: "Political unrest or government changes affecting operations.", weight: 0.04, group: "location" },
  { key: "mediaSentiment", column: "Media_Sentiment_Score", label: "Media sentiment", description: "Risk signals from news, social media and public reports.", weight: 0.03, group: "company" },
  { key: "externalIntelligence", column: "External_Intelligence_Score", label: "External intelligence", description: "Risk data from third-party intelligence and databases.", weight: 0.03, group: "company" },
  { key: "marketSentiment", column: "Market_Sentiment_Score", label: "Market sentiment", description: "Public and consumer perception of the supplier.", weight: 0.03, group: "company" },
] as const satisfies readonly Criterion[];

export type CriterionInfo = (typeof CRITERIA)[number];
export type CriterionKey = CriterionInfo["key"];
export type Weights = Record<CriterionKey, number>;

export const CRITERION_BY_KEY = Object.fromEntries(
  CRITERIA.map((criterion) => [criterion.key, criterion]),
) as Record<CriterionKey, CriterionInfo>;

export const TOTAL_RISK_WEIGHTS = Object.fromEntries(
  CRITERIA.map((criterion) => [criterion.key, criterion.weight]),
) as Weights;

export type RiskLevel = "low" | "medium" | "high" | "critical";

/** The dataset's own level cut-offs, also used for weighted profile scores. */
export function riskLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}
