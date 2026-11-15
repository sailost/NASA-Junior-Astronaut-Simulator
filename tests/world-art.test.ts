import { test } from "node:test";
import assert from "node:assert/strict";
import type Phaser from "phaser";
import { artScene } from "./support/ArtScene";
import { drawStation } from "../src/game/world/StationRenderer";
import { WorldEffects } from "../src/game/world/WorldEffects";
import {
  stationVisualState,
  roomVisualState,
} from "../src/game/world/visualState";
import {
  makeAstronaut,
  animateAstronaut,
  interactAstronaut,
} from "../src/game/entities/Astronaut";
import { idleMotion } from "../src/game/entities/movement";
import { Simulation } from "../src/game/systems/Simulation";
import { stations } from "../src/game/world/map";
test("cached station art preserves the image while removing static vector work from subsequent frames", () => {
  const vector = artScene(), cached = artScene(true);
  drawStation(vector.scene as unknown as Phaser.Scene);
  drawStation(cached.scene as unknown as Phaser.Scene);
  const commands = (art: ReturnType<typeof artScene>) => art.nodes
    .filter((n) => n.visible && n.kind === "graphics")
    .reduce((count, n) => count + n.commands.length, 0);
  assert.ok(commands(vector) > 1000);
  assert.equal(commands(cached), 0);
  assert.equal([...cached.textures.keys()].filter((k) => k.startsWith("aurora-static-")).length, 5);
  const camera = { x: 0, y: 0, zoom: 1 };
  const before = vector.render(1540, 1000, camera).getContext("2d").getImageData(0, 0, 1540, 1000).data;
  const after = cached.render(1540, 1000, camera).getContext("2d").getImageData(0, 0, 1540, 1000).data;
  let difference = 0;
  for (let i = 0; i < before.length; i++) difference += Math.abs(before[i] - after[i]);
  assert.ok(difference / before.length < 1, "raster caching must preserve colors, geometry and layer order");
});
test("lighting and machine activity follow resources and failures without mutating mechanics", () => {
  const sim = new Simulation(2),
    green = stations.find((s) => s.id === "greenhouse")!;
  assert.equal(stationVisualState(sim, green).working, true);
  sim.systems.greenhouse = false;
  assert.equal(stationVisualState(sim, green).working, false);
  assert.equal(roomVisualState(sim, "green").damaged, true);
  assert.equal(roomVisualState(sim, "control").damaged, false);
  sim.resources.energy = 0;
  const before = JSON.stringify(sim);
  assert.equal(roomVisualState(sim, "lab").powered, false);
  assert.ok(roomVisualState(sim, "lab").shade >= 0.25);
  assert.equal(JSON.stringify(sim), before);
});
test("production art creates six textured materials and can render illuminated and unpowered rooms", () => {
  const art = artScene(),
    scene = art.scene as unknown as Phaser.Scene;
  drawStation(scene);
  assert.equal(
    [...art.textures.keys()].filter((k) => k.startsWith("aurora-floor-"))
      .length,
    6,
  );
  const effects = new WorldEffects(scene),
    sim = new Simulation(2),
    player = { x: 765, y: 350 };
  const before = JSON.stringify(sim);
  effects.update(1000, 0.016, sim, player);
  const lit = art
    .render(500, 360, { x: 540, y: 110, zoom: 1 })
    .toBuffer("image/png");
  sim.resources.energy = 0;
  effects.update(2000, 0.016, sim, player);
  const dark = art
    .render(500, 360, { x: 540, y: 110, zoom: 1 })
    .toBuffer("image/png");
  assert.notDeepEqual(lit, dark);
  sim.resources.energy = 76;
  assert.equal(JSON.stringify(sim), before);
});
test("astronaut idle and interaction animate limbs while its position, shadow and collision anchor stay fixed", () => {
  const art = artScene(),
    actor = makeAstronaut(
      art.scene as unknown as Phaser.Scene,
      765,
      350,
      0xe1e1d7,
    ),
    motion = idleMotion();
  for (let i = 0; i < 30; i++) animateAstronaut(actor, motion, 0, 1 / 60);
  assert.equal(actor.root.x, 765);
  assert.equal(actor.root.y, 350);
  assert.equal(actor.root.rotation, 0);
  assert.ok(Math.abs(actor.rig.y) < 0.5);
  assert.equal(actor.shadow.rotation, 0);
  interactAstronaut(actor);
  animateAstronaut(actor, motion, 0, 0.2);
  assert.ok(actor.arms[1].y < 0);
  for (let i = 0; i < 60; i++) animateAstronaut(actor, motion, 0, 1 / 60);
  assert.equal(actor.interaction, 0);
  assert.equal(actor.arms[1].y, 1);
  assert.equal(actor.root.y, 350);
});
