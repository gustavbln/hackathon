import assert from "node:assert/strict";
import { test } from "node:test";
import { marketFileSchema } from "./market/contract.ts";
import { companyGroups } from "./market/groups.ts";

const source = { url: "https://example.com/report", title: "Annual report" };

function company(id: string, parentId: string | null, distressed = false) {
  return {
    id,
    name: id,
    country: "DE",
    parentId,
    makesComponent: true,
    scores: {},
    events: distressed ? [{ kind: "insolvency", date: "2025-03-01", summary: "Filed for insolvency.", source }] : [],
  };
}

function file(companies: ReturnType<typeof company>[]) {
  return { component: "seats", researchedAt: "2026-10-18", companies };
}

test("reject parents that are missing or that loop", () => {
  assert.equal(marketFileSchema.safeParse(file([company("a", "ghost")])).success, false);
  assert.equal(marketFileSchema.safeParse(file([company("a", "b"), company("b", "a")])).success, false);
});

test("group every subsidiary under its top-most parent and flag distressed members", () => {
  const parsed = marketFileSchema.parse(
    file([company("holding", null), company("seats-de", "holding", true), company("seats-pl", "seats-de"), company("solo", null)]),
  );
  const groups = companyGroups(parsed.companies);
  assert.deepEqual(groups.get("seats-pl"), {
    rootId: "holding",
    memberIds: ["holding", "seats-de", "seats-pl"],
    distressedIds: ["seats-de"],
  });
  assert.deepEqual(groups.get("solo")?.memberIds, ["solo"]);
});
