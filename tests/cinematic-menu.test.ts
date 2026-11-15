import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Window } from "happy-dom";
import {
  CinematicMenu,
  MENU_ART,
  MENU_HOTSPOTS,
  fitMenuArt,
  menuHotspotRect,
} from "../src/game/ui/CinematicMenu";
let dom: Window | undefined, view: CinematicMenu | undefined;
afterEach(async () => {
  view?.destroy();
  await dom?.happyDOM.close();
});
function createMenu(width = 1920, height = 1080) {
  dom = new Window({ url: "http://localhost/base-aurora/" });
  Object.assign(globalThis, { window: dom, document: dom.document });
  dom.document.body.innerHTML = '<section id="menu"></section>';
  const root = dom.document.querySelector("#menu")! as unknown as HTMLElement;
  let bounds = { width, height };
  root.getBoundingClientRect = (() => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: bounds.width,
    bottom: bounds.height,
    ...bounds,
  })) as any;
  const calls = { start: 0, help: 0, archive: 0 };
  view = new CinematicMenu(root, {
    start: () => calls.start++,
    help: () => calls.help++,
    archive: () => calls.archive++,
  });
  return {
    root,
    calls,
    resize(w: number, h: number) {
      bounds = { width: w, height: h };
      dom!.window.dispatchEvent(new dom!.Event("resize"));
    },
  };
}
test("the menu uses an exact copy of the original PNG and the expected intrinsic dimensions", async () => {
  const image = await readFile("public/assets/aurora-menu.png");
  assert.equal(image.readUInt32BE(16), MENU_ART.width);
  assert.equal(image.readUInt32BE(20), MENU_ART.height);
  assert.equal(
    createHash("sha256").update(image).digest("hex"),
    "32b9c35461f71cb565e07410a43523bc1cea1d85199ab7bdc21758643792a349",
  );
});
test("three transparent semantic buttons visibly confirm the click before invoking their original actions", async () => {
  const { root, calls } = createMenu();
  assert.equal(root.querySelectorAll("button").length, 3);
  assert.equal(
    root.querySelectorAll("h1,h2,svg,.mission-plate,.menu-copy").length,
    0,
  );
  for (const zone of MENU_HOTSPOTS) {
    const button = root.querySelector<HTMLButtonElement>(`#${zone.id}`)!;
    assert.equal(button.textContent, "");
    assert.equal(button.getAttribute("aria-label"), zone.label);
    button.click();
    button.click();
    assert.equal(calls[zone.id], 0);
    assert.ok(button.classList.contains("menu-pressed"));
    assert.equal(root.querySelectorAll("button:disabled").length, 3);
    await new Promise((resolve) => setTimeout(resolve, 270));
    assert.equal(calls[zone.id], 1);
    assert.equal(button.classList.contains("menu-pressed"), false);
  }
  const image = root.querySelector("img")!;
  assert.ok(image.src.endsWith("/base-aurora/assets/aurora-menu.png"));
});
test("leaving the menu cancels a pending click action", async () => {
  const { root, calls } = createMenu();
  root.querySelector<HTMLButtonElement>("#help")!.click();
  view!.destroy();
  await new Promise((resolve) => setTimeout(resolve, 270));
  assert.equal(calls.help, 0);
});
test("image and hotspot transforms remain aligned at 1920x1080, 1366x768 and on resize", () => {
  const { root, resize } = createMenu();
  for (const [width, height] of [
    [1920, 1080],
    [1366, 768],
    [900, 900],
  ]) {
    resize(width, height);
    const fit = fitMenuArt(width, height),
      stage = root.querySelector<HTMLElement>(".menu-stage")!;
    assert.ok(Math.abs(parseFloat(stage.style.width) - fit.width) < 0.001);
    assert.ok(Math.abs(parseFloat(stage.style.height) - fit.height) < 0.001);
    assert.ok(Math.abs(fit.width / fit.height - 1672 / 941) < 1e-10);
    assert.ok(fit.left >= 0 && fit.top >= 0);
    assert.ok(
      fit.left + fit.width <= width + 0.001 &&
        fit.top + fit.height <= height + 0.001,
    );
    for (const zone of MENU_HOTSPOTS) {
      const button = root.querySelector<HTMLElement>(`#${zone.id}`)!,
        rect = menuHotspotRect(zone.id, width, height);
      assert.ok(
        Math.abs(
          fit.left +
            (parseFloat(button.style.left) / 100) * fit.width -
            rect.left,
        ) < 0.001,
      );
      assert.ok(
        Math.abs(
          fit.top +
            (parseFloat(button.style.top) / 100) * fit.height -
            rect.top,
        ) < 0.001,
      );
      assert.ok(
        Math.abs(
          (parseFloat(button.style.width) / 100) * fit.width - rect.width,
        ) < 0.001,
      );
      assert.ok(
        rect.left >= fit.left &&
          rect.top >= fit.top &&
          rect.left + rect.width <= fit.left + fit.width,
      );
    }
  }
});
test("transition keeps buttons locked until the cinematic fade finishes and honors reduced motion", async () => {
  const { root, calls } = createMenu();
  let completed = 0;
  view!.transitionOut(() => completed++);
  assert.equal(completed, 0);
  assert.ok(root.classList.contains("menu-launching"));
  root.querySelector<HTMLButtonElement>("#start")!.click();
  assert.equal(calls.start, 0);
  await new Promise((r) => setTimeout(r, 610));
  assert.equal(completed, 1);
  view!.destroy();
  dom!.window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
  })) as any;
  view = new CinematicMenu(root, { start() {}, help() {}, archive() {} });
  view.transitionOut(() => completed++);
  assert.equal(completed, 2);
});
test("destroy cancels a pending launch and a missing image reports a useful error", async () => {
  const { root } = createMenu();
  root.querySelector("img")!.dispatchEvent(new dom!.Event("error") as unknown as Event);
  assert.equal(
    root.querySelector<HTMLElement>(".menu-art-error")!.hidden,
    false,
  );
  let completed = false;
  view!.transitionOut(() => (completed = true));
  view!.destroy();
  await new Promise((r) => setTimeout(r, 610));
  assert.equal(completed, false);
});
