"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import { trainJourneyPose } from "./train-journey-layout";

/** Keep the same camera and renderer while travelling through a window into the cabin. */
export function TrainJourneyCamera({ progress, reducedMotion }: { progress: number; reducedMotion: boolean }) {
  const { size, invalidate } = useThree();
  const initialized = useRef(false);
  useLayoutEffect(() => { invalidate(); }, [progress, size.width, size.height, invalidate]);

  useFrame(({ camera }, delta) => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const travel = reducedMotion ? (progress >= 0.99 ? 1 : 0) : progress;
    const target = trainJourneyPose(travel, size.width < size.height);
    const mix = !initialized.current || reducedMotion ? 1 : 1 - Math.exp(-12 * Math.min(delta, 0.1));
    camera.position.lerp(target.position, mix);
    camera.quaternion.slerp(target.quaternion, mix);
    camera.fov = target.fov;
    camera.updateProjectionMatrix();
    initialized.current = true;
    if (camera.position.distanceTo(target.position) > 0.0001 || camera.quaternion.angleTo(target.quaternion) > 0.0001) invalidate();
  });
  return null;
}
