import type Phaser from "phaser";
import type { Simulation } from "../systems/Simulation";
import { rooms, stations, type Station } from "./map";
import { roomPalette } from "./materials";
import { roomVisualState, stationVisualState } from "./visualState";
import { hasInteriorAssets, prepareDoorFrame, interiorDoorFrame, interiorKey } from "./InteriorAssets";
export class WorldEffects {
  private roomLights: {
    id: string;
    light: Phaser.GameObjects.Image;
    shade: Phaser.GameObjects.Rectangle;
    strips: Phaser.GameObjects.Rectangle[];
  }[] = [];
  private machines: {
    station: Station;
    light: Phaser.GameObjects.Image;
    screen: Phaser.GameObjects.Rectangle;
    rotor?: Phaser.GameObjects.Container;
    levels?: Phaser.GameObjects.Rectangle[];
    samples?: Phaser.GameObjects.Arc[];
  }[] = [];
  private doors: {
    x: number;
    y: number;
    leaves: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image)[];
    axis: number;
    light: Phaser.GameObjects.Rectangle;
  }[] = [];
  private motes: Phaser.GameObjects.Arc[] = [];
  private daylight: Phaser.GameObjects.Graphics[] = [];
  private holo?: Phaser.GameObjects.Graphics;
  private detailed = false;
  constructor(private scene: Phaser.Scene) {
    this.detailed = hasInteriorAssets(scene);
    if (this.detailed) prepareDoorFrame(scene);
    for (const r of rooms) {
      const light = scene.add
        .image(r.x + r.w / 2, r.y + r.h / 2, "aurora-soft-light")
        .setDisplaySize(r.w * 1.04, r.h * 1.2)
        .setTint(roomPalette[r.id].glow)
        .setAlpha(0.28)
        .setDepth(2);
      const shade = scene.add
        .rectangle(r.x + 14, r.y + 23, r.w - 28, r.h - 36, 0x142c40, 0)
        .setOrigin(0)
        .setDepth(11);
      const strips = [r.x + 18, r.x + r.w - 19].map((x) =>
        scene.add
          .rectangle(x, r.y + 152, 2, 72, roomPalette[r.id].glow, 0.55)
          .setDepth(3),
      );
      this.roomLights.push({ id: r.id, light, shade, strips });
      const daylight = scene.add.graphics().setDepth(-6),
        left = r.id === "life" || r.id === "engine";
      if (r.id === "control" || r.id === "lab") {
        const edge = r.id === "control" ? r.y + 25 : r.y + r.h - 12,
          sign = r.id === "control" ? 1 : -1;
        for (let i = 0; i < 4; i++) {
          daylight.fillStyle(0xf2c48e, 0.018);
          daylight.fillTriangle(
            r.x + r.w - 126,
            edge,
            r.x + r.w - 48,
            edge,
            r.x + r.w - 10 + i * 8,
            edge + sign * (130 + i * 8),
          );
        }
      } else {
        const edge = left ? r.x + 14 : r.x + r.w - 14,
          sign = left ? 1 : -1;
        for (let i = 0; i < 4; i++) {
          daylight.fillStyle(0xf2c48e, 0.018);
          daylight.fillTriangle(
            edge,
            r.y + 165,
            edge,
            r.y + 230,
            edge + sign * (115 + i * 8),
            r.y + 275 + i * 5,
          );
        }
      }
      this.daylight.push(daylight);
      const y = r.y < 500 ? r.y + r.h - 3 : r.y + 10,
        x = r.x + r.w / 2;
      if (this.detailed) scene.add.image(x, y, interiorDoorFrame).setDisplaySize(83.2, 44.8).setDepth(24);
      const leaves = this.detailed ? [38, 104].map((left) => scene.add
        .image(x, y, interiorKey("airlock-door")).setDisplaySize(83.2, 44.8).setCrop(left, 24, 66, 62).setDepth(23)) : [-1, 1].map((sign) =>
        scene.add
          .rectangle(x + sign * 16, y, 29, 9, 0x78919b)
          .setStrokeStyle(1, 0xa9bdc0, 0.4)
          .setDepth(12),
      );
      this.doors.push({
        x,
        y,
        axis: 0,
        leaves,
        light: scene.add.rectangle(x, y + 7, 45, 1, 0x87c6ce, 0.5).setDepth(4),
      });
    }
    this.holo = scene.add.graphics().setDepth(4);
    for (const station of stations) {
      const light = scene.add
        .image(station.x, station.y + 12, "aurora-soft-light")
        .setTint(station.kind === "greenhouse" ? 0xb6d699 : 0x7dd9e4)
        .setDisplaySize(
          station.kind === "greenhouse" ? 250 : 120,
          station.kind === "greenhouse" ? 110 : 80,
        )
        .setAlpha(0.18)
        .setDepth(2);
      const screen = scene.add
        .rectangle(
          station.x,
          station.y - (this.detailed ? station.kind === "research" ? 43 : 30 : 22),
          station.kind === "greenhouse" ? 188 : 25,
          1,
          0xabe9e6,
          0.55,
        )
        .setDepth(this.detailed ? 26 : 3);
      let rotor: Phaser.GameObjects.Container | undefined;
      let levels: Phaser.GameObjects.Rectangle[] | undefined,
        samples: Phaser.GameObjects.Arc[] | undefined;
      if (station.kind === "circuit")
        levels = (this.detailed ? [-32, -17, -3] : [-30, 0, 30]).map((dx) => {
          scene.add
            .rectangle(station.x + dx + 0.5, station.y + 7, this.detailed ? 6 : 9, 20, 0x294957)
            .setOrigin(0.5, 1)
            .setDepth(this.detailed ? 26 : 3);
          return scene.add
            .rectangle(
              station.x + dx + 0.5,
              station.y + 7,
              this.detailed ? 6 : 9,
              20,
              0x9fc7b6,
              0.7,
            )
            .setOrigin(0.5, 1)
            .setDepth(this.detailed ? 26 : 4);
        });
      if (station.kind === "research")
        samples = [-17, 0, 17].map((dx) =>
          scene.add
            .circle(station.x + dx, station.y + 27, 1.7, 0x557a87, 0.7)
            .setDepth(this.detailed ? 26 : 4),
        );
      if (station.kind === "upgrade" || station.kind === "water") {
        const blades = scene.add.graphics();
        blades.fillStyle(0xb4cbcc, 0.3);
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3;
          blades.fillTriangle(
            0,
            0,
            Math.cos(a) * 8,
            Math.sin(a) * 8,
            Math.cos(a + 0.7) * 6,
            Math.sin(a + 0.7) * 6,
          );
        }
        rotor = scene.add
          .container(
            station.x + (station.kind === "upgrade" ? -19 : 0),
            station.y - 3,
            [blades],
          )
          .setDepth(3);
      }
      this.machines.push({ station, light, screen, rotor, levels, samples });
    }
    for (let i = 0; i < 22; i++)
      this.motes.push(
        scene.add
          .circle(
            150 + ((i * 137) % 1260),
            160 + ((i * 97) % 680),
            i % 3 === 0 ? 1 : 0.65,
            0xd6d6b8,
            0.08,
          )
          .setDepth(9),
      );
  }
  update(
    time: number,
    dt: number,
    sim: Simulation,
    player: { x: number; y: number },
  ) {
    this.daylight.forEach((beam) => beam.setAlpha(sim.daylight ? 1 : 0.08));
    this.holo?.clear();
    if (this.holo && sim.resources.energy > 0.5) {
      const control = stations.find((station) => station.kind === "control")!;
      const x = control.x, y = control.y + (this.detailed ? 17 : -16), scale = this.detailed ? .42 : 1;
      this.holo.lineStyle(0.8, 0x9ed8e1, 0.28);
      this.holo.strokeEllipse(x, y, 34 * scale, 12 * scale);
      this.holo.strokeEllipse(x, y, 16 * scale, 26 * scale);
      this.holo.strokeCircle(x, y, 13 * scale);
      this.holo.lineStyle(0.8, 0xc4e9d8, 0.45);
      this.holo.lineBetween(x, y, x + Math.cos(time / 4000) * 16 * scale, y + Math.sin(time / 4000) * 6 * scale);
    }
    for (const room of this.roomLights) {
      const state = roomVisualState(sim, room.id);
      room.light.setAlpha(state.glow);
      room.shade.setFillStyle(0x142c40, state.shade);
      for (const strip of room.strips)
        strip
          .setAlpha(state.powered ? (state.damaged ? 0.18 : 0.55) : 0.06)
          .setFillStyle(state.sheltered ? 0x99cdae : roomPalette[room.id].glow);
    }
    for (const machine of this.machines) {
      const state = stationVisualState(sim, machine.station);
      machine.light.setAlpha(state.working ? 0.15 : state.alarm ? 0.025 : 0.01);
      machine.screen.setAlpha(
        state.working
          ? 0.32 + Math.sin(time / 1300 + machine.station.x) * 0.1
          : 0,
      );
      if (machine.rotor && state.working) machine.rotor.rotation += dt * 0.8;
      machine.levels?.forEach((level) =>
        level
          .setDisplaySize(this.detailed ? 6 : 9, Math.max(0.1, sim.resources.energy * 0.2))
          .setFillStyle(
            sim.resources.energy < 18 ? 0xd5a071 : 0x9fc7b6,
            state.working ? 0.7 : 0.15,
          ),
      );
      machine.samples?.forEach((sample, i) =>
        sample
          .setFillStyle(sim.research > i ? 0xc8d6a0 : 0x557a87)
          .setAlpha(state.working ? 0.8 : 0.1),
      );
    }
    for (const door of this.doors) {
      const near = Math.hypot(player.x - door.x, player.y - door.y) < 104;
      door.axis += ((near ? 1 : 0) - door.axis) * (1 - Math.exp(-10 * dt));
      door.leaves.forEach(
        (leaf, i) => (leaf.x = door.x + (i ? 1 : -1) * (this.detailed ? door.axis * 32 : 16 + door.axis * 19)),
      );
      door.light.setAlpha(sim.resources.energy > 0.5 ? 0.45 : 0.08);
    }
    for (let i = 0; i < this.motes.length; i++) {
      const mote = this.motes[i];
      mote.x += dt * (1 + (i % 3)) * 0.55;
      mote.y += Math.sin(time / 6000 + i) * dt * 0.4;
      mote.setAlpha(0.035 + (Math.sin(time / 2500 + i) + 1) * 0.025);
      if (mote.x > 1440) mote.x = 110;
    }
  }
  celebrate(id: string) {
    const s = stations.find((s) => s.id === id);
    if (!s) return;
    const circle = this.scene.add
      .circle(s.x, s.y, 32, 0xa8d8be, 0)
      .setStrokeStyle(1, 0xc4dfb4, 0.65)
      .setDepth(14);
    this.scene.tweens.add({
      targets: circle,
      scale: 1.8,
      alpha: 0,
      duration: 650,
      ease: "Sine.Out",
      onComplete: () => circle.destroy(),
    });
  }
}
