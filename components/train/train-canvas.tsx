"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Group } from "three";
import { TrainModel } from "./train-model";
import { TrainFallback } from "./train-fallback";

const ROTATION_SECONDS = 20;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION).matches;
}

function TrainArrangement({ reducedMotion, onReady }: { reducedMotion: boolean; onReady: () => void }) {
  const group = useRef<Group>(null);
  useEffect(onReady, [onReady]);
  useFrame((_, delta) => {
    if (group.current && !reducedMotion) {
      // Clamp long background-tab frames so returning to the page never causes a jump.
      group.current.rotation.y += Math.min(delta, 0.1) * Math.PI * 2 / ROTATION_SECONDS;
    }
  });

  return (
    <group ref={group} rotation={[0, -0.2, 0]}>
      <TrainModel />
    </group>
  );
}

function SceneCamera() {
  const { width, height } = useThree((state) => state.size);
  // Fit the entire turning radius, including the nose, on both portrait and landscape screens.
  const zoom = Math.min(width / 40, height / 25);
  return (
    <OrthographicCamera
      makeDefault
      position={[24, 26, 36]}
      near={0.1}
      far={200}
      zoom={zoom}
      onUpdate={(camera) => {
        camera.lookAt(0, 1.8, 0);
        camera.updateProjectionMatrix();
      }}
    />
  );
}

export default function TrainCanvas() {
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true);
  const [loaded, setLoaded] = useState(false);
  const handleReady = useCallback(() => setLoaded(true), []);

  return (
    <>
      {!loaded && <TrainFallback loading />}
      <Canvas
        orthographic
        dpr={[1, 1.5]}
        frameloop={reducedMotion ? "demand" : "always"}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        fallback={<TrainFallback />}
        style={{ touchAction: "pan-y" }}
      >
        <SceneCamera />
        <ambientLight intensity={1.8} />
        <directionalLight position={[12, 25, 18]} intensity={2} />
        <Suspense fallback={null}>
          <TrainArrangement reducedMotion={reducedMotion} onReady={handleReady} />
        </Suspense>
      </Canvas>
    </>
  );
}
