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
const OVERVIEW_POSITION: [number, number, number] = [22, 34, 30];

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION).matches;
}

function TrainArrangement({ reducedMotion, onReady, onCabinSelect, progress }: { reducedMotion: boolean; onReady: () => void; onCabinSelect?: () => void; progress: number }) {
  useEffect(onReady, [onReady]);
  const advance = reducedMotion ? 0 : 6 * ease(progress);

  return (
    <group rotation={[0, -0.2, 0]}>
      <group position={[advance, 0, 0]}>
        {onCabinSelect ? <CabinTarget onSelect={onCabinSelect}><TrainModel /></CabinTarget> : <TrainModel />}
      </group>
    </group>
  );
}

function SceneCamera({ progress, reducedMotion }: { progress: number; reducedMotion: boolean }) {
  const camera = useRef<Camera>(null);
  const windowMesh = useRef<Mesh | null>(null);
  const windowCenter = useRef(new Vector3());
  const destination = useRef(new Vector3());
  const { width, height } = useThree((state) => state.size);
  // Leave room around the overview, then keep the window close-up modest.
  const zoom = Math.min(width / 28, height / 18) * 0.7;
  useFrame((state, delta) => {
    if (!camera.current) return;
    const travel = reducedMotion ? 0 : ease(MathUtils.clamp((progress - 0.15) / 0.85, 0, 1));
    const smooth = reducedMotion ? 1 : 1 - Math.exp(-8 * Math.min(delta, 0.1));
    if (!windowMesh.current) {
      const carriage = state.scene.getObjectByName("Passenger_carriage") ?? state.scene.getObjectByName("Passenger carriage");
      if (carriage instanceof Mesh) {
        carriage.geometry.computeBoundingBox();
        const centerX = carriage.geometry.boundingBox?.getCenter(windowCenter.current).x ?? 0;
        let nearest = Infinity;
        state.scene.traverse((object) => {
          if (!(object instanceof Mesh) || !object.name.replaceAll("_", " ").startsWith("Passenger carriage passenger window")) return;
          object.geometry.computeBoundingBox();
          const center = object.geometry.boundingBox?.getCenter(windowCenter.current);
          if (center && center.z > 0 && Math.abs(center.x - centerX) < nearest) {
            nearest = Math.abs(center.x - centerX);
            windowMesh.current = object;
          }
        });
      }
    }
    const window = windowMesh.current;
    if (window) {
      window.geometry.boundingBox?.getCenter(windowCenter.current);
      window.updateWorldMatrix(true, false);
      window.localToWorld(windowCenter.current);
    }
    const { x, y, z } = windowCenter.current;
    destination.current.set(
      OVERVIEW_POSITION[0] + x * travel,
      OVERVIEW_POSITION[1] + (y - 1.8) * travel,
      OVERVIEW_POSITION[2] + z * travel,
    );
    camera.current.position.lerp(destination.current, smooth);
    const targetZoom = zoom * Math.pow(4, travel);
    camera.current.zoom = MathUtils.lerp(camera.current.zoom, targetZoom, smooth);
    // Keep the viewing angle fixed: the train approaches along its track instead of orbiting.
    camera.current.lookAt(
      camera.current.position.x - OVERVIEW_POSITION[0],
      camera.current.position.y - OVERVIEW_POSITION[1] + 1.8,
      camera.current.position.z - OVERVIEW_POSITION[2],
    );
    camera.current.updateProjectionMatrix();
    if (camera.current.position.distanceToSquared(destination.current) > 0.000001 || Math.abs(camera.current.zoom - targetZoom) > 0.001) state.invalidate();
  });
  return (
    <OrthographicCamera
      makeDefault
      ref={camera}
      position={OVERVIEW_POSITION}
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
          <TrainArrangement reducedMotion={reducedMotion} onReady={handleReady} onCabinSelect={onCabinSelect} progress={progress} />
        </Suspense>
      </Canvas>
    </>
  );
}
