"use client";

import { Canvas } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { Suspense, useCallback, useRef, useState, type ReactNode } from "react";
import type { Group } from "three";
import { TrainDepotWorld } from "./train-depot-world";
import { readDepotPalette } from "./depot-palette";
import { TrainJourneyCamera } from "./train-journey-camera";
import { TrainModel } from "./train-model";
import { depotJourney, TRAIN_TO_CABIN } from "./train-journey-layout";
import { CabinControls, type CabinView } from "./cabin-controls";
import { CabinFocus } from "./cabin-focus";
import { cabinBoxGeometry } from "./cabin-geometry";
import { CabinPart } from "./cabin-part";
import { CABIN_CENTER, CABIN_LENGTH, CABIN_SEATS, type CabinSelection } from "./cabin-layout";
import { readCabinPalette, type CabinPalette } from "./cabin-palette";

type Point = [number, number, number];

function BlueprintBox({ size, position, palette, color = palette.surface, bright = false, rounded = false, opacity = 1 }: {
  size: Point; position: Point; palette: CabinPalette; color?: string; bright?: boolean; rounded?: boolean; opacity?: number;
}) {
  const { body, edges } = cabinBoxGeometry(size, rounded);
  return (
    <mesh geometry={body} position={position}>
      <meshStandardMaterial color={color} roughness={opacity < 1 ? 0.25 : 0.85} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} />
      <lineSegments geometry={edges} raycast={() => null}>
        <lineBasicMaterial color={palette.line} transparent opacity={opacity < 1 ? 0.15 : bright ? 1 : 0.45} />
      </lineSegments>
    </mesh>
  );
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

function CabinShell({ palette, interactive }: { palette: CabinPalette; interactive: boolean }) {
  const box = { palette };
  return (
    // Solid cabin surfaces block pointer hits on geometry behind them.
    <group onPointerOver={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <CabinPart label="Ceiling panels" enabled={interactive}>{(active) => (
        <BlueprintBox {...box} color={active ? palette.upholstery : palette.surface} bright={active} size={[3.8, 0.1, CABIN_LENGTH]} position={[0, 2.65, CABIN_CENTER]} />
      )}</CabinPart>
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
          <CabinPart label="Luggage rack" enabled={interactive}>{(active) => <>
            <BlueprintBox {...box} color={active ? palette.upholstery : palette.mechanical} bright={active} size={[0.75, 0.065, 15.2]} position={[side * 1.43, 2.05, CABIN_CENTER]} />
            <BlueprintBox {...box} color={palette.glass} bright={active} size={[0.05, 0.09, 15.2]} position={[side * 1.06, 2.13, CABIN_CENTER]} />
            <BlueprintBox {...box} color={palette.line} bright={active} size={[0.025, 0.012, 15.2]} position={[side * 1.1, 2, CABIN_CENTER]} />
          </>}</CabinPart>
          {Array.from({ length: 11 }, (_, index) => 3.4 - index * 1.35).map((z) => (
            <group key={z}>
              <BlueprintBox {...box} color={palette.glass} size={[0.055, 0.5, 0.055]} position={[side * 1.09, 2.33, z]} />
              <CabinPart label="Reading light" enabled={interactive}>{(active) => <>
                <BlueprintBox {...box} color={active ? palette.upholstery : palette.mechanical} bright={active} size={[0.14, 0.07, 0.3]} position={[side * 1.35, 1.99, z]} />
                <BlueprintBox {...box} color={active ? palette.upholstery : palette.surface} bright={active} size={[0.12, 0.018, 0.2]} position={[side * 1.35, 1.94, z]} />
              </>}</CabinPart>
              <CabinPart label="Power outlet" enabled={interactive}>{(active) => (
                <BlueprintBox {...box} color={active ? palette.upholstery : palette.line} bright={active} size={[0.025, 0.12, 0.17]} position={[side * 1.78, 0.65, z]} />
              )}</CabinPart>
            </group>
          ))}
          {[2.2, -0.5, -4.5, -7.8].map((z) => (
            <group key={z}>
              <CabinPart label="Luggage" enabled={interactive}>{(active) => <>
                <BlueprintBox {...box} color={active ? palette.upholstery : palette.surface} bright={active} size={[0.48, 0.27, 0.64]} position={[side * 1.43, 2.22, z]} />
                <BlueprintBox {...box} color={palette.glass} bright={active} size={[0.23, 0.035, 0.08]} position={[side * 1.43, 2.38, z]} />
              </>}</CabinPart>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

type PartBox = { size: Point; position: Point; color: keyof CabinPalette; opacity?: number };

const CABIN_PARTS: { label: string; boxes: PartBox[] }[] = [
  { label: "Side windows", boxes: [-1, 1].map((side) => ({ size: [0.04, 1.25, CABIN_LENGTH], position: [side * 1.88, 1.48, CABIN_CENTER], color: "sky", opacity: 0.12 })) },
  { label: "Interior door", boxes: [
    { size: [0.95, 2.2, 0.04], position: [0, 1.1, 4.73], color: "mechanical" },
    { size: [0.95, 2.2, 0.04], position: [0, 1.1, -11.33], color: "mechanical" },
    { size: [0.6, 0.8, 0.04], position: [0, 1.55, -11.29], color: "glass" },
  ] },
  { label: "Flooring", boxes: [
    { size: [3.8, 0.1, CABIN_LENGTH], position: [0, -0.06, CABIN_CENTER], color: "mechanical" },
    { size: [0.79, 0.012, CABIN_LENGTH], position: [0, 0.001, CABIN_CENTER], color: "line" },
  ] },
];

export default function CabinCanvas({ fallback, zoom, setZoom, resetView, rotating, reducedMotion, journeyProgress, ...selection }: CabinSelection & CabinView & {
  fallback: ReactNode; rotating: boolean; reducedMotion: boolean; journeyProgress?: number;
}) {
  const dragged = useRef(false);
  const world = useRef<Group>(null);
  const seats = useRef<Group>(null);
  const [palette] = useState(readCabinPalette);
  const [depotPalette] = useState(readDepotPalette);
  const [trainReady, setTrainReady] = useState(false);
  const ready = useCallback(() => setTrainReady(true), []);
  const waiting = journeyProgress !== undefined && !trainReady;
  const exteriorProgress = journeyProgress === undefined ? 1 : reducedMotion ? (journeyProgress >= 0.99 ? 1 : 0) : journeyProgress;
  const cabinLight = depotJourney(exteriorProgress).boarding;

  return (
    <>
      {waiting && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--depot-sky)] text-sm" role="status">Preparing the train and workshop…</div>}
      <Canvas shadows camera={{ position: [0, 1.65, 4.6], near: 0.03, far: 1200 }} dpr={[1, 1.5]} frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        fallback={fallback} style={{ touchAction: journeyProgress !== undefined ? "pan-y" : "none" }} aria-label="Explore cabin components. Select a seat to open supplier sourcing.">
        {journeyProgress !== undefined && <TrainJourneyCamera progress={journeyProgress} reducedMotion={reducedMotion} />}
        {journeyProgress === undefined && <CabinControls zoom={zoom} setZoom={setZoom} resetView={resetView} dragged={dragged} enabled={!selection.selectedSeatId} />}
        <ambientLight intensity={0.8 + cabinLight * 0.6} />
        <directionalLight position={[0, 2.5, 3]} intensity={1.6 * cabinLight} />
        <directionalLight position={[65, 85, 45]} intensity={2 * (1 - cabinLight)} castShadow={cabinLight < 0.99}
          shadow-mapSize={[2048, 2048]} shadow-camera-left={-125} shadow-camera-right={125}
          shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={350} shadow-bias={-0.0002} shadow-normalBias={0.05} />
        {journeyProgress !== undefined && <Suspense fallback={null}><group matrix={TRAIN_TO_CABIN} matrixAutoUpdate={false}><TrainModel onReady={ready} /></group></Suspense>}
        <group ref={world}>
          <TrainDepotWorld progress={exteriorProgress} palette={depotPalette} />
          <CabinShell palette={palette} interactive={!selection.selectedSeatId} />
          {CABIN_PARTS.map(({ label, boxes }) => (
            <CabinPart key={label} label={label} enabled={!selection.selectedSeatId}>{(active) => (
              boxes.map((part, index) => <BlueprintBox key={index} palette={palette} size={part.size} position={part.position}
                color={active ? palette.upholstery : palette[part.color]} bright={active} opacity={active && part.opacity ? 0.3 : part.opacity} />)
            )}</CabinPart>
          ))}
        </group>
        <group ref={seats}>
          {CABIN_SEATS.map((seat) => <Seat key={seat.id} {...seat} {...selection} onSeatSelect={(id) => { if (!dragged.current) selection.onSeatSelect(id); }} palette={palette} />)}
        </group>
        {/* After the groups so URL-preselected seats find their mounted refs. */}
        {journeyProgress === undefined && <CabinFocus seatId={selection.selectedSeatId} world={world} seats={seats} zoom={zoom} rotating={rotating} reducedMotion={reducedMotion} />}
      </Canvas>
    </>
  );
}
