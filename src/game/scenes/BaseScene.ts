import { explorationCamera } from "../world/camera";
import { drawMarsTerrain, preloadMars } from "../world/MarsTerrain";
import Phaser from "phaser";
import { stations, canWalk, type Station } from "../world/map";
import { Simulation } from "../systems/Simulation";
import balance from "../config/balance.json";
import { StationAudio } from "../audio/Audio";
import {
  makeAstronaut,
  animateAstronaut,
  type Astronaut,
  interactAstronaut,
} from "../entities/Astronaut";
import { idleMotion, moveAstronaut } from "../entities/movement";
import { preloadInteriors } from "../world/InteriorAssets";
import type { StationVisuals } from "../world/InteriorRenderer";
import { drawStation } from "../world/StationRenderer";
import { WorldEffects } from "../world/WorldEffects";
import { MissionGuide } from "../world/MissionGuide";
import { NightThreats } from "../world/NightThreats";
export class BaseScene extends Phaser.Scene {
  sim: Simulation;
  audio: StationAudio;
  player!: Phaser.GameObjects.Container;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  nearest?: Station;
  onInteract: (s: Station) => void = () => {};
  onFrame: () => void = () => {};
  blocked = true;
  // Tutorial protection freezes Simulation but permits normal collision-aware practice.
  tutorialMovement = false;
  private lamps: {
    station: Station;
    light: Phaser.GameObjects.Arc;
    ring: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
  }[] = [];
  private shade!: Phaser.GameObjects.Rectangle;
  private astronaut?: Astronaut;
  private motion = idleMotion();
  private lastStep = 0;
  private lastAlert = 0;
  private lastDay = true;
  private playerLight!: Phaser.GameObjects.Arc;
  private guide?: MissionGuide;
  private effects?: WorldEffects;
  private threats?: NightThreats;
  private stationVisuals?: StationVisuals;
  private completion?: string;
  constructor(
    sim: Simulation,
    audio: StationAudio,
    private onReady: (scene: BaseScene) => void = () => {},
  ) {
    super("base");
    this.sim = sim;
    this.audio = audio;
  }
  preload() {
    preloadMars(this);
    preloadInteriors(this);
  }
  create() {
    this.cameras.main.setBackgroundColor("#815e4d");
    this.drawTerrain();
    this.drawBase();
    this.playerLight = this.add
      .circle(765, 350, 38, 0xa0e2ea, 0.04)
      .setDepth(5);
    this.player = this.createAstronaut(765, 350, 0xe1e1d7, true);
    this.player.setDepth(20);
    if (
      typeof this.add.graphics === "function" &&
      typeof this.add.text === "function"
    )
      this.guide = new MissionGuide(this);
    this.shade = this.add
      .rectangle(770, 500, 1800, 1200, 0x0c1e39, 1)
      .setAlpha(0)
      .setDepth(40);
    if (
      typeof this.add.image === "function" &&
      typeof this.add.graphics === "function"
    )
      this.effects = new WorldEffects(this);
    if (typeof this.add.graphics === "function" && typeof this.add.container === "function") this.threats = new NightThreats(this);
    this.cameras.main.setBounds(0, 0, 1540, 1000);

    this.cameras.main.startFollow(this.player, true, 0.16, 0.16, 0, 0);
    this.cameras.main.setDeadzone?.(90, 60);
    this.fitViewport();
    this.scale?.on("resize", this.fitViewport, this);
    this.events?.once("shutdown", () =>
      this.scale?.off("resize", this.fitViewport, this),
    );
    this.keys = this.input.keyboard!.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,E",
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "SPACE"]);
    // Scene plugins and keys exist now; booting the HUD earlier leaves controls blocked.
    this.onReady(this);
  }
  private fitViewport() {
    if (!this.scale) return;
    const view = explorationCamera(this.scale.width, this.scale.height);
    this.cameras.main.setViewport(view.x, view.y, view.width, view.height);
    this.cameras.main.setZoom(view.zoom);
    this.cameras.main.setDeadzone?.(view.deadzone.width, view.deadzone.height);
  }
  setTrackedStation(id?: string) {
    this.guide?.setTarget(id);
  }
  private drawTerrain() {
    drawMarsTerrain(this);
  }
  private drawBase() {
    this.stationVisuals = drawStation(this);
    for (const station of stations) this.drawMachineIndicator(station);
    this.createAstronaut(1172, 806, 0xd4aa78).setScale(1.08).setAlpha(0.9);
  }
  private drawMachineIndicator(s: Station) {
    const x = s.x,
      y = s.y;
    const light = this.add.circle(x + 41, y - 24, 4, 0x65c69a).setDepth(25);
    const ring = this.add
      .circle(x, y, 49, 0x8caaa8, 0)
      .setStrokeStyle(1, 0xa3b6b3, 0.3)
      .setDepth(3)
      .setVisible(false);
    const label = this.add
      .text(x, y - 58, "!", {
        fontFamily: "Arial",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#d4b58b",
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(26);
    this.lamps.push({ station: s, light, ring, label });
  }
  private createAstronaut(
    x: number,
    y: number,
    color: number,
    controlled = false,
  ) {
    const actor = makeAstronaut(this, x, y, color);
    if (controlled) this.astronaut = actor;
    return actor.root.setScale(controlled ? 1.28 : 1.1);
  }
  update(time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.1);
    this.sim.tick(dt);
    if (!this.blocked && (!this.sim.paused || this.tutorialMovement) && this.sim.status === "playing") {
      let dx =
          Number(this.keys.D.isDown || this.keys.RIGHT.isDown) -
          Number(this.keys.A.isDown || this.keys.LEFT.isDown),
        dy =
          Number(this.keys.S.isDown || this.keys.DOWN.isDown) -
          Number(this.keys.W.isDown || this.keys.UP.isDown);
      const moved = moveAstronaut(
        this.player,
        this.motion,
        { x: dx, y: dy },
        dt,
        balance.moveSpeed,
        canWalk,
      );
      if (this.astronaut)
        animateAstronaut(this.astronaut, this.motion, moved.distance, dt);
      if (moved.distance > 0.05 && time - this.lastStep > 430) {
        this.audio.tone("step");
        this.lastStep = time;
      }
      this.nearest = stations
        .filter(
          (s) => Math.hypot(s.x - this.player.x, s.y - this.player.y) < 115,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - this.player.x, a.y - this.player.y) -
            Math.hypot(b.x - this.player.x, b.y - this.player.y),
        )[0];
      if (Phaser.Input.Keyboard.JustDown(this.keys.E) && this.nearest) {
        if (this.astronaut) interactAstronaut(this.astronaut);
        this.onInteract(this.nearest);
      }
    }
    if (this.blocked || (this.sim.paused && !this.tutorialMovement) || this.sim.status !== "playing") {
      this.motion.vx = 0;
      this.motion.vy = 0;
      if (this.astronaut) animateAstronaut(this.astronaut, this.motion, 0, dt);
    }
    if (!this.blocked && this.completion) {
      this.effects?.celebrate(this.completion);
      if (this.astronaut) interactAstronaut(this.astronaut);
      this.completion = undefined;
    }
    this.stationVisuals?.update(this.player, this.sim);
    this.effects?.update(time, dt, this.sim, this.player);
    this.threats?.update(time, this.sim, this.player, dt, !this.blocked);
    const night = this.sim.daylight
      ? Math.max(0, (this.sim.phase - 0.5) / 0.12) * 0.12
      : this.sim.campaign?.level === 2 ? 0.57 : 0.19;
    if (this.lastDay !== this.sim.daylight) this.audio.tone("click");
    this.lastDay = this.sim.daylight;
    this.shade.setAlpha(Phaser.Math.Linear(this.shade.alpha, night, 1 - Math.exp(-dt * 3)));
    this.playerLight.setPosition(this.player.x, this.player.y);
    for (const l of this.lamps) {
      const broken = l.station.system && !this.sim.systems[l.station.system];
      l.light.setFillStyle(
        broken
          ? 0xdb926e
          : this.sim.resources.energy > 0.5
            ? 0x8dc8ba
            : 0x4d626d,
      );
      l.light.setAlpha(
        broken
          ? 0.55 + Math.sin(time / 320) * 0.3
          : this.sim.resources.energy > 0.5
            ? 0.8
            : 0.2,
      );
      l.label.setVisible(!!broken);
      l.ring.setVisible(this.nearest?.id === l.station.id && !this.blocked);
    }
    if (this.sim.activeEvents.length > this.lastAlert) this.audio.tone("alert");
    this.lastAlert = this.sim.activeEvents.length;
    this.onFrame();
    this.guide?.update(
      time,
      this.player,
      this.sim.status === "playing",
    );
  }
  celebrateStation(id: string) {
    this.completion = id;
  }
  reset(sim: Simulation) {
    this.sim = sim;
    this.player.setPosition(765, 350);
    this.motion = idleMotion();
    this.nearest = undefined;
    this.completion = undefined;
  }
}
