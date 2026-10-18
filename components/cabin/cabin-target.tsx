"use client";

import { useState, type ReactNode } from "react";
import { useCursor } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";

// Mesh names come from create-train.ts; every passenger-carriage part starts with this.
const isCabin = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
  const name = event.object.name.replaceAll("_", " ");
  return name.startsWith("Passenger carriage") || name.startsWith("Front power car windscreen");
};

/** The windshield and passenger carriage also support direct entry. */
export function CabinTarget({ onSelect, children }: { onSelect: () => void; children: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  return (
    <group
      onPointerMove={(event) => setHovered(isCabin(event))}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => {
        if (!isCabin(event)) return;
        event.stopPropagation();
        onSelect();
      }}
    >
      {children}
    </group>
  );
}
