"use client";

import { Clone, useGLTF } from "@react-three/drei";
import { TRAIN_MODEL_URL } from "./train-asset";

/** Mount inside an R3F Canvas and Suspense. Camera and motion belong to the scene. */
export function TrainModel() {
  const { scene } = useGLTF(TRAIN_MODEL_URL);
  return <Clone object={scene} dispose={null} />;
}
