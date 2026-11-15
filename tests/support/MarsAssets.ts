import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { marsAssets, marsAssetKey } from "../../src/game/world/MarsTerrain";
import type { artScene } from "./ArtScene";
export async function loadMarsArt(art: ReturnType<typeof artScene>) {
  await Promise.all(marsAssets.map(async (asset) => {
    const image = await loadImage(await readFile(new URL(`../../public/assets/world/mars/${asset}.png`, import.meta.url)));
    const canvas = createCanvas(image.width, image.height);
    canvas.getContext("2d").drawImage(image, 0, 0);
    art.textures.set(marsAssetKey(asset), canvas);
  }));
}
