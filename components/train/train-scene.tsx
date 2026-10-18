"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { preload } from "react-dom";
import { TrainFallback } from "./train-fallback";
import { TRAIN_MODEL_URL } from "./train-asset";

const TrainCanvas = dynamic(() => import("./train-canvas"), { ssr: false });

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <TrainFallback /> : this.props.children;
  }
}

export function TrainScene({ children, cabinHref }: { children?: ReactNode; cabinHref?: string }) {
  // Start the model download with the page, not after the 3D code has loaded.
  preload(TRAIN_MODEL_URL, { as: "fetch", crossOrigin: "anonymous" });
  const router = useRouter();
  const figure = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [topInset, setTopInset] = useState(128);
  const onCabinSelect = cabinHref ? () => router.push(cabinHref) : undefined;

  useEffect(() => {
    if (!cabinHref) return;
    router.prefetch(cabinHref);
    // Warm the cabin's 3D code while the visitor still looks at the train, so entering it is instant.
    const warm = setTimeout(() => void import("./cabin-canvas"), 1_500);
    let armed = false;
    let frame = 0;
    let entry: ReturnType<typeof setTimeout> | undefined;
    const arm = () => { armed = true; };
    const key = (event: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", "End", " "].includes(event.key)) arm();
    };
    const update = () => {
      frame = 0;
      if (!figure.current) return;
      const top = figure.current.getBoundingClientRect().top;
      setTopInset(Math.max(0, top));
      const range = Math.max(figure.current.offsetHeight - window.innerHeight, 1);
      const next = Math.min(1, Math.max(0, -top / range));
      setProgress(next);
      if (next < 0.98) { clearTimeout(entry); entry = undefined; }
      // Wait for the zoom to settle; restoring browser scroll alone must never enter the cabin.
      if (next >= 0.98 && armed && entry === undefined) {
        entry = setTimeout(() => router.push(cabinHref), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600);
      }
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    window.addEventListener("wheel", arm, { passive: true });
    window.addEventListener("touchstart", arm, { passive: true });
    window.addEventListener("keydown", key);
    update();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(entry);
      clearTimeout(warm);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      window.removeEventListener("wheel", arm);
      window.removeEventListener("touchstart", arm);
      window.removeEventListener("keydown", key);
    };
  }, [cabinHref, router]);

  return (
    <figure
      ref={figure}
      className={`blueprint-scene relative my-3 ${cabinHref ? "h-[160svh] shrink-0" : "min-h-[680px] flex-1 sm:min-h-[620px]"}`}
      aria-label="Explore the high-speed train. Scroll down to zoom into its passenger cabin."
    >
      <div className={`${cabinHref ? "sticky top-0 h-svh" : "absolute inset-0 min-h-[620px]"} overflow-hidden`}
        style={cabinHref ? { height: `calc(100svh - ${topInset}px)` } : undefined}>
        {children && <div className="relative z-10 px-2 pt-6 sm:pt-8" style={{ opacity: Math.max(0, 1 - progress * 4) }}>{children}</div>}
        {/* A fixed-size canvas: resizing it while scrolling re-renders WebGL every frame. The camera does the zoom. */}
        <div className={`${onCabinSelect ? "" : "pointer-events-none "}absolute inset-x-0 h-svh`}
          style={{ top: -topInset / 2 }} aria-hidden="true">
          <SceneBoundary><TrainCanvas onCabinSelect={onCabinSelect} progress={progress} /></SceneBoundary>
        </div>
        {cabinHref && <div className="absolute inset-x-0 bottom-12 z-30 flex flex-col items-center gap-3">
          <Button asChild variant="outline" size="lg" className="rounded-none border-[var(--blueprint-ink)] bg-[var(--blueprint-paper)] px-6 text-[var(--blueprint-ink)] hover:bg-[var(--blueprint-grid)] hover:text-[var(--blueprint-ink)]">
            <Link href={cabinHref}>Enter cabin <ArrowDown strokeWidth={1.25} /></Link>
          </Button>
          <span className="blueprint-label" aria-hidden="true">Or scroll to explore</span>
          <span className="h-px w-24 bg-[var(--blueprint-rule)]" aria-hidden="true"><span className="block h-full bg-[var(--blueprint-ink)]" style={{ width: `${progress * 100}%` }} /></span>
        </div>}
        {cabinHref && <div className="pointer-events-none absolute inset-0 z-20 bg-[var(--blueprint-paper)]" aria-hidden="true"
          style={{ opacity: Math.min(1, Math.max(0, (progress - 0.85) / 0.13)) }} />}
        <figcaption className="blueprint-label absolute bottom-3 left-0">HS—03 / General arrangement</figcaption>
        <span className="blueprint-label absolute right-0 bottom-3 hidden sm:block" aria-hidden="true">{progress > 0.35 ? "Passenger carriage" : "Axonometric view"}</span>
      </div>
    </figure>
  );
}
