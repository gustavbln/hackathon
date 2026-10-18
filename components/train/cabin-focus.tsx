"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line, MathUtils, Matrix4, Mesh, PerspectiveCamera, Quaternion, Vector3, type Group, type Material, type Object3D } from "three";
import { CABIN_SEATS } from "./cabin-layout";

type View = { position: Vector3; quaternion: Quaternion; fov: number };
type Finish = { material: Material; opacity: number; transparent: boolean; depthWrite: boolean };

/** Keep the actual selected chair in one canvas while the camera and the surrounding cabin dissolve. */
export function CabinFocus({ seatId, world, seats, zoom, rotating, reducedMotion }: {
  seatId: string | null; world: RefObject<Group | null>; seats: RefObject<Group | null>;
  zoom: number; rotating: boolean; reducedMotion: boolean;
}) {
  const { camera, size, invalidate } = useThree();
  const home = useRef<View | null>(null);
  const motion = useRef<(View & { elapsed: number; mix: number }) | null>(null);
  const mix = useRef(0);
  const activeSeat = useRef<string | null>(null);
  const finishes = useRef<Finish[]>([]);
  const spin = useRef(0);
  const bob = useRef(0);

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !world.current || !seats.current) return;
    if (!seatId && !home.current) return;
    const view = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov };
    if (seatId && !home.current) home.current = view;
    if (seatId) activeSeat.current = seatId;
    motion.current = { ...view, elapsed: 0, mix: mix.current };

    for (const finish of finishes.current) Object.assign(finish.material, {
      opacity: finish.opacity, transparent: finish.transparent, depthWrite: finish.depthWrite,
    });
    const materials = new Set<Material>();
    const collect = (object: Object3D) => {
      if (object instanceof Mesh || object instanceof Line) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    };
    world.current.traverse(collect);
    for (const seat of seats.current.children) if (seat.name !== `seat-${activeSeat.current}`) seat.traverse(collect);
    finishes.current = [...materials].map((material) => ({ material, opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite }));
    for (const finish of finishes.current) {
      finish.material.transparent = true;
      finish.material.depthWrite = false;
      finish.material.opacity = finish.opacity * (1 - mix.current);
    }
    Object.assign(world.current, { visible: true });
    for (const seat of seats.current.children) Object.assign(seat, { visible: true });
    invalidate();
  }, [camera, seatId, world, seats, invalidate]);

  useLayoutEffect(() => { invalidate(); }, [size.width, size.height, zoom, rotating, reducedMotion, invalidate]);

  useFrame((state, delta) => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const normalFov = MathUtils.clamp((size.width < size.height ? 80 : 62) / zoom, 28, 90);
    const animation = motion.current;
    const seat = CABIN_SEATS.find(({ id }) => id === activeSeat.current);
    if (!animation || !home.current || !seat) {
      Object.assign(camera, { fov: normalFov });
      camera.updateProjectionMatrix();
      return;
    }

    animation.elapsed += Math.min(delta, 0.05);
    const t = reducedMotion ? 1 : Math.min(animation.elapsed / 0.85, 1);
    const eased = t * t * (3 - 2 * t);
    mix.current = MathUtils.lerp(animation.mix, seatId ? 1 : 0, eased);
    const target = new Vector3(...seat.position).add(new Vector3(2, 1.8, 3));
    const lookAt = new Vector3(...seat.position).add(new Vector3(0, 0.95, 0));
    const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(target, lookAt, camera.up));
    const focusFov = MathUtils.radToDeg(2 * Math.atan(Math.max(2.3, 1.3 * size.height / size.width) / (2 * target.distanceTo(lookAt))));
    camera.position.lerpVectors(animation.position, seatId ? target : home.current.position, eased);
    camera.quaternion.slerpQuaternions(animation.quaternion, seatId ? quaternion : home.current.quaternion, eased);
    Object.assign(camera, { fov: MathUtils.lerp(animation.fov, seatId ? focusFov : normalFov, eased) });
    camera.updateProjectionMatrix();

    const visibility = 1 - mix.current;
    for (const finish of finishes.current) Object.assign(finish.material, { opacity: finish.opacity * visibility });
    if (world.current) Object.assign(world.current, { visible: visibility > 0.001 });
    for (const object of seats.current?.children ?? []) {
      const selected = object.name === `seat-${activeSeat.current}`;
      Object.assign(object, { visible: selected || visibility > 0.001 });
      if (selected) {
        if (seatId && rotating && !reducedMotion) {
          spin.current += Math.min(delta, 0.05) * 0.28;
          bob.current = Math.sin(state.clock.elapsedTime * 0.9) * 0.025;
        }
        object.rotation.set(0, spin.current * mix.current, 0);
        object.position.setY(reducedMotion ? 0 : (0.09 + bob.current) * mix.current);
      }
    }
    if (t < 1 || (seatId && rotating && !reducedMotion)) invalidate();
    if (!seatId && t === 1) {
      for (const finish of finishes.current) Object.assign(finish.material, {
        opacity: finish.opacity, transparent: finish.transparent, depthWrite: finish.depthWrite,
      });
      finishes.current = [];
      motion.current = null;
      home.current = null;
      activeSeat.current = null;
      spin.current = 0;
    }
  });

  return null;
}
