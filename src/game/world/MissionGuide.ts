import type Phaser from "phaser";
import { stations, type Station } from "./map";
import { findRoute, type Point } from "./navigation";
export class MissionGuide {
  private graphics: Phaser.GameObjects.Graphics;
  private target?: Station;
  private route: Point[] = [];
  private lastPlan = 0;
  private lastPosition: Point = { x: -1000, y: -1000 };
  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(8);
  }
  setTarget(id?: string) {
    if (this.target?.id === id) return;
    this.target = stations.find((s) => s.id === id);
    this.route = [];
    this.lastPlan = -10000;
  }
  update(time: number, player: Point, visible: boolean) {
    this.graphics.clear();
    if (!visible || !this.target) return;
    const target = this.target,
      near = Math.hypot(target.x - player.x, target.y - player.y) < 115;
    if (
      !near &&
      time - this.lastPlan > 600 &&
      (this.route.length === 0 ||
        Math.hypot(
          player.x - this.lastPosition.x,
          player.y - this.lastPosition.y,
        ) > 35)
    ) {
      this.route = findRoute(player, target);
      this.lastPlan = time;
      this.lastPosition = { x: player.x, y: player.y };
    }
    if (!near) {
      this.graphics.fillStyle(0xd6b587, 0.42);
      let closest = 0;
      for (let i = 0; i < this.route.length; i++)
        if (
          Math.hypot(this.route[i].x - player.x, this.route[i].y - player.y) <
          Math.hypot(
            this.route[closest].x - player.x,
            this.route[closest].y - player.y,
          )
        )
          closest = i;
      for (
        let i = closest + 3;
        i < Math.min(this.route.length, closest + 23);
        i += 4
      ) {
        const p = this.route[i];
        this.graphics.fillCircle(p.x, p.y, 1.25);
      }
    }
    const y = target.y - 45,
      bob = Math.sin(time / 360) * 2;
    this.graphics.lineStyle(1, 0xe1b67b, 0.65);
    this.graphics.strokePoints(
      [
        { x: target.x, y: y - 15 + bob },
        { x: target.x + 7, y: y - 23 + bob },
        { x: target.x, y: y - 31 + bob },
        { x: target.x - 7, y: y - 23 + bob },
      ],
      true,
    );
    // The contextual DOM prompt supplies the verb; avoid a second floating label.
  }
}
