import { BackSide } from "three";
import { TrainDepot, type DepotPalette } from "./train-depot";
import { depotJourney, TRAIN_TO_CABIN } from "./train-journey-layout";

/** Keeping the cabin at the origin lets the existing seat controls share this entire journey. */
export function TrainDepotWorld({ progress, palette }: { progress: number; palette: DepotPalette }) {
  const { door, offset } = depotJourney(progress);
  return (
    <group matrix={TRAIN_TO_CABIN} matrixAutoUpdate={false}>
      <mesh>
        <sphereGeometry args={[360, 32, 20]} />
        <meshBasicMaterial color={palette.sky} side={BackSide} />
      </mesh>
      <group position={[offset, 0, 0]}>
        <TrainDepot doorProgress={door} palette={palette} />
      </group>
    </group>
  );
}
