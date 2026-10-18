"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MathUtils, type PerspectiveCamera as Camera } from "three";
import { TrainModel } from "./train-model";
import { TrainFallback } from "./train-fallback";
import { CabinTarget } from "@/components/cabin/cabin-target";

/** Scroll progress eased at both ends, so the fly-in starts and lands softly. */
const ease = (progress: number) => progress * progress * (3 - 2 * progress);
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const FRONT_POSITION: [number, number, number] = [16, 4.7, 0];
const WINDSHIELD: [number, number, number] = [9, 3.45, 0];

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION).matches;
}

function TrainArrangement({ onReady, onCabinSelect }: { onReady: () => void; onCabinSelect?: () => void }) {
  useEffect(onReady, [onReady]);

  return (
    <group>
      {onCabinSelect ? <CabinTarget onSelect={onCabinSelect}><TrainModel /></CabinTarget> : <TrainModel />}
    </group>
  );
}

function SceneCamera({ progress, reducedMotion }: { progress: number; reducedMotion: boolean }) {
  const camera = useRef<Camera>(null);
  const { width, height } = useThree((state) => state.size);
  const lens = width < 640 ? 30 : 38;
  const fov = MathUtils.radToDeg(2 * Math.atan(Math.tan(MathUtils.degToRad(lens) / 2) * Math.max(1, height / width)));
  useFrame((state, delta) => {
    if (!camera.current) return;
    const travel = reducedMotion ? 0 : ease(progress);
    const target = MathUtils.lerp(FRONT_POSITION[0], 11.5, travel);
    camera.current.position.x = MathUtils.damp(camera.current.position.x, target, 10, Math.min(delta, 0.1));
    // A straight approach preserves the pitch while the roof recedes behind the broad windshield.
    camera.current.position.y = WINDSHIELD[1] + (camera.current.position.x - WINDSHIELD[0])
      * (FRONT_POSITION[1] - WINDSHIELD[1]) / (FRONT_POSITION[0] - WINDSHIELD[0]);
    camera.current.lookAt(...WINDSHIELD);
    if (Math.abs(camera.current.position.x - target) > 0.001) state.invalidate();
  });
  return (
    <PerspectiveCamera
      makeDefault
      ref={camera}
      position={FRONT_POSITION}
      near={0.05}
      far={200}
      fov={fov}
      onUpdate={(camera) => {
        camera.lookAt(...WINDSHIELD);
        camera.updateProjectionMatrix();
      }}
    />
  );
}

export default function TrainCanvas({ onCabinSelect, progress = 0 }: { onCabinSelect?: () => void; progress?: number }) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true);
  const [loaded, setLoaded] = useState(false);
  const handleReady = useCallback(() => setLoaded(true), []);

  return (
    <>
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        fallback={<TrainFallback />}
        // Fade only the canvas so the no-WebGL fallback remains visible.
        className={`[&_canvas]:transition-opacity [&_canvas]:duration-600 motion-reduce:[&_canvas]:transition-none ${loaded ? "[&_canvas]:opacity-100" : "[&_canvas]:opacity-0"}`}
        style={{ touchAction: "pan-y" }}
      >
        <SceneCamera progress={progress} reducedMotion={reducedMotion} />
        <ambientLight intensity={1.8} />
        <directionalLight position={[12, 25, 18]} intensity={2} />
        <Suspense fallback={null}>
          <TrainArrangement onReady={handleReady} onCabinSelect={onCabinSelect} />
        </Suspense>
      </Canvas>
    </>
  );
}
