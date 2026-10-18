import { GROUP_INCIDENT_EVENTS, GROUP_RELATIONSHIPS, type Evidence, type FinancialEvent, type Relationship } from "./model.ts";

export interface CompanyGroup {
  /** Companies with no current parent inside the group. */
  rootIds: string[];
  memberIds: string[];
  /** Related companies (not the supplier) with a confirmed insolvency or payment default. */
  incidentIds: string[];
  /** Spec §9 wording: counts what is confirmed and never claims the group is complete. */
  hint: string | null;
}

const isGroupLink = (relationship: Relationship) =>
  relationship.status === "current" && (GROUP_RELATIONSHIPS as readonly string[]).includes(relationship.type);

/** The supplier's company group: everything reachable through current ownership or joint ventures. */
export function companyGroup(
  supplierId: string,
  relationships: readonly Relationship[],
  events: readonly FinancialEvent[],
  evidence: readonly Evidence[],
): CompanyGroup {
  const links = relationships.filter(isGroupLink);
  const members = new Set([supplierId]);
  for (let queue = [supplierId]; queue.length > 0; ) {
    const current = queue.pop();
    for (const link of links) {
      const next = link.fromId === current ? link.toId : link.toId === current ? link.fromId : null;
      if (next !== null && !members.has(next)) {
        members.add(next);
        queue = [...queue, next];
      }
    }
  }

  const confirmed = new Set(evidence.filter((item) => item.status === "confirmed").map((item) => item.id));
  const incidentIds = [
    ...new Set(
      events
        .filter(
          (event) =>
            event.entityId !== supplierId &&
            members.has(event.entityId) &&
            (GROUP_INCIDENT_EVENTS as readonly string[]).includes(event.kind) &&
            event.evidenceIds.some((evidenceId) => confirmed.has(evidenceId)),
        )
        .map((event) => event.entityId),
    ),
  ];

  return {
    rootIds: [...members].filter((member) => !links.some((link) => link.toId === member && members.has(link.fromId))),
    memberIds: [...members],
    incidentIds,
    hint:
      incidentIds.length === 0
        ? null
        : `${incidentIds.length} confirmed financial incident${incidentIds.length === 1 ? "" : "s"} at related companies; completeness of the group coverage is unknown.`,
  };
}
