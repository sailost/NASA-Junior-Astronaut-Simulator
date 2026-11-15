import assert from "node:assert/strict";
import { rotateMask, waterSolution } from "../../src/game/minigames/puzzles";
import { scanTargets, type PuzzleKind } from "../../src/game/minigames/Minigame";
import type { SampleId } from "../../src/game/systems/Expedition";

/** Operate visible controls, without modifying private minigame state. */
export function operateMachine(root: ParentNode, kind: PuzzleKind, sample: SampleId = "plant") {
  const click = (selector: string) => {
    const button = root.querySelector<HTMLElement>(selector);
    assert.ok(button, selector); button.click();
  };
  if (kind === "oxygen") {
    for (const [i, target] of [40, 65, 55].entries()) {
      const button = root.querySelector(`#val${i}`)!;
      for (let j = 0; j < 25 && Number(button.getAttribute("aria-valuenow")) !== target; j++) click(`#val${i}`);
      assert.equal(Number(button.getAttribute("aria-valuenow")), target);
    }
  } else if (kind === "water") {
    for (let i = 0; i < 9; i++) {
      const button = root.querySelector(`[data-pipe="${i}"]`)!;
      for (let turn = 0; turn < 4; turn++) {
        const description = button.getAttribute("aria-description")!;
        const mask = ["arriba", "derecha", "abajo", "izquierda"].reduce((m, label, d) => m | (description.includes(label) ? 1 << d : 0), 0);
        if (mask === waterSolution[i]) break;
        assert.ok(rotateMask(mask, 1)); click(`[data-pipe="${i}"]`);
      }
    }
  } else if (kind === "circuit") {
    [2, 0, 1].forEach((right, left) => { click(`[data-left="${left}"]`); click(`[data-right="${right}"]`); });
  } else if (kind === "laboratory") {
    click("#place-sample");
    scanTargets[sample].forEach((target, i) => { for (let n = 0; n < target / 30; n++) click(`[data-ring="${i}"]`); });
  } else if (kind === "signal") {
    for (let i = 0; i < 21; i++) click('[data-tune="freq"][data-delta="2"]');
    for (let i = 0; i < 18; i++) click('[data-tune="phase"][data-delta="-2"]');
  } else if (kind === "greenhouse") {
    for (let i = 0; i < 2; i++) click('[data-grow="water"][data-delta="1"]');
    for (let i = 0; i < 2; i++) click('[data-grow="light"][data-delta="-1"]');
  } else { [0, 1, 2].forEach((i) => click(`[data-safety="${i}"]`)); }
}
