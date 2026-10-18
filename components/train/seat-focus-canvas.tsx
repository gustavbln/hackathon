"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import type { Group } from "three";

import { Button } from "@/components/ui/button";
import { Seat } from "./cabin-canvas";
import type { TrainPalette } from "./create-train";

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function SeatPreview({ seatId, rotating, palette }: { seatId: string; rotating: boolean; palette: TrainPalette }) {
  const group = useRef<Group>(null);
  const { width, height } = useThree((state) => state.size);
  useFrame((state, delta) => {
    if (!group.current || !rotating) return;
    group.current.rotation.y += Math.min(delta, 0.1) * 0.3;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.025;
  });

  return (
    <>
      <OrthographicCamera makeDefault position={[2, 1.8, 3]} zoom={Math.min(width / 1.6, height / 2.3)}
        onUpdate={(camera) => { camera.lookAt(0, 0.75, 0); camera.updateProjectionMatrix(); }} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[2, 4, 3]} intensity={1.8} />
      <group ref={group} rotation={[0, -0.6, 0]}>
        <Seat id={seatId} position={[0, 0, 0]} palette={palette} selectedSeatId={null} onSeatSelect={() => {}} />
      </group>
    </>
  );
}

export default function SeatFocusCanvas({ seatId }: { seatId: string }) {
  const prefersReducedMotion = useSyncExternalStore(subscribeMotion, reducedMotion, () => true);
  const [paused, setPaused] = useState(false);
  const [palette] = useState<TrainPalette>(() => {
    const style = getComputedStyle(document.documentElement);
    const token = (name: string) => style.getPropertyValue(`--train-${name}`).trim();
    return { surface: token("surface"), line: token("line"), glass: token("glass"), mechanical: token("mechanical") };
  });
  const rotating = !paused && !prefersReducedMotion;

  return (
    <figure aria-label={`Seat ${seatId} preview`} className="flex h-full min-h-0 flex-col">
      <figcaption className="px-5 pt-5">
        <p className="blueprint-label">Selected component / {seatId}</p>
        <h2 className="mt-2 text-xl font-medium tracking-tight">Passenger seat</h2>
      </figcaption>
      <Button variant="ghost" disabled={prefersReducedMotion} aria-pressed={paused}
        aria-label={prefersReducedMotion ? "Seat model; reduced motion enabled" : rotating ? "Pause seat rotation" : "Resume seat rotation"}
        onClick={() => setPaused((current) => !current)}
        className="relative h-auto min-h-0 w-full flex-1 rounded-none p-0 hover:bg-transparent disabled:opacity-100">
        <span className="pointer-events-none absolute inset-0 block" aria-label="3D seat model">
          <Canvas dpr={[1, 1.5]} frameloop={rotating ? "always" : "demand"} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
            fallback={<span className="p-5 text-sm text-[var(--blueprint-muted)]">The 3D preview is unavailable. Supplier analysis is still available.</span>}>
            <SeatPreview seatId={seatId} rotating={rotating} palette={palette} />
          </Canvas>
        </span>
      </Button>
    </figure>
  );
}
