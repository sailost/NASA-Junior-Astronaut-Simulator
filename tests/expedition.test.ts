import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/systems/Simulation";
import { getObjectives, recommendObjective } from "../src/game/systems/objectives";
import { objectiveDirection } from "../src/game/ui/direction";
import { findRoute } from "../src/game/world/navigation";
import { stations } from "../src/game/world/map";

const current = (sim: Simulation) => recommendObjective(getObjectives(sim))!;
test("expedition provides useful next steps during processing and stores three different samples without confirmation clicks", () => {
  const s = new Simulation(2);
  assert.equal(current(s).id, "collect-plant");
  assert.equal(s.loadSample(), false);
  s.startAnalysis(); assert.equal(s.research, 0);
  s.collectSample("plant"); assert.equal(current(s).id, "analyze-plant");
  assert.ok(s.loadSample()); s.startAnalysis();
  const energy = s.resources.energy, water = s.resources.water;
  for (let i = 0; i < 5; i++) s.startAnalysis();
  assert.equal(s.resources.energy, energy); assert.equal(s.resources.water, water);
  assert.equal(current(s).id, "batteries");
  s.action("battery-reserve"); assert.equal(current(s).id, "collect-water");
  s.collectSample("water"); s.tick(9);
  assert.deepEqual(s.expedition.results, ["plant"]);
  assert.equal(current(s).id, "analyze-water");
  assert.ok(s.loadSample()); s.startAnalysis(); s.tick(9);
  assert.equal(current(s).id, "analyze-soil");
  assert.ok(s.expedition.collected.soil); assert.ok(s.loadSample());
  s.startAnalysis(); s.tick(9);
  assert.deepEqual(s.expedition.results, ["plant", "water", "soil"]);
  assert.equal(current(s).id, "report");
  assert.equal(s.loadSample(), false);
  s.action("transmit"); const reserve = s.resources.energy;
  s.action("transmit"); assert.equal(s.resources.energy, reserve);
  assert.equal(s.report, "pending"); s.tick(29); assert.equal(s.report, "received");
});

test("analysis pauses on power loss or pause and resumes without losing or duplicating a sample", () => {
  const s = new Simulation(2); s.collectSample("plant"); s.loadSample(); s.startAnalysis();
  s.tick(2); const remaining = s.expedition.remaining;
  s.resources.energy = 0; s.systems.power = false; s.tick(3);
  assert.equal(s.expedition.remaining, remaining); assert.equal(s.research, 0);
  s.paused = true; const state = JSON.stringify(s); s.tick(100); assert.equal(JSON.stringify(s), state);
  s.paused = false; s.resources.energy = 20; s.tick(7);
  assert.equal(s.research, 1); assert.deepEqual(s.expedition.results, ["plant"]);
  s.tick(2); assert.equal(s.research, 1);
});

test("unavailable samples explain their prerequisite and failed analysis payments are atomic", () => {
  const s = new Simulation(1); s.systems.water = false;
  assert.match(s.collectSample("water"), /Restaura/); assert.equal(s.expedition.collected.water, false);
  s.collectSample("plant"); s.loadSample(); s.resources.water = 4;
  const energy = s.resources.energy;
  assert.match(s.startAnalysis(), /12 energía y 5 agua/);
  assert.equal(s.resources.energy, energy); assert.equal(s.expedition.loaded, "plant");
  assert.equal(s.expedition.processing, undefined);
  s.resources.water = 10; s.startAnalysis();
  assert.equal(s.resources.energy, energy - 12); assert.equal(s.resources.water, 5);
});

test("night preparation trades slower crops for actual energy savings; tending costs resources and never grants instant food", () => {
  const reserve = new Simulation(2), normal = new Simulation(2);
  reserve.action("battery-reserve"); const paid = reserve.resources.energy;
  reserve.action("battery-reserve"); assert.equal(reserve.resources.energy, paid);
  for (const s of [reserve, normal]) { s.time = 120; s.crop = 0; s.resources.energy = 70; }
  reserve.tick(10); normal.tick(10);
  assert.ok(reserve.resources.energy > normal.resources.energy);
  assert.ok(reserve.crop < normal.crop);
  const energy = normal.resources.energy, water = normal.resources.water, food = normal.resources.food;
  normal.action("tend"); assert.equal(normal.resources.energy, energy - 2); assert.equal(normal.resources.water, water - 2);
  assert.equal(normal.resources.food, food); assert.ok(normal.crop < 100);
  const once = JSON.stringify(normal.resources); normal.action("tend"); assert.equal(JSON.stringify(normal.resources), once);
});

test("guidance remains visible for on-screen equipment and stays inside both supported viewports", () => {
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    const view = { x: 200, y: 100, width, height };
    const centered = objectiveDirection({ x: 200 + width / 2, y: 100 + height / 2 }, view);
    assert.equal(centered.x, 50); assert.ok(centered.y < 50); assert.equal(centered.angle, 90);
    for (const target of [{ x: -3000, y: 500 }, { x: 500, y: -5000 }, { x: 9000, y: 8000 }]) {
      const direction = objectiveDirection(target, view)!;
      assert.ok(direction.x >= 5 && direction.x <= 95); assert.ok(direction.y >= 10 && direction.y <= 90);
    }
  }
});

test("a complete expedition survives three sols with walking time, active work, repairs and no resource injections", () => {
  for (const seed of [1, 2]) {
    const s = new Simulation(seed);
    let player = { x: 765, y: 350 };
    const visit = (id: string, work: number, action: () => void) => {
      const target = stations.find((station) => station.id === id)!;
      const route = findRoute(player, target);
      s.tick(route.length * 10 / 155 + work);
      player = route.at(-1)!;
      assert.equal(s.status, "playing"); action();
    };
    visit("greenhouse", 2, () => { s.collectSample("plant"); s.action("plant"); });
    visit("research", 12, () => { assert.ok(s.loadSample()); s.startAnalysis(); });
    visit("power", 8, () => s.action("battery-reserve"));
    visit("water", 10, () => { if (!s.systems.water) s.repair("water"); s.collectSample("water"); });
    if (!s.systems.oxygen) visit("oxygen", 10, () => { assert.ok(s.repair("oxygen")); });
    visit("research", 12, () => { assert.ok(s.loadSample()); s.startAnalysis(); });
    s.tick(9);
    visit("research", 12, () => { assert.ok(s.loadSample()); s.startAnalysis(); }); s.tick(9);
    visit("comms", 12, () => { if (!s.systems.comms) s.repair("comms"); s.action("transmit"); });
    const repairAt = new Map<string, number>();
    while (s.status === "playing") {
      s.tick(1);
      for (const event of s.activeEvents) {
        if (event.system === "solar") { if (!s.shielded && event.warning < 20) s.action("shelter"); continue; }
        if (!repairAt.has(event.id)) repairAt.set(event.id, s.time + 18);
        if (s.time >= repairAt.get(event.id)!) assert.ok(s.repair(event.system));
      }
      if (s.crop >= 100) s.action("harvest");
    }
    assert.equal(s.status, "won", `${seed}: ${s.reason} ${JSON.stringify(s.resources)}`);
    assert.ok(s.time >= 540 && s.time < 540.25); assert.equal(s.research, 3); assert.equal(s.report, "received");
  }
});
