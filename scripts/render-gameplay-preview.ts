import { mkdir, writeFile } from "node:fs/promises";
import type Phaser from "phaser";
import { artScene } from "../tests/support/ArtScene";
import { loadMarsArt } from "../tests/support/MarsAssets";
import { loadInteriorArt } from "../tests/support/InteriorArt";
import { drawMarsTerrain } from "../src/game/world/MarsTerrain";
import { drawStation } from "../src/game/world/StationRenderer";
import { WorldEffects } from "../src/game/world/WorldEffects";
import {
  makeAstronaut,
  animateAstronaut,
} from "../src/game/entities/Astronaut";
import { Simulation } from "../src/game/systems/Simulation";
import { idleMotion } from "../src/game/entities/movement";
const art = artScene(),
  scene = art.scene as unknown as Phaser.Scene;
await Promise.all([loadMarsArt(art), loadInteriorArt(art)]);
drawMarsTerrain(scene);
const stationVisuals = drawStation(scene);
const effects = new WorldEffects(scene),
  sim = new Simulation(2);
const actor = makeAstronaut(scene, 765, 350, 0xe1e1d7);
actor.root.setScale(1.28).setDepth(20);
animateAstronaut(actor, { ...idleMotion(), facing: 0.6 }, 0, 0.016);
effects.update(4000, 0.016, sim, actor.root);
stationVisuals?.update(actor.root, sim);
await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/world-art.png",
  art.render(1540, 1000, { x: 0, y: 0, zoom: 1 }).toBuffer("image/png"),
);
await writeFile(
  "test-results/control-art.png",
  art.render(1366, 768, { x: 195, y: 45, zoom: 1.2 }).toBuffer("image/png"),
);
for (const room of (await import("../src/game/world/map")).rooms) {
  await writeFile(`test-results/interior-${room.id}.png`, art.render(920, 680, { x: room.x - 25, y: room.y - 25, zoom: 2 }).toBuffer("image/png"));
}
sim.resources.energy = 0;
sim.systems.oxygen = false;
effects.update(5000, 0.016, sim, actor.root);
stationVisuals?.update(actor.root, sim);
await writeFile(
  "test-results/power-loss-art.png",
  art.render(1366, 768, { x: 0, y: 70, zoom: 1.2 }).toBuffer("image/png"),
);
console.log(
  "Offscreen art previews written to test-results/. These are drawing-routine previews, not browser screenshots.",
);
