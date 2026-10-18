"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown } from "lucide-react";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { TrainFallback } from "./train-fallback";
import { TrainCapabilities } from "./train-capabilities";

const TrainCanvas = dynamic(() => import("./train-canvas"), {
  ssr: false,
  loading: () => <TrainFallback loading />,
});

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
  const router = useRouter();
  const figure = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const onCabinSelect = cabinHref ? () => router.push(cabinHref) : undefined;

  useEffect(() => {
    if (!cabinHref) return;
    router.prefetch(cabinHref);
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
      const range = Math.max(figure.current.offsetHeight - window.innerHeight, 1);
      const next = Math.min(1, Math.max(0, -figure.current.getBoundingClientRect().top / range));
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
    window.addEventListener("touchmove", arm, { passive: true });
    window.addEventListener("keydown", key);
    update();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(entry);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      window.removeEventListener("wheel", arm);
      window.removeEventListener("touchmove", arm);
      window.removeEventListener("keydown", key);
    };
  }, [cabinHref, router]);

  return (
    <figure
      ref={figure}
      className={`blueprint-scene relative my-5 ${cabinHref ? "h-[190svh] shrink-0" : "min-h-[680px] flex-1 sm:min-h-[620px]"}`}
      aria-label="Explore the high-speed train. Scroll down to zoom into its passenger cabin."
    >
      <div className={`${cabinHref ? "sticky top-0 h-svh" : "absolute inset-0 min-h-[620px]"} overflow-hidden`}>
        {cabinHref && <Link href={cabinHref} className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-30 focus:bg-[var(--blueprint-paper)] focus:p-3">Enter cabin</Link>}
        {children && <div className="relative z-10 px-2 pt-6 sm:pt-8" style={{ opacity: Math.max(0, 1 - progress * 4) }}>{children}</div>}
        <div className={`${onCabinSelect ? "" : "pointer-events-none "}absolute`} aria-hidden="true" style={{
          left: `${Math.max(0, 15 - progress * 22)}%`, right: `${Math.max(0, 15 - progress * 22)}%`,
          top: `${Math.max(0, 24 - progress * 35)}%`, bottom: `${Math.max(0, 12 - progress * 20)}%`,
        }}>
          <SceneBoundary><TrainCanvas onCabinSelect={onCabinSelect} progress={progress} /></SceneBoundary>
        </div>
        <div className="absolute inset-0" style={{ opacity: Math.max(0, 1 - progress * 3), pointerEvents: "none" }}><TrainCapabilities /></div>
        {cabinHref && <div className="pointer-events-none absolute inset-x-0 bottom-12 flex flex-col items-center gap-2" aria-hidden="true">
          <span className="blueprint-label">Scroll to enter the cabin</span>
          <ArrowDown className="size-4 text-[var(--blueprint-muted)]" strokeWidth={1.25} />
          <span className="h-px w-24 bg-[var(--blueprint-rule)]"><span className="block h-full bg-[var(--blueprint-ink)]" style={{ width: `${progress * 100}%` }} /></span>
        </div>}
        <figcaption className="blueprint-label absolute bottom-3 left-0">HS—03 / General arrangement</figcaption>
        <span className="blueprint-label absolute right-0 bottom-3 hidden sm:block" aria-hidden="true">{progress > 0.35 ? "Passenger carriage" : "Axonometric view"}</span>
      </div>
    </figure>
  );
}
