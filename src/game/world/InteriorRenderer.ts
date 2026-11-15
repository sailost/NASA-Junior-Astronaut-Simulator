import type Phaser from "phaser";
import type { Simulation } from "../systems/Simulation";
import { rooms, stations, walkable, equipmentBays, type Station, type Room } from "./map";
import { interiorKey, roomFloorAsset, type InteriorAsset } from "./InteriorAssets";
import { createMaterials, roomPalette } from "./materials";
import { bakeStaticArt } from "./staticArt";
import { chassis, pipe } from "./props";
import { drawLegacyMachine } from "./StationEquipment";
import { stationVisualState } from "./visualState";

export const interiorDimensions: Partial<Record<InteriorAsset, [number, number]>> = {
  "wall-horizontal": [320, 100], "wall-vertical": [100, 320], "console-control": [256, 156],
  "machine-oxygen": [252, 167], "hydroponics-bed": [262, 156], "machine-lab-scanner": [210, 183],
  "machine-generator": [250, 172], "machine-communications": [242, 155], "shelter-shield-panel": [245, 162],
  "floor-vent": [114, 87], "warning-stripe": [168, 46], "utility-crate": [132, 111],
};
export interface InteriorSprite { asset: InteriorAsset; x: number; y: number; w: number; h: number; }
const spritePlan = (asset: InteriorAsset, x: number, y: number, w: number): InteriorSprite => {
  const [sourceW, sourceH] = interiorDimensions[asset]!; return { asset, x, y, w, h: w * sourceH / sourceW };
};
export function machineSprites(station: Station): InteriorSprite[] {
  if (station.kind === "greenhouse") return [-57, 57].map((dx) => spritePlan("hydroponics-bed", station.x + dx, station.y - 2, 113));
  const spec: Record<string, [InteriorAsset, number, number]> = {
    control: ["console-control", 108, -1], oxygen: ["machine-oxygen", 102, -2],
    research: ["machine-lab-scanner", 90, -7], circuit: ["machine-generator", 100, -3],
    signal: ["machine-communications", 104, -2], shelter: ["shelter-shield-panel", 100, -1],
  };
  const data = spec[station.kind]; return data ? [spritePlan(data[0], station.x, station.y + data[2], data[1])] : [];
}
/** Exact room boundaries, with one 84-unit opening at each existing entrance. */
export function wallSprites(room: Room): InteriorSprite[] {
  const output: InteriorSprite[] = [], middle = room.x + room.w / 2;
  const horizontal = (x: number, y: number, width: number) => {
    const count = Math.max(1, Math.round(width / 82)), part = width / count;
    for (let i = 0; i < count; i++) {
      const plan = spritePlan("wall-horizontal", x + part * (i + .5), y, part); output.push(plan);
    }
  };
  for (const side of ["top", "bottom"] as const) {
    const isDoor = room.y < 500 ? side === "bottom" : side === "top";
    const y = side === "top" ? room.y + 1 : room.y + room.h;
    if (isDoor) {
      horizontal(room.x, y, room.w / 2 - 42);
      horizontal(middle + 42, y, room.w / 2 - 42);
    } else horizontal(room.x, y, room.w);
  }
  const count = 4, height = room.h / count, width = height * 100 / 320;
  for (const x of [room.x + 1, room.x + room.w - 1]) for (let i = 0; i < count; i++)
    output.push({ asset: "wall-vertical", x, y: room.y + height * (i + .5), w: width, h: height });
  return output;
}
const image = (scene: Phaser.Scene, plan: InteriorSprite, depth: number) => scene.add
  .image(plan.x, plan.y, interiorKey(plan.asset)).setDisplaySize(plan.w, plan.h).setDepth(depth);

export class StationVisuals {
  constructor(private machines: { station: Station; images: Phaser.GameObjects.Image[]; depth?: number; tint?: number }[]) {}
  update(player: { x: number; y: number }, sim: Simulation) {
    for (const machine of this.machines) {
      const depth = player.y < machine.station.y + 8 ? 21 : 0;
      if (depth !== machine.depth) { machine.images.forEach((node) => node.setDepth(depth)); machine.depth = depth; }
      const state = stationVisualState(sim, machine.station);
      const tint = !state.powered ? 0x637884 : state.alarm ? 0xa6917d : 0xffffff;
      if (machine.tint !== tint) { machine.images.forEach((node) => node.setTint(tint)); machine.tint = tint; }
    }
  }
}
export function drawInteriorStation(scene: Phaser.Scene) {
  createMaterials(scene);
  const foundation = scene.add.graphics().setDepth(-21), fittings = scene.add.graphics().setDepth(-1), contacts = scene.add.graphics().setDepth(-9);
  // Preserve the original walkable corridor network; its texture is anchored to world coordinates.
  for (const area of walkable.slice(rooms.length)) {
    foundation.fillStyle(0x07131d, .28); foundation.fillRoundedRect(area.x - 8, area.y + 4, area.w + 16, area.h + 9, 6);
    const floor = scene.add.tileSprite(area.x, area.y, area.w, area.h, interiorKey("floor-corridor")).setOrigin(0).setDepth(-13);
    floor.tilePositionX = area.x; floor.tilePositionY = area.y;
  }
  for (const room of rooms) {
    const palette = roomPalette[room.id];
    for (let layer = 4; layer > 0; layer--) {
      foundation.fillStyle(0x07121c, .035 * layer);
      foundation.fillRoundedRect(room.x - 10 - layer * 2, room.y + 2, room.w + 20 + layer * 4, room.h + 15 + layer * 3, 14);
    }
    foundation.fillStyle(0x18313d); foundation.fillRoundedRect(room.x - 7, room.y - 7, room.w + 14, room.h + 14, 10);
    const floor = scene.add.tileSprite(room.x + 12, room.y + 12, room.w - 24, room.h - 24, interiorKey(roomFloorAsset[room.id])).setOrigin(0).setDepth(-12);
    floor.tilePositionX = room.x + 12; floor.tilePositionY = room.y + 12;
    // Contact shadows emphasize the cutaway wall faces, without global blur/bloom.
    for (let inset = 0; inset < 4; inset++) {
      contacts.lineStyle(2, 0x061b27, .10 - inset * .018);
      contacts.strokeRect(room.x + 14 + inset * 2, room.y + 14 + inset * 2, room.w - 28 - inset * 4, room.h - 28 - inset * 4);
    }
    wallSprites(room).forEach((plan) => image(scene, plan, 22));
    const plaqueX = room.x + 28, plaqueY = room.y + 31;
    fittings.fillStyle(0x0a2535, .9); fittings.fillRoundedRect(plaqueX, plaqueY, Math.min(184, room.name.length * 6.4 + 30), 20, 3);
    fittings.fillStyle(palette.accent); fittings.fillRect(plaqueX + 5, plaqueY + 5, 3, 10);
    scene.add.text(plaqueX + 15, plaqueY + 5, room.name, { fontFamily: "Arial", fontSize: "9px", fontStyle: "bold", color: "#d2e0df" }).setDepth(25);
    // Existing blocked service bays stay visibly occupied: counters, storage and manifolds,
    // rather than extra glowing consoles that could be mistaken for new interactions.
    const bays = equipmentBays.filter((bay) => bay.x >= room.x && bay.x < room.x + room.w && bay.y >= room.y && bay.y < room.y + room.h);
    for (const [index, bay] of bays.entries()) {
      chassis(fittings, bay.x + 3, bay.y + 5, bay.w - 6, bay.h - 7, room.id === "lab" ? 0xa1afae : room.id === "shelter" ? 0x66767a : 0x48636d);
      fittings.fillStyle(room.id === "green" ? 0x244338 : 0x233d48); fittings.fillRoundedRect(bay.x + 9, bay.y + 10, bay.w - 18, bay.h - 20, 4);
      if (room.id === "green" || room.id === "life") {
        pipe(fittings, [{ x: bay.x + 15, y: bay.y + 19 }, { x: bay.x + bay.w - 15, y: bay.y + 19 }], 4, room.id === "green" ? 0x759f92 : 0x789eac);
        for (let x = bay.x + 22; x < bay.x + bay.w - 12; x += 46) {
          fittings.fillStyle(0x537a84); fittings.fillRoundedRect(x, bay.y + 23, 20, 11, 3);
          fittings.fillStyle(0x99b9b5, .7); fittings.fillRect(x + 3, bay.y + 25, 14, 1);
        }
      } else if (room.id === "lab") {
        for (let x = bay.x + 17; x < bay.x + bay.w - 15; x += 24) {
          fittings.fillStyle(0xbecdc9); fittings.fillRoundedRect(x, bay.y + 15, 8, 19, 3);
          fittings.fillStyle(0x71adbb); fittings.fillRect(x + 2, bay.y + 23, 4, 8);
        }
      } else {
        const crate = spritePlan("utility-crate", bay.x + 35, bay.y + bay.h / 2 + 2, 39); image(scene, crate, 0);
        image(scene, spritePlan("floor-vent", bay.x + bay.w - 36, bay.y + bay.h / 2 + 1, 44), 0);
      }
    }
    const vent = spritePlan("floor-vent", room.x + room.w - 52, room.y + room.h - 51, 31);
    image(scene, vent, -8).setAlpha(.72);
    if (room.id === "engine" || room.id === "shelter")
      image(scene, spritePlan("warning-stripe", room.x + room.w / 2, room.y + 48, 61), -8).setAlpha(.8);
  }
  for (const station of stations) {
    const width = station.kind === "greenhouse" ? 232 : 112;
    for (let layer = 3; layer > 0; layer--) {
      contacts.fillStyle(0x04131d, .055 * layer);
      contacts.fillRoundedRect(station.x - width / 2 - layer, station.y - 31, width + layer * 2, 70 + layer * 3, 7);
    }
    if (!machineSprites(station).length) drawLegacyMachine(fittings, station);
  }
  bakeStaticArt(scene, foundation, "aurora-interior-v2-foundation");
  bakeStaticArt(scene, fittings, "aurora-interior-v2-fittings");
  bakeStaticArt(scene, contacts, "aurora-interior-v2-contact");
  const machines = stations.map((station) => ({ station, images: machineSprites(station).map((plan) => image(scene, plan, 0)) })).filter((m) => m.images.length);
  return new StationVisuals(machines);
}
