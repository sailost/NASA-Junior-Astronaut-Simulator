import { canWalk, type Station } from "./map";
import { findRoute, type Point } from "./navigation";

/** A small, collision-aware pursuer. Replans at most once per second. */
export class NightPursuit implements Point {
  x: number;
  y: number;
  private route: Point[] = [];
  private replanIn = 0;
  private plannedFor?: Point;

  constructor(station: Pick<Station, "x" | "y">) {
    let spawn: Point | undefined;
    for (let radius = 50; radius <= 140 && !spawn; radius += 10) {
      for (const [dx, dy] of [[1, 1], [-1, 1], [0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const candidate = { x: station.x + dx * radius, y: station.y + dy * radius };
        if (canWalk(candidate.x, candidate.y)) { spawn = candidate; break; }
      }
    }
    this.x = spawn?.x ?? station.x;
    this.y = spawn?.y ?? station.y;
  }

  update(dt: number, player: Point, speed: number) {
    if (dt <= 0) return;
    this.replanIn -= dt;
    if (this.replanIn <= 0) {
      if (!this.route.length || !this.plannedFor || Math.hypot(player.x - this.plannedFor.x, player.y - this.plannedFor.y) > 25) {
        this.route = findRoute(this, player, 12);
        this.plannedFor = { x: player.x, y: player.y };
      }
      this.replanIn = .9;
    }
    let travel = speed * dt;
    while (travel > 0 && this.route.length) {
      const target = this.route[0];
      const distance = Math.hypot(target.x - this.x, target.y - this.y);
      if (distance < .01) { this.route.shift(); continue; }
      const step = Math.min(distance, travel, 4);
      const x = this.x + (target.x - this.x) / distance * step;
      const y = this.y + (target.y - this.y) / distance * step;
      if (!canWalk(x, y)) { this.route = []; break; }
      this.x = x; this.y = y; travel -= step;
    }
  }

  touches(player: Point) {
    const distance = Math.hypot(player.x - this.x, player.y - this.y);
    if (distance > 30) return false;
    // Nearby characters on opposite sides of a wall cannot hit each other.
    const steps = Math.max(1, Math.ceil(distance / 4));
    for (let i = 1; i <= steps; i++)
      if (!canWalk(this.x + (player.x - this.x) * i / steps, this.y + (player.y - this.y) * i / steps)) return false;
    return true;
  }
}
