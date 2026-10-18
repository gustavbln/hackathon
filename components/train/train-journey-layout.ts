import { MathUtils, Matrix4, Quaternion, Vector3 } from "three";

// The existing cabin uses Z along the aisle; the exterior asset uses X along the rails.
export const CABIN_TO_TRAIN = new Matrix4().compose(
  new Vector3(4.785, 1.35, 0),
  new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
  new Vector3(0.6, 0.85, 1.45),
);
export const TRAIN_TO_CABIN = CABIN_TO_TRAIN.clone().invert();

export function trainPointToCabin(x: number, y: number, z: number) {
  return new Vector3(x, y, z).applyMatrix4(TRAIN_TO_CABIN);
}

const smoothstep = (value: number) => {
  const t = MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export function trainJourneyPose(progress: number, portrait: boolean) {
  const travel = MathUtils.clamp(progress, 0, 1);
  const distance = portrait ? 140 : 65;
  const start = new Vector3((portrait ? 0.96 : 0.52) * distance, (portrait ? 0.3 : 0.27) * distance, (portrait ? 0.28 : 0.81) * distance);
  const approach = smoothstep(travel / 0.65);
  const through = smoothstep((travel - 0.65) / 0.18);
  const aisle = smoothstep((travel - 0.83) / 0.17);
  const remaining = (Math.exp(-3.5 * approach) - Math.exp(-3.5)) / (1 - Math.exp(-3.5));
  const position = new Vector3(
    MathUtils.lerp(0.385, start.x, remaining),
    MathUtils.lerp(2.75, start.y, remaining),
    MathUtils.lerp(4.4, start.z, remaining),
  );
  position.z = MathUtils.lerp(position.z, 0.45, through);
  const home = new Vector3(0, 1.65, 4.6).applyMatrix4(CABIN_TO_TRAIN);
  position.lerp(home, aisle);
  const lookAt = new Vector3(0.385, MathUtils.lerp(2.2, 2.75, approach), -2);
  lookAt.lerp(new Vector3(0.385 - 6 * aisle, 2.75, 0), smoothstep((travel - 0.77) / 0.13));
  position.applyMatrix4(TRAIN_TO_CABIN);
  lookAt.applyMatrix4(TRAIN_TO_CABIN);
  const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(position, lookAt, new Vector3(0, 1, 0)));
  quaternion.slerp(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.04), smoothstep((travel - 0.9) / 0.1));
  return { position, quaternion, fov: MathUtils.lerp(portrait ? 50 : 36, portrait ? 80 : 62, smoothstep((travel - 0.67) / 0.33)) };
}
