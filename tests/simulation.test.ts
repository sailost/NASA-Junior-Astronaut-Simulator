import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/systems/Simulation";
import { canWalk, stations, rooms } from "../src/game/world/map";
import {
  waterSolution,
  waterConnected,
  rotateMask,
  oxygenAligned,
  signalAligned,
  circuitAligned,
} from "../src/game/minigames/puzzles";
import { readFile } from "node:fs/promises";
test("fixed simulation steps produce the same reserves at different frame rates", () => {
  const a = new Simulation(2),
    b = new Simulation(2);
  a.tick(50);
  for (let i = 0; i < 200; i++) b.tick(0.25);
  assert.deepEqual(a.resources, b.resources);
  assert.equal(a.time, b.time);
  assert.deepEqual(a.systems, b.systems);
});
test("pause freezes clock, resources, communication and emergency timers", () => {
  const s = new Simulation(1);
  s.trigger("solar");
  s.paused = true;
  const initial = JSON.stringify(s);
  s.tick(100);
  assert.equal(JSON.stringify(s), initial);
});
test("failed purchases do not partially spend reserves or parts", () => {
  const s = new Simulation(1);
  s.resources.water = 0;
  const energy = s.resources.energy;
  s.action("research");
  assert.equal(s.resources.energy, energy);
  assert.equal(s.research, 0);
  s.spareParts = 0;
  assert.equal(s.repair("oxygen"), false);
  assert.equal(s.resources.energy, energy);
});
test("night consumes batteries; upgrades have a cost and improve only daytime generation", () => {
  const a = new Simulation(2),
    b = new Simulation(2);
  a.action("upgrade");
  assert.equal(a.spareParts, 8);
  assert.equal(a.resources.energy, 60);
  a.resources.energy = b.resources.energy = 40;
  a.tick(20);
  b.tick(20);
  assert.ok(a.resources.energy > b.resources.energy);
  a.time = b.time = 120;
  a.resources.energy = b.resources.energy = 50;
  a.tick(10);
  b.tick(10);
  assert.ok(a.resources.energy < 50);
  assert.equal(a.resources.energy, b.resources.energy);
});
test("crops use water, take time and cannot be harvested repeatedly", () => {
  const s = new Simulation(2);
  assert.match(s.action("plant"), /iniciado/);
  const food = s.resources.food,
    water = s.resources.water;
  assert.equal(s.crop, 0);
  s.tick(20);
  assert.ok(s.crop > 0 && s.crop < 100);
  assert.ok(s.resources.water < water);
  s.action("harvest");
  assert.ok(s.resources.food < food);
  s.crop = 100;
  s.action("harvest");
  const after = s.resources.food;
  assert.equal(s.crop, -1);
  s.action("harvest");
  assert.equal(s.resources.food, after);
});
test("science costs resources once, processes in background and gates communication", () => {
  const s = new Simulation(1);
  assert.match(s.action("transmit"), /3 investigaciones/);
  s.collectSample("plant");
  assert.equal(s.loadSample(), true);
  s.startAnalysis();
  assert.equal(s.research, 0);
  s.startAnalysis();
  assert.equal(s.research, 0);
  s.tick(9);
  assert.equal(s.research, 1);
  s.action("battery-reserve");
  s.collectSample("water");
  assert.equal(s.loadSample(), true);
  s.startAnalysis();
  s.tick(9);
  assert.equal(s.research, 2);
  assert.ok(s.resources.energy < 80);
});
test("science allocation speeds analysis preparation at the cost of greater drain", () => {
  const normal = new Simulation(1),
    science = new Simulation(1);
  science.allocation = "science";
  for (const s of [normal, science]) { s.collectSample("plant"); s.loadSample(); s.startAnalysis(); }
  assert.equal(normal.researchCooldown, 8);
  assert.equal(science.researchCooldown, 6);
  normal.tick(20);
  science.tick(20);
  assert.ok(science.resources.energy < normal.resources.energy);
  assert.ok(science.resources.oxygen < normal.resources.oxygen);
});
test("an active historical solar scenario warns first and shelter reduces simulated exposure", () => {
  const a = new Simulation(2),
    b = new Simulation(2);
  a.solarRecord = {
    id: "2024-05-10T06:27:00-FLR-001",
    date: "2024-05-10",
    url: "https://ccmc.gsfc.nasa.gov/DONKI/events/30666/2/",
    type: "FLR",
  };
  a.trigger("solar");
  b.trigger("solar");
  a.action("shelter");
  a.tick(20);
  b.tick(20);
  assert.equal(a.resources.radiation, 0);
  assert.equal(b.resources.radiation, 0);
  a.tick(35);
  b.tick(35);
  assert.ok(b.resources.radiation > a.resources.radiation * 10);
  assert.ok(a.log.some((l) => l.text.includes("ARCHIVO DONKI")));
});
test("communication requires surviving the delay and produces the promised consequence", () => {
  const s = new Simulation(1);
  s.research = 3;
  s.action("transmit");
  assert.equal(s.report, "pending");
  const parts = s.spareParts;
  s.tick(27);
  assert.equal(s.report, "pending");
  s.tick(2);
  assert.equal(s.report, "received");
  assert.equal(s.spareParts, parts + 2);
});
test("unattended colony loses and keeps every resource within 0..100", () => {
  const s = new Simulation(2);
  s.tick(1000);
  assert.equal(s.status, "lost");
  for (const v of Object.values(s.resources)) assert.ok(v >= 0 && v <= 100);
  assert.ok(s.reason);
});
test("complete three-sol strategies win across both event branches without granting resources", () => {
  for (const seed of [1, 2, 3, 4]) {
    const s = new Simulation(seed);
    s.solarRecord = {
      id: "2024-05-10T07:12:00-CME-001",
      type: "CME",
      date: "2024-05-10T07:12:00Z",
      url: "https://ccmc.gsfc.nasa.gov/DONKI/",
    };
    s.action("upgrade");
    let nextAction = 0;
    const inProgress = new Map<string, number>();
    while (s.status === "playing") {
      s.tick(1);
      // Model 12 seconds of walking and minigame work before each repair.
      for (const e of s.activeEvents) {
        if (e.system === "solar") {
          if (!s.shielded && e.warning < 12) s.action("shelter");
          continue;
        }
        if (!inProgress.has(e.id)) inProgress.set(e.id, s.time + 12);
        if (s.time >= inProgress.get(e.id)!) s.repair(e.system);
      }
      if (
        s.time >= nextAction &&
        s.research < 3 &&
        s.researchCooldown === 0 &&
        s.resources.energy > 25
      ) {
        const sample = s.expedition.nextSample;
        if (sample) s.collectSample(sample);
        assert.ok(s.loadSample());
        s.startAnalysis();
        nextAction = s.time + 40;
      }
      if (
        s.research >= 3 &&
        s.report === "none" &&
        s.systems.comms &&
        s.resources.energy > 22
      )
        s.action("transmit");
      if (
        s.crop === -1 &&
        s.resources.water > 38 &&
        s.resources.energy > 28 &&
        s.resources.food < 64
      )
        s.action("plant");
      if (s.crop >= 100) s.action("harvest");
      if (s.time > 550) assert.fail("Simulation did not terminate");
    }
    assert.equal(
      s.status,
      "won",
      `seed ${seed}: ${s.reason}; ${JSON.stringify(s.resources)}`,
    );
    assert.ok(s.resources.health > 70);
    assert.ok(s.events.some((e) => e.system === "solar" && e.resolved));
    assert.ok(s.log.some((l) => l.text.includes("ARCHIVO DONKI")));
  }
});
test("surviving without the required science does not count as victory", () => {
  const s = new Simulation(2);
  s.time = 539;
  s.resources = {
    energy: 80,
    oxygen: 80,
    water: 80,
    food: 80,
    health: 100,
    radiation: 0,
  };
  s.tick(1);
  assert.equal(s.status, "lost");
  assert.match(s.reason, /investigaciones/);
});
test("restart uses fresh independent state and deterministic event branching", () => {
  const a = new Simulation(1);
  a.tick(200);
  a.action("research");
  const fresh = new Simulation(1);
  assert.equal(fresh.time, 0);
  assert.equal(fresh.research, 0);
  assert.equal(fresh.events.length, 0);
  assert.notEqual(a.resources, fresh.resources);
});
test("all four minigames reject incorrect input and accept a playable solution", () => {
  assert.ok(waterConnected(waterSolution));
  assert.ok(!waterConnected(waterSolution.map((m) => rotateMask(m, 1))));
  assert.ok(!waterConnected([]));
  assert.ok(oxygenAligned([40, 65, 55]));
  assert.ok(!oxygenAligned([20, 65, 55]));
  assert.ok(signalAligned(62, 34));
  assert.ok(!signalAligned(20, 70));
  assert.ok(circuitAligned([2, 0, 1]));
  assert.ok(!circuitAligned([0, 1, 2]));
});
test("collision map connects all six rooms to the start and every interaction area", () => {
  const queue: [[number, number]] = [[765, 350]],
    seen = new Set<string>();
  let head = 0;
  while (head < queue.length) {
    const [x, y] = queue[head++];
    for (const [nx, ny] of [
      [x + 5, y],
      [x - 5, y],
      [x, y + 5],
      [x, y - 5],
    ]) {
      const key = `${nx},${ny}`;
      if (!seen.has(key) && canWalk(nx, ny)) {
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  for (const room of rooms)
    assert.ok(
      queue.some(
        ([x, y]) =>
          x > room.x + 30 &&
          x < room.x + room.w - 30 &&
          y > room.y + 30 &&
          y < room.y + room.h - 30,
      ),
      room.name,
    );
  for (const s of stations)
    assert.ok(
      queue.some(([x, y]) => Math.hypot(s.x - x, s.y - y) < 110),
      s.name,
    );
  assert.equal(canWalk(0, 0), false);
  assert.equal(canWalk(765, 750), false);
});
test("bundled scientific data includes traceable DONKI records and RadLab units", async () => {
  const d = JSON.parse(await readFile("public/data/science.json", "utf8"));
  assert.equal(d.schemaVersion, 1);
  assert.ok(d.solarEvents.length >= 2);
  for (const e of d.solarEvents) {
    assert.ok(e.id && e.source && e.url && e.retrievedAt);
    assert.ok(Number.isFinite(Date.parse(e.date)));
    assert.ok(!e.url.includes("api_key"));
  }
  assert.equal(d.radiation.status, "verified");
  for (const r of d.radiation.readings) {
    assert.equal(r.unit, "μGy/h");
    assert.equal(r.platform, "ISS");
    assert.ok(Number.isFinite(r.absorbedDoseRate));
    assert.ok(Number.isFinite(Date.parse(r.timestamp)));
  }
  assert.ok(d.cards.some((c: { url: string }) => c.url.includes("OSD-37")));
});
