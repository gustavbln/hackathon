"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatFocus } from "@/components/chat/chat-focus";
import { CRITERIA, type CriterionKey, type Weights } from "@/lib/suppliers/criteria";
import type { BoardRow } from "./board-view";
import { SupplierFocus } from "./supplier-focus";

interface SupplierDetailProps {
  supplier: BoardRow;
  supplierCount: number;
  weights: Weights;
  /** Carries the seat and weighting on to the next detail page. */
  query: string;
}

export function SupplierDetail({ supplier, supplierCount, weights, query }: SupplierDetailProps) {
  const router = useRouter();
  const [activeCriterion, setActiveCriterion] = useState<CriterionKey | null>(null);
  const { onAction } = useChatFocus();
  useEffect(() => onAction((action) => action.type === "highlight_driver" && setActiveCriterion(action.driverKey)), [onAction]);
  const criteria = [...CRITERIA].sort((a, b) => weights[b.key] - weights[a.key]);

  return (
    <SupplierFocus
      supplier={supplier}
      supplierCount={supplierCount}
      criteria={criteria}
      weights={weights}
      activeCriterion={activeCriterion}
      onCriterionHover={setActiveCriterion}
      onSelect={(row) => router.push(`/suppliers/${row.id}?${query}`)}
      headingLevel={1}
    />
  );
}
