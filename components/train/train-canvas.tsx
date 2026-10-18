"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MathUtils, Mesh, Vector3, type OrthographicCamera as Camera } from "three";
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
  const carriageCenter = useRef(new Vector3());
  const { width, height } = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  // A fixed three-quarter view can fill the width without reserving a full turning circle.
  const zoom = Math.min(width / 27, height / 11);
  useEffect(() => { invalidate(); }, [progress, reducedMotion, zoom, invalidate]);
  useFrame((state, delta) => {
    if (!camera.current) return;
    const travel = reducedMotion ? 0 : ease(progress);
    const smooth = reducedMotion ? 1 : 1 - Math.exp(-8 * Math.min(delta, 0.1));
    const carriage = state.scene.getObjectByName("Passenger_carriage") ?? state.scene.getObjectByName("Passenger carriage");
    if (carriage instanceof Mesh) {
      if (!carriage.geometry.boundingBox) carriage.geometry.computeBoundingBox();
      carriage.geometry.boundingBox?.getCenter(carriageCenter.current);
      carriage.localToWorld(carriageCenter.current);
    }
    const x = carriageCenter.current.x * travel;
    const z = carriageCenter.current.z * travel;
    const targetX = 13 * (1 - travel) + x;
    const targetY = 13 - 10.2 * travel;
    const targetZ = 32 - 26 * travel + z;
    const targetZoom = zoom * Math.pow(15, travel);
    camera.current.position.x = MathUtils.lerp(camera.current.position.x, targetX, smooth);
    camera.current.position.y = MathUtils.lerp(camera.current.position.y, targetY, smooth);
    camera.current.position.z = MathUtils.lerp(camera.current.position.z, targetZ, smooth);
    // Exponential zoom reads as constant speed; a polynomial one crawls, then lurches.
    camera.current.zoom = MathUtils.lerp(camera.current.zoom, targetZoom, smooth);
    camera.current.lookAt(x, 1.8 + travel, z);
    camera.current.updateProjectionMatrix();
    if (Math.abs(camera.current.position.x - targetX) + Math.abs(camera.current.position.y - targetY)
      + Math.abs(camera.current.position.z - targetZ) + Math.abs(camera.current.zoom - targetZoom) > 0.001) state.invalidate();
  });
  return (
    <OrthographicCamera
      makeDefault
      ref={camera}
      position={[13, 13, 32]}
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
      <Canvas
        orthographic
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
