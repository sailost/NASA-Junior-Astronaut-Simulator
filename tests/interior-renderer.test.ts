import { test } from "node:test";
import assert from "node:assert/strict";
import type Phaser from "phaser";
import { artScene } from "./support/ArtScene";
import { loadInteriorArt } from "./support/InteriorArt";
import { interiorAssets, interiorKey, interiorUrl, preloadInteriors, hasInteriorAssets, roomFloorAsset, interiorDoorFrame } from "../src/game/world/InteriorAssets";
import { machineSprites, wallSprites, interiorDimensions } from "../src/game/world/InteriorRenderer";
import { drawStation } from "../src/game/world/StationRenderer";
import { WorldEffects } from "../src/game/world/WorldEffects";
import { rooms, stations, canWalk } from "../src/game/world/map";
import { Simulation } from "../src/game/systems/Simulation";

test("all 20 interior PNGs load relative to GitHub Pages and match their source proportions", async () => {
  const calls: [string, string][] = [];
  preloadInteriors({ load: { image: (key: string, path: string) => calls.push([key, path]) } } as unknown as Phaser.Scene);
  assert.equal(calls.length, 20);
  for (const asset of interiorAssets) {
    assert.ok(calls.some(([key, path]) => key === interiorKey(asset) && path === interiorUrl(asset)));
    assert.equal(interiorUrl(asset, "/base-aurora/"), `/base-aurora/assets/world/interiors/${asset}.png`);
  }
  const art = artScene(); await loadInteriorArt(art);
  assert.ok(hasInteriorAssets(art.scene as unknown as Phaser.Scene));
  for (const [asset, dimensions] of Object.entries(interiorDimensions)) {
    const canvas = art.textures.get(`interior-${asset}`)!;
    assert.deepEqual([canvas.width, canvas.height], dimensions);
  }
  for (const asset of Object.values(roomFloorAsset)) {
    const canvas = art.textures.get(interiorKey(asset))!;
    assert.deepEqual([canvas.width, canvas.height], [256, 256]);
    const pixels = canvas.getContext("2d").getImageData(0, 0, 256, 256).data;
    for (let i = 3; i < pixels.length; i += 4) assert.equal(pixels[i], 255);
  }
});

test("modular walls preserve every original doorway and native sprite aspect ratio", () => {
  for (const room of rooms) {
    const doorY = room.y < 500 ? room.y + room.h : room.y + 1;
    const doorX = room.x + room.w / 2;
    for (const plan of wallSprites(room)) {
      const [width, height] = interiorDimensions[plan.asset]!;
      assert.ok(Math.abs(plan.w / plan.h - width / height) < 1e-10);
      if (plan.asset === "wall-horizontal" && plan.y === doorY)
        assert.ok(plan.x + plan.w / 2 <= doorX - 42 + .001 || plan.x - plan.w / 2 >= doorX + 42 - .001);
    }
  }
});

test("new machines are attached only to existing interaction points and preserve aspect ratios", () => {
  let count = 0;
  for (const station of stations) {
    const plans = machineSprites(station); count += plans.length;
    if (station.kind === "water" || station.kind === "upgrade") assert.equal(plans.length, 0);
    else assert.equal(plans.length, station.kind === "greenhouse" ? 2 : 1);
    for (const plan of plans) {
      const [width, height] = interiorDimensions[plan.asset]!;
      assert.ok(Math.abs(plan.w / plan.h - width / height) < 1e-10);
      assert.ok(Math.abs(plan.x - station.x) <= 57);
      assert.ok(Math.abs(plan.y - station.y) <= 7);
      const room = rooms.find((r) => r.id === station.room)!;
      assert.ok(plan.x - plan.w / 2 > room.x && plan.x + plan.w / 2 < room.x + room.w);
    }
  }
  assert.equal(count, 8); // Two trays belong to the single existing crop installation.
});

test("production PNG renderer replaces legacy art, anchors floors to the world and caches static geometry", async () => {
  const art = artScene(true); await loadInteriorArt(art);
  const visuals = drawStation(art.scene as unknown as Phaser.Scene);
  assert.ok(visuals);
  const floors = art.nodes.filter((node) => node.kind === "tile");
  assert.ok(floors.length >= 13);
  for (const floor of floors) { assert.equal(floor.tilePositionX, floor.x); assert.equal(floor.tilePositionY, floor.y); }
  assert.equal(art.nodes.filter((node) => node.kind === "image" && node.key === interiorKey("console-control")).length, 1);
  assert.equal(art.nodes.filter((node) => node.kind === "image" && node.key === interiorKey("machine-lab-scanner")).length, 1);
  assert.equal([...art.textures.keys()].filter((key) => key.startsWith("aurora-interior-v2-")).length, 3);
  assert.ok(![...art.textures.keys()].some((key) => key.startsWith("aurora-static-") || key.startsWith("aurora-floor-")));
  assert.equal(art.nodes.filter((node) => node.visible && node.kind === "graphics").length, 0);
  assert.ok(art.nodes.filter((node) => node.visible).length < 180);
});

test("occlusion and power/failure tint follow state without moving equipment or modifying resources", async () => {
  const art = artScene(); await loadInteriorArt(art);
  const visuals = drawStation(art.scene as unknown as Phaser.Scene)!, sim = new Simulation(2);
  const scanner = art.nodes.find((n) => n.key === interiorKey("machine-lab-scanner"))!;
  const before = JSON.stringify(sim), position = { x: scanner.x, y: scanner.y };
  visuals.update({ x: 765, y: 690 }, sim); assert.ok(scanner.depth > 20);
  visuals.update({ x: 765, y: 810 }, sim); assert.ok(scanner.depth < 20);
  assert.equal(JSON.stringify(sim), before);
  assert.deepEqual({ x: scanner.x, y: scanner.y }, position);
  const originalTint = scanner.tint; sim.resources.energy = 0;
  const powerless = JSON.stringify(sim); visuals.update({ x: 765, y: 810 }, sim);
  assert.notEqual(scanner.tint, originalTint); assert.equal(JSON.stringify(sim), powerless);
  sim.resources.energy = 76; sim.systems.oxygen = false;
  visuals.update({ x: 765, y: 350 }, sim);
  assert.notEqual(art.nodes.find((n) => n.key === interiorKey("machine-oxygen"))!.tint, 0xffffff);
});

test("airlock leaves open around the existing entrance and do not change walkability or simulation", async () => {
  const art = artScene(); await loadInteriorArt(art);
  const scene = art.scene as unknown as Phaser.Scene; drawStation(scene);
  const effects = new WorldEffects(scene), sim = new Simulation(2), room = rooms.find((r) => r.id === "control")!;
  const x = room.x + room.w / 2, y = room.y + room.h - 3;
  const leaves = art.nodes.filter((node) => node.key === interiorKey("airlock-door") && node.y === y && node.x === x);
  assert.equal(leaves.length, 2);
  const frame = art.textures.get(interiorDoorFrame)!;
  const aperture = frame.getContext("2d").getImageData(38, 24, 132, 62).data;
  for (let i = 3; i < aperture.length; i += 4) assert.equal(aperture[i], 0);
  const before = JSON.stringify(sim), routeBefore = [400, 420, 440, 460, 480, 500].map((cy) => canWalk(x, cy));
  for (let i = 0; i < 60; i++) effects.update(i * 16, .016, sim, { x, y: y - 35 });
  assert.ok(Math.abs(leaves[0].x - x) > 31 && Math.abs(leaves[1].x - x) > 31);
  assert.deepEqual([400, 420, 440, 460, 480, 500].map((cy) => canWalk(x, cy)), routeBefore);
  assert.ok(routeBefore.every(Boolean)); assert.equal(JSON.stringify(sim), before);
  for (let i = 0; i < 60; i++) effects.update(1000 + i * 16, .016, sim, { x: 100, y: 100 });
  assert.ok(Math.abs(leaves[0].x - x) < 1 && Math.abs(leaves[1].x - x) < 1);
});
