"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MathUtils, Mesh, Vector3, type Group, type OrthographicCamera as Camera } from "three";
import { TrainModel } from "./train-model";
import { TrainFallback } from "./train-fallback";
import { CabinTarget } from "@/components/cabin/cabin-target";

const ROTATION_SECONDS = 20;
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

function TrainArrangement({ reducedMotion, onReady, onCabinSelect, progress }: { reducedMotion: boolean; onReady: () => void; onCabinSelect?: () => void; progress: number }) {
  const group = useRef<Group>(null);
  useEffect(onReady, [onReady]);
  useFrame((_, delta) => {
    if (!group.current || reducedMotion) return;
    // Clamp long background-tab frames so returning to the page never causes a jump.
    const step = Math.min(delta, 0.1);
    const travel = ease(progress);
    // The spin fades out while the train turns broadside, both in proportion to the scroll.
    const angle = MathUtils.euclideanModulo(group.current.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
    group.current.rotation.y = MathUtils.damp(angle, 0, 4 * travel, step) + step * (Math.PI * 2 / ROTATION_SECONDS) * (1 - travel);
  });

  return (
    <group ref={group} rotation={[0, -0.2, 0]}>
      {onCabinSelect ? <CabinTarget onSelect={onCabinSelect}><TrainModel /></CabinTarget> : <TrainModel />}
    </group>
  );
}

function SceneCamera({ progress, reducedMotion }: { progress: number; reducedMotion: boolean }) {
  const camera = useRef<Camera>(null);
  const carriageCenter = useRef(new Vector3());
  const { width, height } = useThree((state) => state.size);
  // Fit the two-car train's turning radius (about 11.5 m to the nose) with room for the capabilities around it.
  const zoom = Math.min(width / 28, height / 18) * 0.7;
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
    camera.current.position.x = MathUtils.lerp(camera.current.position.x, 24 * (1 - travel) + x, smooth);
    camera.current.position.y = MathUtils.lerp(camera.current.position.y, 26 - 23.2 * travel, smooth);
    camera.current.position.z = MathUtils.lerp(camera.current.position.z, 36 - 30 * travel + z, smooth);
    // Exponential zoom reads as constant speed; a polynomial one crawls, then lurches.
    camera.current.zoom = MathUtils.lerp(camera.current.zoom, zoom * Math.pow(15, travel), smooth);
    camera.current.lookAt(x, 1.8 + travel, z);
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
      <Canvas
        orthographic
        dpr={[1, 1.5]}
        frameloop={reducedMotion ? "demand" : "always"}
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
          <TrainArrangement reducedMotion={reducedMotion} onReady={handleReady} onCabinSelect={onCabinSelect} progress={progress} />
        </Suspense>
      </Canvas>
    </>
  );
}
