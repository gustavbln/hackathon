import { readFile, writeFile } from "node:fs/promises";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createTrain, disposeTrain } from "../components/train/create-train.ts";

// GLTFExporter uses this browser API to pack binary buffers (no textures here).
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
function token(name) {
  const value = css.match(new RegExp(`--train-${name}:\\s*(#[a-fA-F0-9]{6})`))?.[1];
  if (!value) throw new Error(`Missing --train-${name} hex color in globals.css`);
  return value;
}
const train = createTrain({
  surface: token("surface"), line: token("line"),
  glass: token("glass"), mechanical: token("mechanical"),
}, {
  body: token("exterior"), stripe: token("livery"), glass: token("windshield"), headlight: token("headlight"),
});
try {
  const glb = await new GLTFExporter().parseAsync(train, { binary: true });
  await writeFile(new URL("../public/models/high-speed-train.glb", import.meta.url), Buffer.from(glb));
  console.info(`Exported original train asset: ${(glb.byteLength / 1024).toFixed(0)} KB`);
} finally {
  disposeTrain(train);
}
