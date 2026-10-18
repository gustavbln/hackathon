"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useState, useSyncExternalStore, type ReactNode } from "react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SeatShortlistPanel } from "@/components/cabin/seat-shortlist-panel";
import type { Weights } from "@/lib/suppliers/criteria";
import { ChatDock } from "@/components/chat/chat-dock";
import { CABIN_SEATS } from "./cabin-layout";

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

class CabinBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <CabinFallback /> : this.props.children; }
}

interface CabinSceneProps {
  /** From `?seat=`, so detail pages can link back to the seat they came from. */
  initialSeatId?: string | null;
  /** From `?w=`: the weighting the buyer set before leaving the seat view. */
  initialWeights?: Weights | null;
}

export function CabinScene({ initialSeatId = null, initialWeights = null }: CabinSceneProps) {
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(
    CABIN_SEATS.some(({ id }) => id === initialSeatId) ? initialSeatId : null,
  );
  const [zoom, setZoom] = useState(1);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(subscribeMotion, reducedMotion, () => true);
  const focused = selectedSeatId !== null;
  const rotating = focused && !paused && !prefersReducedMotion;
  const selectSeat = (id: string | null) => { setSelectedSeatId(id); setPaused(false); };

  return (
    <main className="blueprint-page relative flex min-h-svh min-w-0 flex-1 flex-col px-5 sm:px-10 lg:px-16">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--blueprint-rule)] py-6">
        {focused ? (
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
      <h1 className="sr-only">{focused ? "Seat sourcing" : "Passenger cabin"}</h1>
      <section aria-label={focused ? "Seat sourcing workspace" : "Interactive blueprint cabin"} className="@container mt-6 flex min-h-0 flex-1 flex-col pb-6">
        <div className={`grid min-w-0 transition-[grid-template-columns,gap] duration-[850ms] ease-in-out motion-reduce:transition-none ${focused ? "gap-5 @min-[720px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1.8fr)]" : "gap-0 @min-[720px]:grid-cols-[minmax(0,1fr)_minmax(0,0fr)]"}`}>
          <figure aria-label={focused ? `Seat ${selectedSeatId} preview` : "Cabin panorama"}
            className={`relative min-w-0 overflow-hidden rounded-sm border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] transition-[height] duration-[850ms] motion-reduce:transition-none ${focused ? "h-80 @min-[720px]:h-[40rem]" : "h-[calc(100svh-10rem)] min-h-[420px]"}`}>
            {/* One fixed canvas size, centred and cropped by the frame: resizing WebGL during the
                850 ms layout change painted blank grey frames. The seat stays centred, so the crop is safe. */}
            <div className="absolute top-1/2 left-1/2 h-[max(calc(100svh-10rem),40rem)] w-[calc(100vw-2.5rem)] -translate-x-1/2 -translate-y-1/2">
              <CabinBoundary>
                <CabinCanvas selectedSeatId={selectedSeatId} onSeatSelect={selectSeat}
                  zoom={zoom} setZoom={setZoom} resetView={0} rotating={rotating} reducedMotion={prefersReducedMotion} fallback={<CabinFallback />} />
              </CabinBoundary>
            </div>
            {focused && (
              <>
                <figcaption className="pointer-events-none absolute top-5 left-5 z-20 animate-in fade-in-0 duration-700 motion-reduce:animate-none">
                  <p className="blueprint-label">Selected component / {selectedSeatId}</p>
                  <h2 className="mt-2 text-xl font-medium tracking-tight">Passenger seat</h2>
                </figcaption>
                <Button variant="ghost" disabled={prefersReducedMotion} aria-pressed={paused}
                  aria-label={prefersReducedMotion ? "Seat model; reduced motion enabled" : rotating ? "Pause seat rotation" : "Resume seat rotation"}
                  onClick={() => setPaused((current) => !current)}
                  className="absolute inset-0 z-10 h-full w-full rounded-none p-0 hover:bg-transparent disabled:opacity-100" />
              </>
            )}
          </figure>
          <div className={focused ? "min-w-0 animate-in fade-in-0 slide-in-from-right-8 duration-700 motion-reduce:animate-none" : "hidden min-w-0 @min-[720px]:block"}>
            {selectedSeatId && (
              <SeatShortlistPanel
                seatId={selectedSeatId}
                initialWeights={selectedSeatId === initialSeatId ? initialWeights : null}
                onClose={() => selectSeat(null)}
              />
            )}
          </div>
        </div>
        {!focused && (
          <>
            {/* Hidden until focused: the keyboard and screen-reader way to pick a seat without the 3D view. */}
            <footer className="sr-only focus-within:not-sr-only focus-within:flex focus-within:items-center focus-within:justify-between focus-within:gap-4 focus-within:py-5">
              <p className="text-sm text-[var(--blueprint-muted)]" role="status" aria-live="polite">Select any seat to begin</p>
              <div className="flex items-center gap-3">
                <label htmlFor="cabin-seat" className="blueprint-label">Seat</label>
                <NativeSelect id="cabin-seat" value="" onChange={(event) => selectSeat(event.target.value || null)}>
                  <NativeSelectOption value="">None selected</NativeSelectOption>
                  {CABIN_SEATS.map((seat) => <NativeSelectOption key={seat.id} value={seat.id}>Seat {seat.id}</NativeSelectOption>)}
                </NativeSelect>
              </div>
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
