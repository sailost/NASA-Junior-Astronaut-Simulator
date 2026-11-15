import { test } from "node:test";
import assert from "node:assert/strict";
import { explorationCamera } from "../src/game/world/camera";
import { auraMessage } from "../src/game/ui/Aura";
import { Simulation } from "../src/game/systems/Simulation";
import {
  getObjectives,
  recommendObjective,
} from "../src/game/systems/objectives";
test("full exploration viewport fits inside the rendered world at both target resolutions", () => {
  for (const [width, height] of [
    [1920, 1080],
    [1366, 768],
    [1280, 720],
    [800, 600],
  ]) {
    const camera = explorationCamera(width, height);
    assert.deepEqual(
      [camera.x, camera.y, camera.width, camera.height],
      [0, 0, width, height],
    );
    assert.ok(width / camera.zoom <= 1540);
    assert.ok(height / camera.zoom <= 1000);
    assert.ok(width / camera.zoom <= 1140.01);
    assert.ok(height / camera.zoom <= 680.01);
  }
});
test("AURA prioritizes critical reserves and provides an emergency destination without changing the simulation", () => {
  const sim = new Simulation(2);
  sim.trigger("water");
  const current = recommendObjective(getObjectives(sim));
  assert.match(auraMessage(sim, current)!.text, /soporte vital/i);
  sim.resources.energy = 5;
  const before = JSON.stringify(sim);
  assert.match(auraMessage(sim, current)!.text, /Energía en nivel crítico/);
  assert.equal(JSON.stringify(sim), before);
});
