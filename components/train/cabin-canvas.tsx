"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Edges, PerspectiveCamera, useCursor } from "@react-three/drei";
import { useState, type ReactNode } from "react";
import { CABIN_SEATS, type CabinSelection } from "./cabin-layout";
import type { TrainPalette } from "./create-train";

type Point = [number, number, number];

function BlueprintBox({ size, position, palette, color = palette.surface, bright = false }: {
  size: Point; position: Point; palette: TrainPalette; color?: string; bright?: boolean;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} />
      <Edges color={palette.line} transparent opacity={bright ? 1 : 0.38} raycast={() => null} />
    </mesh>
  );
}

function Seat({ id, position, palette, selectedSeatId, onSeatSelect }: {
  id: string; position: Point; palette: TrainPalette;
} & CabinSelection) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const active = hovered || selectedSeatId === id;
  const color = active ? palette.glass : palette.surface;
  const box = { palette, color, bright: active };

  return (
    <group name={`seat-${id}`} position={position}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => { event.stopPropagation(); onSeatSelect(id); }}>
      <BlueprintBox {...box} size={[0.49, 0.14, 0.59]} position={[0, 0.51, 0]} />
      <group rotation={[-0.09, 0, 0]} position={[0, 1.03, -0.25]}>
        <BlueprintBox {...box} size={[0.49, 0.95, 0.13]} position={[0, 0, 0]} />
        <BlueprintBox {...box} size={[0.35, 0.23, 0.08]} position={[0, 0.29, 0.1]} />
      </group>
      {[-0.28, 0.28].map((x) => (
        <BlueprintBox key={x} {...box} size={[0.06, 0.07, 0.5]} position={[x, 0.75, 0.01]} />
      ))}
      <BlueprintBox {...box} color={palette.mechanical} size={[0.12, 0.44, 0.34]} position={[0, 0.23, -0.05]} />
      <BlueprintBox {...box} color={palette.mechanical} size={[0.4, 0.04, 0.45]} position={[0, 0.04, -0.05]} />
    </group>
  );
}

function CabinShell({ palette }: { palette: TrainPalette }) {
  const box = { palette };
  return (
    // Solid cabin surfaces block pointer hits on geometry behind them.
    <group onPointerOver={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <BlueprintBox {...box} color={palette.mechanical} size={[3.8, 0.1, 13]} position={[0, -0.06, -1.5]} />
      <BlueprintBox {...box} size={[3.8, 0.1, 13]} position={[0, 2.65, -1.5]} />
      <BlueprintBox {...box} size={[3.8, 2.7, 0.1]} position={[0, 1.3, -8]} />
      <BlueprintBox {...box} color={palette.mechanical} size={[0.95, 2.2, 0.04]} position={[0, 1.1, -7.93]} />
      <BlueprintBox {...box} color={palette.glass} size={[0.6, 0.8, 0.04]} position={[0, 1.55, -7.89]} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <BlueprintBox {...box} size={[0.1, 0.9, 13]} position={[side * 1.85, 0.4, -1.5]} />
          <BlueprintBox {...box} size={[0.1, 0.6, 13]} position={[side * 1.85, 2.4, -1.5]} />
          <BlueprintBox {...box} color={palette.glass} size={[0.04, 1.25, 13]} position={[side * 1.88, 1.48, -1.5]} />
          {Array.from({ length: 8 }, (_, index) => (
            <BlueprintBox key={index} {...box} size={[0.14, 1.3, 0.09]} position={[side * 1.82, 1.48, 4.8 - index * 1.8]} />
          ))}
          <BlueprintBox {...box} color={palette.line} size={[0.025, 0.015, 12.8]} position={[side * 0.65, 2.58, -1.5]} />
          <BlueprintBox {...box} color={palette.glass} size={[0.015, 0.008, 12.8]} position={[side * 0.42, 0, -1.5]} />
        </group>
      ))}
    </group>
  );
}

function CabinCamera() {
  const { width, height } = useThree((state) => state.size);
  return <PerspectiveCamera makeDefault position={[0, 1.65, 4.6]} fov={width < height ? 80 : 62} near={0.05} far={40}
    onUpdate={(camera) => { camera.lookAt(0, 1.25, -5); camera.updateProjectionMatrix(); }} />;
}

export default function CabinCanvas({ fallback, ...selection }: CabinSelection & { fallback: ReactNode }) {
  const [palette] = useState<TrainPalette>(() => {
    const style = getComputedStyle(document.documentElement);
    const token = (name: string) => style.getPropertyValue(`--train-${name}`).trim();
    return { surface: token("surface"), line: token("line"), glass: token("glass"), mechanical: token("mechanical") };
  });

  return (
    <Canvas dpr={[1, 1.5]} frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      fallback={fallback} style={{ touchAction: "pan-y" }} aria-label="Inside the blueprint train cabin. Click a seat to select it."
      onPointerMissed={() => selection.onSeatSelect(null)}>
      <CabinCamera />
      <CabinShell palette={palette} />
      {CABIN_SEATS.map((seat) => <Seat key={seat.id} {...seat} {...selection} palette={palette} />)}
    </Canvas>
  );
}
