import Phaser from "phaser";
import { Simulation } from "./game/systems/Simulation";
import { BaseScene } from "./game/scenes/BaseScene";
import { StationAudio } from "./game/audio/Audio";
import { Interface } from "./game/ui/Interface";
import "./style.css";
import "./game/ui/flight.css";
import "./game/ui/quests.css";
import "./game/ui/cinematic-menu.css";
import "./game/ui/exploration.css";
import "./game/ui/machines.css";
import "./game/ui/tutorial.css";
import "./game/ui/aura.css";
import "./game/ui/prologue.css";
import "./game/ui/mission-learning.css";
const sim = new Simulation(),
  audio = new StationAudio(),
  scene = new BaseScene(sim, audio, (readyScene) => {
    new Interface(
      document.querySelector("#interface")!,
      sim,
      readyScene,
      audio,
    );
  });
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#18283a",
  antialias: true,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [scene],
  audio: { noAudio: true },
  render: { roundPixels: false },
});
window.addEventListener("pagehide", () => audio.context?.suspend());
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {});
  });
if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
