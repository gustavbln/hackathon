import { BoxGeometry, EdgesGeometry } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const boxes = new Map<string, { body: BoxGeometry; edges: EdgesGeometry }>();

// Repeated seat parts share geometry; materials stay separate so only the selected seat remains visible.
export function cabinBoxGeometry(size: [number, number, number], rounded: boolean) {
  const key = `${size.join(",")}:${rounded}`;
  let geometry = boxes.get(key);
  if (!geometry) {
    const body = rounded
      ? new RoundedBoxGeometry(...size, 2, Math.min(0.035, Math.min(...size) / 3))
      : new BoxGeometry(...size);
    geometry = { body, edges: new EdgesGeometry(body, 15) };
    boxes.set(key, geometry);
  }
  return geometry;
}
