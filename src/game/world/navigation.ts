import { canWalk, type Station } from "./map";
export interface Point {
  x: number;
  y: number;
}
const grid = 10,
  width = 155,
  height = 101;
export function findRoute(
  start: Point,
  station: Pick<Station, "x" | "y">,
  arrivalRadius = 85,
): Point[] {
  const snap = (p: Point) => {
    const cx = Math.round(p.x / grid),
      cy = Math.round(p.y / grid);
    for (let radius = 0; radius < 4; radius++)
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          const x = cx + dx,
            y = cy + dy;
          if (
            x >= 0 &&
            x < width &&
            y >= 0 &&
            y < height &&
            canWalk(x * grid, y * grid)
          )
            return y * width + x;
        }
    return -1;
  };
  const from = snap(start);
  let to = -1;
  if (from < 0) return [];
  const parent = new Int32Array(width * height).fill(-1),
    queue = [from];
  parent[from] = from;
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i],
      x = current % width,
      y = Math.floor(current / width);
    // Stop on any reachable interaction side. A machine can block the aisle
    // itself, so prescribing its south side may lead to an unreachable goal.
    if (Math.hypot(x * grid - station.x, y * grid - station.y) <= arrivalRadius) {
      to = current;
      break;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        id = ny * width + nx;
      if (
        nx < 0 ||
        nx >= width ||
        ny < 0 ||
        ny >= height ||
        parent[id] !== -1 ||
        !canWalk(nx * grid, ny * grid)
      )
        continue;
      parent[id] = current;
      queue.push(id);
    }
  }
  if (to < 0) return [];
  const points: Point[] = [];
  for (let id = to; ; id = parent[id]) {
    points.push({ x: (id % width) * grid, y: Math.floor(id / width) * grid });
    if (id === from) break;
  }
  return points.reverse();
}
