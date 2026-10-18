"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MathUtils, type Group, type OrthographicCamera as Camera } from "three";
import { TrainModel } from "./train-model";
import { TrainFallback } from "./train-fallback";
import { CabinTarget } from "@/components/cabin/cabin-target";

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

function TrainArrangement({ reducedMotion, onReady, onCabinSelect, progress }: { reducedMotion: boolean; onReady: () => void; onCabinSelect?: () => void; progress: number }) {
  const group = useRef<Group>(null);
  useEffect(onReady, [onReady]);
  useFrame((_, delta) => {
    if (group.current && !reducedMotion) {
      // Clamp long background-tab frames so returning to the page never causes a jump.
      if (progress > 0.01) {
        const angle = MathUtils.euclideanModulo(group.current.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
        group.current.rotation.y = MathUtils.damp(angle, 0, 6, Math.min(delta, 0.1));
      } else group.current.rotation.y += Math.min(delta, 0.1) * Math.PI * 2 / ROTATION_SECONDS;
    }
  });

  return (
    <group ref={group} rotation={[0, -0.2, 0]}>
      {onCabinSelect ? <CabinTarget onSelect={onCabinSelect}><TrainModel /></CabinTarget> : <TrainModel />}
    </group>
  );
}

function SceneCamera({ progress, reducedMotion }: { progress: number; reducedMotion: boolean }) {
  const camera = useRef<Camera>(null);
  const { width, height } = useThree((state) => state.size);
  // Fit the entire turning radius, including the nose, on both portrait and landscape screens.
  const zoom = Math.min(width / 40, height / 25);
  useFrame((_, delta) => {
    if (!camera.current) return;
    const travel = reducedMotion ? 0 : progress * progress * (3 - 2 * progress);
    const smooth = reducedMotion ? 1 : 1 - Math.exp(-8 * Math.min(delta, 0.1));
    camera.current.position.x = MathUtils.lerp(camera.current.position.x, 24 * (1 - travel), smooth);
    camera.current.position.y = MathUtils.lerp(camera.current.position.y, 26 - 24 * travel, smooth);
    camera.current.position.z = MathUtils.lerp(camera.current.position.z, 36 - 30 * travel, smooth);
    camera.current.zoom = MathUtils.lerp(camera.current.zoom, zoom * (1 + 14 * travel * travel), smooth);
    camera.current.lookAt(0, 1.8, 0);
    camera.current.updateProjectionMatrix();
  });
  return (
    <OrthographicCamera
      makeDefault
      ref={camera}
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

export default function TrainCanvas({ onCabinSelect, progress = 0 }: { onCabinSelect?: () => void; progress?: number }) {
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
        <SceneCamera progress={progress} reducedMotion={reducedMotion} />
        <ambientLight intensity={1.8} />
        <directionalLight position={[12, 25, 18]} intensity={2} />
        <Suspense fallback={null}>
          <TrainArrangement reducedMotion={reducedMotion} onReady={handleReady} onCabinSelect={onCabinSelect} progress={progress} />
        </Suspense>
      </Canvas>
    </>
  );
}
