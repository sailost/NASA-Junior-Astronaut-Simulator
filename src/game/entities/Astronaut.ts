import type Phaser from "phaser";
import type { Motion } from "./movement";
export interface Astronaut {
  root: Phaser.GameObjects.Container;
  rig: Phaser.GameObjects.Container;
  feet: Phaser.GameObjects.Container[];
  arms: Phaser.GameObjects.Container[];
  shadow: Phaser.GameObjects.Ellipse;
  gait: number;
  clock: number;
  interaction: number;
}

export function makeAstronaut(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
): Astronaut {
  const penumbra = scene.add.ellipse(2, 6, 42, 31, 0x07131c, 0.08);
  const shadow = scene.add.ellipse(2, 5, 30, 24, 0x081016, 0.25);
  const pack = scene.add.graphics();
  pack.fillStyle(0x223746);
  pack.fillRoundedRect(-13, 4, 26, 20, 5);
  pack.fillStyle(0x596b73);
  pack.fillRoundedRect(-11, 5, 22, 17, 4);
  pack.fillStyle(0x8c9b9c);
  pack.fillRoundedRect(-8, 7, 16, 11, 2);
  pack.lineStyle(1, 0x182d3d);
  pack.strokeRoundedRect(-11, 5, 22, 17, 4);
  pack.fillStyle(0xd39a60);
  pack.fillRect(-5, 9, 10, 2);
  pack.fillStyle(0xafd3d2);
  pack.fillCircle(7, 18, 1);
  const suit = scene.add.graphics();
  // An overhead EVA suit: the helmet sits between the shoulders, rather than
  // above a standing body. Its forward edge defines the travel direction.
  suit.fillStyle(0x1b232a);
  suit.fillRoundedRect(-12, -7, 24, 26, 5);
  suit.fillStyle(0x68747b);
  suit.fillRoundedRect(-11, 3, 22, 18, 4);
  suit.fillStyle(0x303c44);
  suit.fillRect(-7, 12, 14, 5);
  suit.fillStyle(color);
  suit.fillRoundedRect(-12, -10, 24, 24, 7);
  suit.fillStyle(0x9da6a8);
  suit.fillRoundedRect(-12, 6, 24, 6, 2);
  suit.lineStyle(1, 0x404d55);
  suit.strokeRoundedRect(-12, -10, 24, 24, 7);
  suit.lineStyle(1, 0xf2f0e0, 0.4);
  suit.lineBetween(-8, -7, 8, -7);
  const limb = (side: number, foot: boolean) => {
    const g = scene.add.graphics();
    g.fillStyle(foot ? 0x939c9f : color);
    g.fillRoundedRect(-4, -7, 8, foot ? 15 : 17, 3);
    g.fillStyle(foot ? 0x26323a : 0x6d787d);
    g.fillRoundedRect(-4, foot ? 3 : 5, 8, foot ? 6 : 5, 2);
    g.lineStyle(1, 0x46545b, 0.8);
    g.lineBetween(-3, -1, 3, -1);
    if (!foot) {
      g.fillStyle(0xc48a53);
      g.fillRoundedRect(-4, -3, 8, 3, 1);
      g.fillStyle(0xb8c0b9);
      g.fillRect(-2, -5, 4, 1);
    }
    return scene.add.container(side * (foot ? 6 : 15), foot ? 12 : 1, [g]);
  };
  const feet = [limb(-1, true), limb(1, true)],
    arms = [limb(-1, false), limb(1, false)];
  const helmet = scene.add.graphics();
  helmet.fillStyle(0x59676e);
  helmet.fillEllipse(0, -5, 25, 24);
  helmet.fillStyle(0xd5d6ce);
  helmet.fillEllipse(0, -7, 22, 23);
  helmet.fillStyle(0x1a2c36);
  helmet.fillRoundedRect(-9, -17, 18, 12, 5);
  helmet.lineStyle(1, 0xc39b66, 0.75);
  helmet.strokeRoundedRect(-9, -17, 18, 12, 5);
  helmet.fillStyle(0x607e88, 0.6);
  helmet.fillRoundedRect(-6, -15, 10, 3, 1);
  helmet.lineStyle(1, 0x9ca7a7, 0.9);
  helmet.strokeEllipse(0, -7, 22, 23);
  helmet.fillStyle(0xb7b5a5);
  helmet.fillRect(-13, -9, 3, 7);
  helmet.fillRect(10, -9, 3, 7);
  const details = scene.add.graphics();
  details.fillStyle(0xa46d4d);
  details.fillRect(5, 7, 5, 2);
  details.fillStyle(0xdddcd2);
  details.fillRect(-7, 6, 6, 2);
  const rig = scene.add.container(0, 0, [
    ...feet,
    pack,
    ...arms,
    suit,
    helmet,
    details,
  ]);
  return {
    root: scene.add.container(x, y, [penumbra, shadow, rig]),
    rig,
    feet,
    arms,
    shadow,
    gait: 0,
    clock: 0,
    interaction: 0,
  };
}

export function animateAstronaut(
  actor: Astronaut,
  motion: Motion,
  distance: number,
  dt: number,
) {
  const moving = distance > 0.05;
  actor.clock += dt;
  actor.interaction = Math.max(0, actor.interaction - dt);
  actor.gait += ((moving ? 1 : 0) - actor.gait) * (1 - Math.exp(-24 * dt));
  const cycle = Math.sin(motion.stride) * actor.gait;
  actor.rig.rotation = motion.facing;
  actor.rig.y = moving ? 0 : Math.sin(actor.clock * 1.7) * 0.28;
  actor.feet[0].y = 12 + cycle * 2.6;
  actor.feet[1].y = 12 - cycle * 2.6;
  actor.arms[0].y = 1 - cycle * 1.8;
  const reach =
    actor.interaction > 0 ? Math.sin((actor.interaction / 0.5) * Math.PI) : 0;
  actor.arms[1].y = 1 + cycle * 1.8 - reach * 5;
  // Shadow and world-space position stay steady; only limbs articulate.
  actor.arms[0].rotation = -cycle * 0.06;
  actor.arms[1].rotation = -cycle * 0.06 - reach * 0.22;
}
export function interactAstronaut(actor: Astronaut) {
  actor.interaction = 0.5;
}
