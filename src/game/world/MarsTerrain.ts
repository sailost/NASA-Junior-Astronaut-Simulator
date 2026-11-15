import type Phaser from "phaser";
import { rooms, walkable, stations } from "./map";

export const marsAssets = ["small-stones", "rock-cluster", "small-crater", "large-crater", "dust-patch", "cracked-regolith", "bootprints", "rocky-ridge", "solar-panels", "communications-dish", "exterior-pipe", "warning-beacon"] as const;
export type MarsAsset = typeof marsAssets[number];
export interface MarsDecoration { asset: MarsAsset; x: number; y: number; w: number; h: number; angle?: number; alpha?: number; }
export const marsGroundKey = "aurora-mars-regolith-v1";
export const marsAssetKey = (asset: MarsAsset) => `mars-${asset}`;
export const marsAssetUrl = (asset: MarsAsset, base = "./") => `${base}assets/world/mars/${asset}.png`;
export function preloadMars(scene: Phaser.Scene) {
  const base = import.meta.env?.BASE_URL || "./";
  for (const asset of marsAssets) scene.load.image(marsAssetKey(asset), marsAssetUrl(asset, base));
}

/** Explicit, world-fixed composition. No placement or randomness in the update loop. */
export const marsDecorations: readonly MarsDecoration[] = [
  { asset: "dust-patch", x: 205, y: 50, w: 142, h: 72, alpha: .27 },
  { asset: "cracked-regolith", x: 460, y: 48, w: 115, h: 78, alpha: .40 },
  { asset: "large-crater", x: 690, y: 55, w: 108, h: 88, angle: .05, alpha: .91 },
  { asset: "small-crater", x: 350, y: 63, w: 70, h: 60, angle: .12, alpha: .86 },
  { asset: "rock-cluster", x: 90, y: 53, w: 66, h: 55, angle: -.08 },
  { asset: "small-stones", x: 165, y: 90, w: 52, h: 32, alpha: .85 },
  { asset: "communications-dish", x: 878, y: 57, w: 88, h: 100 },
  { asset: "rocky-ridge", x: 1200, y: 50, w: 178, h: 73, angle: -.07, alpha: .94 },
  { asset: "small-stones", x: 1355, y: 66, w: 62, h: 47, alpha: .85 },
  { asset: "cracked-regolith", x: 1465, y: 50, w: 95, h: 80, alpha: .42 },
  { asset: "warning-beacon", x: 1097, y: 77, w: 34, h: 48 },
  { asset: "dust-patch", x: 1005, y: 620, w: 28, h: 60, alpha: .22 },
  { asset: "rocky-ridge", x: 29, y: 290, w: 42, h: 135, angle: .03, alpha: .85 },
  { asset: "small-crater", x: 35, y: 706, w: 46, h: 58, angle: .08, alpha: .84 },
  { asset: "small-stones", x: 29, y: 590, w: 39, h: 43, alpha: .8 },
  { asset: "dust-patch", x: 32, y: 815, w: 43, h: 100, alpha: .27 },
  { asset: "rock-cluster", x: 1500, y: 720, w: 58, h: 62, angle: .06 },
  { asset: "small-crater", x: 1503, y: 330, w: 52, h: 57, angle: -.06, alpha: .85 },
  { asset: "small-stones", x: 1500, y: 830, w: 50, h: 35, alpha: .84 },
  { asset: "dust-patch", x: 1497, y: 190, w: 52, h: 100, alpha: .28 },
  { asset: "small-stones", x: 525, y: 350, w: 28, h: 28, alpha: .75 },
  { asset: "cracked-regolith", x: 525, y: 690, w: 27, h: 34, alpha: .28 },
  { asset: "cracked-regolith", x: 1005, y: 725, w: 28, h: 37, alpha: .35 },
  { asset: "small-stones", x: 1010, y: 280, w: 27, h: 32, alpha: .76 },
  { asset: "solar-panels", x: 175, y: 955, w: 108, h: 86 },
  { asset: "solar-panels", x: 312, y: 955, w: 108, h: 86 },
  { asset: "solar-panels", x: 449, y: 955, w: 108, h: 86 },
  { asset: "exterior-pipe", x: 555, y: 954, w: 100, h: 76 },
  { asset: "bootprints", x: 695, y: 955, w: 59, h: 70, angle: -.24, alpha: .52 },
  { asset: "cracked-regolith", x: 918, y: 955, w: 99, h: 66, alpha: .4 },
  { asset: "rock-cluster", x: 1033, y: 956, w: 68, h: 68, angle: -.1 },
  { asset: "small-stones", x: 66, y: 950, w: 44, h: 36, alpha: .8 },
  { asset: "dust-patch", x: 795, y: 956, w: 76, h: 64, alpha: .25 },
  { asset: "warning-beacon", x: 115, y: 936, w: 26, h: 44 },
];
export function decorationBounds(d: MarsDecoration) {
  const c = Math.abs(Math.cos(d.angle || 0)), s = Math.abs(Math.sin(d.angle || 0));
  const w = d.w * c + d.h * s, h = d.h * c + d.w * s;
  return { x: d.x - w / 2, y: d.y - h / 2, w, h };
}
export function isExteriorDecoration(d: MarsDecoration) {
  const a = decorationBounds(d);
  if (a.x < 0 || a.y < 0 || a.x + a.w > 1540 || a.y + a.h > 1000) return false;
  const protectedAreas = [
    ...rooms.map((r) => ({ x: r.x - 16, y: r.y - 20, w: r.w + 32, h: r.h + 60 })),
    ...walkable.map((r) => ({ x: r.x - 12, y: r.y - 12, w: r.w + 24, h: r.h + 24 })),
    // Existing geographic stencil on the terrain remains legible.
    { x: 1110, y: 917, w: 360, h: 70 },
  ];
  return !protectedAreas.some((b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) &&
    stations.every((station) => Math.hypot(d.x - station.x, d.y - station.y) > 60 + Math.max(a.w, a.h) / 2);
}

function noiseField(width: number, height: number, spacing: number, seed: number) {
  const columns = Math.ceil(width / spacing) + 2, rows = Math.ceil(height / spacing) + 2;
  const values = new Float32Array(columns * rows);
  for (let i = 0; i < values.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; values[i] = seed / 4294967296; }
  return (x: number, y: number) => {
    const ix = Math.floor(x / spacing), iy = Math.floor(y / spacing);
    let fx = x / spacing - ix, fy = y / spacing - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const i = iy * columns + ix;
    return (values[i] * (1 - fx) + values[i + 1] * fx) * (1 - fy) +
      (values[i + columns] * (1 - fx) + values[i + columns + 1] * fx) * fy;
  };
}
/** Three spatial scales of seeded noise, painted once into a cached CanvasTexture. */
export function paintMarsSurface(context: CanvasRenderingContext2D, width = 1540, height = 1000) {
  const broad = noiseField(width, height, 250, 342), detail = noiseField(width, height, 48, 527);
  const image = context.createImageData(width, height), data = image.data;
  let seed = 13425;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const field = broad(x, y), fine = detail(x, y) - .5, grain = (seed / 4294967296 - .5) * 6;
    const sand = Math.max(0, field - .52) * 50;
    const i = (y * width + x) * 4;
    data[i] = 143 + field * 29 + fine * 9 + grain + sand;
    data[i + 1] = 70 + field * 23 + fine * 6 + grain * .65 + sand * .85;
    data[i + 2] = 46 + field * 15 + fine * 4 + grain * .45 + sand * .5;
    data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  for (const d of marsDecorations) {
    if (!isExteriorDecoration(d) || !["rock-cluster", "rocky-ridge", "solar-panels", "communications-dish", "exterior-pipe", "warning-beacon"].includes(d.asset)) continue;
    context.save(); context.translate(d.x + 3, d.y + d.h * .31); context.rotate(d.angle || 0);
    context.scale(d.w * .5, Math.max(3, d.h * .13));
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, "rgba(49,28,23,.25)"); gradient.addColorStop(1, "rgba(49,28,23,0)");
    context.fillStyle = gradient; context.fillRect(-1, -1, 2, 2); context.restore();
  }
}
export function drawMarsTerrain(scene: Phaser.Scene) {
  if (!scene.textures.exists(marsGroundKey)) {
    const texture = scene.textures.createCanvas(marsGroundKey, 1540, 1000)!;
    paintMarsSurface(texture.context); texture.refresh();
  }
  scene.add.image(0, 0, marsGroundKey).setOrigin(0).setDepth(-45);
  for (const d of marsDecorations) {
    if (!isExteriorDecoration(d) || !scene.textures.exists(marsAssetKey(d.asset))) continue;
    const decal = ["dust-patch", "cracked-regolith", "bootprints"].includes(d.asset);
    const image = scene.add.image(d.x, d.y, marsAssetKey(d.asset))
      .setDisplaySize(d.w, d.h).setRotation(d.angle || 0).setAlpha(d.alpha ?? 1).setDepth(decal ? -43 : -38);
    // Exclude the isolated fragment at the source's right edge, without editing the PNG.
    if (d.asset === "bootprints") image.setCrop(0, 0, 320, 362);
  }
  scene.add.text(1130, 932, "ARCADIA PLANITIA\nBASE AURORA / SECTOR 03", {
    fontFamily: "monospace", fontSize: "13px", color: "#d5b59e", lineSpacing: 6,
  }).setAlpha(.65).setDepth(-35);
}
