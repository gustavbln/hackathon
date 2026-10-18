"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { preload } from "react-dom";
import { Button } from "@/components/ui/button";
import { CabinScene } from "./cabin-scene";
import { TRAIN_MODEL_URL } from "./train-asset";

const ENTRY_DURATION_MS = 1500;

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

    const startedAt = performance.now();
    const animate = (now: number) => {
      const time = Math.min(1, (now - startedAt) / ENTRY_DURATION_MS);
      const eased = time * time * (3 - 2 * time);
      // Native smooth scrolling chooses its own duration, so drive the existing journey explicitly.
      window.scrollTo({ top: start + (destination - start) * eased, behavior: "instant" });
      entryFrame.current = time < 1 ? requestAnimationFrame(animate) : 0;
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
    <section ref={figure} className="relative h-[260svh]" aria-label="Scroll through a passenger window into the train cabin">
      <div className={entered ? "fixed inset-0 z-[5]" : "sticky top-0 h-svh overflow-hidden"}
        style={entered ? undefined : { height: `calc(100svh - ${topInset}px)` }}>
        <CabinScene journey={{ progress, entered, onBack: back }} />
        {!entered && <>
          {children && <div className="pointer-events-none absolute top-6 left-6" style={{ opacity: 1 - progress }}>{children}</div>}
          <div className="absolute inset-x-0 bottom-6 z-30 flex flex-col items-center gap-3" style={{ opacity: Math.max(0, 1 - progress * 2) }}>
            <Button onClick={enter} variant="outline" size="lg" className="rounded-none border-[var(--blueprint-ink)] bg-[var(--blueprint-paper)] text-[var(--blueprint-ink)]">
              Enter cabin <ArrowDown strokeWidth={1.25} />
            </Button>
            <span className="blueprint-label rounded bg-[var(--blueprint-paper)]/90 px-3 py-1">Or scroll through the window</span>
          </div>
        </>}
      </div>
    </section>
  );
}
