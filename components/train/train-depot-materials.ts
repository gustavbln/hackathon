import { CanvasTexture, DoubleSide, MeshBasicMaterial, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from "three";

export type DepotPalette = {
  wall: string;
  brick: string;
  mortar: string;
  roof: string;
  steel: string;
  glass: string;
  ground: string;
  ballast: string;
  brand: string;
  shutter: string;
  shadow: string;
  marking: string;
  sky: string;
  trees: string;
};

function texture(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The depot textures require a 2D canvas.");
  paint(context);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return map;
}

export function depotMaterials(palette: DepotPalette) {
  const grit = (base: string, size: number) => {
    const map = texture(512, 512, (context) => {
      context.fillStyle = base;
      context.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 9000; i++) {
        const x = (i * 127.31 + Math.sin(i * 31.7) * 37.1) % 512;
        const y = (i * 73.17 + Math.cos(i * 17.1) * 91.2) % 512;
        context.globalAlpha = 0.12 + i % 4 * 0.06;
        context.fillStyle = i % 3 ? palette.shadow : palette.wall;
        context.fillRect(x, y, size, size * 0.7);
      }
    });
    map.wrapS = map.wrapT = RepeatWrapping;
    return map;
  };
  const brickMap = texture(512, 512, (context) => {
    context.fillStyle = palette.mortar;
    context.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 16; row++) {
      for (let column = -1; column < 8; column++) {
        const x = column * 72 + row % 2 * 36;
        context.fillStyle = palette.brick;
        context.fillRect(x + 2, row * 32 + 2, 68, 28);
        context.globalAlpha = 0.08 + ((row * 13 + column * 7 + 100) % 5) * 0.035;
        context.fillStyle = palette.shadow;
        context.fillRect(x + 2, row * 32 + 2, 68, 28);
        context.globalAlpha = 1;
      }
    }
  });
  brickMap.wrapS = brickMap.wrapT = RepeatWrapping;
  brickMap.repeat.set(2, 2);
  const signMap = texture(1024, 256, (context) => {
    context.fillStyle = palette.brand;
    context.textAlign = "center";
    context.font = "bold 160px Arial, sans-serif";
    context.fillText("SIEMENS", 512, 165);
    context.font = "32px Arial, sans-serif";
    context.fillText("M O B I L I T Y", 512, 224);
  });
  const safetyMap = texture(128, 128, (context) => {
    context.fillStyle = palette.marking;
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = palette.shadow;
    for (let offset = -256; offset < 256; offset += 64) {
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset + 32, 0);
      context.lineTo(offset + 160, 128);
      context.lineTo(offset + 128, 128);
      context.closePath();
      context.fill();
    }
  });
  safetyMap.wrapS = safetyMap.wrapT = RepeatWrapping;
  safetyMap.repeat.set(1, 4);
  const standard = (color: string, roughness = 0.85, metalness = 0) => new MeshStandardMaterial({ color, roughness, metalness });
  return {
    wall: standard(palette.wall), brick: new MeshStandardMaterial({ map: brickMap, roughness: 1 }),
    roof: new MeshStandardMaterial({ color: palette.roof, roughness: 0.7, metalness: 0.35, side: DoubleSide }), steel: standard(palette.steel, 0.46, 0.65),
    glass: standard(palette.glass, 0.2, 0.4), ground: new MeshStandardMaterial({ map: grit(palette.ground, 1.7), roughness: 1 }),
    ballast: new MeshStandardMaterial({ map: grit(palette.ballast, 4), roughness: 1 }), shutter: standard(palette.shutter, 0.65, 0.32),
    shadow: standard(palette.shadow), marking: standard(palette.marking), trees: standard(palette.trees, 1), brand: standard(palette.brand),
    sign: new MeshBasicMaterial({ map: signMap, transparent: true, depthWrite: false }),
    safety: new MeshStandardMaterial({ map: safetyMap, roughness: 0.8 }),
    light: new MeshStandardMaterial({ color: palette.wall, emissive: palette.wall, emissiveIntensity: 1.1 }),
  };
}
