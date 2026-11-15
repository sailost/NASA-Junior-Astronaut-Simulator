import { test } from "node:test";
import assert from "node:assert/strict";
import type Phaser from "phaser";
import { artScene } from "./support/ArtScene";
import { loadMarsArt } from "./support/MarsAssets";
import { drawMarsTerrain, marsAssets, marsAssetUrl, marsAssetKey, marsDecorations, isExteriorDecoration, marsGroundKey, preloadMars } from "../src/game/world/MarsTerrain";
import { drawStation } from "../src/game/world/StationRenderer";
import { rooms } from "../src/game/world/map";

test("the twelve individual PNGs load through the deployment base path without the atlas", () => {
  const calls: [string, string][] = [];
  preloadMars({ load: { image: (key: string, path: string) => calls.push([key, path]) } } as unknown as Phaser.Scene);
  assert.equal(calls.length, 12);
  assert.equal(new Set(calls.map(([key]) => key)).size, 12);
  for (const asset of marsAssets) {
    assert.ok(calls.some(([key, path]) => key === marsAssetKey(asset) && path === marsAssetUrl(asset)));
    assert.equal(marsAssetUrl(asset, "/base-aurora/"), `/base-aurora/assets/world/mars/${asset}.png`);
  }
  assert.ok(calls.every(([, path]) => !path.includes("atlas")));
});

test("all fixed decorations stay outside rooms, corridors, doors and machine footprints", () => {
  assert.ok(marsDecorations.length <= 40);
  assert.equal(new Set(marsDecorations.map((d) => d.asset)).size, 12);
  for (const decoration of marsDecorations) assert.ok(isExteriorDecoration(decoration), JSON.stringify(decoration));
  assert.equal(isExteriorDecoration({ asset: "rock-cluster", x: 765, y: 750, w: 70, h: 70 }), false);
  assert.equal(isExteriorDecoration({ asset: "small-crater", x: 765, y: 505, w: 40, h: 40 }), false);
  assert.equal(isExteriorDecoration({ asset: "small-stones", x: -10, y: 50, w: 40, h: 40 }), false);
});

test("source images have real alpha, no opaque backgrounds, and no visible neon edge contamination", async () => {
  const art = artScene(); await loadMarsArt(art);
  for (const asset of marsAssets) {
    const image = art.textures.get(marsAssetKey(asset))!;
    const pixels = image.getContext("2d").getImageData(0, 0, image.width, image.height).data;
    let transparent = 0, edgeNeon = 0;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4;
      if (pixels[i + 3] === 0) transparent++;
      if ((x < 8 || y < 8 || x >= image.width - 8 || y >= image.height - 8) && pixels[i + 3] > 32 &&
        pixels[i] > 220 && pixels[i + 2] < 40 && (pixels[i + 1] < 40 || pixels[i + 1] > 220)) edgeNeon++;
    }
    assert.ok(transparent > image.width * image.height * .25, asset);
    assert.equal(edgeNeon, 0, asset);
  }
});

test("terrain is deterministic, cached once, world-fixed and below every interior layer", async () => {
  const first = artScene(), second = artScene(); await Promise.all([loadMarsArt(first), loadMarsArt(second)]);
  drawMarsTerrain(first.scene as unknown as Phaser.Scene);
  drawMarsTerrain(second.scene as unknown as Phaser.Scene);
  assert.deepEqual(first.textures.get(marsGroundKey)!.toBuffer("image/png"), second.textures.get(marsGroundKey)!.toBuffer("image/png"));
  const objects = first.nodes.filter((node) => node.kind === "image" && node.key.startsWith("mars-"));
  assert.equal(objects.length, marsDecorations.length);
  for (const [i, node] of objects.entries()) {
    assert.equal(node.x, marsDecorations[i].x); assert.equal(node.y, marsDecorations[i].y);
    assert.ok(node.depth < -21); assert.equal(node.rotation, marsDecorations[i].angle || 0);
  }
  assert.deepEqual(objects.find((node) => node.key === "mars-bootprints")!.crop, { x: 0, y: 0, w: 320, h: 362 });
  assert.equal(first.nodes.filter((node) => node.kind === "graphics").length, 0);
  const existing = first.textures.get(marsGroundKey); drawMarsTerrain(first.scene as unknown as Phaser.Scene);
  assert.equal(first.textures.get(marsGroundKey), existing);
});

test("new exterior rendering preserves every room interior pixel", async () => {
  const previous = artScene(), current = artScene(); await loadMarsArt(current);
  drawStation(previous.scene as unknown as Phaser.Scene);
  drawMarsTerrain(current.scene as unknown as Phaser.Scene); drawStation(current.scene as unknown as Phaser.Scene);
  const camera = { x: 0, y: 0, zoom: 1 };
  const before = previous.render(1540, 1000, camera).getContext("2d");
  const after = current.render(1540, 1000, camera).getContext("2d");
  for (const room of rooms) {
    const area = [room.x + 26, room.y + 40, room.w - 52, room.h - 65] as const;
    assert.deepEqual(after.getImageData(...area).data, before.getImageData(...area).data, room.name);
  }
});
