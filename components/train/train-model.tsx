"use client";

import { Clone, useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { Mesh } from "three";
import { TRAIN_MODEL_URL } from "./train-asset";

/** Mount inside an R3F Canvas and Suspense. Camera and motion belong to the scene. */
export function TrainModel({ onReady }: { onReady?: () => void }) {
  const { scene } = useGLTF(TRAIN_MODEL_URL);
  const train = useMemo(() => {
    const copy = scene.clone(true);
    // The depot provides continuous fixed tracks; only the vehicle leaves the workshop.
    copy.traverse((object) => {
      if (/^(Rail head|Rail web|Track sleeper)/.test(object.name.replaceAll("_", " "))) object.visible = false;
      if (object instanceof Mesh) object.castShadow = object.receiveShadow = true;
    });
    return copy;
  }, [scene]);
  useEffect(() => { onReady?.(); }, [onReady]);
  return <Clone object={train} dispose={null} />;
}
