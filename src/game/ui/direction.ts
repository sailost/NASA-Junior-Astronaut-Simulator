export function objectiveDirection(
  target: { x: number; y: number },
  view: { x: number; y: number; width: number; height: number },
) {
  const x = (target.x - view.x) / view.width, y = (target.y - view.y) / view.height;
  // Keep pointing at visible equipment too, until its mission is completed.
  if (x > .05 && x < .95 && y > .07 && y < .93)
    return { x: Math.max(6, Math.min(94, x * 100)), y: Math.max(11, Math.min(89, (y - 60 / view.height) * 100)), angle: 90 };
  const dx = x - .5, dy = y - .5;
  const factor = Math.min(.44 / Math.max(.0001, Math.abs(dx)), .39 / Math.max(.0001, Math.abs(dy)));
  return { x: 50 + dx * factor * 100, y: 50 + dy * factor * 100, angle: Math.atan2(dy, dx) * 180 / Math.PI };
}
