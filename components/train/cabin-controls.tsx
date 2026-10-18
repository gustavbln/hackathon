"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { MathUtils } from "three";

export type CabinView = {
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  resetView: number;
};

export const clampZoom = (zoom: number) => MathUtils.clamp(zoom, 0.85, 2.2);

export function CabinControls({ setZoom, resetView, dragged, enabled = true }: CabinView & { dragged: RefObject<boolean>; enabled?: boolean }) {
  const { camera, gl, invalidate, size } = useThree();
  const angles = useRef({ yaw: 0, pitch: -0.04 });

  useEffect(() => {
    angles.current = { yaw: 0, pitch: -0.04 };
    camera.rotation.set(-0.04, 0, 0, "YXZ");
    invalidate();
  }, [camera, resetView, invalidate]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let origin = { x: 0, y: 0 };
    const distance = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const rotate = (dx: number, dy: number) => {
      angles.current.yaw += dx * 0.003;
      angles.current.pitch = MathUtils.clamp(angles.current.pitch + dy * 0.003, -0.95, 0.95);
      camera.rotation.set(angles.current.pitch, angles.current.yaw, 0, "YXZ");
      invalidate();
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (!pointers.size) {
        dragged.current = false;
        origin = { x: event.clientX, y: event.clientY };
      } else dragged.current = true;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture(event.pointerId);
      canvas.focus({ preventScroll: true });
    };
    const move = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const before = distance();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const after = distance();
        if (before > 0 && after > 0) setZoom((value) => clampZoom(value * after / before));
      } else {
        if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 5) dragged.current = true;
        if (dragged.current) rotate(event.clientX - previous.x, event.clientY - previous.y);
      }
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const cancel = (event: PointerEvent) => { dragged.current = true; up(event); };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.height : 1);
      setZoom((value) => clampZoom(value * Math.exp(-MathUtils.clamp(delta, -200, 200) * 0.002)));
    };
    const key = (event: KeyboardEvent) => {
      const steps: Record<string, [number, number]> = { ArrowLeft: [25, 0], ArrowRight: [-25, 0], ArrowUp: [0, 25], ArrowDown: [0, -25] };
      if (steps[event.key]) { event.preventDefault(); rotate(...steps[event.key]); }
      if (event.key === "+" || event.key === "=" || event.key === "-") {
        event.preventDefault();
        setZoom((value) => clampZoom(value + (event.key === "-" ? -0.15 : 0.15)));
      }
    };
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("aria-label", "Cabin panorama. Drag or use arrow keys to look around. Scroll, pinch, or use plus and minus to zoom.");
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("keydown", key);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("keydown", key);
      canvas.removeAttribute("tabindex");
    };
  }, [camera, gl, invalidate, setZoom, dragged, size.height, enabled]);

  return null;
}
