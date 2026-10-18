"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { preload } from "react-dom";
import { Button } from "@/components/ui/button";
import { CabinScene } from "./cabin-scene";
import { TRAIN_MODEL_URL } from "./train-asset";

const ENTRY_STAGES = [
  { start: 0, end: 0.2, duration: 900 },
  { start: 0.2, end: 0.6, duration: 1800 },
  { start: 0.6, end: 1, duration: 1500 },
];

export function TrainScene({ children }: { children?: ReactNode }) {
  preload(TRAIN_MODEL_URL, { as: "fetch", crossOrigin: "anonymous" });
  const figure = useRef<HTMLElement>(null);
  const armed = useRef(false);
  const entryFrame = useRef(0);
  const entrySettleMs = useRef(900);
  const [progress, setProgress] = useState(0);
  const [entered, setEntered] = useState(false);
  const [topInset, setTopInset] = useState(180);

  useEffect(() => {
    if (entered) return;
    let frame = 0;
    let entry: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      cancelAnimationFrame(entryFrame.current);
      entryFrame.current = 0;
      entrySettleMs.current = 900;
      clearTimeout(entry);
      entry = undefined;
      armed.current = true;
      if (!frame) frame = requestAnimationFrame(update);
    };
    const key = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Escape"].includes(event.key)) arm();
    };
    const update = () => {
      frame = 0;
      if (!figure.current) return;
      const top = figure.current.getBoundingClientRect().top;
      setTopInset(Math.max(0, top));
      const range = Math.max(figure.current.offsetHeight - window.innerHeight, 1);
      const next = Math.min(1, Math.max(0, -top / range));
      setProgress(next);
      if (next < 0.995) { clearTimeout(entry); entry = undefined; }
      if (next >= 0.995 && armed.current && entry === undefined) {
        entry = setTimeout(() => setEntered(true), entrySettleMs.current);
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
      cancelAnimationFrame(entryFrame.current);
      entryFrame.current = 0;
      clearTimeout(entry);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      window.removeEventListener("wheel", arm);
      window.removeEventListener("touchstart", arm);
      window.removeEventListener("keydown", key);
    };
  }, [entered]);

  useEffect(() => {
    if (!entered) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [entered]);

  const enter = () => {
    if (!figure.current) return;
    cancelAnimationFrame(entryFrame.current);
    armed.current = true;
    const start = window.scrollY;
    const destination = start + figure.current.getBoundingClientRect().top + figure.current.offsetHeight - window.innerHeight;
    entrySettleMs.current = 250;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      entryFrame.current = 0;
      window.scrollTo({ top: destination, behavior: "instant" });
      setProgress(1);
      return;
    }

    const stages = ENTRY_STAGES.filter((stage) => stage.end > progress).map((stage) => {
      const from = Math.max(progress, stage.start);
      return { ...stage, from, duration: stage.duration * (stage.end - from) / (stage.end - stage.start) };
    });
    const sectionTop = start + figure.current.getBoundingClientRect().top;
    const range = figure.current.offsetHeight - window.innerHeight;
    const startedAt = performance.now();
    const animate = (now: number) => {
      let elapsed = now - startedAt;
      let next = 1;
      for (const stage of stages) {
        if (elapsed < stage.duration) {
          next = stage.from + (stage.end - stage.from) * elapsed / stage.duration;
          break;
        }
        elapsed -= stage.duration;
      }
      // Each scene stage eases its own movement; the final window entry keeps its 1.5-second duration.
      window.scrollTo({ top: sectionTop + range * next, behavior: "instant" });
      entryFrame.current = next < 1 ? requestAnimationFrame(animate) : 0;
    };
    entryFrame.current = requestAnimationFrame(animate);
  };
  const back = () => {
    cancelAnimationFrame(entryFrame.current);
    entryFrame.current = 0;
    armed.current = false;
    setEntered(false);
    setProgress(0);
    window.history.replaceState(window.history.state, "", "/");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <section ref={figure} className="relative h-[480svh]" aria-label="Scroll to open the workshop, drive the train out, and enter the cabin">
      <div className={entered ? "fixed inset-0 z-[5]" : "sticky top-0 h-svh overflow-hidden"}
        style={entered ? undefined : { height: `calc(100svh - ${topInset}px)` }}>
        <CabinScene journey={{ progress, entered, onBack: back }} />
        {!entered && <>
          {children && <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-[var(--blueprint-paper)]/90 to-transparent px-5 pt-6 pb-12 sm:px-10 lg:px-16" style={{ opacity: Math.max(0, 1 - progress * 5) }}>{children}</div>}
          <div className="absolute inset-x-0 bottom-12 z-30 flex flex-col items-center gap-3" inert={progress > 0.15} style={{ opacity: Math.max(0, 1 - progress * 6) }}>
            <Button onClick={enter} size="lg" className="h-12 rounded-full bg-[var(--blueprint-ink)] px-7 text-[var(--blueprint-paper)] hover:bg-[var(--blueprint-ink)]/90">
              Enter the cabin <ArrowDown strokeWidth={1.5} />
            </Button>
            <span className="rounded-full bg-[var(--blueprint-paper)]/85 px-3 py-1 text-xs text-[var(--blueprint-ink)]">or scroll to open the workshop</span>
          </div>
          <div className="pointer-events-none absolute inset-x-5 bottom-5 z-20 flex items-center justify-between gap-4 text-[var(--blueprint-ink)] sm:inset-x-10 lg:inset-x-16" style={{ opacity: Math.min(1, progress * 10) * Math.min(1, (1 - progress) * 10) }}>
            <p className="rounded bg-[var(--blueprint-paper)]/85 px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase">
              {progress < 0.2 ? "01 / Workshop doors" : progress < 0.6 ? "02 / Leaving the workshop" : "03 / Into the cabin"}
            </p>
            <div className="flex gap-1.5" aria-hidden="true">
              {ENTRY_STAGES.map((stage) => <span key={stage.start} className="h-0.5 w-9 overflow-hidden bg-[var(--blueprint-paper)]/70">
                <span className="block h-full origin-left bg-[var(--blueprint-ink)]" style={{ transform: `scaleX(${Math.min(1, Math.max(0, (progress - stage.start) / (stage.end - stage.start)))})` }} />
              </span>)}
            </div>
          </div>
        </>}
      </div>
    </section>
  );
}
