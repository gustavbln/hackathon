"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { depotMaterials, type DepotPalette } from "./train-depot-materials";

export type { DepotPalette } from "./train-depot-materials";
type Point = [number, number, number];
type Materials = ReturnType<typeof depotMaterials>;
type Finish = keyof Materials;

function createDepot(palette: DepotPalette) {
  const scene = new THREE.Group();
  scene.name = "Siemens mobility workshop and rail yard";
  const materials = depotMaterials(palette);
  const batches = new Map<Finish, THREE.BufferGeometry[]>();
  const transform = new THREE.Object3D();
  function part(geometry: THREE.BufferGeometry, finish: Finish, position: Point = [0, 0, 0], rotation: Point = [0, 0, 0]) {
    transform.position.set(...position);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    geometry.applyMatrix4(transform.matrix);
    if (finish === "brick" || finish === "ground" || finish === "ballast") {
      const points = geometry.getAttribute("position"), normals = geometry.getAttribute("normal"), uv = geometry.getAttribute("uv");
      const scale = finish === "brick" ? 4 : 8;
      for (let i = 0; i < points.count; i++) {
        if (Math.abs(normals.getY(i)) > 0.5) uv.setXY(i, points.getX(i) / scale, points.getZ(i) / scale);
        else uv.setXY(i, (Math.abs(normals.getX(i)) > 0.5 ? points.getZ(i) : points.getX(i)) / scale, points.getY(i) / scale);
      }
    }
    const batch = batches.get(finish) ?? [];
    batch.push(geometry);
    batches.set(finish, batch);
  }
  function box(size: Point, position: Point, finish: Finish, rotation?: Point) {
    part(new THREE.BoxGeometry(...size), finish, position, rotation);
  }
  function rod(a: Point, b: Point, radius: number, finish: Finish = "steel") {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const geometry = new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 8);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()));
    part(geometry, finish, start.add(end).multiplyScalar(0.5).toArray() as Point);
  }
  function arch(width: number, eaves: number, rise: number, center: number, finish: Finish, x = 42.05) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, eaves);
    shape.lineTo(width / 2, eaves);
    shape.quadraticCurveTo(0, eaves + rise * 2, -width / 2, eaves);
    part(new THREE.ShapeGeometry(shape, 48), finish, [x, 0, center], [0, Math.PI / 2, 0]);
  }
  function roof(width: number, eaves: number, rise: number, center: number) {
    const coordinates: number[] = [], uv: number[] = [], indices: number[] = [];
    for (let end = 0; end < 2; end++) {
      for (let index = 0; index <= 48; index++) {
        const t = index / 48, z = (t - 0.5) * width;
        coordinates.push(end ? 42.1 : -68, eaves + rise * (1 - (z / (width / 2)) ** 2), center + z);
        uv.push(t, end);
        if (!end && index < 48) indices.push(index, index + 1, index + 49, index + 1, index + 50, index + 49);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(coordinates, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    part(geometry, "roof");
    for (let x = -68; x <= 42; x += 11) {
      const points = Array.from({ length: 33 }, (_, i) => {
        const z = (i / 32 - 0.5) * width;
        return new THREE.Vector3(x, eaves + rise * (1 - (z / (width / 2)) ** 2) + 0.04, center + z);
      });
      part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, x === 42 ? 0.13 : 0.055, 6, false), "steel");
    }
  }

  box([650, 0.15, 650], [40, -0.48, 0], "ground");
  box([110, 0.16, 26], [-13, -0.32, 0], "shadow");
  box([110, 8.2, 0.55], [-13, 3.75, -13], "brick");
  box([110, 8.2, 0.55], [-13, 3.75, 13], "brick");
  box([0.6, 10.4, 26], [-68, 4.7, 0], "shadow");
  roof(26.8, 8.2, 4.1, 0);
  arch(26, 8.15, 4.15, 0, "wall");
  box([1, 0.45, 27.3], [42.1, 8.1, 0], "wall");
  box([1.05, 0.12, 27.6], [42.15, 8.39, 0], "steel");

  // Brick piers and individual jambs leave a genuine opening for the unchanged train.
  for (const z of [-12, -4, 4, 12]) {
    box([0.8, 8.4, 2.6], [42, 3.8, z], "brick");
    box([0.95, 8.4, 0.34], [42.17, 3.8, z], "wall");
    box([1, 0.48, 2.65], [42.15, 0.0, z], "wall");
    box([1, 0.3, 2.65], [42.15, 6.35, z], "wall");
  }
  for (const z of [-8, 0, 8]) {
    box([0.72, 1.75, 5.45], [42.02, 7.25, z], "brick");
    box([0.8, 0.16, 5.55], [42.08, 6.35, z], "wall");
    box([0.1, 0.65, 4.85], [42.45, 6.85, z], "glass");
    arch(4.85, 7.17, 0.37, z, "glass", 42.46);
    for (let bar = -2.2; bar <= 2.21; bar += 0.55) box([0.13, 0.91, 0.035], [42.53, 6.98, z + bar], "shutter");
    box([0.14, 0.045, 4.9], [42.54, 6.97, z], "shutter");
    for (const side of [-1, 1]) {
      box([0.35, 6.7, 0.18], [42.28, 3.05, z + side * 2.73], "steel");
      box([0.15, 1.6, 0.2], [42.5, 0.5, z + side * 2.75], "safety");
    }
    if (z !== 0) {
      box([0.16, 6.6, 5.3], [42.12, 3.0, z], "shutter");
      for (let y = -0.2; y < 6.3; y += 0.28) box([0.035, 0.022, 5.3], [42.22, y, z], "steel");
      box([0.18, 0.72, 3.65], [42.25, 3.6, z], "glass");
      for (const offset of [-1.8, -0.9, 0, 0.9, 1.8]) box([0.2, 0.75, 0.04], [42.3, 3.6, z + offset], "steel");
    }
  }
  part(new THREE.PlaneGeometry(6.8, 1.7), "sign", [42.7, 10.25, 0], [0, Math.PI / 2, 0]);
  box([0.15, 1.15, 4.3], [42.5, 8.95, 0], "glass");
  for (let z = -2; z <= 2; z += 0.4) box([0.22, 1.2, 0.035], [42.59, 8.95, z], "shutter");
  for (const z of [-8, 8]) {
    part(new THREE.CylinderGeometry(0.32, 0.32, 1.7, 12), "steel", [42.65, 9.25, z], [0, 0, -0.18]);
    part(new THREE.CylinderGeometry(0.4, 0.4, 0.45, 16), "steel", [42.88, 10.08, z], [0, 0, Math.PI / 2]);
    part(new THREE.CircleGeometry(0.31, 16), "shadow", [43.13, 10.08, z], [0, Math.PI / 2, 0]);
  }

  // A hazy skyline behind a belt of trees fills the horizon below the landing headline.
  for (let i = 0; i < 16; i++) {
    const height = 6 + i * 37 % 9 * 2;
    box([8 + i % 2 * 4, height, 4 + i % 3], [-262 - i % 3 * 7, height / 2 - 0.4, -40 + i * 5], "shutter");
  }
  for (let i = 0; i < 70; i++) {
    const height = 7 + i * 17 % 5 * 1.6;
    part(new THREE.ConeGeometry(height * 0.3, height, 7), "trees", [-150 - i * 53 % 95, height / 2 - 0.4, -45 + i * 29 % 85]);
  }

  for (let x = -60; x <= 38; x += 14) {
    for (const z of [-12.6, -4, 4, 12.6]) box([0.22, 7.8, 0.22], [x, 3.55, z], "steel");
    box([0.22, 0.3, 25.3], [x, 7.4, 0], "steel");
    for (const z of [-8, 8]) box([1.8, 0.05, 0.24], [x, 7.15, z], "light");
    rod([x, 7.45, -12], [x, 10.5, 0], 0.045);
    rod([x, 7.45, 12], [x, 10.5, 0], 0.045);
    box([1.1, 3, 0.15], [x, 3, 13.36], "glass");
  }

  // Tracks share the train's metre scale and extend under the doors into the shed.
  for (const z of [-22, -8, 0, 8, 22]) {
    box([270, 0.1, 3.5], [60, -0.34, z], "ballast");
    for (const side of [-1, 1]) {
      box([270, 0.085, 0.075], [60, -0.06, z + side * 0.7175], "steel");
      box([270, 0.1, 0.025], [60, -0.14, z + side * 0.7175], "steel");
    }
    for (let x = -73; x <= 194; x += 0.9) box([0.2, 0.12, 2.6], [x, -0.25, z], "shadow");
  }
  for (const z of [-4.4, 4.4, 13.8]) {
    box([138, 0.12, 1.5], [111, -0.26, z], "wall");
    box([136, 0.025, 0.09], [111, -0.185, z - 0.65], "marking");
    for (let x = 44; x < 177; x += 4) box([0.025, 0.015, 1.5], [x, -0.193, z], "ground");
  }
  for (let z = -28; z <= 37; z += 3.5) {
    if (Math.abs(z) <= 16) continue;
    box([0.16, 2.4, 0.16], [48, 0.9, z], "steel");
    rod([48, 1.8, z], [48, 1.8, z + 3.5], 0.04);
  }
  for (const [x, z] of [[60, -20], [115, -28], [-40, 37]]) {
    part(new THREE.CylinderGeometry(0.09, 0.18, 17, 10), "steel", [x, 8.1, z]);
    box([1.6, 0.12, 1.6], [x, 16.5, z], "steel");
    for (const dx of [-0.6, 0.6]) for (const dz of [-0.6, 0.6]) {
      box([0.48, 0.16, 0.42], [x + dx, 16.6, z + dz], "shadow");
      box([0.4, 0.025, 0.34], [x + dx, 16.5, z + dz], "light");
    }
  }
  for (const z of [-15, 15]) {
    box([2, 2.1, 1.1], [46, 0.75, z], "steel");
    box([0.05, 0.55, 0.65], [47.03, 1.2, z], "brand");
  }
  // Low service halls and a fenced access road give the yard a restrained industrial horizon.
  for (const [x, z, width, height] of [[-78, -62, 44, 6.6], [-20, -68, 38, 5.4], [49, -63, 52, 7.2]]) {
    box([width, height, 18], [x, height / 2 - 0.35, z], "wall");
    box([width + 0.5, 0.22, 18.5], [x, height - 0.25, z], "steel");
    box([width - 2, 1.1, 0.12], [x, height - 1.85, z + 9.07], "glass");
    for (let offset = -width / 2 + 2; offset < width / 2; offset += 3) {
      box([0.075, 1.2, 0.17], [x + offset, height - 1.85, z + 9.1], "shutter");
    }
    for (let offset = -width / 2 + 5; offset < width / 2; offset += 10) {
      box([9.8, 0.16, 18.3], [x + offset, height + 0.42, z], "roof", [0, 0, -0.13]);
      box([0.14, 1.3, 17.7], [x + offset - 4.85, height + 0.42, z], "glass");
    }
    box([2.6, 1.1, 1.8], [x + width / 4, height + 1.05, z - 3], "shutter");
    part(new THREE.CylinderGeometry(0.28, 0.37, 3.5, 8), "steel", [x - width / 4, height + 1.5, z - 5]);
    box([3.8, 3.3, 0.15], [x + width / 3, 1.3, z + 9.1], "shutter");
  }
  box([280, 0.13, 0.35], [20, -0.3, -42], "wall");
  for (let x = -120; x <= 160; x += 5) box([0.09, 2.45, 0.09], [x, 0.85, -42], "steel");
  for (const y of [0.35, 1.75]) rod([-120, y, -42], [160, y, -42], 0.025);
  for (let x = -120; x <= 160; x += 0.8) box([0.025, 1.75, 0.025], [x, 0.95, -42], "steel");
  for (const z of [-46, -52]) box([280, 0.015, 0.1], [20, -0.396, z], "wall");
  // Merge every repeated detail by finish: brick joints, sleepers and mullions cost one draw call each.
  for (const [finish, geometries] of batches) {
    const geometry = mergeGeometries(geometries);
    if (!geometry) throw new Error(`Unable to merge the depot's ${finish} geometry.`);
    const mesh = new THREE.Mesh(geometry, materials[finish]);
    mesh.castShadow = finish !== "sign";
    mesh.receiveShadow = true;
    scene.add(mesh);
    geometries.forEach((source) => source.dispose());
  }
  return { scene, materials };
}

const DOOR_SLATS = 34;
function shutterPose(index: number, progress: number) {
  const distance = -0.3 + (index + 0.5) * 6.7 / DOOR_SLATS + THREE.MathUtils.clamp(progress, 0, 1) * 6.9;
  const bend = Math.max(0, distance - 6.4), radius = 0.55;
  const angle = Math.min(Math.PI / 2, bend / radius);
  return {
    position: [42.12 - radius * (1 - Math.cos(angle)) - Math.max(0, bend - radius * Math.PI / 2), Math.min(distance, 6.4) + radius * Math.sin(angle), 0] as Point,
    rotation: [0, 0, angle] as Point,
  };
}

export function TrainDepot({ doorProgress, palette }: { doorProgress: number; palette: DepotPalette }) {
  const depot = useMemo(() => createDepot(palette), [palette]);
  const slat = useMemo(() => new THREE.BoxGeometry(0.13, 6.7 / DOOR_SLATS - 0.012, 5.32), []);
  useEffect(() => () => {
    depot.scene.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    for (const material of Object.values(depot.materials)) {
      material.map?.dispose();
      material.dispose();
    }
  }, [depot]);
  useEffect(() => () => slat.dispose(), [slat]);
  return (
    <group name="Siemens depot" dispose={null}>
      <primitive object={depot.scene} />
      <group name="Sectional workshop door">
        {Array.from({ length: DOOR_SLATS }, (_, index) => (
          <mesh key={index} geometry={slat} material={depot.materials.shutter} {...shutterPose(index, doorProgress)} castShadow />
        ))}
      </group>
    </group>
  );
}
