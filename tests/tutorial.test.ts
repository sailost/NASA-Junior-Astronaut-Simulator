import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import { Simulation } from "../src/game/systems/Simulation";
import { Interface } from "../src/game/ui/Interface";
import { TutorialManager, TUTORIAL_KEY, tutorialTarget } from "../src/game/tutorial/TutorialManager";
import { tutorialSteps } from "../src/game/tutorial/steps";
import { tutorialPanelPosition } from "../src/game/tutorial/TutorialView";
import { AuraCoach } from "../src/game/ui/AuraCoach";
import { getObjectives, recommendObjective } from "../src/game/systems/objectives";
import { stations } from "../src/game/world/map";
import { operateMachine } from "./support/operateMachine";
import balance from "../src/game/config/balance.json";
let dom: Window;
const nativeFetch = globalThis.fetch;
beforeEach(async () => {
  dom = new Window({ url: "http://localhost:5173/" });
  Object.assign(globalThis, { window: dom, document: dom.document, localStorage: dom.localStorage });
  dom.matchMedia = (() => ({ matches: true })) as any;
  const science = await readFile("public/data/science.json", "utf8");
  globalThis.fetch = (async () => new Response(science)) as typeof fetch;
});
afterEach(() => { globalThis.fetch = nativeFetch; void dom.happyDOM.close(); });
function rect(x: number, y: number, width: number, height: number) { return { x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, toJSON() {} } as DOMRect; }
function setup(seen = false) {
  if (seen) localStorage.setItem(TUTORIAL_KEY, "done");
  const sim = new Simulation(2);
  const scene: any = {
    sim, player: { x: 765, y: 350 }, blocked: true, tutorialMovement: false,
    input: { keyboard: { enabled: true, resetKeys() {}, clearCaptures() {}, addCapture() {} } },
    cameras: { main: { fadeIn() {}, worldView: { x: 0, y: 0, width: 1540, height: 1000 } } },
    setTrackedStation(id: string) { this.trackedStation = id; },
    celebrateStation() {},
    reset(next: Simulation) { this.sim = next; this.player = { x: 765, y: 350 }; },
  };
  const audio: any = { tone() {}, unlock() {}, muted: true, toggle() {} };
  dom.document.body.innerHTML = '<div id="interface"></div>';
  const root = dom.document.querySelector("#interface")! as unknown as HTMLElement;
  root.getBoundingClientRect = () => rect(0, 0, 1366, 768);
  const ui = new Interface(root, sim, scene, audio, { campaign: false });
  root.querySelectorAll<HTMLElement>("[data-resource]").forEach((node, i) => node.getBoundingClientRect = () => rect(400 + i * 60, 25, 50, 25));
  root.querySelector<HTMLElement>('[data-detail-resource="radiation"]')!.getBoundingClientRect = () => rect(1040, 370, 270, 38);
  // These regression cases exercise the existing tutorial after explicitly skipping the comic.
  const click = (selector: string) => { const node = root.querySelector<HTMLElement>(selector); assert.ok(node, selector); node.click(); if (selector === "#start") root.querySelector<HTMLElement>("#intro-skip")?.click(); };
  const refresh = () => { (ui as any).lastRender = -1000; ui.update(); };
  const toMovement = () => {
    for (let i = 0; i < 20 && !(root.querySelector("#tutorial-next") as HTMLButtonElement).disabled; i++) click("#tutorial-next");
    assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Tu turno: camina/);
  };
  return { sim, scene, root, ui, click, refresh, toMovement };
}

test("first launch welcomes the player, focuses each real HUD resource, and consumes nothing while reading", () => {
  const { sim, root, scene, click } = setup(); click("#start");
  assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Bienvenido a Base Aurora/);
  assert.equal(sim.paused, true); assert.equal(scene.blocked, true);
  const state = JSON.stringify(sim); sim.tick(1000); assert.equal(JSON.stringify(sim), state);
  for (let i = 0; i < 3; i++) click("#tutorial-next");
  for (const resource of ["energy", "oxygen", "water", "food", "health", "radiation"]) {
    const step = root.querySelector("#tutorial-copy")!.textContent!;
    assert.match(step, /AURA/);
    const focus = root.querySelector<HTMLElement>("#tutorial-focus")!;
    assert.equal(focus.hidden, false);
    const anchor = root.querySelector<HTMLElement>(resource === "radiation" ? '[data-detail-resource="radiation"]' : `[data-resource="${resource}"]`)!;
    assert.equal(Number.parseFloat(focus.style.left), anchor.getBoundingClientRect().left - 6);
    assert.equal(root.querySelectorAll(`[data-resource="${resource}"]`).length, 1);
    if (resource === "energy") assert.ok(root.querySelector('[data-map-room="engine"]')!.classList.contains("tutorial-map-focus"));
    if (resource === "radiation") assert.equal(root.querySelector<HTMLElement>("#status-drawer")!.hidden, false);
    click("#tutorial-next");
  }
  assert.equal(scene.tutorialMovement, true); assert.equal(scene.blocked, false);
  assert.equal(sim.time, 0); assert.equal(sim.events.length, 0);
});

test("previous, keyboard navigation and skip work; skip persists and later launches run normally", () => {
  const { sim, root, click } = setup(); click("#start");
  document.dispatchEvent(new dom.KeyboardEvent("keydown", { code: "Enter" }) as any);
  assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Nuestro nuevo hogar/);
  click("#tutorial-back"); assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Hola, soy AURA/);
  click("#tutorial-skip"); assert.equal(sim.paused, false);
  assert.equal(localStorage.getItem(TUTORIAL_KEY), "skipped");
  click("#pause-btn"); click("#main-menu"); click("#start");
  assert.equal(root.querySelector<HTMLElement>("#tutorial-overlay")!.hidden, true);
});

test("welcome teaches the real AURA conversation with an energy question and protected reserves", () => {
  const { sim, root, click, refresh } = setup(); click("#start");
  assert.match(root.querySelector("#tutorial-copy")!.textContent!, /asistente de IA personal/);
  assert.equal(root.querySelector<HTMLElement>("#aura-companion")!.hidden, false);
  click("#aura-intro-ask");
  assert.equal(root.querySelector<HTMLElement>("#tutorial-overlay")!.hidden, true);
  assert.equal(root.querySelector<HTMLElement>("#aura-conversation")!.hidden, false);
  click('[data-aura-reply="resource:energy"]'); refresh();
  assert.match(root.querySelector("#aura-dialogue-title")!.textContent!, /Energía/);
  assert.match(root.querySelector("#aura-dialogue-text")!.textContent!, /máquinas|instalaciones/);
  assert.ok(root.querySelector('[data-resource="energy"]')!.classList.contains("aura-resource-focus"));
  const before = JSON.stringify(sim); sim.tick(100); assert.equal(JSON.stringify(sim), before);
  document.dispatchEvent(new dom.KeyboardEvent("keydown", { code: "Escape" }) as any); refresh();
  assert.equal(root.querySelector<HTMLElement>("#tutorial-overlay")!.hidden, false);
  assert.equal(sim.paused, true);
  assert.equal(root.querySelector('[data-resource="energy"]')!.classList.contains("aura-resource-focus"), false);
});

test("returning players discover AURA at mission start and choose a real resource question", () => {
  const { sim, root, click, refresh } = setup(true); click("#start"); refresh();
  assert.equal(root.querySelector<HTMLElement>("#aura-discovery")!.hidden, false);
  assert.match(root.querySelector("#aura-discovery")!.textContent!, /Hola, soy AURA/);
  assert.match(root.querySelector("#aura-discovery")!.textContent!, /asistente de IA personal/);
  assert.equal(root.querySelectorAll('#aura-discovery [data-aura-intro-resource]').length, 6);
  assert.ok(root.querySelector('#aura-companion')!.classList.contains('aura-welcoming'));
  click("#aura-discovery-ask");
  assert.equal(root.querySelector<HTMLElement>("#aura-discovery")!.hidden, true);
  click('[data-aura-reply="resource:oxygen"]');
  assert.match(root.querySelector("#aura-dialogue-title")!.textContent!, /Oxígeno/);
  assert.equal(sim.paused, false);
  click("#aura-close"); refresh();
  assert.equal(root.querySelector<HTMLElement>("#aura-discovery")!.hidden, true);
  click("#pause-btn"); click("#restart"); refresh();
  assert.equal(root.querySelector<HTMLElement>("#aura-discovery")!.hidden, false);
  click("#aura-discovery-dismiss"); refresh();
  assert.equal(root.querySelector<HTMLElement>("#aura-discovery")!.hidden, true);
  assert.equal(root.querySelector('#aura-companion')!.classList.contains('aura-welcoming'), false);
  click("#aura-call"); refresh();
  assert.equal(root.querySelector<HTMLElement>("#aura-conversation")!.hidden, false);
});

test("centered welcome explains every resource and its buttons use the existing live conversation", () => {
  const { root, click, refresh, sim } = setup(); click("#start");
  assert.ok(root.querySelector('#tutorial-overlay')!.classList.contains('aura-welcome-tutorial'));
  const text = root.querySelector('#tutorial-copy')!.textContent!;
  for (const name of ["Energía", "Oxígeno", "Agua", "Comida", "Salud", "Exposición"]) assert.ok(text.includes(name));
  assert.match(text, /baterías/); assert.match(text, /cultivos/); assert.match(text, /refugio/);
  for (const id of ["energy", "oxygen", "water", "food", "health", "radiation"]) {
    click(`#tutorial-copy [data-aura-intro-resource="${id}"]`); refresh();
    assert.equal(root.querySelector<HTMLElement>('#aura-conversation')!.hidden, false);
    assert.equal(root.querySelector<HTMLElement>('#tutorial-overlay')!.hidden, true);
    const before = JSON.stringify(sim); sim.tick(100); assert.equal(JSON.stringify(sim), before);
    click('#aura-close'); refresh();
    assert.equal(root.querySelector<HTMLElement>('#tutorial-overlay')!.hidden, false);
  }
  click('#tutorial-skip'); refresh();
  assert.equal(root.querySelector<HTMLElement>('#aura-discovery')!.hidden, true, 'the full tutorial welcome must not repeat');
  assert.equal(sim.paused, false);
});

test("returning-player welcome offers direct resource questions and stays dismissed after closing AURA", () => {
  const { root, click, refresh } = setup(true); click('#start'); refresh();
  click('#aura-discovery [data-aura-intro-resource="water"]'); refresh();
  assert.match(root.querySelector('#aura-dialogue-title')!.textContent!, /Agua/);
  assert.equal(root.querySelector('#aura-companion')!.classList.contains('aura-welcoming'), false);
  click('#aura-close'); refresh();
  assert.equal(root.querySelector<HTMLElement>('#aura-discovery')!.hidden, true);
  document.dispatchEvent(new dom.KeyboardEvent('keydown', { code: 'KeyC' }) as any); refresh();
  assert.equal(root.querySelector<HTMLElement>('#aura-conversation')!.hidden, false);
});

test("initial tutorial is centered at both target resolutions while later panels keep their original placement", () => {
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    const panel = tutorialPanelPosition(width, height, undefined, 100, 620, true);
    assert.equal(panel.x + panel.width / 2, width / 2);
    assert.equal(panel.y + 620 / 2, height / 2);
    const normal = tutorialPanelPosition(width, height, undefined, 100, 245);
    assert.equal(normal.x, width - normal.width - 22);
  }
});

test("movement requires distance, interaction uses the actual mission equipment, and decision costs are real", async () => {
  const { sim, scene, root, click, refresh, toMovement } = setup(); click("#start"); toMovement();
  click("#tutorial-next"); refresh(); assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Tu turno/);
  document.dispatchEvent(new dom.KeyboardEvent("keydown", { code: "KeyW" }) as any); refresh();
  assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Tu turno/);
  for (let i = 0; i < 5; i++) { scene.player.x += 16; refresh(); }
  assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Perfecto/);
  assert.equal(scene.trackedStation, tutorialTarget(sim)!.id);
  const wrong = stations.find((s) => s.kind === "control")!;
  scene.onInteract(wrong); click(".close");
  assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Perfecto/);
  const target = tutorialTarget(sim)!;
  scene.player = { x: target.x, y: target.y + 80 }; refresh();
  assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Equipo al alcance/);
  scene.onInteract(target);
  click('[data-command="collect-plant"]'); click(".close");
  assert.match(root.querySelector("#tutorial-copy")!.textContent!, /primera decisión/);
  assert.equal(sim.expedition.collected.plant, true); assert.equal(sim.resources.energy, balance.initial.energy);
  const lab = stations.find((s) => s.kind === "research")!;
  scene.player = { x: lab.x, y: lab.y + 80 }; scene.onInteract(lab); click("#puzzle-launch");
  const before = { ...sim.resources }; sim.tick(1000); assert.deepEqual(sim.resources, before);
  operateMachine(root, "laboratory"); await new Promise((resolve) => setTimeout(resolve, 720));
  assert.equal(sim.resources.energy, before.energy - balance.costs.researchEnergy);
  assert.equal(sim.resources.water, before.water - balance.costs.researchWater);
  assert.equal(sim.expedition.remaining, 8); assert.equal(sim.research, 0);
  assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Todo listo/);
  assert.equal(sim.paused, true);
  click("#tutorial-back");
  assert.equal((root.querySelector("#tutorial-next") as HTMLButtonElement).disabled, false);
  click("#tutorial-next");
  assert.equal(sim.resources.energy, before.energy - balance.costs.researchEnergy);
  click("#tutorial-next"); assert.equal(localStorage.getItem(TUTORIAL_KEY), "done");
  assert.equal(scene.blocked, false); assert.equal(scene.tutorialMovement, false); assert.equal(sim.paused, false);
  sim.tick(9); assert.equal(sim.research, 1);
});

test("replay from help freezes ongoing work without resetting results or changing the camera", () => {
  const { sim, root, ui, scene, click, refresh } = setup(true); click("#start");
  sim.collectSample("plant"); sim.loadSample(); sim.startAnalysis(); sim.tick(2);
  const remaining = sim.expedition.remaining, resources = { ...sim.resources }, view = { ...scene.cameras.main.worldView };
  click("#controls-btn"); click("#repeat-tutorial");
  assert.equal(root.querySelector<HTMLElement>("#tutorial-overlay")!.hidden, false);
  assert.equal(sim.paused, true); sim.tick(100); refresh();
  assert.equal(sim.expedition.remaining, remaining); assert.deepEqual(sim.resources, resources);
  assert.deepEqual(scene.cameras.main.worldView, view);
  click("#pause-btn"); assert.equal(root.querySelector<HTMLElement>("#tutorial-overlay")!.hidden, true);
  click("#resume"); assert.equal(sim.paused, true);
  click("#tutorial-skip"); assert.equal(sim.paused, false); sim.tick(7); assert.equal(sim.research, 1);
});

test("resource help supports hover, click, keyboard, current values and exposure from the real status drawer", () => {
  const { sim, root, click, refresh } = setup(true); click("#start");
  const energy = root.querySelector<HTMLElement>('[data-resource="energy"]')!;
  energy.dispatchEvent(new dom.MouseEvent("mouseenter") as any);
  assert.equal(root.querySelector<HTMLElement>("#resource-help")!.hidden, false);
  assert.match(root.querySelector("#resource-help-copy")!.textContent!, /76%/);
  energy.dispatchEvent(new dom.MouseEvent("mouseleave") as any);
  assert.equal(root.querySelector<HTMLElement>("#resource-help")!.hidden, true);
  energy.click(); sim.resources.energy = 24; refresh();
  assert.match(root.querySelector("#resource-help-copy")!.textContent!, /24%/);
  assert.match(root.querySelector("#resource-help-copy")!.textContent!, /paneles/i);
  document.dispatchEvent(new dom.KeyboardEvent("keydown", { code: "Escape" }) as any);
  assert.equal(sim.paused, false); assert.equal(root.querySelector<HTMLElement>("#resource-help")!.hidden, true);
  click("#resources-btn");
  const radiation = root.querySelector<HTMLElement>('[data-detail-resource="radiation"]')!;
  radiation.dispatchEvent(new dom.KeyboardEvent("keydown", { key: "Enter" }) as any);
  assert.match(root.querySelector("#resource-help-copy")!.textContent!, /No es una dosis/);
  assert.equal(root.querySelector('[data-resource="radiation"]')!.hasAttribute("hidden"), true);
  click("#close-resource-help");
});

test("returning from pause or help restores the actual drawer being explained", () => {
  const { sim, root, click } = setup(); click("#start");
  for (let i = 0; i < 8; i++) click("#tutorial-next");
  assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Protección y exposición/);
  click("#pause-btn"); click("#resume");
  assert.equal(root.querySelector<HTMLElement>("#status-drawer")!.hidden, false);
  click("#controls-btn"); click("#ready");
  assert.equal(root.querySelector<HTMLElement>("#status-drawer")!.hidden, false);
  assert.equal(root.querySelector<HTMLElement>("#tutorial-focus")!.hidden, false);
  assert.equal(sim.paused, true);
});

test("AURA defers milestone help during minigames and shows it once when exploration resumes", () => {
  const { sim, scene, root, click, refresh } = setup(true); click("#start");
  scene.onInteract(stations.find((s) => s.kind === "oxygen")); click("#puzzle-launch");
  sim.time = 120; refresh(); assert.equal(root.querySelector<HTMLElement>("#aura-message")!.hidden, true);
  click(".close"); refresh(); assert.match(root.querySelector("#aura-text")!.textContent!, /baterías/);
});

test("manager tolerates disabled storage, ignores fake progress and derives targets from emergency objectives", () => {
  const manager = new TutorialManager({ getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } });
  assert.equal(manager.shouldStart, true); manager.start();
  while (manager.canNext) manager.next();
  assert.equal(manager.step.kind, "movement"); assert.equal(manager.next(), false);
  manager.observe({ x: 0, y: 0 }); manager.observe({ x: 1000, y: 0 });
  assert.equal(manager.step.kind, "movement");
  for (let i = 1; i <= 5; i++) manager.observe({ x: 1000 + i * 16, y: 0 });
  const s = new Simulation(1); s.trigger("water"); const target = tutorialTarget(s)!;
  assert.equal(target.id, "water");
  assert.equal(manager.interact(target.id, s, { x: 0, y: 0 }), false);
  assert.equal(manager.interact(target.id, s, target), true);
  assert.equal(manager.decision("collect-plant", true), false);
  assert.equal(manager.decision("water", false), false);
  assert.equal(manager.decision("water", true), true);
  manager.next(); assert.equal(manager.active, false);
  assert.equal(manager.shouldStart, false);
});

test("context milestones are delivered once, solar attribution remains historical, and resolved goals are discarded", () => {
  const sim = new Simulation(2), coach = new AuraCoach();
  const goal = () => recommendObjective(getObjectives(sim));
  sim.time = 120; assert.equal(coach.update(sim, goal())?.id, "first-night");
  sim.time = 128; assert.notEqual(coach.update(sim, goal())?.id, "first-night");
  sim.time = 300; assert.notEqual(coach.update(sim, goal())?.id, "first-night");
  sim.trigger("oxygen"); assert.equal(coach.update(sim, goal())?.id, "first-emergency");
  sim.repair("oxygen"); assert.notEqual(coach.update(sim, goal())?.id, "first-emergency");
  sim.solarRecord = { id: "historic-test", date: "2024-05-10", type: "FLR", url: "https://ccmc.gsfc.nasa.gov/DONKI/" };
  sim.trigger("solar"); const solar = coach.update(sim, goal())!;
  assert.match(solar.text, /histórico NASA DONKI/); assert.match(solar.text, /no demuestra una amenaza/);
  sim.action("shelter"); assert.notEqual(coach.update(sim, goal())?.id, "first-solar");
});

test("tutorial panels stay inside target resolutions and leave their real highlighted element uncovered", () => {
  assert.equal(tutorialSteps.filter((s) => s.resource).length, 6);
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    for (const target of [rect(width / 2, 20, 60, 30), rect(width - 300, 370, 270, 38)]) {
      const panel = tutorialPanelPosition(width, height, target);
      assert.ok(panel.x >= 16 && panel.x + panel.width <= width - 16);
      assert.ok(panel.y >= 16 && panel.y + 245 <= height - 16);
      assert.ok(panel.y > target.bottom || panel.y + 245 < target.top);
    }
  }
});

test("context help discards finished processing and proximity hints, and re-arms resource warnings after recovery", () => {
  const sim = new Simulation(2), coach = new AuraCoach();
  const goal = () => recommendObjective(getObjectives(sim));
  sim.time = 10;
  assert.match(coach.update(sim, goal(), "greenhouse")!.id, /^near-/);
  assert.doesNotMatch(coach.update(sim, goal(), undefined)!.text, /Estás junto/);
  coach.reset(); sim.collectSample("plant"); sim.loadSample(); sim.startAnalysis();
  assert.equal(coach.update(sim, goal())?.id, "first-analysis");
  sim.time += 8;
  assert.match(coach.update(sim, goal())!.id, /^processing-/);
  sim.tick(9);
  assert.doesNotMatch(coach.update(sim, goal())!.text, /sigue procesando/);
  sim.resources.energy = 5;
  assert.equal(coach.update(sim, goal())?.id, "critical-energy");
  sim.time += 8; assert.equal(coach.update(sim, goal()), undefined);
  sim.resources.energy = 50; coach.update(sim, goal());
  sim.resources.energy = 5; assert.equal(coach.update(sim, goal())?.id, "critical-energy");
});

test("finished tutorial adds no repeated DOM measurements to normal exploration updates", () => {
  const { root, click, refresh } = setup(true); click("#start");
  let measurements = 0;
  root.getBoundingClientRect = () => { measurements++; return rect(0, 0, 1366, 768); };
  for (let i = 0; i < 20; i++) refresh();
  assert.equal(measurements, 0);
});
