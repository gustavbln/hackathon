import { BackSide } from "three";
import type { CabinPalette } from "./cabin-palette";

export function TrainCountryside({ palette }: { palette: CabinPalette }) {
  return (
    <group name="Countryside outside the windows">
      <mesh><sphereGeometry args={[280, 24, 16]} /><meshBasicMaterial color={palette.sky} side={BackSide} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.98, 0]}>
        <planeGeometry args={[560, 560]} /><meshStandardMaterial color={palette.terrain} roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          {Array.from({ length: 5 }, (_, index) => (
            <mesh key={index} position={[side * (52 + index % 2 * 8), 0.5, -42 + index * 22]} scale={[12, 4 + index % 3, 16]}>
              <sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={palette.hills} roughness={1} />
            </mesh>
          ))}
          {Array.from({ length: 14 }, (_, index) => (
            <group key={index} position={[side * (7 + index % 4 * 2.7), -1.98, -34 + index * 5.5]}>
              <mesh position={[0, 0.75, 0]}><cylinderGeometry args={[0.1, 0.13, 1.8, 5]} /><meshStandardMaterial color={palette.line} /></mesh>
              <mesh position={[0, 2.3, 0]}><coneGeometry args={[1 + index % 3 * 0.15, 3.2, 6]} /><meshStandardMaterial color={palette.trees} roughness={1} /></mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

