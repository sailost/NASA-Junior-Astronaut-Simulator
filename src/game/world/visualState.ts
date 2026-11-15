import type { Simulation } from "../systems/Simulation";
import type { Station } from "./map";
export function stationVisualState(sim: Simulation, station: Station) {
  const powered = sim.resources.energy > 0.5,
    operational = !station.system || sim.systems[station.system];
  return {
    powered,
    operational,
    working: powered && operational,
    alarm: !operational,
    light: !powered ? 0.1 : !operational ? 0.3 : sim.daylight ? 0.78 : 1,
  };
}
export function roomVisualState(sim: Simulation, id: string) {
  const relevant =
    id === "life"
      ? ["oxygen", "water"]
      : id === "green"
        ? ["greenhouse"]
        : id === "engine"
          ? ["power"]
          : id === "control"
            ? ["comms"]
            : [];
  const damaged = relevant.some(
    (key) => !sim.systems[key as keyof typeof sim.systems],
  );
  const powered = sim.resources.energy > 0.5;
  return {
    powered,
    damaged,
    shade: !powered ? 0.3 : damaged ? 0.08 : 0,
    glow: powered ? (sim.daylight ? 0.28 : 0.45) : 0.03,
    sheltered: id === "shelter" && sim.shielded,
  };
}
