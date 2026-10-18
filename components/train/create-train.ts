import * as THREE from "three";

export type TrainPalette = {
  surface: string;
  line: string;
  glass: string;
  mechanical: string;
};

type ExteriorPalette = {
  exterior: string;
  livery: string;
  windshield: string;
  headlight: string;
  rail: string;
};
type Point = [number, number, number];

/** Original, unbranded high-speed train. Metres; X longitudinal, Y up, Z across. */
export function createTrain(palette: TrainPalette, exterior: ExteriorPalette) {
  const train = new THREE.Group();
  train.name = "High-speed electric multiple unit";
  const paint = new THREE.MeshStandardMaterial({ color: exterior.exterior, roughness: 0.27, metalness: 0.32 });
  const red = new THREE.MeshStandardMaterial({ color: exterior.livery, roughness: 0.3, metalness: 0.25 });
  const glass = new THREE.MeshStandardMaterial({ color: exterior.windshield, roughness: 0.16, metalness: 0.55 });
  const rubber = new THREE.MeshStandardMaterial({ color: exterior.windshield, roughness: 0.85 });
  const steel = new THREE.MeshStandardMaterial({ color: exterior.rail, roughness: 0.36, metalness: 0.8 });
  const equipment = new THREE.MeshStandardMaterial({ color: palette.line, roughness: 0.7, metalness: 0.35 });
  const light = new THREE.MeshStandardMaterial({ color: exterior.headlight, emissive: exterior.headlight, emissiveIntensity: 1.7, roughness: 0.2 });

  function mesh(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: Point = [0, 0, 0], rotation?: Point) {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.set(...position);
    if (rotation) object.rotation.set(...rotation);
    object.castShadow = true;
    object.receiveShadow = true;
    train.add(object);
    return object;
  }
  function box(name: string, size: Point, position: Point, material = equipment) {
    return mesh(name, new THREE.BoxGeometry(...size), material, position);
  }
  function rod(name: string, a: Point, b: Point, radius: number, material = steel) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const object = mesh(name, new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 10), material);
    object.position.copy(start).add(end).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  }

  // The cab roof drops into the nose over six metres; the sides stay nearly vertical.
  function section(x: number, angle: number, cab: boolean, offset = 0): Point {
    const t = cab ? THREE.MathUtils.smoothstep(x, 6.8, 13) : 0;
    const halfHeight = 1.49 - 1.36 * t;
    const halfWidth = 1.46 - 1.12 * t;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [x, 2.54 - 0.8 * t + (halfHeight + offset) * Math.sign(c) * Math.pow(Math.abs(c), 0.7),
      (halfWidth + offset) * Math.sign(s) * Math.pow(Math.abs(s), 0.72)];
  }

  function carriage(center: number, direction: number, cab: boolean, name: string) {
    const world = ([x, y, z]: Point): Point => [center + direction * x, y, direction * z];
    function patch(label: string, x1: number, x2: number, a1: number, a2: number, material: THREE.Material, offset = 0, rounded = false) {
      const positions: number[] = [];
      const indices: number[] = [];
      const rows = Math.max(12, Math.ceil((x2 - x1) * 5));
      const sides = Math.max(16, Math.ceil((a2 - a1) * 48));
      for (let u = 0; u <= rows; u++) {
        const x = THREE.MathUtils.lerp(x1, x2, u / rows);
        const endDistance = Math.min(x - x1, x2 - x);
        const radius = Math.min(0.12, (x2 - x1) / 4);
        const corner = rounded && endDistance < radius ? (1 - Math.sqrt(1 - Math.pow(1 - endDistance / radius, 2))) * (a2 - a1) * 0.15 : 0;
        for (let v = 0; v <= sides; v++) {
          positions.push(...world(section(x, THREE.MathUtils.lerp(a1 + corner, a2 - corner, v / sides), cab, offset)));
          if (u < rows && v < sides) {
            const i = u * (sides + 1) + v;
            indices.push(i, i + 1, i + sides + 1, i + 1, i + sides + 2, i + sides + 1);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return mesh(`${name} ${label}`, geometry, material);
    }
    patch("body", -12.5, cab ? 13 : 12.5, 0, Math.PI * 2, paint);
    for (const end of [-12.5, cab ? 13 : 12.5]) {
      const shape = new THREE.Shape();
      for (let i = 0; i <= 64; i++) {
        const [, y, z] = section(end, i / 64 * Math.PI * 2, cab);
        if (i === 0) shape.moveTo(z, y); else shape.lineTo(z, y);
      }
      const cap = new THREE.ShapeGeometry(shape);
      // Rotate local XY into the YZ cross-section.
      cap.rotateY(Math.PI / 2);
      mesh(`${name} end cap`, cap, paint, [center + direction * end, 0, 0], [0, direction < 0 ? Math.PI : 0, 0]);
    }
    for (const side of [0, Math.PI]) {
      const sidePatch = (label: string, x1: number, x2: number, a1: number, a2: number, material: THREE.Material, offset: number, rounded = false) =>
        patch(label, x1, x2, side === 0 ? a1 : 3 * Math.PI - a2, side === 0 ? a2 : 3 * Math.PI - a1, material, offset, rounded);
      sidePatch("red waist stripe", -12.45, cab ? 12.6 : 12.45, side + 1.86, side + 2.01, red, 0.018);
      sidePatch("lower skirt", -12.45, cab ? 7.6 : 12.45, side + 2.36, side + 2.49, steel, 0.02);
      for (let x = -9; x < (cab ? 5.8 : 10); x += 1.75) {
        sidePatch("window gasket", x - 0.05, x + 1.32, side + 1.035, side + 1.58, rubber, 0.025, true);
        sidePatch("passenger window", x, x + 1.27, side + 1.075, side + 1.54, glass, 0.04, true);
      }
      for (const x of [-11.65, ...(cab ? [] : [10.6])]) {
        sidePatch("door seal", x, x + 0.94, side + 0.92, side + 2.32, rubber, 0.023, true);
        sidePatch("door", x + 0.035, x + 0.905, side + 0.94, side + 2.3, paint, 0.035, true);
        sidePatch("door glazing", x + 0.2, x + 0.74, side + 1.08, side + 1.56, glass, 0.05, true);
        sidePatch("door stripe", x + 0.04, x + 0.9, side + 1.86, side + 2.01, red, 0.05);
      }
    }
    if (cab) {
      patch("windscreen surround", 7.85, 10.05, -0.76, 0.76, rubber, 0.035, true);
      patch("windscreen", 7.94, 9.96, -0.7, 0.7, glass, 0.055, true);
      for (const side of [-1, 1]) {
        const angle = side > 0 ? 1.27 : Math.PI * 2 - 1.45;
        patch("headlight housing", 11.1, 11.98, angle, angle + 0.23, rubber, 0.04, true);
        patch("LED headlight", 11.2, 11.88, angle + 0.04, angle + 0.18, light, 0.06, true);
      }
      rod(`${name} wiper`, world([8.12, 3.73, 0.05]), world([9.13, 3.34, 0.42]), 0.022, rubber);
    }
    box(`${name} underfloor cabinets`, [18.5, 0.5, 2.18], world([-0.7, 0.99, 0]), steel);
    for (const x of [-8.9, cab ? 5.5 : 8.9]) {
      const bx = center + direction * x;
      box(`${name} bogie`, [3.25, 0.38, 1.8], [bx, 0.69, 0], rubber);
      for (const axle of [-1.1, 1.1]) {
        rod(`${name} axle`, [bx + axle, 0.46, -1.12], [bx + axle, 0.46, 1.12], 0.1);
        for (const side of [-1, 1]) {
          mesh(`${name} wheel`, new THREE.CylinderGeometry(0.46, 0.46, 0.16, 32), steel, [bx + axle, 0.46, side * 0.88], [Math.PI / 2, 0, 0]);
          mesh(`${name} brake disc`, new THREE.CylinderGeometry(0.29, 0.29, 0.05, 24), equipment, [bx + axle, 0.46, side * 1.0], [Math.PI / 2, 0, 0]);
          mesh(`${name} suspension`, new THREE.CylinderGeometry(0.16, 0.16, 0.25, 12), steel, [bx + axle * 0.6, 0.78, side * 0.91]);
        }
      }
    }
    box(`${name} rooftop HVAC`, [3.8, 0.19, 1.55], world([-3.5, 4.03, 0]), paint);
    for (let x = -5.1; x < -1.8; x += 0.16) box(`${name} ventilation louvre`, [0.045, 0.025, 1.25], world([x, 4.14, 0]), steel);
  }

  carriage(25.65, 1, true, "Front power car");
  carriage(0, 1, false, "Passenger carriage");
  carriage(-25.65, -1, true, "Rear power car");
  for (const x of [-12.825, 12.825]) {
    box("Gangway bellows", [0.65, 2.8, 2.35], [x, 2.48, 0], rubber);
    for (let dx = -0.27; dx <= 0.27; dx += 0.09) box("Gangway fold", [0.035, 2.88, 2.43], [x + dx, 2.48, 0], steel);
    box("Coupler", [0.9, 0.2, 0.26], [x, 0.9, 0], steel);
  }
  box("Pantograph base", [2.6, 0.14, 1.5], [-6.5, 4.06, 0], steel);
  for (const z of [-0.46, 0.46]) {
    rod("Pantograph lower arm", [-7.5, 4.2, z], [-5.4, 4.95, z], 0.045);
    rod("Pantograph upper arm", [-5.4, 4.95, z], [-7.0, 5.6, z], 0.035);
  }
  box("Pantograph collector", [0.2, 0.09, 2.0], [-7, 5.6, 0], rubber);
  for (const z of [-0.7175, 0.7175]) {
    box("Rail head", [84, 0.085, 0.07], [0, -0.06, z], steel);
    box("Rail web", [84, 0.1, 0.025], [0, -0.14, z], steel);
  }
  for (let x = -41; x <= 41; x += 0.65) box("Track sleeper", [0.22, 0.12, 2.6], [x, -0.25, 0], equipment);
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
