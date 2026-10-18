import type { DepotPalette } from "./train-depot";

export function readDepotPalette(): DepotPalette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(`--depot-${name}`).trim();
  return {
    wall: token("wall"), brick: token("brick"), mortar: token("mortar"),
    roof: token("roof"), steel: token("steel"), glass: token("glass"),
    ground: token("ground"), ballast: token("ballast"), brand: token("brand"),
    shutter: token("shutter"), shadow: token("shadow"), marking: token("marking"), sky: token("sky"),
  };
}
