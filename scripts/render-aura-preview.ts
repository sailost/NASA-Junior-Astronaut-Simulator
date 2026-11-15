/** Static SVG art inspection only. Does not emulate browser layout or CSS animation. */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { auraHologram, auraMoodLabels, type AuraMood } from "../src/game/ui/AuraHologram";
const canvas = createCanvas(1200, 300), c = canvas.getContext("2d");
c.fillStyle = "#0b202e"; c.fillRect(0, 0, 1200, 300);
const css = (await readFile("src/game/ui/aura.css", "utf8")).split("#aura-companion")[0];
const moods: AuraMood[] = ["idle", "talking", "thinking", "happy", "alert", "emergency"];
for (const [i, mood] of moods.entries()) {
  const color = mood === "emergency" ? "#f1a5b6" : mood === "alert" ? "#e4c17f" : "#79e4f3";
  const svg = auraHologram(mood).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="225" ').replace('aria-hidden="true">', `aria-hidden="true" style="color:${color}"><style>${css}</style>`);
  c.drawImage(await loadImage(Buffer.from(svg)), i * 200 + 10, 15, 180, 225);
  c.fillStyle = "#bddde3"; c.font = "14px Arial"; c.textAlign = "center";
  c.fillText(auraMoodLabels[mood], i * 200 + 100, 275);
}
await mkdir("test-results", { recursive: true });
await writeFile("test-results/aura-states.png", canvas.toBuffer("image/png"));
