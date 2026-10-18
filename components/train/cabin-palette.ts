import type { TrainPalette } from "./create-train";

export type CabinPalette = TrainPalette & {
  upholstery: string;
  sky: string;
  terrain: string;
  hills: string;
  trees: string;
};

export function readCabinPalette(): CabinPalette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(`--train-${name}`).trim();
  return {
    surface: token("surface"), line: token("line"), glass: token("glass"), mechanical: token("mechanical"),
    upholstery: token("upholstery"), sky: token("sky"), terrain: token("terrain"), hills: token("hills"), trees: token("trees"),
  };
}
