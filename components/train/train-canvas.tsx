"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerspectiveCamera } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MathUtils, type PerspectiveCamera as Camera } from "three";
import { TrainModel } from "./train-model";
import { TrainFallback } from "./train-fallback";
import { CabinTarget } from "@/components/cabin/cabin-target";

/** Scroll progress eased at both ends, so the fly-in starts and lands softly. */
const ease = (progress: number) => progress * progress * (3 - 2 * progress);
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

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
  const invalidate = useThree((state) => state.invalidate);
  const portrait = width < height;
  const distance = portrait ? 128 : 86;
  const startX = (portrait ? 0.96 : 0.52) * distance;
  const startY = (portrait ? 0.3 : 0.27) * distance;
  const startZ = (portrait ? 0.28 : 0.81) * distance;
  useEffect(() => { invalidate(); }, [progress, reducedMotion, width, height, invalidate]);
  useFrame((state, delta) => {
    if (!camera.current) return;
    const travel = reducedMotion ? 0 : ease(progress);
    const smooth = reducedMotion ? 1 : 1 - Math.exp(-8 * Math.min(delta, 0.1));
    // Exponential distance gives an even approach, then levels with the passenger windows.
    const remaining = Math.pow(0.005, travel);
    const targetX = startX * remaining;
    const targetY = 2.65 + (startY - 2.65) * remaining;
    const targetZ = 1.4 + (startZ - 1.4) * remaining;
    camera.current.position.x = MathUtils.lerp(camera.current.position.x, targetX, smooth);
    camera.current.position.y = MathUtils.lerp(camera.current.position.y, targetY, smooth);
    camera.current.position.z = MathUtils.lerp(camera.current.position.z, targetZ, smooth);
    camera.current.lookAt(0, 2.2 + travel * 0.45, 0);
    camera.current.updateProjectionMatrix();
    if (Math.abs(camera.current.position.x - targetX) + Math.abs(camera.current.position.y - targetY)
      + Math.abs(camera.current.position.z - targetZ) > 0.001) state.invalidate();
  });
  return (
    <PerspectiveCamera makeDefault ref={camera} position={[startX, startY, startZ]} near={0.05} far={500} fov={36}
      onUpdate={(camera) => { camera.lookAt(0, 2.2, 0); camera.updateProjectionMatrix(); }} />
  );
}

export default function TrainCanvas({ onCabinSelect, progress = 0 }: { onCabinSelect?: () => void; progress?: number }) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true);
  const [loaded, setLoaded] = useState(false);
  const handleReady = useCallback(() => setLoaded(true), []);

  return (
    <>
      {!loaded && <TrainFallback loading />}
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
        <ambientLight intensity={0.7} />
        <directionalLight position={[15, 30, 20]} intensity={3} />
        <directionalLight position={[-20, 10, -15]} intensity={1.5} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 18, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[100, 18, 1]} />
          <Lightformer form="rect" intensity={2} position={[0, 8, 18]} rotation={[0, Math.PI, 0]} scale={[100, 6, 1]} />
          <Lightformer form="rect" intensity={4} position={[0, 12, -15]} scale={[90, 3, 1]} />
        </Environment>
        <ContactShadows position={[0, -0.32, 0]} opacity={0.3} scale={100} blur={2.5} far={9} resolution={512} frames={1} />
        <Suspense fallback={null}>
          <TrainArrangement onReady={handleReady} onCabinSelect={onCabinSelect} />
        </Suspense>
      </Canvas>
    </>
  );
}
