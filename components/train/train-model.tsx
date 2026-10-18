"use client";

import { Clone, useGLTF } from "@react-three/drei";
import { useState } from "react";
import { TRAIN_MODEL_URL } from "./train-asset";

/** Mount inside an R3F Canvas and Suspense. Camera and motion belong to the scene. */
export function TrainModel() {
  const { scene } = useGLTF(TRAIN_MODEL_URL);
  const [glass] = useState(() => getComputedStyle(document.documentElement).getPropertyValue("--train-windshield").trim());
  return <Clone object={scene} dispose={null} inject={(object) => object.name.includes("windscreen")
    ? <meshStandardMaterial color={glass} roughness={0.25} metalness={0.35} />
    : null} />;
}
