import type Phaser from "phaser";

/** Rasterize unchanged vector art once, retaining its world coordinates and depth. */
export function bakeStaticArt(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  key: string,
) {
  // Lightweight drawing adapters can continue to render the original vectors.
  if (typeof graphics.generateTexture !== "function") return;
  if (!scene.textures.exists(key)) graphics.generateTexture(key, 1540, 1000);
  scene.add.image(0, 0, key).setOrigin(0).setDepth(graphics.depth);
  graphics.destroy();
}
