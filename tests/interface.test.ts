import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import { Interface } from "../src/game/ui/Interface";
import { TUTORIAL_KEY } from "../src/game/tutorial/TutorialManager";
import { Simulation } from "../src/game/systems/Simulation";
import { operateMachine } from "./support/operateMachine";
import { Minigame } from "../src/game/minigames/Minigame";
import { stations } from "../src/game/world/map";
import type { BaseScene } from "../src/game/scenes/BaseScene";
import type { StationAudio } from "../src/game/audio/Audio";
let dom: Window;
const nativeFetch = globalThis.fetch;
beforeEach(async () => {
  dom = new Window({ url: "http://localhost:5173/" });
  Object.assign(globalThis, {
    window: dom,
    document: dom.document,
    localStorage: dom.localStorage,
  });
  dom.window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
  })) as any;
  const science = await readFile("public/data/science.json", "utf8");
  globalThis.fetch = (async () =>
    new Response(science, {
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = nativeFetch;
  void dom.happyDOM.close();
});
function setup() {
  // These regression scenarios exercise an experienced player's normal game.
  localStorage.setItem(TUTORIAL_KEY, "done");
  const sim = new Simulation(2);
  let scene: any = {
    blocked: true,
    sim,
    input: {
      keyboard: {
        enabled: true,
        clearCaptures() {},
        resetKeys() {},
        addCapture() {},
      },
    },
    cameras: { main: { fadeIn() {} } },
    setTrackedStation(id?: string) {
      this.trackedStation = id;
    },
    reset(s: Simulation) {
      this.sim = s;
      this.player = { x: 765, y: 350 };
      this.nearest = undefined;
    },
  };
  const audio = {
    muted: false,
    tone() {},
    unlock() {},
    toggle() {
      this.muted = !this.muted;
    },
  };
  dom.document.body.innerHTML = '<div id="ui"></div>';
  const root = dom.document.querySelector("#ui")! as unknown as HTMLElement;
  const ui = new Interface(
    root,
    sim,
    scene as BaseScene,
    audio as StationAudio,
    { campaign: false }, // Preserve the original simulator's independent regression coverage.
  );
  const click = (selector: string) => {
    const b = dom.document.querySelector(selector);
    assert.ok(b, selector);
    (b as any).click();
    if (selector === "#start") root.querySelector<HTMLElement>("#intro-skip")?.click();
  };
  return { sim, scene, ui, root, click };
}
test("unchanged HUD updates retain existing DOM nodes and still display changed resources", () => {
  const { ui, sim, click, root, scene } = setup();
  click("#start");
  scene.nearest = stations.find((s) => s.id === "research");
  const refresh = () => {
    (ui as any).lastRender = -1000;
    ui.update();
  };
  refresh();
  const resourceUnit = root.querySelector("#r-energy span");
  const prompt = root.querySelector("#interaction kbd");
  const system = root.querySelector("#system-detail b");
  assert.ok(resourceUnit && prompt && system);
  for (let i = 0; i < 20; i++) refresh();
  assert.equal(root.querySelector("#r-energy span"), resourceUnit);
  assert.equal(root.querySelector("#interaction kbd"), prompt);
  assert.equal(root.querySelector("#system-detail b"), system);
  sim.resources.energy = 12;
  refresh();
  assert.equal(root.querySelector("#r-energy")?.textContent, "12%");
  assert.ok(root.querySelector('[data-resource="energy"]')?.classList.contains("low"));
});

test("menu, start, pause, instructions and restart operate on real state", () => {
  const { sim, scene, ui, root, click } = setup();
  assert.equal(sim.paused, true);
  assert.equal(
    root.querySelector("#start")?.getAttribute("aria-label"),
    "Iniciar misión",
  );
  click("#start");
  assert.equal(sim.paused, false);
  assert.equal(scene.blocked, false);
  sim.tick(12);
  click("#pause-btn");
  assert.equal(sim.paused, true);
  const time = sim.time;
  sim.tick(10);
  assert.equal(sim.time, time);
  click("#resume");
  assert.equal(sim.paused, false);
  click("#pause-btn");
  click("#restart");
  assert.equal(ui.sim.time, 0);
  assert.notEqual(ui.sim, sim);
  assert.equal(scene.sim, ui.sim);
  assert.equal(scene.blocked, false);
});
test("exploration shows only the current mission and opens full missions and map on request", () => {
  const { sim, scene, click } = setup();
  click("#start");
  const mission = dom.document.querySelector("#mission-drawer") as any,
    map = dom.document.querySelector("#map-drawer") as any;
  assert.equal(mission.hidden, true);
  assert.equal(map.hidden, true);
  assert.match(mission.textContent, /Recoge una muestra vegetal/);
  assert.match(mission.textContent, /LABORATORIO/);
  assert.match(mission.textContent, /recoge la muestra/);
  assert.equal(scene.trackedStation, "greenhouse");
  dom.document.dispatchEvent(
    new dom.KeyboardEvent("keydown", { code: "KeyJ" }),
  );
  assert.equal(mission.hidden, false);
  assert.equal(scene.blocked, false);
  assert.equal(sim.paused, false);
  click("#close-mission");
  assert.equal(mission.hidden, true);
  click("#map-btn");
  assert.equal(map.hidden, false);
  assert.equal(sim.paused, false);
  dom.document.dispatchEvent(
    new dom.KeyboardEvent("keydown", { code: "Escape" }),
  );
  assert.equal(map.hidden, true);
  assert.equal(sim.paused, false);
  click("#pause-btn");
  assert.equal(sim.paused, true);
  click("#resume");
  assert.equal(mission.hidden, true);
  assert.equal(map.hidden, true);
});
test("selecting a mission tracks its actual equipment, and emergencies identify their room", () => {
  const { sim, scene, ui, click } = setup();
  click("#start");
  click("#mission-btn");
  click('[data-track="grow"]');
  assert.equal(scene.trackedStation, "greenhouse");
  sim.trigger("oxygen");
  ui.update();
  assert.equal(scene.trackedStation, "oxygen");
  const panel = dom.document.querySelector("#objectives")!;
  assert.match(panel.textContent!, /SOPORTE VITAL/);
  assert.match(panel.textContent!, /calibrador de oxígeno/);
  click('[data-track="collect-plant"]');
  assert.equal(scene.trackedStation, "greenhouse");
});
test("compact HUD keeps full reserves accessible, reveals radiation only when relevant and maps incidents", () => {
  const { sim, ui, root, click } = setup();
  click("#start");
  ui.update();
  assert.equal(root.querySelector(".exploration-hud > footer"), null);
  assert.equal(root.querySelector(".toolbar"), null);
  assert.match(
    root.querySelector("#current-mission-title")!.textContent!,
    /Recoge una muestra vegetal/,
  );
  assert.match(
    root.querySelector("#current-mission-destination")!.textContent!,
    /invernadero/,
  );
  const radiation = root.querySelector<HTMLElement>(
    '[data-resource="radiation"]',
  )!;
  assert.equal(radiation.hidden, true);
  click("#resources-btn");
  assert.equal(
    root.querySelector<HTMLElement>("#status-drawer")!.hidden,
    false,
  );
  assert.equal(root.querySelector("#detail-water")!.textContent, "78 / 100");
  click("#close-status");
  sim.trigger("solar");
  (ui as any).lastRender = 0;
  ui.update();
  assert.equal(radiation.hidden, false);
  assert.ok(root.querySelector("#map-emergencies circle"));
  click("#map-btn");
  assert.equal(root.querySelector<HTMLElement>("#map-drawer")!.hidden, false);
  click("#close-map");
});
test("instructions from the main menu return to the menu without starting the clock", () => {
  const { sim, root, click } = setup();
  click("#help");
  assert.match(root.textContent!, /Procedimientos de operación/);
  click("#ready");
  assert.equal(
    root.querySelector("#start")?.getAttribute("aria-label"),
    "Iniciar misión",
  );
  assert.equal(sim.paused, true);
});
test("illustrated menu supports science, gameplay, returning from pause and starting a fresh run", async () => {
  const { sim, ui, root, click } = setup();
  await new Promise((r) => setImmediate(r));
  click("#archive");
  assert.equal(sim.paused, true);
  assert.match(root.textContent!, /Archivo científico/);
  click(".close");
  assert.ok(root.querySelector(".menu-illustration"));
  assert.equal(root.querySelector("#start")!.textContent, "");
  click("#start");
  sim.tick(14);
  assert.equal(sim.paused, false);
  click("#pause-btn");
  click("#main-menu");
  assert.equal(sim.paused, true);
  assert.ok(root.querySelector(".menu-illustration"));
  click("#start");
  assert.notEqual(ui.sim, sim);
  assert.equal(ui.sim.time, 0);
  assert.equal(ui.sim.status, "playing");
  assert.equal(ui.sim.paused, false);
});
test("returning from the final report restores the illustration and permits a new mission", () => {
  const { sim, ui, root, click } = setup();
  click("#start");
  sim.resources.health = 0;
  sim.tick(1);
  ui.update();
  assert.match(root.textContent!, /Misión interrumpida/);
  click("#main-menu");
  assert.ok(root.querySelector(".menu-illustration"));
  click("#help");
  click("#ready");
  assert.ok(root.querySelector(".menu-illustration"));
  click("#start");
  assert.equal(ui.sim.status, "playing");
  assert.equal(ui.sim.time, 0);
  assert.equal(ui.sim.paused, false);
});
test("first practice pauses the colony, and Escape closes and releases controls", () => {
  const { sim, scene, click } = setup();
  click("#start");
  scene.onInteract(stations.find((s) => s.id === "oxygen"));
  assert.equal(sim.paused, false);
  click("#puzzle-launch");
  assert.ok(dom.document.querySelector("#val0"));
  assert.equal(sim.resources.energy, 76);
  assert.equal(sim.paused, true);
  sim.tick(5);
  dom.document.dispatchEvent(
    new dom.KeyboardEvent("keydown", { code: "Escape", key: "Escape" }),
  );
  assert.equal(scene.blocked, false);
  assert.equal(sim.paused, false);
  assert.equal(
    dom.document.querySelector("#modal-layer")!.hasAttribute("hidden"),
    true,
  );
});
test("oxygen valves repair the actual system once and spend parts only on success", async () => {
  const { sim, scene, root, click } = setup();
  click("#start"); sim.trigger("oxygen");
  scene.onInteract(stations.find((s) => s.id === "oxygen")); click("#puzzle-launch");
  assert.equal(root.querySelector('input[type="range"]'), null);
  operateMachine(root, "oxygen");
  await new Promise((r) => setTimeout(r, 720));
  assert.equal(sim.systems.oxygen, true); assert.equal(sim.spareParts, 9);
  assert.equal(sim.resources.energy, 71);
  assert.match(root.textContent!, /Mantenimiento completado/);
  click("#back"); assert.equal(scene.blocked, false);
  assert.equal(sim.paused, false);
});

test("wrong valve input can be corrected before automatic validation", async () => {
  const { sim, scene, root, click } = setup();
  click("#start"); sim.trigger("oxygen");
  scene.onInteract(stations.find((s) => s.id === "oxygen")); click("#puzzle-launch");
  click("#val0");
  assert.equal(sim.systems.oxygen, false); assert.equal(sim.spareParts, 10);
  operateMachine(root, "oxygen"); await new Promise((r) => setTimeout(r, 720));
  assert.equal(sim.systems.oxygen, true); assert.equal(sim.repairs, 1);
  click("#back");
});

test("minigame deadline fails once and destruction cancels callbacks", async () => {
  dom.document.body.innerHTML = '<div id="puzzle"></div>';
  let time = 0, result: boolean | undefined;
  const root = dom.document.querySelector("#puzzle")! as unknown as HTMLElement;
  const game = new Minigame(root, "oxygen", () => time, (won) => result = won, { settleMs: 0 });
  time = 76; await new Promise((r) => setTimeout(r, 140));
  assert.equal(result, false); game.destroy(); result = undefined;
  const second = new Minigame(root, "oxygen", () => time, (won) => result = won, { settleMs: 0 });
  second.destroy(); time = 200; await new Promise((r) => setTimeout(r, 140));
  assert.equal(result, undefined);
});

test("all seven machines can be solved through visible controls and resolve exactly once", async () => {
  for (const kind of ["oxygen", "water", "circuit", "laboratory", "signal", "greenhouse", "shelter"] as const) {
    dom.document.body.innerHTML = '<div id="puzzle"></div>';
    const root = dom.document.querySelector("#puzzle")! as unknown as HTMLElement;
    const results: boolean[] = [];
    const game = new Minigame(root, kind, () => 0, (won) => results.push(won), { settleMs: 0 });
    operateMachine(root, kind);
    if (kind === "signal") await new Promise((r) => setTimeout(r, 1150));
    assert.deepEqual(results, [true], kind);
    root.querySelectorAll<HTMLElement>("button").forEach((b) => b.click());
    assert.deepEqual(results, [true]); game.destroy();
  }
});

test("valves accept keyboard corrections and pointer dragging; scanner rejects calibration without a specimen", () => {
  dom.document.body.innerHTML = '<div id="puzzle"></div>';
  const root = dom.document.querySelector("#puzzle")! as unknown as HTMLElement;
  const results: boolean[] = [];
  const oxygen = new Minigame(root, "oxygen", () => 0, (won) => results.push(won), { settleMs: 0 });
  const valve = root.querySelector<HTMLElement>("#val0")!;
  valve.dispatchEvent(new dom.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }) as any);
  assert.equal(valve.getAttribute("aria-valuenow"), "15");
  valve.dispatchEvent(new dom.PointerEvent("pointerdown", { button: 0, pointerId: 1, clientX: 20, clientY: 50 }) as any);
  valve.dispatchEvent(new dom.PointerEvent("pointermove", { pointerId: 1, clientX: 65, clientY: 50 }) as any);
  valve.dispatchEvent(new dom.PointerEvent("pointerup", { pointerId: 1 }) as any);
  assert.equal(valve.getAttribute("aria-valuenow"), "40");
  assert.equal(results.length, 0); oxygen.destroy();
  const lab = new Minigame(root, "laboratory", () => 0, (won) => results.push(won), { settleMs: 0, sample: "soil" });
  for (const [i, turns] of [8, 2].entries())
    for (let n = 0; n < turns; n++) root.querySelector<HTMLElement>(`[data-ring="${i}"]`)!.click();
  assert.equal(results.length, 0);
  root.querySelector<HTMLElement>("#place-sample")!.click();
  assert.deepEqual(results, [true]); lab.destroy();
});

test("closing during a success animation cancels the result callback", async () => {
  dom.document.body.innerHTML = '<div id="puzzle"></div>';
  const root = dom.document.querySelector("#puzzle")! as unknown as HTMLElement;
  let calls = 0;
  const game = new Minigame(root, "shelter", () => 0, () => calls++, { settleMs: 80 });
  operateMachine(root, "shelter"); game.destroy();
  await new Promise((r) => setTimeout(r, 120)); assert.equal(calls, 0);
});

test("garden, refuge, water and antenna consoles apply real costs without duplicate rewards", async () => {
  const { sim, scene, root, click } = setup(); click("#start");
  const operate = async (id: string, kind: "greenhouse" | "shelter" | "water" | "signal") => {
    scene.onInteract(stations.find((s) => s.id === id)); click("#puzzle-launch"); operateMachine(root, kind);
    await new Promise((r) => setTimeout(r, kind === "signal" ? 1800 : 720));
    click("#back");
    assert.equal(scene.blocked, false); assert.equal(sim.paused, false);
  };
  const energy = sim.resources.energy, water = sim.resources.water;
  await operate("greenhouse", "greenhouse");
  assert.equal(sim.resources.energy, energy - 2); assert.equal(sim.resources.water, water - 2);
  assert.equal(sim.crop, -1); assert.ok(sim.expedition.greenhouseTended);
  sim.trigger("water"); const parts = sim.spareParts;
  await operate("water", "water"); assert.equal(sim.systems.water, true); assert.equal(sim.spareParts, parts - 1);
  await operate("shelter", "shelter"); assert.ok(sim.shielded);
  const shieldCost = sim.resources.energy;
  sim.action("shelter"); assert.equal(sim.resources.energy, shieldCost);
  sim.research = 3; const transmissionEnergy = sim.resources.energy;
  await operate("comms", "signal"); assert.equal(sim.resources.energy, transmissionEnergy - 8);
  assert.equal(sim.report, "pending"); sim.tick(29); assert.equal(sim.report, "received");
});

test("a resource change during a running repair fails atomically and exposes retry", async () => {
  const { sim, scene, root, click } = setup(); click("#start"); sim.trigger("oxygen");
  scene.onInteract(stations.find((s) => s.id === "oxygen")); click("#puzzle-launch");
  sim.spareParts = 0; const energy = sim.resources.energy;
  operateMachine(root, "oxygen"); await new Promise((r) => setTimeout(r, 720));
  assert.equal(sim.systems.oxygen, false); assert.equal(sim.resources.energy, energy);
  assert.match(root.textContent!, /necesitas 5 energía y 1 repuesto/);
  click("#retry-machine"); assert.ok(root.querySelector("#puzzle-launch"));
  click("#puzzle-launch"); assert.match(root.querySelector("#terminal-message")!.textContent!, /Necesitas/);
  click(".close"); assert.equal(scene.blocked, false);
});

test("scientific file pauses time and selects the historical scenario for this run", async () => {
  const { sim, root, click } = setup();
  await new Promise((r) => setImmediate(r));
  assert.ok(sim.solarRecord?.id);
  click("#start");
  click("#science-btn");
  assert.equal(sim.paused, true);
  assert.match(root.textContent!, /DosTel/);
  assert.match(root.textContent!, /μGy\/h/);
  assert.match(root.textContent!, /Registro de contexto de esta partida/);
  click(".close");
  assert.equal(sim.paused, false);
});
test("interactive research returns to exploration, stores results remotely and restarts cleanly", async () => {
  const { sim, scene, ui, root, click } = setup(); click("#start");
  scene.onInteract(stations.find((s) => s.id === "greenhouse")); click('[data-command="collect-plant"]');
  assert.equal(sim.expedition.collected.plant, true);
  const energy = sim.resources.energy;
  click(".close"); scene.onInteract(stations.find((s) => s.id === "research")); click("#puzzle-launch");
  operateMachine(root, "laboratory"); await new Promise((r) => setTimeout(r, 720));
  assert.equal(scene.blocked, false); assert.equal(sim.paused, false);
  assert.equal(sim.research, 0); assert.equal(sim.expedition.processing, "plant");
  assert.equal(sim.resources.energy, energy - 12);
  sim.tick(9); (ui as any).lastRender = -1000; ui.update();
  assert.equal(sim.research, 1); assert.equal(sim.expedition.processing, undefined);
  sim.resources.health = 0; sim.tick(1); ui.update();
  assert.match(root.textContent!, /Misión interrumpida/);
  click("#restart"); assert.equal(ui.sim.status, "playing"); assert.equal(ui.sim.research, 0);
  assert.equal(ui.sim.expedition.collected.plant, false);
});
