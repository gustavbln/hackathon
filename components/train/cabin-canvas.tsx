"use client";

import { Canvas } from "@react-three/fiber";
import { Edges, RoundedBox, useCursor } from "@react-three/drei";
import { useRef, useState, type ReactNode } from "react";
import { CabinControls, type CabinView } from "./cabin-controls";
import { CABIN_SEATS, type CabinSelection } from "./cabin-layout";
import type { TrainPalette } from "./create-train";

type Point = [number, number, number];

function BlueprintBox({ size, position, palette, color = palette.surface, bright = false, rounded = false }: {
  size: Point; position: Point; palette: TrainPalette; color?: string; bright?: boolean; rounded?: boolean;
}) {
  const finish = <>
      <meshStandardMaterial color={color} roughness={0.85} />
      <Edges color={palette.line} transparent opacity={bright ? 1 : 0.65} raycast={() => null} />
    </>;
  return rounded
    ? <RoundedBox args={size} radius={Math.min(0.035, Math.min(...size) / 3)} smoothness={2} position={position}>{finish}</RoundedBox>
    : <mesh position={position}><boxGeometry args={size} />{finish}</mesh>;
}

function Seat({ id, position, palette, selectedSeatId, onSeatSelect }: {
  id: string; position: Point; palette: TrainPalette;
} & CabinSelection) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const active = hovered || selectedSeatId === id;
  const color = active ? palette.glass : palette.surface;
  const box = { palette, color, bright: active, rounded: true };

  return (
    <group name={`seat-${id}`} position={position}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => { event.stopPropagation(); if (event.delta <= 5) onSeatSelect(id); }}>
      <BlueprintBox {...box} size={[0.49, 0.14, 0.59]} position={[0, 0.51, 0]} />
      <BlueprintBox {...box} color={palette.mechanical} size={[0.51, 0.06, 0.6]} position={[0, 0.41, 0]} />
      <group rotation={[-0.09, 0, 0]} position={[0, 1.03, -0.25]}>
        <BlueprintBox {...box} color={palette.mechanical} size={[0.51, 0.98, 0.14]} position={[0, 0, -0.03]} />
        <BlueprintBox {...box} size={[0.4, 0.57, 0.12]} position={[0, -0.12, 0.07]} />
        <BlueprintBox {...box} size={[0.35, 0.28, 0.14]} position={[0, 0.3, 0.08]} />
        <BlueprintBox {...box} color={palette.line} size={[0.24, 0.16, 0.012]} position={[0, 0.34, 0.16]} />
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.21, 0.28, 0.11]} rotation={[0, side * -0.25, 0]}>
            <BlueprintBox {...box} size={[0.08, 0.3, 0.19]} position={[0, 0, 0]} />
          </group>
        ))}
        <BlueprintBox {...box} size={[0.36, 0.32, 0.035]} position={[0, -0.15, -0.12]} />
        <BlueprintBox {...box} color={palette.glass} size={[0.08, 0.025, 0.04]} position={[0, 0.04, -0.15]} />
      </group>
      {[-0.28, 0.28].map((x) => (
        <BlueprintBox key={x} {...box} size={[0.06, 0.07, 0.5]} position={[x, 0.75, 0.01]} />
      ))}
      <BlueprintBox {...box} color={palette.mechanical} size={[0.12, 0.44, 0.34]} position={[0, 0.23, -0.05]} />
      <BlueprintBox {...box} color={palette.mechanical} size={[0.4, 0.04, 0.45]} position={[0, 0.04, -0.05]} />
      <BlueprintBox {...box} color={palette.glass} size={[0.32, 0.035, 0.12]} position={[0, 0.2, -0.43]} />
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
      <BlueprintBox {...box} size={[3.8, 2.7, 0.1]} position={[0, 1.3, 5]} />
      <BlueprintBox {...box} color={palette.mechanical} size={[0.95, 2.2, 0.04]} position={[0, 1.1, 4.93]} />
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
          <BlueprintBox {...box} color={palette.mechanical} size={[0.75, 0.065, 11.8]} position={[side * 1.43, 2.05, -1.5]} />
          <BlueprintBox {...box} color={palette.glass} size={[0.05, 0.09, 11.8]} position={[side * 1.06, 2.13, -1.5]} />
          <BlueprintBox {...box} color={palette.line} size={[0.025, 0.012, 11.7]} position={[side * 1.1, 2, -1.5]} />
          {[-6.7, -4.9, -3.1, -1.3, 0.5, 2.3, 4.1].map((z) => (
            <group key={z}>
              <BlueprintBox {...box} color={palette.glass} size={[0.055, 0.5, 0.055]} position={[side * 1.09, 2.33, z]} />
              <BlueprintBox {...box} color={palette.mechanical} size={[0.14, 0.07, 0.3]} position={[side * 1.35, 1.99, z]} />
            </group>
          ))}
          {[0.6, -3].map((z) => (
            <group key={z}>
              <BlueprintBox {...box} size={[0.48, 0.27, 0.64]} position={[side * 1.43, 2.22, z]} />
              <BlueprintBox {...box} color={palette.glass} size={[0.23, 0.035, 0.08]} position={[side * 1.43, 2.38, z]} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

export default function CabinCanvas({ fallback, zoom, setZoom, resetView, ...selection }: CabinSelection & CabinView & { fallback: ReactNode }) {
  const dragged = useRef(false);
  const [palette] = useState<TrainPalette>(() => {
    const style = getComputedStyle(document.documentElement);
    const token = (name: string) => style.getPropertyValue(`--train-${name}`).trim();
    return { surface: token("surface"), line: token("line"), glass: token("glass"), mechanical: token("mechanical") };
  });

  return (
    <Canvas camera={{ position: [0, 1.65, 4.6], near: 0.05, far: 40 }} dpr={[1, 1.5]} frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      fallback={fallback} style={{ touchAction: "none" }} aria-label="Inside the blueprint train cabin. Click a seat to select it.">
      <CabinControls zoom={zoom} setZoom={setZoom} resetView={resetView} dragged={dragged} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[0, 2.5, 3]} intensity={1.6} />
      <CabinShell palette={palette} />
      {CABIN_SEATS.map((seat) => <Seat key={seat.id} {...seat} {...selection} onSeatSelect={(id) => { if (!dragged.current) selection.onSeatSelect(id); }} palette={palette} />)}
    </Canvas>
  );
}
