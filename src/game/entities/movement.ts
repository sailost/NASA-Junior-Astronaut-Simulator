export interface Motion {
  vx: number;
  vy: number;
  facing: number;
  stride: number;
}
export const idleMotion = (): Motion => ({
  vx: 0,
  vy: 0,
  facing: 0,
  stride: 0,
});

/** Local fixed substeps keep steering and collision response stable across frame rates. */
export function moveAstronaut(
  position: { x: number; y: number },
  motion: Motion,
  input: { x: number; y: number },
  dt: number,
  speed: number,
  canWalk: (x: number, y: number) => boolean,
) {
  const magnitude = Math.hypot(input.x, input.y);
  const tx = magnitude ? (input.x / magnitude) * speed : 0,
    ty = magnitude ? (input.y / magnitude) * speed : 0;
  let remaining = Math.max(0, Math.min(dt, 0.1)),
    distance = 0;
  const startX = position.x,
    startY = position.y;
  while (remaining > 0.000001) {
    const step = Math.min(1 / 120, remaining),
      blend = 1 - Math.exp(-(magnitude ? 22 : 34) * step);
    motion.vx += (tx - motion.vx) * blend;
    motion.vy += (ty - motion.vy) * blend;
    if (Math.abs(motion.vx) < 0.1) motion.vx = 0;
    if (Math.abs(motion.vy) < 0.1) motion.vy = 0;
    const dx = motion.vx * step,
      dy = motion.vy * step;
    const px = position.x,
      py = position.y;
    if (canWalk(px + dx, py)) position.x += dx;
    else motion.vx = 0;
    if (canWalk(position.x, py + dy)) position.y += dy;
    else motion.vy = 0;
    distance += Math.hypot(position.x - px, position.y - py);
    remaining -= step;
  }
  if (distance > 0.02 && magnitude) {
    const target = Math.atan2(input.x, -input.y);
    const difference = Math.atan2(
      Math.sin(target - motion.facing),
      Math.cos(target - motion.facing),
    );
    motion.facing += difference * (1 - Math.exp(-18 * dt));
  }
  motion.stride += (distance / 36) * Math.PI * 2;
  return { distance, dx: position.x - startX, dy: position.y - startY };
}
