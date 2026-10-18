"use client";

import { Clone, useGLTF } from "@react-three/drei";

/** Mount inside an R3F Canvas and Suspense. Camera and motion belong to the scene. */
export function TrainModel() {
  const { scene } = useGLTF("/models/high-speed-train.glb");
  return <Clone object={scene} dispose={null} />;
}
