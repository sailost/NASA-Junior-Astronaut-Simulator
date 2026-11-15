import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadImage } from "@napi-rs/canvas";
import { Window } from "happy-dom";
import { Prologue, INTRO_ART, INTRO_START, fitIntro, paperPose } from "../src/game/ui/Prologue";
import { Interface } from "../src/game/ui/Interface";
import { Simulation } from "../src/game/systems/Simulation";
import { TUTORIAL_KEY } from "../src/game/tutorial/TutorialManager";
import { getObjectives } from "../src/game/systems/objectives";
let dom: Window;
const originalFetch = globalThis.fetch;
beforeEach(async () => {
  dom = new Window({ url: "http://localhost:5173/aurora/" });
  Object.assign(globalThis, { window: dom, document: dom.document, localStorage: dom.localStorage });
  dom.matchMedia = (() => ({ matches: true })) as any;
  const science = await readFile("public/data/science.json", "utf8");
  globalThis.fetch = (async () => new Response(science)) as typeof fetch;
});
afterEach(() => { globalThis.fetch = originalFetch; void dom.happyDOM.close(); });
const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
function click(root: HTMLElement, selector: string) { const button = root.querySelector<HTMLElement>(selector); assert.ok(button, selector); button.click(); }
async function loaded(root: HTMLElement) {
  for (const img of Array.from(root.querySelectorAll<HTMLImageElement>('.intro-preload img'))) img.dispatchEvent(new dom.Event('load') as any);
  await wait();
}
function reader() {
  document.body.innerHTML = '<div id="reader"></div>';
  const root = document.querySelector<HTMLElement>('#reader')!;
  root.getBoundingClientRect = () => ({ width: 1366, height: 768 }) as DOMRect;
  const starts: boolean[] = [], sounds: string[] = []; let menus = 0;
  const view = new Prologue(root, { start: (read) => starts.push(read), menu: () => menus++, turnSound: () => sounds.push('paper'), startSound: () => sounds.push('start') });
  return { root, view, starts, sounds, menus: () => menus };
}
test('all three original illustrations have the inspected dimensions and Pages-relative paths', async () => {
  for (const page of INTRO_ART.pages) {
    const img = await loadImage(`public/${INTRO_ART.directory}${page}`);
    assert.equal(img.width, INTRO_ART.width); assert.equal(img.height, INTRO_ART.height);
  }
  const { root, view } = reader();
  for (const img of Array.from(root.querySelectorAll<HTMLImageElement>('.intro-preload img'))) assert.match(img.src, /\/aurora\/assets\/world\/intro\/prologo-0[123]-/);
  assert.equal(root.querySelectorAll('.intro-preload img').length, 3); view.destroy();
});
test('preloading gates navigation, missing art remains skippable and exiting cancels callbacks', async () => {
  const { root, view, starts } = reader();
  assert.equal(root.querySelector<HTMLButtonElement>('#intro-next')!.disabled, true);
  root.querySelector('img.intro-preload, .intro-preload img')!.dispatchEvent(new dom.Event('error') as any);
  assert.equal(root.querySelector<HTMLElement>('.intro-error')!.hidden, false);
  click(root, '#intro-skip'); assert.deepEqual(starts, [false]);
  view.destroy(); await wait(); assert.equal(root.childElementCount, 0);
});
test('the first page enters after preload, locks navigation during its reveal and cleans up on exit', async () => {
  const { root, view, starts } = reader(); dom.matchMedia = (() => ({ matches: false })) as any;
  assert.equal(root.querySelector('.intro-entering'), null);
  await loaded(root);
  assert.ok(root.querySelector('.intro-reader')!.classList.contains('intro-entering'));
  assert.equal(root.querySelector<HTMLButtonElement>('#intro-next')!.disabled, true);
  view.turn(1); click(root, '#intro-skip'); assert.deepEqual(starts, []);
  await wait(1120);
  assert.equal(root.querySelector('.intro-entering'), null);
  assert.equal(root.querySelector<HTMLButtonElement>('#intro-next')!.disabled, false);
  assert.equal(root.querySelector('#intro-counter')!.textContent, '1 / 3');
  assert.equal(document.activeElement?.id, 'intro-next');
  view.destroy();
  const second = reader(); await loaded(second.root); second.view.destroy();
  await wait(920); assert.equal(second.root.childElementCount, 0); assert.deepEqual(second.starts, []);
});
test('forward, reverse and keyboard navigation wait for completion and the illustrated start launches once', async () => {
  const { root, view, starts, sounds } = reader(); await loaded(root);
  assert.equal(root.querySelector('#intro-counter')!.textContent, '1 / 3');
  document.dispatchEvent(new dom.KeyboardEvent('keydown', { code: 'ArrowRight' }) as any);
  view.turn(1); click(root, '#intro-start');
  assert.equal(root.querySelector('#intro-counter')!.textContent, '1 / 3'); assert.deepEqual(starts, []);
  await wait(135); assert.equal(root.querySelector('#intro-counter')!.textContent, '2 / 3');
  document.dispatchEvent(new dom.KeyboardEvent('keydown', { code: 'ArrowLeft' }) as any);
  await wait(135); assert.equal(root.querySelector('#intro-counter')!.textContent, '1 / 3');
  document.dispatchEvent(new dom.KeyboardEvent('keydown', { code: 'Enter' }) as any);
  await wait(135); document.dispatchEvent(new dom.KeyboardEvent('keydown', { code: 'Space' }) as any);
  await wait(135); assert.equal(root.querySelector('#intro-counter')!.textContent, '3 / 3');
  assert.equal(document.activeElement?.id, 'intro-start');
  const start = root.querySelector<HTMLButtonElement>('#intro-start')!;
  assert.equal(start.textContent, ''); assert.equal(start.getAttribute('aria-label'), 'Comenzar misión');
  click(root, '#intro-start'); click(root, '#intro-start');
  assert.deepEqual(starts, [true]); assert.equal(sounds.filter((s) => s === 'paper').length, 4);
  view.destroy();
});
test('curved paper consists of connected independent tangents, a blank reverse and an underlying page', async () => {
  for (const p of [0, .15, .4, .65, 1]) {
    const poses = paperPose(p);
    for (let i = 0; i < poses.length - 1; i++) {
      assert.ok(Math.abs(poses[i + 1].x - poses[i].x - Math.cos(poses[i].angle) / poses.length) < 1e-10);
      assert.ok(Math.abs(poses[i + 1].z - poses[i].z + Math.sin(poses[i].angle) / poses.length) < 1e-10);
    }
  }
  assert.notEqual(paperPose(.4)[0].angle, paperPose(.4).at(-1)!.angle, 'paper bends instead of rotating as a rigid card');
  const { root, view } = reader(); await loaded(root); dom.matchMedia = (() => ({ matches: false })) as any;
  const animations: { frames: Keyframe[]; options: KeyframeAnimationOptions }[] = [];
  (dom.HTMLElement.prototype as any).animate = function(frames: Keyframe[], options: KeyframeAnimationOptions) { animations.push({ frames, options }); return { cancel() {} }; };
  view.turn(1); assert.equal(root.querySelectorAll('.intro-strip').length, 28);
  assert.match(root.querySelector<HTMLImageElement>('.intro-picture')!.src, /prologo-02/);
  assert.equal(root.querySelector('.intro-paper-back')!.childElementCount, 0);
  assert.equal(animations[0].frames.length, 41); assert.equal(animations[0].options.duration, 800);
  assert.match(String(animations[0].frames[20].transform), /translate3d.*rotateY/);
  view.turn(1); assert.equal(root.querySelectorAll('.intro-strip').length, 28);
  window.dispatchEvent(new dom.Event('resize') as any);
  assert.equal(root.querySelectorAll('.intro-strip').length, 0); assert.equal(root.querySelector('#intro-counter')!.textContent, '2 / 3');
  animations.length = 0; view.turn(-1);
  assert.match(String(animations[0].frames[0].transform), /rotateY\(-3\.14159/);
  view.destroy(); await wait(820); assert.equal(root.childElementCount, 0);
});
test('full-screen and letterboxed hotspot calculations stay on the original illustrated button', () => {
  for (const [w, h] of [[1920,1080], [1366,768], [2560,1440], [900,1000]]) {
    const fit = fitIntro(w,h);
    assert.ok(Math.abs(fit.width / fit.height - 1672 / 941) < 1e-10);
    assert.ok(fit.left >= 0 && fit.top >= 0 && fit.top + fit.height <= h - 48);
    const scale = fit.width / 1672;
    assert.ok(Math.abs(INTRO_START.x * fit.width - 1094 * scale) < 1e-8);
    assert.ok(Math.abs(INTRO_START.y * fit.height - 800 * scale) < 1e-8);
    assert.ok(Math.abs(INTRO_START.width * fit.width - 536 * scale) < 1e-8);
  }
});
function game(seen = false) {
  if (seen) localStorage.setItem(TUTORIAL_KEY, 'done');
  document.body.innerHTML = '<div id="ui"></div>';
  const root = document.querySelector<HTMLElement>('#ui')!, sim = new Simulation(2); let resets = 0;
  const scene: any = { player: {x:765,y:350}, input: { keyboard: { enabled: true, resetKeys() {}, clearCaptures() {}, addCapture() {} } }, cameras: { main: { fadeIn() {}, worldView: { x:0,y:0,width:1540,height:1000 } } }, setTrackedStation() {}, reset(next: Simulation) { this.sim = next; resets++; } };
  const ui = new Interface(root, sim, scene, { muted:true, unlock() {}, tone() {} } as any);
  return { root, sim, scene, ui, resets: () => resets };
}
test('menu opens comic with paused resources and input, return and skip preserve the existing launch flow', () => {
  const { root, sim, scene, ui, resets } = game(true);
  click(root, '#start'); assert.equal(root.dataset.screen, 'prologue');
  assert.equal(sim.paused, true); assert.equal(scene.blocked, true); assert.equal(scene.input.keyboard.enabled, false);
  const before = JSON.stringify(sim); sim.tick(1000); assert.equal(JSON.stringify(sim), before); assert.equal(resets(), 0);
  document.dispatchEvent(new dom.KeyboardEvent('keydown', { code: 'Escape' }) as any);
  assert.equal(root.dataset.screen, 'menu'); assert.equal(root.querySelector('.intro-reader'), null);
  click(root, '#start'); assert.equal(root.dataset.screen, 'prologue');
  click(root, '#intro-skip'); assert.equal(root.dataset.screen, 'game'); assert.equal(ui.sim.paused, false); assert.equal(resets(), 0);
  assert.equal(scene.input.keyboard.enabled, true); assert.equal(ui.sim.research, 0);
  assert.match(getObjectives(ui.sim).find((o) => !o.done)!.title, /hoja/);
  click(root, '#pause-btn'); click(root, '#main-menu'); click(root, '#start');
  assert.equal(resets(), 0); click(root, '#intro-skip'); assert.equal(resets(), 1);
});
test('reading the third page starts once, keeps useful AURA guidance and skips only redundant narrative', async () => {
  const { root, sim, ui } = game(); click(root, '#start'); await loaded(root);
  click(root, '#intro-next'); await wait(135); click(root, '#intro-next'); await wait(135);
  click(root, '#intro-start'); assert.equal(root.dataset.screen, 'game'); assert.equal(ui.sim, sim);
  assert.equal(root.querySelector('.intro-reader'), null); assert.equal(root.querySelectorAll('#tutorial-overlay').length, 1);
  assert.match(root.querySelector('#tutorial-copy')!.textContent!, /Hola, soy AURA/);
  click(root, '#tutorial-next'); assert.match(root.querySelector('#tutorial-copy')!.textContent!, /La energía mantiene/);
  assert.doesNotMatch(root.querySelector('#tutorial-copy')!.textContent!, /Nuestro nuevo hogar|Tres soles, una misión/);
  click(root, '#tutorial-back'); assert.match(root.querySelector('#tutorial-copy')!.textContent!, /Hola, soy AURA/);
  click(root, '#aura-intro-ask'); assert.equal(root.querySelector<HTMLElement>('#aura-conversation')!.hidden, false);
  assert.equal(sim.paused, true); assert.equal(sim.expedition.collected.plant, false);
});
