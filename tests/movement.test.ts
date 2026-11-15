import { test } from "node:test";
import assert from "node:assert/strict";
import { idleMotion, moveAstronaut } from "../src/game/entities/movement";

const clear = () => true;
test("motion accelerates, stops promptly and does not leave idle rotation", () => {
  const position = { x: 0, y: 0 },
    motion = idleMotion();
  moveAstronaut(position, motion, { x: 1, y: 0 }, 1 / 60, 155, clear);
  assert.ok(motion.vx > 0 && motion.vx < 155);
  for (let i = 0; i < 60; i++)
    moveAstronaut(position, motion, { x: 1, y: 0 }, 1 / 60, 155, clear);
  const start = position.x,
    facing = motion.facing;
  for (let i = 0; i < 30; i++)
    moveAstronaut(position, motion, { x: 0, y: 0 }, 1 / 60, 155, clear);
  assert.ok(
    position.x - start < 5,
    "braking travels less than five world pixels",
  );
  assert.equal(motion.vx, 0);
  assert.equal(motion.vy, 0);
  assert.equal(motion.facing, facing);
  const stopped = position.x,
    stride = motion.stride;
  moveAstronaut(position, motion, { x: 0, y: 0 }, 0.1, 155, clear);
  assert.equal(position.x, stopped);
  assert.equal(motion.stride, stride);
});
test("walking speed and turning are consistent at 30 and 120 frames per second", () => {
  const slow = { x: 0, y: 0 },
    fast = { x: 0, y: 0 },
    a = idleMotion(),
    b = idleMotion();
  for (let i = 0; i < 36; i++)
    moveAstronaut(slow, a, { x: 1, y: 0 }, 1 / 30, 155, clear);
  for (let i = 0; i < 144; i++)
    moveAstronaut(fast, b, { x: 1, y: 0 }, 1 / 120, 155, clear);
  assert.ok(Math.abs(slow.x - fast.x) < 0.01);
  assert.ok(Math.abs(a.facing - b.facing) < 0.001);
});
test("diagonal movement has the same speed as axial movement", () => {
  const straight = { x: 0, y: 0 },
    diagonal = { x: 0, y: 0 },
    a = idleMotion(),
    b = idleMotion();
  for (let i = 0; i < 60; i++) {
    moveAstronaut(straight, a, { x: 1, y: 0 }, 1 / 60, 155, clear);
    moveAstronaut(diagonal, b, { x: 1, y: 1 }, 1 / 60, 155, clear);
  }
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - straight.x) < 0.01);
});
test("collision stops translation and the walk cycle instead of walking in place", () => {
  const position = { x: 0, y: 0 },
    motion = idleMotion();
  for (let i = 0; i < 30; i++)
    moveAstronaut(position, motion, { x: 1, y: 0 }, 1 / 30, 155, (x) => x < 20);
  assert.ok(position.x < 20);
  const stride = motion.stride;
  const moved = moveAstronaut(
    position,
    motion,
    { x: 1, y: 0 },
    0.1,
    155,
    () => false,
  );
  assert.equal(moved.distance, 0);
  assert.equal(motion.stride, stride);
});
test("facing takes the short path across the angle boundary", () => {
  const position = { x: 0, y: 0 },
    motion = { ...idleMotion(), facing: Math.PI - 0.02 };
  moveAstronaut(position, motion, { x: -0.01, y: 1 }, 1 / 60, 155, clear);
  assert.ok(Math.abs(motion.facing - (Math.PI - 0.02)) < 0.1);
});
