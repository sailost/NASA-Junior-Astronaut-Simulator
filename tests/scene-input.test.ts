import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { Window } from "happy-dom";
import { Interface } from "../src/game/ui/Interface";
import { Simulation } from "../src/game/systems/Simulation";

test("scene boot enables real Phaser keyboard events, movement, interaction and pause", async () => {
  const dom = new Window({ url: "http://localhost:5173/" });
  Object.assign(globalThis, {
    window: dom,
    document: dom.document,
    localStorage: dom.localStorage,
  });
  dom.window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
  })) as any;
  const require = createRequire(import.meta.url);
  // Use the installed Phaser Scene, keyboard manager, keys and math. Only the
  // rendering factories are replaced; this is a nonvisual integration test.
  const Scene = require("phaser/src/scene/Scene.js");
  const KeyboardManager = require("phaser/src/input/keyboard/KeyboardManager.js");
  const Key = require("phaser/src/input/keyboard/keys/Key.js");
  const EventEmitter = require("eventemitter3");
  const keyboardModule = {
    Scene,
    Math: {
      Angle: { RotateTo: require("phaser/src/math/angle/RotateTo.js") },
      Linear: require("phaser/src/math/Linear.js"),
    },
    Input: {
      Keyboard: {
        JustDown: require("phaser/src/input/keyboard/keys/JustDown.js"),
      },
    },
  };
  const filename = path.resolve("src/game/scenes/BaseScene.ts");
  const localRequire = createRequire(pathToFileURL(filename));
  const module = { exports: {} as Record<string, any> };
  vm.runInNewContext(
    transformSync(await readFile(filename, "utf8"), {
      loader: "ts",
      format: "cjs",
      target: "es2022",
    }).code,
    {
      module,
      exports: module.exports,
      require: (id: string) =>
        id === "phaser" ? keyboardModule : localRequire(id),
    },
  );
  dom.document.body.innerHTML =
    '<canvas id="canvas"></canvas><div id="interface"></div>';
  const audio = { muted: true, tone() {}, unlock() {}, toggle() {} };
  const sim = new Simulation(2);
  let interfaceInstance!: Interface;
  const scene = new module.exports.BaseScene(sim, audio, (ready: any) => {
    interfaceInstance = new Interface(
      dom.document.querySelector("#interface")! as unknown as HTMLElement,
      sim,
      ready,
      audio as any,
      { campaign: false },
    );
  });
  assert.equal(
    scene.events,
    undefined,
    "Phaser has not injected scene.events before boot",
  );
  const events = new EventEmitter();
  const manager = new KeyboardManager({
    events,
    game: { events: new EventEmitter() },
  });
  manager.target = dom.window;
  const byCode = new Map<number, any>();
  const keyboard = {
    enabled: true,
    addKeys(names: string) {
      return Object.fromEntries(
        names.split(",").map((name) => {
          const code: Record<string, number> = {
            W: 87,
            A: 65,
            S: 83,
            D: 68,
            UP: 38,
            DOWN: 40,
            LEFT: 37,
            RIGHT: 39,
            E: 69,
          };
          const key = new Key(keyboard, code[name]);
          byCode.set(code[name], key);
          return [name, key];
        }),
      );
    },
    addCapture: (keys: string[]) => manager.addCapture(keys),
    clearCaptures: () => manager.clearCaptures(),
    resetKeys: () => byCode.forEach((key) => key.reset()),
  };
  events.on("process", () => {
    for (const event of manager.queue.splice(0))
      if (keyboard.enabled) {
        const key = byCode.get(event.keyCode);
        if (key) event.type === "keydown" ? key.onDown(event) : key.onUp(event);
      }
  });
  // Phaser uses managerprocess for its input queue processing event.
  events.on(require("phaser/src/input/events/MANAGER_PROCESS_EVENT.js"), () =>
    events.emit("process"),
  );
  const node = (x = 0, y = 0): any => ({
    x,
    y,
    alpha: 0,
    rotation: 0,
    setDepth() {
      return this;
    },
    setAlpha(a: number) {
      this.alpha = a;
      return this;
    },
    setPosition(a: number, b: number) {
      this.x = a;
      this.y = b;
      return this;
    },
  });
  scene.drawTerrain = () => {};
  scene.drawBase = () => {};
  scene.createAstronaut = (x: number, y: number) => node(x, y);
  scene.legs = [node(), node()];
  scene.add = {
    circle: (x: number, y: number) => node(x, y),
    rectangle: () => node(),
  };
  let viewport: number[] = [];
  scene.scale = { width: 1280, height: 720, on() {}, off() {} };
  scene.cameras = {
    main: {
      setBackgroundColor() {},
      setBounds() {},
      setZoom() {},
      startFollow() {},
      fadeIn() {},
      setViewport(...values: number[]) {
        viewport = values;
      },
    },
  };
  scene.input = { keyboard };
  scene.game = { canvas: dom.document.querySelector("canvas") };
  manager.startListeners();
  try {
    scene.create();
    assert.deepEqual(
      viewport,
      [0, 0, 1280, 720],
      "exploration camera uses the entire game area without reserved UI rails",
    );
    assert.ok(
      dom.document.querySelector("#start"),
      "HUD/menu are created after scene keys exist",
    );
    (dom.document.querySelector("#start") as any).click();
    (dom.document.querySelector("#intro-skip") as any).click();
    assert.equal(sim.paused, true);
    assert.equal(scene.blocked, true);
    const send = (type: string, code: string, keyCode: number) =>
      dom.document.activeElement!.dispatchEvent(
        new dom.KeyboardEvent(type, {
          code,
          keyCode,
          bubbles: true,
          cancelable: true,
        }),
      );
    for (let i = 0; i < 9; i++) (dom.document.querySelector("#tutorial-next") as any).click();
    assert.equal(scene.tutorialMovement, true);
    assert.equal(scene.blocked, false);
    const protectedResources = { ...sim.resources }, protectedX = scene.player.x;
    send("keydown", "KeyD", 68);
    for (let frame = 0; frame < 8; frame++) {
      (interfaceInstance as any).lastRender = -1000;
      scene.update(frame * 100, 100);
    }
    send("keyup", "KeyD", 68);
    assert.ok(scene.player.x - protectedX >= 64);
    assert.equal(sim.time, 0);
    assert.deepEqual(sim.resources, protectedResources);
    assert.match(dom.document.querySelector("#tutorial-copy")!.textContent!, /Perfecto/);
    (dom.document.querySelector("#tutorial-skip") as any).click();
    assert.equal(scene.blocked, false);
    assert.equal(sim.paused, false);
    // Start the normal-movement assertion away from the communications equipment
    // reached during the protected walk, so collision remains part of the test.
    scene.player.setPosition(765, 350);
    const initialX = scene.player.x;
    send("keydown", "KeyD", 68);
    scene.update(1000, 100);
    send("keyup", "KeyD", 68);
    assert.ok(
      scene.player.x > initialX,
      "WASD input moves the actual scene player",
    );
    assert.ok(sim.time > 0);
    scene.player.setPosition(765, 325);
    scene.update(1100, 16);
    send("keydown", "KeyE", 69);
    scene.update(1200, 16);
    send("keyup", "KeyE", 69);
    assert.ok(
      dom.document.querySelector("[data-allocation]"),
      "E reaches Phaser and opens the nearby control terminal",
    );
    dom.document.dispatchEvent(
      new dom.KeyboardEvent("keydown", {
        code: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    assert.equal(scene.blocked, false);
    dom.document.dispatchEvent(
      new dom.KeyboardEvent("keydown", {
        code: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    assert.equal(sim.paused, true);
    const x = scene.player.x;
    send("keydown", "KeyD", 68);
    scene.update(1300, 100);
    assert.equal(scene.player.x, x);
    (dom.document.querySelector("#resume") as any).click();
    send("keydown", "ArrowDown", 40);
    const y = scene.player.y;
    scene.update(1400, 100);
    send("keyup", "ArrowDown", 40);
    assert.ok(scene.player.y > y);
  } finally {
    manager.stopListeners();
    await dom.happyDOM.close();
  }
});
