"use client";

import { useState, type ReactNode } from "react";
import { Html, useCursor } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";

// Mesh names come from create-train.ts; every passenger-carriage part starts with this.
const isCabin = (event: ThreeEvent<PointerEvent | MouseEvent>) => event.object.name.startsWith("Passenger carriage");

/** Makes the passenger carriage clickable. The label shows only on hover, so the landing stays clean. */
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
      {hovered && (
        <Html position={[-5.9, 4.8, 0]} center zIndexRange={[20, 0]} className="pointer-events-none">
          <span className="blueprint-label border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)]/90 px-2 py-1 whitespace-nowrap text-[var(--blueprint-ink)] backdrop-blur-sm">
            Passenger cabin / Seats
          </span>
        </Html>
      )}
    </group>
  );
}
