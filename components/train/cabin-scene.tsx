"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useState, type ReactNode } from "react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus, RotateCcw } from "lucide-react";
import { ComponentPreviewPanel } from "@/components/cabin/component-preview-panel";
import { SeatShortlistPanel } from "@/components/cabin/seat-shortlist-panel";
import { ChatDock } from "@/components/chat/chat-dock";
import { CABIN_COMPONENTS, CABIN_SEATS, type CabinComponentId } from "./cabin-layout";

function CabinFallback({ loading = false }: { loading?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8 text-center" role="status">
      <p className="text-sm text-[var(--blueprint-muted)]">
        {loading ? "Preparing the preview…" : "The 3D preview is unavailable. You can still use the sourcing controls."}
      </p>
    </div>
  );
}

const CabinCanvas = dynamic(() => import("./cabin-canvas"), {
  ssr: false,
  loading: () => <CabinFallback loading />,
});

const SeatFocusCanvas = dynamic(() => import("./seat-focus-canvas"), {
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
  const [selectedComponentId, setSelectedComponentId] = useState<CabinComponentId | null>(null);
  // One selection at a time: a seat or one of the preview parts.
  const selectSeat = (id: string | null) => { setSelectedSeatId(id); setSelectedComponentId(null); };
  const selectComponent = (id: CabinComponentId | null) => { setSelectedComponentId(id); setSelectedSeatId(null); };
  const componentLabel = CABIN_COMPONENTS.find(({ id }) => id === selectedComponentId)?.label;

  const scene = selectedSeatId ? (
      <section aria-label="Seat sourcing workspace" className="@container mt-6 flex min-h-0 flex-1 flex-col pb-6">
        <div className="grid min-w-0 gap-5 @min-[720px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1.8fr)]">
          <div className="relative h-72 overflow-hidden rounded-sm border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] animate-in fade-in-0 slide-in-from-right-8 duration-500 motion-reduce:animate-none @min-[720px]:h-auto">
            <CabinBoundary><SeatFocusCanvas seatId={selectedSeatId} /></CabinBoundary>
          </div>
          <SeatShortlistPanel seatId={selectedSeatId} onClose={() => selectSeat(null)} />
        </div>
      </section>
  ) : (
    <section className="mt-6 flex flex-1 flex-col" aria-label="Interactive blueprint cabin">
      <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-sm border border-[var(--blueprint-rule)] sm:min-h-[480px]">
        <div className="absolute inset-0">
          <CabinBoundary>
            <CabinCanvas selectedSeatId={selectedSeatId} onSeatSelect={selectSeat}
              selectedComponentId={selectedComponentId} onComponentSelect={selectComponent}
              zoom={zoom} setZoom={setZoom} resetView={resetView} fallback={<CabinFallback />} />
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
          {selectedSeatId ? `Seat ${selectedSeatId} selected` : componentLabel ? `${componentLabel} selected (preview)` : "Select any seat to begin"}
        </p>
        <div className="flex items-center gap-3">
          <label htmlFor="cabin-seat" className="blueprint-label">Seat</label>
          <NativeSelect id="cabin-seat" value={selectedSeatId ?? ""} onChange={(event) => selectSeat(event.target.value || null)}>
            <NativeSelectOption value="">None selected</NativeSelectOption>
            {CABIN_SEATS.map((seat) => <NativeSelectOption key={seat.id} value={seat.id}>Seat {seat.id}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </footer>
      {selectedComponentId && <ComponentPreviewPanel componentId={selectedComponentId} onClose={() => selectComponent(null)} />}
    </section>
  );

  return (
    <main className="blueprint-page relative flex min-h-svh min-w-0 flex-1 flex-col px-5 sm:px-10 lg:px-16">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--blueprint-rule)] py-6">
        {selectedSeatId ? (
          <Button variant="ghost" onClick={() => selectSeat(null)} className="min-h-9 gap-2 px-0 text-sm">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to cabin
          </Button>
        ) : (
          <Link href="/" className="flex min-h-9 items-center gap-2 text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to train
          </Link>
        )}
        <div className="flex items-center gap-6">
          <span className="blueprint-label hidden sm:block">HS—03 / Interior</span>
          <ChatDock />
        </div>
      </header>
      <section className="pt-7 sm:pt-9" aria-labelledby="cabin-heading">
        <p className="blueprint-label mb-2">02 / Passenger compartment</p>
        <h1 id="cabin-heading" className="text-3xl font-medium tracking-tight sm:text-4xl">
          {selectedSeatId ? "Seat sourcing" : "Inside the cabin"}
        </h1>
        <p className="mt-2 text-sm text-[var(--blueprint-muted)]">
          {selectedSeatId ? "Compare priorities and supplier risk for this component." : "Choose a seat to explore the train’s components."}
        </p>
      </section>
      {scene}
    </main>
  );
}
