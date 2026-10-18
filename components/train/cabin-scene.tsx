"use client";

import dynamic from "next/dynamic";
import { Component, useState, type ReactNode } from "react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { CABIN_SEATS } from "./cabin-layout";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw } from "lucide-react";

function CabinFallback({ loading = false }: { loading?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8 text-center" role="status">
      <p className="text-sm text-[var(--blueprint-muted)]">
        {loading ? "Preparing the cabin…" : "The 3D cabin is unavailable. You can still choose a seat below, or reload to try again."}
      </p>
    </div>
  );
}

const CabinCanvas = dynamic(() => import("./cabin-canvas"), {
  ssr: false,
  loading: () => <CabinFallback loading />,
});

class CabinBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <CabinFallback /> : this.props.children; }
}

export function CabinScene() {
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [resetView, setResetView] = useState(0);

  return (
    <section className="mt-6 flex flex-1 flex-col" aria-label="Interactive blueprint cabin">
      <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-sm border border-[var(--blueprint-rule)] sm:min-h-[480px]">
        <div className="absolute inset-0">
          <CabinBoundary>
            <CabinCanvas selectedSeatId={selectedSeatId} onSeatSelect={setSelectedSeatId} zoom={zoom} setZoom={setZoom} resetView={resetView} fallback={<CabinFallback />} />
          </CabinBoundary>
        </div>
        <span className="blueprint-label pointer-events-none absolute top-4 left-4">Cabin 01 / Perspective</span>
        <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-lg border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] p-1">
          <Button variant="ghost" size="icon" aria-label="Zoom out" disabled={zoom <= 0.85} onClick={() => setZoom((value) => Math.max(0.85, value - 0.2))}><Minus /></Button>
          <span className="w-12 text-center font-mono text-xs" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" aria-label="Zoom in" disabled={zoom >= 2.2} onClick={() => setZoom((value) => Math.min(2.2, value + 0.2))}><Plus /></Button>
          <Button variant="ghost" size="icon" aria-label="Reset view" onClick={() => { setZoom(1); setResetView((value) => value + 1); }}><RotateCcw /></Button>
        </div>
      </div>
      <p className="blueprint-label mt-3">Drag to look around · Scroll or pinch to zoom</p>
      <footer className="flex flex-wrap items-center justify-between gap-4 py-5">
        <p className="text-sm text-[var(--blueprint-muted)]" role="status" aria-live="polite">
          {selectedSeatId ? `Seat ${selectedSeatId} selected` : "Select any seat to begin"}
        </p>
        <div className="flex items-center gap-3">
          <label htmlFor="cabin-seat" className="blueprint-label">Seat</label>
          <NativeSelect id="cabin-seat" value={selectedSeatId ?? ""} onChange={(event) => setSelectedSeatId(event.target.value || null)}>
            <NativeSelectOption value="">None selected</NativeSelectOption>
            {CABIN_SEATS.map((seat) => <NativeSelectOption key={seat.id} value={seat.id}>Seat {seat.id}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </footer>
    </section>
  );
}
