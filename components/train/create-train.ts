import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

export type TrainPalette = {
  surface: string;
  line: string;
  glass: string;
  mechanical: string;
};

type Point = [number, number, number];

/** Original train asset in metres: X runs along the train, Y is up, ground is Y = 0. */
export function createTrain(palette: TrainPalette, livery?: { body: string; stripe: string; glass: string; headlight: string }) {
  const train = new THREE.Group();
  train.name = "Blueprint high-speed train";
  const surface = livery
    ? new THREE.MeshStandardMaterial({ color: livery.body, metalness: 0.2, roughness: 0.35 })
    : new THREE.MeshBasicMaterial({ color: palette.surface });
  const glass = new THREE.MeshBasicMaterial({ color: livery?.glass ?? palette.glass });
  const mechanical = new THREE.MeshBasicMaterial({ color: palette.mechanical });
  const ink = new THREE.LineBasicMaterial({ color: palette.line, transparent: Boolean(livery), opacity: livery ? 0.18 : 1 });
  const stripe = new THREE.MeshStandardMaterial({ color: livery?.stripe ?? palette.line, roughness: 0.35 });
  const headlight = new THREE.MeshStandardMaterial({ color: livery?.headlight ?? palette.glass, emissive: livery?.headlight ?? palette.glass, emissiveIntensity: livery ? 3 : 0 });
  const strokes: number[] = [];

  function line(points: Point[]) {
    for (let i = 1; i < points.length; i++) strokes.push(...points[i - 1], ...points[i]);
  }

  function mesh(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: Point, rotation?: Point) {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.set(...position);
    if (rotation) object.rotation.set(...rotation);
    train.add(object);
    return object;
  }

  function box(name: string, size: Point, position: Point, material = surface) {
    const object = mesh(name, new THREE.BoxGeometry(...size), material, position);
    const edges = new THREE.EdgesGeometry(object.geometry);
    const outline = new THREE.LineSegments(edges, ink);
    object.add(outline);
    return object;
  }

  // Rounded rectangular cross-section: flat-ish sides and a gently arched roof.
  function section(x: number, angle: number, cab: boolean, offset = 0): Point {
    const t = cab ? THREE.MathUtils.clamp((x - 2.2) / 3.4, 0, 1) : 0;
    const taper = t * t * (3 - 2 * t);
    const radiusY = 1.48 * (1 - 0.84 * taper) + offset;
    const radiusZ = 1.4 * (1 - 0.8 * taper) + offset;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return [x, 2.48 - 0.76 * taper + radiusY * Math.sign(cosine) * Math.pow(Math.abs(cosine), 0.65),
      radiusZ * Math.sign(sine) * Math.pow(Math.abs(sine), 0.65)];
  }

  function carriage(center: number, direction: number, cab: boolean, name: string) {
    const transform = ([x, y, z]: Point): Point => [center + direction * x, y, direction * z];
    const columns = 56;
    const sides = 48;
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let row = 0; row <= columns; row++) {
      const x = -5.6 + 11.2 * row / columns;
      for (let side = 0; side <= sides; side++) {
        vertices.push(...transform(section(x, side / sides * Math.PI * 2, cab)));
      }
    }
    for (let row = 0; row < columns; row++) {
      for (let side = 0; side < sides; side++) {
        const a = row * (sides + 1) + side;
        const b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    // Close both ends; the cab finishes in a small rounded face.
    for (const end of [0, columns]) {
      if (cab && livery && end === columns) continue;
      const x = -5.6 + 11.2 * end / columns;
      const top = section(x, 0, cab);
      const bottom = section(x, Math.PI, cab);
      const centerIndex = vertices.length / 3;
      vertices.push(...transform([x, (top[1] + bottom[1]) / 2, 0]));
      for (let side = 0; side < sides; side++) {
        const a = end * (sides + 1) + side;
        if (end === 0) indices.push(centerIndex, a + 1, a);
        else indices.push(centerIndex, a, a + 1);
      }
    }
    // Stitch a shallow dome into the nose instead of ending it with a flat disc.
    if (cab && livery) {
      const endX = 5.6;
      const centerY = 1.72;
      const rings = 12;
      let previous = columns * (sides + 1);
      for (let ring = 1; ring < rings; ring++) {
        const angle = ring / rings * Math.PI / 2;
        const start = vertices.length / 3;
        for (let side = 0; side <= sides; side++) {
          const point = section(endX, side / sides * Math.PI * 2, cab);
          vertices.push(...transform([endX + 0.22 * Math.sin(angle), centerY + (point[1] - centerY) * Math.cos(angle), point[2] * Math.cos(angle)]));
        }
        for (let side = 0; side < sides; side++) {
          const a = previous + side;
          const b = start + side;
          indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
        previous = start;
      }
      const pole = vertices.length / 3;
      vertices.push(...transform([endX + 0.22, centerY, 0]));
      for (let side = 0; side < sides; side++) indices.push(previous + side, previous + side + 1, pole);
    }
    const shell = new THREE.BufferGeometry();
    shell.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    shell.setIndex(indices);
    const geometry = mergeVertices(shell);
    shell.dispose();
    geometry.computeVertexNormals();
    mesh(name, geometry, surface, [0, 0, 0]);

    // Purposeful longitudinal curves and section ribs, without triangle diagonals.
    const outlineColumns = livery && cab ? Math.floor(columns * 7.8 / 11.2) : columns;
    for (let side = 0; side < 12; side++) {
      line(Array.from({ length: outlineColumns + 1 }, (_, row) =>
        transform(section(-5.6 + 11.2 * row / columns, side / 12 * Math.PI * 2, cab, 0.012))));
    }
    for (let row = 0; row <= 14; row++) {
      if (livery && cab && -5.6 + 11.2 * row / 14 > 2.2) continue;
      line(Array.from({ length: sides + 1 }, (_, side) =>
        transform(section(-5.6 + 11.2 * row / 14, side / sides * Math.PI * 2, cab, 0.012))));
    }

    // Surface-following panels remain flush with the rounded shell.
    function panel(label: string, x1: number, x2: number, a1: number, a2: number, material: THREE.Material = glass) {
      const points: number[] = [];
      const triangles: number[] = [];
      const steps = 8;
      for (let u = 0; u <= steps; u++) {
        for (let v = 0; v <= steps; v++) {
          points.push(...transform(section(THREE.MathUtils.lerp(x1, x2, u / steps),
            THREE.MathUtils.lerp(a1, a2, v / steps), cab, 0.065)));
          if (u < steps && v < steps) {
            const i = u * (steps + 1) + v;
            triangles.push(i, i + 1, i + steps + 1, i + 1, i + steps + 2, i + steps + 1);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
      geometry.setIndex(triangles);
      geometry.computeVertexNormals();
      mesh(`${name} ${label}`, geometry, material, [0, 0, 0]);
      for (const x of [x1, x2]) line(Array.from({ length: 17 }, (_, i) =>
        transform(section(x, THREE.MathUtils.lerp(a1, a2, i / 16), cab, 0.08))));
      for (const a of [a1, a2]) line(Array.from({ length: 17 }, (_, i) =>
        transform(section(THREE.MathUtils.lerp(x1, x2, i / 16), a, cab, 0.08))));
    }
    for (const side of [0, Math.PI]) {
      if (livery) {
        const a = side === 0 ? 1.72 : 4.44;
        panel("red side stripe", -5.55, cab ? 3.95 : 5.55, a, a + 0.12, stripe);
      }
      for (let x = -3.75; x < (cab ? 1.6 : 4.2); x += 1.25) {
        const a = side === 0 ? 1.12 : 4.65;
        panel("passenger window", x, x + 0.86, a, a + 0.5);
      }
      const a = side === 0 ? 1.05 : 3.95;
      for (const x of [-4.95, ...(cab ? [] : [4.65])]) {
        const corners = [[x, a], [x + 0.55, a], [x + 0.55, a + 1.25], [x, a + 1.25], [x, a]];
        line(corners.map(([px, angle]) => transform(section(px, angle, cab, 0.04))));
      }
    }
    if (cab) {
      panel("windscreen", 2.55, 3.65, -0.88, 0.88);
      if (livery) panel("red nose stripe", 3.95, 4.13, -1.72, 1.72, stripe);
      for (const side of [-1, 1]) {
        panel("headlight", 4.65, 5.08, side > 0 ? 1.05 : 4.85, side > 0 ? 1.28 : 5.08, headlight);
      }
    }
    box(`${name} underfloor equipment`, [7.5, 0.4, 1.85], transform([-0.4, 0.9, 0]), mechanical);
    for (const x of [-3.65, 2.0]) {
      const bogieX = center + direction * x;
      box(`${name} bogie frame`, [2.0, 0.3, 1.8], [bogieX, 0.62, 0], mechanical);
      for (const axle of [-0.66, 0.66]) {
        mesh(`${name} axle`, new THREE.CylinderGeometry(0.09, 0.09, 2.3, 12), mechanical,
          [bogieX + axle, 0.44, 0], [Math.PI / 2, 0, 0]);
        for (const side of [-1, 1]) {
          mesh(`${name} wheel`, new THREE.CylinderGeometry(0.43, 0.43, 0.19, 24), mechanical,
            [bogieX + axle, 0.44, side * 1.02], [Math.PI / 2, 0, 0]);
          for (const radius of [0.18, 0.43]) line(Array.from({ length: 33 }, (_, i) => {
            const angle = i / 32 * Math.PI * 2;
            return [bogieX + axle + radius * Math.cos(angle), 0.44 + radius * Math.sin(angle), side * 1.125];
          }));
        }
      }
    }
  }

  // Two cars, centred on the gangway between them.
  carriage(5.9, 1, true, "Front power car");
  carriage(-5.9, 1, false, "Passenger carriage");
  box("Flexible gangway", [0.6, 2.5, 2.35], [0, 2.4, 0], mechanical);
  for (const dx of [-0.2, 0, 0.2]) {
    line([[dx, 1.15, -1.19], [dx, 3.65, -1.19], [dx, 3.65, 1.19], [dx, 1.15, 1.19]]);
  }
  box("Roof ventilation unit", [2.0, 0.12, 1.1], [-5.9, 3.99, 0]);
  for (let x = -6.75; x <= -5.05; x += 0.17) line([[x, 4.055, -0.48], [x, 4.055, 0.48]]);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(strokes, 3));
  const contours = new THREE.LineSegments(lineGeometry, ink);
  contours.name = "Architectural contour lines";
  train.add(contours);
  return train;
}

export function disposeTrain(train: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  train.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
