import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import { Simulation } from "../src/game/systems/Simulation";
import { auraDialogue, auraStateMood, type AuraContext } from "../src/game/ui/AuraDialogue";
import { AuraCompanion } from "../src/game/ui/AuraCompanion";
import { auraHologram } from "../src/game/ui/AuraHologram";
import { Interface } from "../src/game/ui/Interface";
import { TUTORIAL_KEY } from "../src/game/tutorial/TutorialManager";
import type { ScienceData } from "../src/game/data/Science";
let dom: Window, science: ScienceData;
const originalFetch = globalThis.fetch;
beforeEach(async () => {
  dom = new Window({ url: "http://localhost:5173/base-aurora/" });
  Object.assign(globalThis, { window: dom, document: dom.document, localStorage: dom.localStorage });
  dom.matchMedia = (() => ({ matches: true })) as any;
  science = JSON.parse(await readFile("public/data/science.json", "utf8"));
  globalThis.fetch = (async () => new Response(JSON.stringify(science))) as typeof fetch;
});
afterEach(() => { globalThis.fetch = originalFetch; void dom.happyDOM.close(); });
function context(): AuraContext { return { sim: new Simulation(2), player: { x: 765, y: 350 }, science }; }
function companion() {
  const data = context(), routes: (string | undefined)[] = [];
  dom.document.body.innerHTML = '<div id="ui"></div>';
  const root = dom.document.querySelector("#ui")! as unknown as HTMLElement;
  const view = new AuraCompanion(root, () => data, () => true, (id) => routes.push(id));
  const click = (id: string) => { const node = root.querySelector<HTMLElement>(`[data-aura-reply="${id}"]`); assert.ok(node, id); node.click(); };
  view.update(true); return { data, view, root, routes, click };
}
test("every offline dialogue branch is traversable, sourced when scientific, and leaves simulation untouched", () => {
  const data = context(), before = JSON.stringify(data.sim), queue = ["home"], visited = new Set<string>();
  while (queue.length) {
    const topic = queue.shift()!; if (visited.has(topic)) continue;
    visited.add(topic); const node = auraDialogue(topic, data);
    assert.ok(node.title && node.text); assert.ok(node.choices.length > 0 && node.choices.length <= 4);
    assert.equal(new Set(node.choices.map((c) => c.id)).size, node.choices.length);
    for (const option of node.choices) if (option.next) queue.push(option.next);
    for (const reference of node.references || []) assert.ok(reference.url.startsWith("https://"));
  }
  for (const topic of ["resource:energy", "resource:radiation", "science-plants", "science-food", "science-comms", "science-solar", "science-radiation", "science-map"]) assert.ok(visited.has(topic), topic);
  assert.equal(JSON.stringify(data.sim), before);
  assert.match(auraDialogue("science-plants", data).references![0].url, /OSD-37/);
  assert.match(auraDialogue("science-food", data).references![0].url, /asc-csa/);
  assert.match(auraDialogue("science-radiation", data).text, /ISS/);
});
test("dialogue follows real inventory, analysis, report and emergencies, including proximity to the destination", () => {
  const data = context(); assert.match(auraDialogue("mission", data).text, /muestra vegetal/);
  assert.equal(auraDialogue("route", data).stationId, "greenhouse");
  data.sim.collectSample("plant"); assert.equal(auraDialogue("route", data).stationId, "research");
  data.sim.loadSample(); data.sim.startAnalysis();
  assert.equal(auraDialogue("route", data).stationId, "power");
  data.sim.trigger("oxygen"); const node = auraDialogue("route", data);
  assert.equal(node.stationId, "oxygen"); assert.match(auraDialogue("consequences", data).text, /oxígeno/);
  data.player = { x: 190, y: 310 }; assert.match(auraDialogue("route", data).text, /Ya estás al alcance/);
  data.sim.repair("oxygen"); assert.notEqual(auraDialogue("route", data).stationId, "oxygen");
  data.sim.report = "pending"; data.sim.reportDue = 28; data.sim.expedition.processing = undefined;
  assert.match(auraDialogue("consequences", data).text, /no hace falta reenviarlo/);
});
test("RPG replies, live values, keyboard shortcuts and guide selections work without freezing the colony", () => {
  const { data, view, root, routes, click } = companion(); const before = JSON.stringify(data.sim);
  view.toggle(); assert.equal(view.isOpen, true); click("resources"); click("resource:energy");
  assert.match(root.querySelector("#aura-dialogue-title")!.textContent!, /76%/);
  data.sim.tick(1); view.update(true); assert.equal(data.sim.paused, false);
  data.sim.resources.energy = 31; view.update(true);
  assert.match(root.querySelector("#aura-dialogue-title")!.textContent!, /31%/);
  click("mission"); click("route");
  // A newly arrived emergency supersedes the destination displayed before it.
  data.sim.trigger("water"); click("guide"); assert.deepEqual(routes, ["water"]);
  assert.equal(view.isOpen, false);
  const snapshot = JSON.stringify(data.sim);
  view.key(new dom.KeyboardEvent("keydown", { code: "KeyC" }) as any);
  view.key(new dom.KeyboardEvent("keydown", { code: "Digit4" }) as any);
  assert.match(root.querySelector("#aura-dialogue-title")!.textContent!, /Ciencia/);
  view.key(new dom.KeyboardEvent("keydown", { code: "Escape" }) as any);
  assert.equal(view.isOpen, false); assert.equal(JSON.stringify(data.sim), snapshot);
  assert.notEqual(JSON.stringify(data.sim), before); // Only the explicit tick and fixture changes above.
});
test("portrait exposes all six functional states and emergency has priority over celebration", () => {
  const { data, view, root } = companion();
  view.update(true); assert.equal(root.querySelector("#aura-companion")!.getAttribute("data-mood"), "idle");
  view.update(true, { id: "hello", text: "Hola" }); assert.equal(root.querySelector("#aura-companion")!.getAttribute("data-mood"), "talking");
  view.celebrate(); view.update(true); assert.equal(root.querySelector("#aura-companion")!.getAttribute("data-mood"), "happy");
  data.sim.trigger("water"); view.update(true); assert.equal(root.querySelector("#aura-companion")!.getAttribute("data-mood"), "alert");
  data.sim.resources.health = 20; view.update(true); assert.equal(root.querySelector("#aura-companion")!.getAttribute("data-mood"), "emergency");
  view.reset(); data.sim = new Simulation(1); data.sim.collectSample("plant"); data.sim.loadSample(); data.sim.startAnalysis();
  assert.equal(auraStateMood(data.sim), "thinking"); view.update(true);
  assert.equal(root.querySelector("#aura-companion")!.getAttribute("data-mood"), "thinking");
  for (const mood of ["idle", "talking", "thinking", "happy", "alert", "emergency"] as const) {
    assert.match(auraHologram(mood), new RegExp(`data-mood="${mood}"`));
    assert.doesNotMatch(auraHologram(mood), /<image|<script|NASA|CSA|https?:/);
  }
});
test("scientific links are live controls with safe URLs; absent data never blocks play", () => {
  const { data, view, root, click } = companion(); view.toggle(); click("science"); click("science-food");
  const link = root.querySelector<HTMLAnchorElement>("#aura-dialogue-sources a")!;
  assert.match(link.href, /asc-csa/); assert.equal(link.target, "_blank"); assert.match(link.rel, /noopener/);
  assert.match(auraDialogue("science-solar", data).text, /no demuestra por sí solo una amenaza/);
  data.science = undefined; view.update(true); assert.match(root.querySelector("#aura-dialogue-text")!.textContent!, /aún no está disponible/);
  data.science = { ...science, cards: [{ ...science.cards[0], url: "javascript:alert(1)//food-production" }] };
  view.update(true); assert.equal(root.querySelector("#aura-dialogue-sources a"), null);
});
test("first-party narrative offers two real learning paths; exploration still requires walking and preserves mission state", () => {
  const sim = new Simulation(2), scene: any = {
    player: { x: 765, y: 350 }, blocked: true,
    input: { keyboard: { enabled: true, resetKeys() {}, addCapture() {}, clearCaptures() {} } },
    cameras: { main: { fadeIn() {} } }, setTrackedStation() {},
  };
  dom.document.body.innerHTML = '<div id="ui"></div>';
  const root = dom.document.querySelector("#ui")! as unknown as HTMLElement;
  const ui = new Interface(root, sim, scene, { muted: true, unlock() {}, tone() {} } as any, { campaign: false });
  root.querySelector<HTMLElement>("#start")!.click();
  root.querySelector<HTMLElement>("#intro-skip")!.click();
  assert.equal(root.querySelector<HTMLElement>("#aura-intro-replies")!.hidden, false);
  root.querySelector<HTMLElement>("#aura-intro-explore")!.click();
  assert.match(root.querySelector("#tutorial-copy")!.textContent!, /Tu turno: camina/);
  assert.equal((root.querySelector("#tutorial-next") as HTMLButtonElement).disabled, true);
  assert.equal(sim.paused, true); assert.equal(sim.research, 0); assert.equal(sim.expedition.collected.plant, false);
  root.querySelector<HTMLElement>("#tutorial-skip")!.click();
  (ui as any).lastRender = -1000; ui.update();
  root.querySelector<HTMLElement>("#aura-call")!.click();
  assert.equal(scene.blocked, false); assert.equal(sim.paused, false);
  root.querySelector<HTMLElement>("#pause-btn")!.click();
  assert.equal(root.querySelector<HTMLElement>("#aura-companion")!.hidden, true);
  assert.equal(sim.paused, true);
  assert.equal(localStorage.getItem(TUTORIAL_KEY), "skipped");
});
