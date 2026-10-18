"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown } from "lucide-react";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { preload } from "react-dom";
import { TrainFallback } from "./train-fallback";
import { TRAIN_MODEL_URL } from "./train-asset";
import { TrainCapabilities } from "./train-capabilities";

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
    // Warm the cabin's 3D code while the visitor still looks at the train.
    void import("./cabin-canvas");
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
      if (next < 0.94) { clearTimeout(entry); entry = undefined; }
      // Wait for the zoom to settle; restoring browser scroll alone must never enter the cabin.
      if (next >= 0.94 && armed && entry === undefined) {
        entry = setTimeout(() => router.push(cabinHref), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 120);
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
      className={`blueprint-scene relative my-5 ${cabinHref ? "h-[190svh] shrink-0" : "min-h-[680px] flex-1 sm:min-h-[620px]"}`}
      aria-label="Face the high-speed train. Scroll straight through the windshield into the passenger cabin."
    >
      <div className={`${cabinHref ? "sticky top-0 h-svh" : "absolute inset-0 min-h-[620px]"} overflow-hidden`}
        style={cabinHref ? { height: `calc(100svh - ${topInset}px)` } : undefined}>
        {cabinHref && <Link href={cabinHref} prefetch={true} className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-30 focus:bg-[var(--blueprint-paper)] focus:p-3">Enter cabin</Link>}
        {children && <div className="relative z-10 px-2 pt-6 sm:pt-8" style={{ opacity: Math.max(0, 1 - progress * 4) }}>{children}</div>}
        {/* A fixed-size canvas: resizing it while scrolling re-renders WebGL every frame. The camera does the zoom. */}
        <div className={`${onCabinSelect ? "" : "pointer-events-none "}absolute inset-x-0 top-0 h-svh`}
          style={cabinHref ? { top: -topInset } : undefined} aria-hidden="true">
          <SceneBoundary><TrainCanvas onCabinSelect={onCabinSelect} progress={progress} /></SceneBoundary>
        </div>
        <div className="absolute inset-0 hidden sm:block" style={{ opacity: Math.max(0, 1 - progress * 3), pointerEvents: "none" }}><TrainCapabilities /></div>
        {cabinHref && <div className="pointer-events-none absolute inset-x-0 bottom-12 flex flex-col items-center gap-2" aria-hidden="true">
          <span className="blueprint-label">Scroll to enter the cabin</span>
          <ArrowDown className="size-4 text-[var(--blueprint-muted)]" strokeWidth={1.25} />
          <span className="h-px w-24 bg-[var(--blueprint-rule)]"><span className="block h-full bg-[var(--blueprint-ink)]" style={{ width: `${progress * 100}%` }} /></span>
        </div>}
        {cabinHref && <div className="pointer-events-none absolute inset-0 z-20 bg-[var(--blueprint-paper)]" aria-hidden="true"
          style={{ opacity: Math.min(0.8, Math.max(0, (progress - 0.85) / 0.13)) }} />}
        <figcaption className="blueprint-label absolute bottom-3 left-0">HS—03 / General arrangement</figcaption>
        <span className="blueprint-label absolute right-0 bottom-3 hidden sm:block" aria-hidden="true">{progress > 0.35 ? "Through the windshield" : "Front view"}</span>
      </div>
    </figure>
  );
}
