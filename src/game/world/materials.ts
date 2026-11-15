import type Phaser from "phaser";
import { interiorKey, roomFloorAsset } from "./InteriorAssets";
export const roomPalette: Record<
  string,
  { floor: string; accent: number; glow: number }
> = {
  life: { floor: "#53656a", accent: 0x8dbdc4, glow: 0x83d5df },
  control: { floor: "#4d6069", accent: 0x7faeba, glow: 0x80cfdd },
  green: { floor: "#51625a", accent: 0xa3b994, glow: 0xb9d0a2 },
  engine: { floor: "#605b55", accent: 0xc39c73, glow: 0xe6b16e },
  lab: { floor: "#5b646c", accent: 0xb0c0c8, glow: 0xaad7e3 },
  shelter: { floor: "#62666a", accent: 0xd2b58e, glow: 0xe3b77c },
};
export function createMaterials(scene: Phaser.Scene) {
  for (const [name, palette] of Object.entries(roomPalette)) {
    if (scene.textures.exists(interiorKey(roomFloorAsset[name]))) continue;
    const key = `aurora-floor-${name}`;
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.createCanvas(key, 96, 96)!,
      c = texture.context;
    c.fillStyle = palette.floor;
    c.fillRect(0, 0, 96, 96);
    let seed = 117;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1400; i++) {
      c.fillStyle =
        rand() > 0.5 ? "rgba(225,233,226,.035)" : "rgba(8,20,26,.06)";
      c.fillRect(rand() * 96, rand() * 96, rand() * 2 + 0.5, 0.7);
    }
    c.strokeStyle = "rgba(13,27,35,.27)";
    c.lineWidth = 2;
    c.strokeRect(1, 1, 94, 94);
    c.strokeStyle = "rgba(210,222,219,.1)";
    c.lineWidth = 1;
    c.strokeRect(3.5, 3.5, 89, 89);
    for (const [x, y] of [
      [8, 8],
      [88, 8],
      [8, 88],
      [88, 88],
    ]) {
      c.fillStyle = "#273a42";
      c.beginPath();
      c.arc(x, y, 1.2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(180,199,199,.3)";
      c.fillRect(x - 1, y - 1, 1, 0.5);
    }
    c.strokeStyle = "rgba(12,28,35,.12)";
    for (let i = 0; i < 5; i++) {
      const x = rand() * 80 + 8,
        y = rand() * 80 + 8;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + rand() * 12, y - 1);
      c.stroke();
    }
    texture.refresh();
  }
  if (!scene.textures.exists("aurora-soft-light")) {
    const texture = scene.textures.createCanvas("aurora-soft-light", 128, 128)!,
      c = texture.context,
      gradient = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,.52)");
    gradient.addColorStop(0.4, "rgba(255,255,255,.16)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 128, 128);
    texture.refresh();
  }
}
