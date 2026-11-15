import type Phaser from "phaser";
import { hasInteriorAssets } from "./InteriorAssets";
import { drawInteriorStation } from "./InteriorRenderer";
import { drawLegacyMachine } from "./StationEquipment";
import { bakeStaticArt } from "./staticArt";
import { rooms, stations, walkable, equipmentBays, type Station } from "./map";
import { createMaterials, roomPalette } from "./materials";
import { chassis, pipe, screen, plant, fan, type Ink } from "./props";

export function drawStation(scene: Phaser.Scene) {
  if (hasInteriorAssets(scene)) return drawInteriorStation(scene);
  createMaterials(scene);
  const under = scene.add.graphics().setDepth(-21),
    walls = scene.add.graphics().setDepth(-4),
    props = scene.add.graphics().setDepth(0),
    pads = scene.add.graphics().setDepth(-8),
    windows = scene.add.graphics().setDepth(1);
  for (const a of walkable) {
    under.fillStyle(0x071522, 0.25);
    under.fillRoundedRect(a.x - 13, a.y + 3, a.w + 28, a.h + 22, 14);
    under.fillStyle(0x2d4855);
    under.fillRoundedRect(a.x - 8, a.y - 8, a.w + 16, a.h + 16, 9);
    under.fillStyle(0x4a626b);
    under.fillRect(a.x, a.y, a.w, a.h);
  }
  // Corridor tread plates and a narrow handrail replace blueprint lane markings.
  for (let x = 130; x < 1400; x += 32) {
    under.fillStyle(0x718286, 0.2);
    under.fillRoundedRect(x, 478, 23, 45, 2);
    under.lineStyle(1, 0x1b3540, 0.45);
    for (let i = 0; i < 4; i++)
      under.lineBetween(x + 4, 485 + i * 9, x + 18, 485 + i * 9);
  }
  under.lineStyle(3, 0x18333e);
  under.lineBetween(125, 468, 1400, 468);
  under.lineBetween(125, 532, 1400, 532);
  under.lineStyle(1, 0xa1b4b4, 0.35);
  under.lineBetween(125, 470, 1400, 470);
  under.lineBetween(125, 530, 1400, 530);
  for (const r of rooms) {
    const palette = roomPalette[r.id];
    for (let i = 5; i > 0; i--) {
      under.fillStyle(0x091923, 0.025 * i);
      under.fillRoundedRect(
        r.x - 12 - i * 2,
        r.y - 6,
        r.w + 24 + i * 4,
        r.h + 32 + i * 3,
        18,
      );
    }
    scene.add
      .tileSprite(
        r.x + 13,
        r.y + 22,
        r.w - 26,
        r.h - 35,
        `aurora-floor-${r.id}`,
      )
      .setOrigin(0)
      .setDepth(-12);
    // Beveled hull, an inside face and a floor-level shadow give walls thickness.
    walls.fillStyle(0x182e3b);
    walls.fillRoundedRect(r.x - 8, r.y - 13, r.w + 16, 35, 11);
    walls.fillStyle(0x82949c);
    walls.fillRoundedRect(r.x - 3, r.y - 12, r.w + 6, 16, 8);
    walls.fillStyle(0x536e7d);
    walls.fillRect(r.x + 2, r.y + 1, r.w - 4, 19);
    walls.fillStyle(0xb7c4c4, 0.28);
    walls.fillRect(r.x + 13, r.y - 10, r.w - 26, 2);
    walls.fillStyle(0x192f3a, 0.3);
    walls.fillRect(r.x + 13, r.y + 20, r.w - 26, 13);
    for (const side of [r.x - 5, r.x + r.w - 6]) {
      walls.fillStyle(0x2a4351);
      walls.fillRoundedRect(side, r.y + 7, 12, r.h - 9, 4);
      walls.fillStyle(0x879ba2);
      walls.fillRect(side + 2, r.y + 10, 3, r.h - 19);
      walls.fillStyle(0x132c37, 0.3);
      walls.fillRect(
        side + (side === r.x - 5 ? 12 : -5),
        r.y + 21,
        5,
        r.h - 30,
      );
    }
    walls.fillStyle(0x294351);
    walls.fillRoundedRect(r.x, r.y + r.h - 7, r.w, 14, 6);
    walls.fillStyle(0xa3b2b4, 0.45);
    walls.fillRect(r.x + 10, r.y + r.h - 6, r.w - 20, 2);
    for (let x = r.x + 27; x < r.x + r.w - 16; x += 54) {
      walls.fillStyle(0x233f4e);
      walls.fillRect(x, r.y - 6, 2, 12);
      walls.fillStyle(0xc8d4cf, 0.4);
      walls.fillCircle(x + 7, r.y - 3, 1);
    }
    // Small wall plaques replace labels painted across the floor.
    const plaqueX = r.x + 29,
      plaqueY = r.y + 33;
    props.fillStyle(0x203947, 0.8);
    props.fillRoundedRect(
      plaqueX,
      plaqueY,
      Math.min(172, r.name.length * 6.4 + 31),
      22,
      3,
    );
    props.fillStyle(palette.accent);
    props.fillRoundedRect(plaqueX + 5, plaqueY + 6, 3, 10, 1);
    scene.add
      .text(plaqueX + 16, plaqueY + 6, r.name, {
        fontFamily: "Arial",
        fontSize: "9px",
        fontStyle: "bold",
        letterSpacing: 0.8,
        color: "#b9cdcf",
      })
      .setDepth(1);
    for (const bay of equipmentBays.filter(
      (b) => b.x >= r.x && b.x < r.x + r.w && b.y >= r.y && b.y < r.y + r.h,
    )) {
      chassis(
        props,
        bay.x + 3,
        bay.y + 3,
        bay.w - 6,
        bay.h - 6,
        r.id === "shelter" ? 0x829090 : 0x788c90,
      );
      if (r.id === "life")
        for (let x = bay.x + 19; x < bay.x + bay.w - 10; x += 37) {
          props.fillStyle(0xabbabb);
          props.fillEllipse(x, bay.y + bay.h / 2, 21, 27);
          props.fillStyle(0x344e59);
          props.fillRect(x - 12, bay.y + bay.h / 2 - 3, 24, 6);
          props.fillStyle(0x8ecbd0);
          props.fillCircle(x, bay.y + bay.h / 2 - 10, 3);
        }
      else if (r.id === "control")
        for (let x = bay.x + 12; x < bay.x + bay.w - 48; x += 66)
          screen(props, x, bay.y + 9, 55, 25);
      else if (r.id === "green") {
        props.fillStyle(0x263d35);
        props.fillRoundedRect(bay.x + 8, bay.y + 8, bay.w - 16, bay.h - 16, 4);
        for (let x = bay.x + 22; x < bay.x + bay.w - 8; x += 27)
          plant(props, x, bay.y + bay.h / 2, Math.round(x) % 5, 0.85);
        pipe(
          props,
          [
            { x: bay.x + 5, y: bay.y + bay.h - 6 },
            { x: bay.x + bay.w - 5, y: bay.y + bay.h - 6 },
          ],
          3,
          0x7a9993,
        );
      } else if (r.id === "engine")
        for (let x = bay.x + 22; x < bay.x + bay.w - 10; x += 34)
          fan(props, x, bay.y + bay.h / 2, 11);
      else if (r.id === "lab") {
        props.fillStyle(0xd1d5cb);
        props.fillRoundedRect(bay.x + 8, bay.y + 8, bay.w - 16, bay.h - 16, 3);
        for (let x = bay.x + 19; x < bay.x + bay.w - 8; x += 19) {
          props.fillStyle(0x8ec2ce, 0.8);
          props.fillRoundedRect(x, bay.y + 14, 6, 17, 2);
          props.fillStyle(0x516b79);
          props.fillRect(x - 1, bay.y + 12, 8, 4);
        }
      } else {
        props.fillStyle(0x526a78);
        props.fillRoundedRect(bay.x + 9, bay.y + 8, bay.w - 18, bay.h - 16, 5);
        props.fillStyle(0xbcc6bf);
        props.fillRoundedRect(bay.x + 13, bay.y + 11, 19, bay.h - 22, 3);
        props.lineStyle(1, 0xa3bbb9, 0.3);
        props.lineBetween(
          bay.x + 38,
          bay.y + 12,
          bay.x + bay.w - 18,
          bay.y + 12,
        );
      }
    }
    // Services run along the walls; their footprint never adds collision obstacles.
    // Recessed equipment pads are part of the floor, not additional obstructions.
    for (const station of stations.filter((s) => s.room === r.id)) {
      under.fillStyle(0x132b36, 0.1);
      under.fillRoundedRect(station.x - 66, station.y - 47, 132, 108, 12);
      const pad = pads;
      pad.lineStyle(1, palette.accent, 0.15);
      pad.strokeRoundedRect(
        station.x - (station.kind === "greenhouse" ? 125 : 63),
        station.y - 44,
        station.kind === "greenhouse" ? 250 : 126,
        96,
        8,
      );
      pad.fillStyle(palette.accent, 0.12);
      for (let k = 0; k < 3; k++)
        pad.fillRect(station.x - 44 + k * 9, station.y + 46, 4, 2);
    }
    // Exterior glazing with a shallow metal frame and reflected sky.
    const window = windows,
      left = r.id === "life" || r.id === "engine";
    if (r.id === "control" || r.id === "lab") {
      const wy = r.id === "control" ? r.y - 6 : r.y + r.h - 2,
        wx = r.x + r.w - 130;
      window.fillStyle(0x1d3541);
      window.fillRoundedRect(wx - 4, wy - 6, 88, 13, 3);
      window.fillStyle(0x86a9b5, 0.7);
      window.fillRoundedRect(wx, wy - 3, 80, 5, 1);
      window.fillStyle(0xcbd8d0, 0.4);
      window.fillRect(wx + 4, wy - 3, 72, 1);
      for (let i = 1; i < 4; i++) {
        window.fillStyle(0x253f4a);
        window.fillRect(wx + i * 20, wy - 6, 3, 13);
      }
    } else {
      const wx = left ? r.x + 1 : r.x + r.w - 2,
        wy = r.y + 164;
      window.fillStyle(0x1d3541);
      window.fillRoundedRect(wx - 6, wy - 5, 13, 76, 3);
      window.fillStyle(0x8faeb4, 0.7);
      window.fillRoundedRect(wx - 3, wy, 5, 66, 1);
      window.fillStyle(0xd5e2d7, 0.4);
      window.fillRect(wx - 3, wy + 4, 1, 58);
      for (let i = 1; i < 3; i++) {
        window.fillStyle(0x253f4a);
        window.fillRect(wx - 6, wy + i * 22, 13, 3);
      }
    }
    if (r.id === "life") {
      pipe(
        props,
        [
          { x: r.x + 20, y: r.y + 114 },
          { x: r.x + 20, y: r.y + 239 },
          { x: r.x + 65, y: r.y + 239 },
        ],
        6,
      );
      for (const y of [r.y + 150, r.y + 214]) {
        props.fillStyle(0xa97d5c);
        props.fillCircle(r.x + 21, y, 6);
        props.lineStyle(2, 0xe2bf8d);
        props.lineBetween(r.x + 16, y, r.x + 26, y);
      }
    }
    if (r.id === "engine") {
      pipe(
        props,
        [
          { x: r.x + r.w - 22, y: r.y + 122 },
          { x: r.x + r.w - 22, y: r.y + 247 },
          { x: r.x + r.w - 77, y: r.y + 247 },
        ],
        6,
        0xa6977d,
      );
    }
    if (r.id === "lab") {
      chassis(props, r.x + 30, r.y + 169, 48, 34, 0xa4b4b7);
      props.fillStyle(0x445e6b);
      props.fillCircle(r.x + 54, r.y + 185, 12);
      props.lineStyle(2, 0x8cc6cc, 0.7);
      props.strokeCircle(r.x + 54, r.y + 185, 8);
    }
    if (r.id === "shelter") {
      chassis(props, r.x + 27, r.y + 162, 48, 57, 0x9caba6);
      props.fillStyle(0x526f70);
      props.fillRect(r.x + 38, r.y + 185, 26, 7);
      props.fillRect(r.x + 47, r.y + 176, 7, 25);
    }
    const doorY = r.y < 500 ? r.y + r.h - 5 : r.y + 8,
      doorX = r.x + r.w / 2;
    walls.fillStyle(0x526b75);
    walls.fillRect(doorX - 34, doorY - 13, 68, 27);
    walls.fillStyle(0x253e48);
    walls.fillRect(doorX - 32, doorY - 5, 64, 15);
    for (const direction of [-1, 1]) {
      chassis(walls, doorX + direction * 39 - 5, doorY - 14, 10, 31, 0x95a6a7);
      walls.fillStyle(palette.accent, 0.75);
      walls.fillRoundedRect(doorX + direction * 39 - 2, doorY - 4, 3, 13, 1);
    }
    walls.fillStyle(0xcfab75, 0.5);
    for (let i = 0; i < 6; i++)
      walls.fillRect(doorX - 28 + i * 10, doorY + 9, 5, 2);
  }
  for (const station of stations) drawLegacyMachine(props, station);
  for (const [name, graphics] of Object.entries({ under, walls, props, pads, windows }))
    bakeStaticArt(scene, graphics, `aurora-static-${name}`);
}
