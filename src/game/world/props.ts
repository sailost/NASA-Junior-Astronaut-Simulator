import type Phaser from "phaser";
export type Ink = Phaser.GameObjects.Graphics;
export function chassis(
  g: Ink,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = 0x7c888b,
) {
  for (let i = 3; i > 0; i--) {
    g.fillStyle(0x091722, 0.04 * i);
    g.fillRoundedRect(x - 3 - i, y + 6 - i, w + 6 + i * 2, h + 5 + i, 8 + i);
  }
  g.fillStyle(0x253943);
  g.fillRoundedRect(x, y + 5, w, h, 7);
  g.fillStyle(fill);
  g.fillRoundedRect(x, y, w, h - 3, 6);
  g.lineStyle(1, 0xc3cbc6, 0.45);
  g.lineBetween(x + 7, y + 1, x + w - 7, y + 1);
  g.lineStyle(1, 0x182e37, 0.65);
  g.lineBetween(x + 4, y + h - 6, x + w - 4, y + h - 6);
  for (const dx of [6, w - 7]) {
    g.fillStyle(0x253a44);
    g.fillCircle(x + dx, y + 6, 1.5);
    g.fillStyle(0xa3b4b7, 0.4);
    g.fillCircle(x + dx - 0.5, y + 5.5, 0.6);
  }
}
export function pipe(
  g: Ink,
  points: { x: number; y: number }[],
  width = 6,
  color = 0x819295,
) {
  g.lineStyle(width + 3, 0x142b35, 0.45);
  g.strokePoints(points);
  g.lineStyle(width, color);
  g.strokePoints(points);
  g.lineStyle(1, 0xc6d3ce, 0.5);
  g.strokePoints(points.map((p) => ({ x: p.x - 1, y: p.y - 1 })));
  for (const p of [points[0], points.at(-1)!]) {
    g.fillStyle(0x344b55);
    g.fillCircle(p.x, p.y, width * 0.9);
    g.fillStyle(color);
    g.fillCircle(p.x, p.y, width * 0.55);
  }
}
export function screen(g: Ink, x: number, y: number, w: number, h: number) {
  chassis(g, x, y, w, h, 0x465a65);
  g.fillStyle(0x102b38);
  g.fillRoundedRect(x + 3, y + 3, w - 6, h - 8, 2);
  g.fillStyle(0x65acb9, 0.1);
  g.fillRect(x + 5, y + 4, w - 10, h * 0.3);
  g.lineStyle(1, 0x95ced2, 0.65);
  g.lineBetween(x + 8, y + h * 0.55, x + w * 0.32, y + h * 0.55);
  g.lineBetween(x + w * 0.32, y + h * 0.55, x + w * 0.44, y + h * 0.31);
  g.lineBetween(x + w * 0.44, y + h * 0.31, x + w * 0.6, y + h * 0.66);
  g.lineBetween(x + w * 0.6, y + h * 0.66, x + w - 7, y + h * 0.4);
  g.fillStyle(0xc3d6ce, 0.4);
  g.fillRect(x + 8, y + h - 10, w * 0.25, 1);
  g.fillStyle(0x7daeb9);
  g.fillCircle(x + w - 7, y + h - 5, 1.2);
}
export function plant(g: Ink, x: number, y: number, seed: number, size = 1) {
  g.fillStyle(0x182f2b, 0.4);
  g.fillEllipse(x + 2, y + 3, 20 * size, 16 * size);
  for (let leaf = 0; leaf < 6; leaf++) {
    const angle = (leaf * Math.PI) / 3 + seed * 0.4,
      px = x + Math.cos(angle) * 6 * size,
      py = y + Math.sin(angle) * 5 * size;
    g.fillStyle([0x769761, 0x8aa577, 0x5e845d][(leaf + seed) % 3]);
    g.fillEllipse(
      px,
      py,
      (8 + (leaf % 2) * 3) * size,
      (5 + (leaf % 3) * 2) * size,
    );
    g.lineStyle(0.7, 0xc0ce91, 0.35);
    g.lineBetween(x, y, px, py);
  }
  g.fillStyle(0xc0cb8c, 0.65);
  g.fillCircle(x, y, 1.4 * size);
}
export function fan(g: Ink, x: number, y: number, r: number) {
  g.fillStyle(0x1c3540);
  g.fillCircle(x + 1, y + 2, r + 3);
  g.fillStyle(0x70838b);
  g.fillCircle(x, y, r + 2);
  g.fillStyle(0x263f49);
  g.fillCircle(x, y, r);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    g.fillStyle(0x91a2a5);
    g.fillTriangle(
      x + Math.cos(a) * 3,
      y + Math.sin(a) * 3,
      x + Math.cos(a + 0.23) * (r - 2),
      y + Math.sin(a + 0.23) * (r - 2),
      x + Math.cos(a + 0.7) * (r - 4),
      y + Math.sin(a + 0.7) * (r - 4),
    );
  }
  g.fillStyle(0x576d76);
  g.fillCircle(x, y, 3);
  g.lineStyle(1, 0xbac5c1, 0.3);
  g.strokeCircle(x, y, r + 2);
}
