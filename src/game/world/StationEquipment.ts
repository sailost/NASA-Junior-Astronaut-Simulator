import { chassis, pipe, screen, plant, fan, type Ink } from "./props";
import type { Station } from "./map";
export function drawLegacyMachine(g: Ink, s: Station) {
  const x = s.x,
    y = s.y;
  if (s.kind === "greenhouse") {
    chassis(g, x - 113, y - 35, 226, 74, 0x91a59a);
    g.fillStyle(0x223c32);
    g.fillRoundedRect(x - 104, y - 28, 208, 52, 5);
    pipe(
      g,
      [
        { x: x - 107, y: y + 29 },
        { x: x + 107, y: y + 29 },
      ],
      4,
      0x8ba6a2,
    );
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 7; i++)
        plant(g, x - 89 + i * 29, y - 14 + row * 26, i + row, 1.05);
    for (const dy of [-31, 26]) {
      g.fillStyle(0xc3d6b1, 0.7);
      g.fillRoundedRect(x - 100, y + dy, 200, 3, 1);
    }
    return;
  }
  chassis(
    g,
    x - 50,
    y - 32,
    100,
    66,
    s.kind === "research" ? 0xb5beba : 0x84969c,
  );
  if (s.kind === "oxygen") {
    for (const dx of [-29, 0, 29]) {
      g.fillStyle(0x455f6c);
      g.fillRoundedRect(x + dx - 12, y - 25, 24, 46, 10);
      g.fillStyle(0xb2c8c7);
      g.fillRoundedRect(x + dx - 10, y - 25, 20, 40, 9);
      g.fillStyle(0xe0e5d4, 0.45);
      g.fillRoundedRect(x + dx - 8, y - 21, 4, 29, 2);
      g.fillStyle(0x637e89);
      g.fillRect(x + dx - 12, y - 10, 24, 6);
      g.fillStyle(0x80b7bc);
      g.fillEllipse(x + dx, y - 23, 12, 5);
    }
    pipe(
      g,
      [
        { x: x - 35, y: y + 26 },
        { x: x + 35, y: y + 26 },
      ],
      4,
    );
    g.fillStyle(0xc49765);
    g.fillCircle(x, y + 26, 5);
  } else if (s.kind === "water") {
    pipe(
      g,
      [
        { x: x - 35, y: y + 23 },
        { x: x - 35, y: y - 17 },
        { x: x + 34, y: y - 17 },
        { x: x + 34, y: y + 23 },
      ],
      5,
      0x85abb2,
    );
    for (const dx of [-21, 0, 21]) {
      g.fillStyle(0xd1d8cd);
      g.fillRoundedRect(x + dx - 8, y - 12, 16, 34, 6);
      g.fillStyle(0x7bafb7, 0.8);
      g.fillRoundedRect(x + dx - 5, y + 1, 10, 17, 3);
      g.fillStyle(0x536d77);
      g.fillRect(x + dx - 9, y - 9, 18, 4);
    }
    g.fillStyle(0xcba26c);
    g.fillCircle(x + 34, y - 17, 5);
  } else if (s.kind === "control") {
    screen(g, x - 44, y - 27, 88, 29);
    g.fillStyle(0x3c5766);
    g.fillRoundedRect(x - 37, y + 9, 74, 17, 3);
    for (let col = 0; col < 12; col++)
      for (let row = 0; row < 2; row++) {
        g.fillStyle(row ? 0x8eaaa9 : 0x7596a2);
        g.fillRect(x - 32 + col * 5.5, y + 13 + row * 5, 3, 2);
      }
    g.fillStyle(0xd1aa73);
    g.fillCircle(x + 38, y + 17, 3);
  } else if (s.kind === "signal") {
    fan(g, x + 31, y + 13, 8);
    g.fillStyle(0x3d5967);
    g.fillRect(x - 14, y - 3, 10, 27);
    g.fillStyle(0xc0cdc9);
    g.fillEllipse(x - 9, y - 9, 46, 32);
    g.fillStyle(0x7e99a3);
    g.fillEllipse(x - 10, y - 11, 37, 23);
    g.lineStyle(2, 0xe0e5d5);
    g.lineBetween(x - 10, y - 11, x + 7, y - 29);
    g.fillStyle(0xc79e68);
    g.fillCircle(x + 7, y - 29, 3);
  } else if (s.kind === "research") {
    g.fillStyle(0xd7ddd0);
    g.fillRoundedRect(x - 42, y - 25, 84, 47, 5);
    g.fillStyle(0x405b69);
    g.fillCircle(x + 19, y - 1, 20);
    g.fillStyle(0x7399a7);
    g.fillCircle(x + 19, y - 1, 15);
    g.lineStyle(2, 0xb2dad5, 0.7);
    g.strokeCircle(x + 19, y - 1, 11);
    g.fillStyle(0x263f50);
    g.fillRoundedRect(x - 35, y - 19, 25, 19, 2);
    g.fillStyle(0x99ccd1);
    g.fillRect(x - 32, y - 14, 18, 2);
    g.fillStyle(0x9baead);
    g.fillRoundedRect(x - 28, y + 6, 12, 12, 2);
    g.fillStyle(0xb9875b);
    g.fillCircle(x - 22, y + 12, 3);
  } else if (s.kind === "circuit") {
    for (const dx of [-30, 0, 30]) {
      chassis(g, x + dx - 11, y - 24, 23, 47, 0x435f6e);
      g.fillStyle(0xa1b9b4);
      g.fillRoundedRect(x + dx - 6, y - 18, 13, 32, 3);
      g.fillStyle(0x668f8d);
      g.fillRect(x + dx - 4, y - 13, 9, 20);
      g.fillStyle(0xc8b38c);
      g.fillRect(x + dx - 3, y - 26, 7, 3);
    }
  } else if (s.kind === "upgrade") {
    fan(g, x - 19, y - 3, 18);
    screen(g, x + 5, y - 22, 36, 27);
    pipe(
      g,
      [
        { x: x + 7, y: y + 20 },
        { x: x + 36, y: y + 20 },
        { x: x + 36, y: y + 9 },
      ],
      4,
      0xab956e,
    );
  } else {
    g.fillStyle(0x536e79);
    g.fillRoundedRect(x - 41, y - 23, 82, 43, 5);
    g.lineStyle(3, 0xa7babc);
    g.strokeRoundedRect(x - 36, y - 19, 72, 35, 4);
    g.lineStyle(2, 0x263e4c);
    g.lineBetween(x, y - 18, x, y + 15);
    screen(g, x + 17, y - 13, 14, 23);
    g.fillStyle(0xbca177);
    g.fillRect(x - 26, y - 4, 10, 5);
  }
}
