import type Phaser from "phaser";
export const interiorAssets = ["floor-control", "floor-corridor", "floor-engineering", "floor-greenhouse", "floor-laboratory", "floor-life-support", "floor-shelter", "wall-horizontal", "wall-vertical", "airlock-door", "console-control", "machine-oxygen", "hydroponics-bed", "machine-lab-scanner", "machine-generator", "machine-communications", "shelter-shield-panel", "floor-vent", "warning-stripe", "utility-crate"] as const;
export type InteriorAsset = typeof interiorAssets[number];
export const interiorKey = (asset: InteriorAsset) => `interior-${asset}`;
export const interiorUrl = (asset: InteriorAsset, base = "./") => `${base}assets/world/interiors/${asset}.png`;
export const roomFloorAsset: Record<string, InteriorAsset> = { control: "floor-control", life: "floor-life-support", green: "floor-greenhouse", lab: "floor-laboratory", engine: "floor-engineering", shelter: "floor-shelter" };
export function preloadInteriors(scene: Phaser.Scene) {
  for (const asset of interiorAssets) scene.load.image(interiorKey(asset), interiorUrl(asset, import.meta.env?.BASE_URL || "./"));
}
export function hasInteriorAssets(scene: Phaser.Scene) { return interiorAssets.every((asset) => scene.textures.exists(interiorKey(asset))); }
export const interiorDoorFrame = "aurora-interior-door-frame-v2";
export function prepareDoorFrame(scene: Phaser.Scene) {
  if (scene.textures.exists(interiorDoorFrame)) return;
  const texture = scene.textures.createCanvas(interiorDoorFrame, 208, 112)!;
  texture.context.drawImage(scene.textures.get(interiorKey("airlock-door")).getSourceImage() as HTMLImageElement, 0, 0);
  // Preserve the original frame; the two cropped centre leaves move independently.
  texture.context.clearRect(38, 24, 132, 62); texture.refresh();
}
