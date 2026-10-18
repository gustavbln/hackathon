"use client";

import { useEffect, useState } from "react";
import { supplierScoreMatrixSchema, type SupplierScoreMatrix } from "@/lib/suppliers/score-matrix";

// Loaded once per page session and shared by every panel that needs it.
let request: Promise<SupplierScoreMatrix> | null = null;

function loadMatrix(): Promise<SupplierScoreMatrix> {
  request ??= fetch("/api/supplier-scores")
    .then(async (response) => {
      if (!response.ok) throw new Error("Supplier scores could not be loaded.");
      return supplierScoreMatrixSchema.parse(await response.json());
    })
    .catch((error: unknown) => {
      request = null;
      throw error;
    });
  return request;
}

/** All suppliers' scores for live re-ranking; null until loaded or when loading failed. */
export function useSupplierScores(): SupplierScoreMatrix | null {
  const [matrix, setMatrix] = useState<SupplierScoreMatrix | null>(null);
  useEffect(() => {
    let active = true;
    loadMatrix().then(
      (loaded) => active && setMatrix(loaded),
      () => active && setMatrix(null),
    );
    return () => {
      active = false;
    };
  }, []);
  return matrix;
}
