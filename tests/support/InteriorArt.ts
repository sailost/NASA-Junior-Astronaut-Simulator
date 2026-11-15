import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { interiorAssets, interiorKey } from "../../src/game/world/InteriorAssets";
import type { artScene } from "./ArtScene";
export async function loadInteriorArt(art: ReturnType<typeof artScene>) {
  await Promise.all(interiorAssets.map(async (asset) => {
    const image = await loadImage(await readFile(new URL(`../../public/assets/world/interiors/${asset}.png`, import.meta.url)));
    const canvas = createCanvas(image.width, image.height);
    canvas.getContext("2d").drawImage(image, 0, 0);
    art.textures.set(interiorKey(asset), canvas);
  }));
}
