"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { researchedRowSchema, type ResearchedRow } from "@/lib/research/contract";

/** The researched real companies; `reload` fetches again after the agents add one. */
export function useResearchedSuppliers(): { researched: ResearchedRow[]; reload: () => void } {
  const [researched, setResearched] = useState<ResearchedRow[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/research/supplier", { signal: controller.signal })
      .then(async (response) => (response.ok ? z.array(researchedRowSchema).parse(await response.json()) : []))
      .then(setResearched, () => !controller.signal.aborted && setResearched([]));
    return () => controller.abort();
  }, [version]);

  return { researched, reload: useCallback(() => setVersion((current) => current + 1), []) };
}
