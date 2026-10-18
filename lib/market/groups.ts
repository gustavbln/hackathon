import { DISTRESS_EVENTS, type MarketCompany } from "./contract.ts";

export interface CompanyGroup {
  rootId: string;
  memberIds: string[];
  /** Members with an insolvency or credit default. */
  distressedIds: string[];
}

/** Every company belongs to the group of its top-most parent. Expects a validated market file. */
export function companyGroups(companies: readonly MarketCompany[]): Map<string, CompanyGroup> {
  const byId = new Map(companies.map((company) => [company.id, company]));
  const rootOf = (company: MarketCompany): string =>
    company.parentId === null ? company.id : rootOf(byId.get(company.parentId) ?? company);

  const groups = new Map<string, CompanyGroup>();
  for (const company of companies) {
    const rootId = rootOf(company);
    const group = groups.get(rootId) ?? { rootId, memberIds: [], distressedIds: [] };
    group.memberIds.push(company.id);
    if (company.events.some((event) => (DISTRESS_EVENTS as readonly string[]).includes(event.kind))) {
      group.distressedIds.push(company.id);
    }
    groups.set(rootId, group);
  }

  const byCompany = new Map<string, CompanyGroup>();
  for (const group of groups.values()) for (const id of group.memberIds) byCompany.set(id, group);
  return byCompany;
}
