"use client";

import { useCursor } from "@react-three/drei";
import { useState, type ReactNode } from "react";

/** Visual feedback only. Sourcing is available for seats. */
export function CabinPart({ label, enabled, children }: {
  label: string; enabled: boolean; children: (active: boolean) => ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const active = enabled && hovered;
  useCursor(active);

  return (
    <group name={label}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (enabled) setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => event.stopPropagation()}>
      {children(active)}
    </group>
  );
}
