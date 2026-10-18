"use client";

import { Canvas } from "@react-three/fiber";
import { Edges, RoundedBox, useCursor } from "@react-three/drei";
import { useRef, useState, type ReactNode } from "react";
import { BackSide, type Group } from "three";
import { CabinControls, type CabinView } from "./cabin-controls";
import { CabinFocus } from "./cabin-focus";
import { CABIN_CENTER, CABIN_LENGTH, CABIN_COMPONENTS, CABIN_SEATS, type CabinComponentId, type CabinSelection } from "./cabin-layout";
import { readCabinPalette, type CabinPalette } from "./cabin-palette";

type Point = [number, number, number];

function BlueprintBox({ size, position, palette, color = palette.surface, bright = false, rounded = false, opacity = 1 }: {
  size: Point; position: Point; palette: CabinPalette; color?: string; bright?: boolean; rounded?: boolean; opacity?: number;
}) {
  const finish = <>
      <meshStandardMaterial color={color} roughness={opacity < 1 ? 0.25 : 0.85} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} />
      <Edges color={palette.line} transparent opacity={opacity < 1 ? 0.15 : bright ? 1 : 0.45} raycast={() => null} />
    </>;
  return rounded
    ? <RoundedBox args={size} radius={Math.min(0.035, Math.min(...size) / 3)} smoothness={2} position={position}>{finish}</RoundedBox>
    : <mesh position={position}><boxGeometry args={size} />{finish}</mesh>;
}

export function Seat({ id, position, palette, selectedSeatId, onSeatSelect }: {
  id: string; position: Point; palette: CabinPalette;
} & Pick<CabinSelection, "selectedSeatId" | "onSeatSelect">) {
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
      <BlueprintBox {...box} color={palette.upholstery} size={[0.49, 0.14, 0.59]} position={[0, 0.51, 0]} />
      <BlueprintBox {...box} color={palette.mechanical} size={[0.51, 0.06, 0.6]} position={[0, 0.41, 0]} />
      <group rotation={[-0.09, 0, 0]} position={[0, 1.03, -0.25]}>
        <BlueprintBox {...box} color={palette.mechanical} size={[0.51, 0.98, 0.14]} position={[0, 0, -0.03]} />
        <BlueprintBox {...box} color={palette.upholstery} size={[0.4, 0.57, 0.12]} position={[0, -0.12, 0.07]} />
        <BlueprintBox {...box} color={palette.upholstery} size={[0.35, 0.28, 0.14]} position={[0, 0.3, 0.08]} />
        <BlueprintBox {...box} size={[0.24, 0.16, 0.012]} position={[0, 0.34, 0.16]} />
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

function CabinShell({ palette }: { palette: CabinPalette }) {
  const box = { palette };
  return (
    // Solid cabin surfaces block pointer hits on geometry behind them.
    <group onPointerOver={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <BlueprintBox {...box} size={[3.8, 0.1, CABIN_LENGTH]} position={[0, 2.65, CABIN_CENTER]} />
      <BlueprintBox {...box} size={[3.8, 2.7, 0.1]} position={[0, 1.3, -11.4]} />
      <BlueprintBox {...box} size={[3.8, 2.7, 0.1]} position={[0, 1.3, 4.8]} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <BlueprintBox {...box} size={[0.1, 0.9, CABIN_LENGTH]} position={[side * 1.85, 0.4, CABIN_CENTER]} />
          <BlueprintBox {...box} size={[0.1, 0.6, CABIN_LENGTH]} position={[side * 1.85, 2.4, CABIN_CENTER]} />
          <BlueprintBox {...box} size={[0.2, 0.045, CABIN_LENGTH]} position={[side * 1.78, 0.87, CABIN_CENTER]} />
          {Array.from({ length: 12 }, (_, index) => (
            <BlueprintBox key={index} {...box} size={[0.14, 1.3, 0.09]} position={[side * 1.82, 1.48, 4.4 - index * 1.35]} />
          ))}
          <BlueprintBox {...box} size={[0.075, 0.018, 15.8]} position={[side * 0.65, 2.58, CABIN_CENTER]} />
          <BlueprintBox {...box} color={palette.glass} size={[0.015, 0.008, 15.8]} position={[side * 0.42, 0, CABIN_CENTER]} />
          <BlueprintBox {...box} color={palette.mechanical} size={[0.75, 0.065, 15.2]} position={[side * 1.43, 2.05, CABIN_CENTER]} />
          <BlueprintBox {...box} color={palette.glass} size={[0.05, 0.09, 15.2]} position={[side * 1.06, 2.13, CABIN_CENTER]} />
          <BlueprintBox {...box} color={palette.line} size={[0.025, 0.012, 15.2]} position={[side * 1.1, 2, CABIN_CENTER]} />
          {Array.from({ length: 11 }, (_, index) => 3.4 - index * 1.35).map((z) => (
            <group key={z}>
              <BlueprintBox {...box} color={palette.glass} size={[0.055, 0.5, 0.055]} position={[side * 1.09, 2.33, z]} />
              <BlueprintBox {...box} color={palette.mechanical} size={[0.14, 0.07, 0.3]} position={[side * 1.35, 1.99, z]} />
              <BlueprintBox {...box} color={palette.surface} size={[0.12, 0.018, 0.2]} position={[side * 1.35, 1.94, z]} />
              <BlueprintBox {...box} color={palette.line} size={[0.025, 0.12, 0.17]} position={[side * 1.78, 0.65, z]} />
            </group>
          ))}
          {[2.2, -0.5, -4.5, -7.8].map((z) => (
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

function Outside({ palette }: { palette: CabinPalette }) {
  return (
    <group name="Countryside outside the windows">
      <mesh><sphereGeometry args={[75, 20, 12]} /><meshBasicMaterial color={palette.sky} side={BackSide} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[140, 140]} /><meshStandardMaterial color={palette.terrain} roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          {Array.from({ length: 5 }, (_, index) => (
            <mesh key={index} position={[side * (24 + index % 2 * 8), 0.5, -42 + index * 22]} scale={[12, 4 + index % 3, 16]}>
              <sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={palette.hills} roughness={1} />
            </mesh>
          ))}
          {Array.from({ length: 14 }, (_, index) => (
            <group key={index} position={[side * (7 + index % 4 * 2.7), 0, -34 + index * 5.5]}>
              <mesh position={[0, 0.75, 0]}><cylinderGeometry args={[0.1, 0.13, 1.8, 5]} /><meshStandardMaterial color={palette.line} /></mesh>
              <mesh position={[0, 2.3, 0]}><coneGeometry args={[1 + index % 3 * 0.15, 3.2, 6]} /><meshStandardMaterial color={palette.trees} roughness={1} /></mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

type PartBox = { size: Point; position: Point; color: keyof CabinPalette; opacity?: number };

const CABIN_PARTS: Record<CabinComponentId, PartBox[]> = {
  windows: [-1, 1].map((side) => ({ size: [0.04, 1.25, CABIN_LENGTH], position: [side * 1.88, 1.48, CABIN_CENTER], color: "sky", opacity: 0.12 })),
  door: [
    { size: [0.95, 2.2, 0.04], position: [0, 1.1, 4.73], color: "mechanical" },
    { size: [0.95, 2.2, 0.04], position: [0, 1.1, -11.33], color: "mechanical" },
    { size: [0.6, 0.8, 0.04], position: [0, 1.55, -11.29], color: "glass" },
  ],
  flooring: [
    { size: [3.8, 0.1, CABIN_LENGTH], position: [0, -0.06, CABIN_CENTER], color: "mechanical" },
    { size: [0.79, 0.012, CABIN_LENGTH], position: [0, 0.001, CABIN_CENTER], color: "line" },
  ],
};

function CabinPart({ id, boxes, palette, selectedComponentId, onComponentSelect }: {
  id: CabinComponentId; boxes: PartBox[]; palette: CabinPalette;
} & Pick<CabinSelection, "selectedComponentId" | "onComponentSelect">) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const active = hovered || selectedComponentId === id;

  return (
    <group name={`part-${id}`}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => { event.stopPropagation(); if (event.delta <= 5) onComponentSelect(id); }}>
      {boxes.map((part, index) => (
        <BlueprintBox key={index} palette={palette} size={part.size} position={part.position}
          color={active ? palette.glass : palette[part.color]} bright={active} opacity={part.opacity} />
      ))}
    </group>
  );
}

export default function CabinCanvas({ fallback, zoom, setZoom, resetView, rotating, reducedMotion, ...selection }: CabinSelection & CabinView & {
  fallback: ReactNode; rotating: boolean; reducedMotion: boolean;
}) {
  const dragged = useRef(false);
  const world = useRef<Group>(null);
  const seats = useRef<Group>(null);
  const [palette] = useState(readCabinPalette);

  return (
    <Canvas camera={{ position: [0, 1.65, 4.6], near: 0.05, far: 160 }} dpr={[1, 1.5]} frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      fallback={fallback} style={{ touchAction: "none" }} aria-label="Inside the blueprint train cabin. Click a seat, a window, the door or the floor to select it."
      onPointerMissed={() => { if (!selection.selectedSeatId && !dragged.current) selection.onComponentSelect(null); }}>
      <CabinControls zoom={zoom} setZoom={setZoom} resetView={resetView} dragged={dragged} enabled={!selection.selectedSeatId} />
      <CabinFocus seatId={selection.selectedSeatId} world={world} seats={seats} zoom={zoom} rotating={rotating} reducedMotion={reducedMotion} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[0, 2.5, 3]} intensity={1.6} />
      <group ref={world}>
        <Outside palette={palette} />
        <CabinShell palette={palette} />
        {CABIN_COMPONENTS.map(({ id }) => (
          <CabinPart key={id} id={id} boxes={CABIN_PARTS[id]} {...selection}
            onComponentSelect={(part) => { if (!dragged.current) selection.onComponentSelect(part); }} palette={palette} />
        ))}
      </group>
      <group ref={seats}>
        {CABIN_SEATS.map((seat) => <Seat key={seat.id} {...seat} {...selection} onSeatSelect={(id) => { if (!dragged.current) selection.onSeatSelect(id); }} palette={palette} />)}
      </group>
    </Canvas>
  );
}
