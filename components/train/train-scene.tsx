"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import { TrainFallback } from "./train-fallback";

const TrainCanvas = dynamic(() => import("./train-canvas"), {
  ssr: false,
  loading: () => <TrainFallback loading />,
});

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <TrainFallback /> : this.props.children;
  }
}

export function TrainScene() {
  return (
    <figure
      className="blueprint-scene relative my-5 min-h-[340px] flex-1 sm:min-h-[440px]"
      aria-label="Blueprint model of a high-speed train, slowly rotating from a bird’s-eye view"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <SceneBoundary><TrainCanvas /></SceneBoundary>
      </div>
      <figcaption className="blueprint-label absolute bottom-3 left-0">HS—03 / General arrangement</figcaption>
      <span className="blueprint-label absolute right-0 bottom-3 hidden sm:block" aria-hidden="true">Axonometric view</span>
    </figure>
  );
}
