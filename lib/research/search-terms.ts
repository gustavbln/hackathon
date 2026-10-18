import type { CriterionKey } from "../suppliers/criteria.ts";

/**
 * Three searches per driver agent, appended to the quoted company name: the core question, recent news, and an
 * official or third-party angle. Fixed in code so every company gets the same reviewable plan (Lightning invented
 * unusable queries when asked to plan).
 */
export const SEARCH_TERMS: Record<CriterionKey, readonly [string, string, string]> = {
  financialHealth: ["annual report revenue net income results", "profit warning loss restructuring 2025 2026", "refinancing liquidity equity ratio"],
  operationalResilience: ["plant closure production stop", "supply disruption capacity 2025 2026", "production sites manufacturing footprint"],
  quality: ["recall defect quality problems", "quality issues customers 2025 2026", "quality certification IATF IRIS award"],
  compliance: ["lawsuit fine investigation", "court proceedings regulator 2025 2026", "antitrust penalty compliance violation"],
  subTierVisibility: ["supply chain due diligence suppliers", "supplier problems bottleneck 2025 2026", "supplier code of conduct human rights"],
  workplaceSafety: ["workplace accident injury", "occupational safety incident 2025 2026", "lost time injury rate safety report"],
  creditRating: ["credit rating outlook", "rating downgrade upgrade 2025 2026", "bond loan covenant financing"],
  esg: ["sustainability report CO2 targets", "ESG rating EcoVadis CDP 2025", "emissions environmental controversy"],
  governance: ["management board CEO change", "governance shareholder dispute 2025 2026", "major shareholder ownership takeover"],
  geopolitical: ["production countries locations", "sanctions tariffs China exposure 2025 2026", "geopolitical risk supply chain"],
  industryBenchmark: ["market share competitors", "compared with peers 2025", "industry ranking position"],
  laborStability: ["strike union works council", "job cuts layoffs protest 2025 2026", "collective agreement workforce"],
  environmentalExposure: ["plant flood earthquake extreme weather", "natural disaster factory site", "climate physical risk locations"],
  digitalSecurity: ["cyber attack ransomware", "data breach IT outage 2025 2026", "information security certification TISAX"],
  politicalStability: ["political risk countries operations", "government policy trade restrictions 2025 2026", "country risk exposure"],
  mediaSentiment: ["news controversy criticism", "press coverage 2025 2026", "reputation scandal"],
  externalIntelligence: ["analyst risk assessment", "rating agency report 2025", "research note outlook"],
  marketSentiment: ["share price investors analysts", "stock outlook 2025 2026", "customer perception brand"],
};
