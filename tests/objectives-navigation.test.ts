import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/systems/Simulation";
import {
  getObjectives,
  recommendObjective,
} from "../src/game/systems/objectives";
import { findRoute } from "../src/game/world/navigation";
import { stations, rooms, canWalk } from "../src/game/world/map";

test("initial mission specifies the greenhouse, collection and E interaction", () => {
  const objectives = getObjectives(new Simulation(2)),
    current = recommendObjective(objectives)!;
  assert.equal(current.stationId, "greenhouse");
  assert.equal(current.room, "INVERNADERO");
  assert.match(current.instruction, /recoge la muestra/);
  assert.match(current.instruction, /pulsa E/i);
  for (const objective of objectives.filter((o) => o.stationId)) {
    const station = stations.find((s) => s.id === objective.stationId)!;
    assert.ok(station);
    assert.equal(
      rooms.find((r) => r.id === station.room)!.name,
      objective.room,
    );
  }
});
test("research completion advances guidance to communications, then to maintaining the base", () => {
  const sim = new Simulation(2);
  sim.research = 3;
  sim.expedition.results = ["plant", "water", "soil"];
  sim.expedition.collected = { plant: true, water: true, soil: true };
  sim.expedition.batteriesReady = true;
  let objective = recommendObjective(getObjectives(sim))!;
  assert.equal(objective.id, "report");
  assert.equal(objective.room, "CENTRO DE CONTROL");
  assert.match(objective.instruction, /Enlace con la Tierra/);
  sim.report = "received";
  sim.harvests = 1;
  sim.upgrades = 1;
  objective = recommendObjective(getObjectives(sim))!;
  assert.equal(objective.id, "survive");
  assert.equal(objective.stationId, undefined);
});
test("emergency guidance has priority and selects its correct local equipment", () => {
  for (const system of [
    "oxygen",
    "water",
    "power",
    "greenhouse",
    "comms",
    "solar",
  ] as const) {
    const sim = new Simulation(2);
    sim.trigger(system);
    const current = recommendObjective(getObjectives(sim))!;
    assert.equal(current.urgent, true);
    assert.equal(current.stationId, system === "solar" ? "shelter" : system);
    assert.ok(current.room);
    assert.match(current.instruction, /pulsa E/i);
  }
});
test("navigation to every machine follows walkable corridors from all six rooms", () => {
  for (const room of rooms)
    for (const station of stations) {
      const route = findRoute(
        { x: room.x + room.w / 2, y: room.y + 220 },
        station,
      );
      assert.ok(route.length, `${room.id} -> ${station.id}`);
      for (const point of route) assert.ok(canWalk(point.x, point.y));
      for (let i = 1; i < route.length; i++)
        assert.equal(
          Math.abs(route[i].x - route[i - 1].x) +
            Math.abs(route[i].y - route[i - 1].y),
          10,
        );
      const goal = route.at(-1)!;
      assert.ok(Math.hypot(goal.x - station.x, goal.y - station.y) < 115);
    }
});
