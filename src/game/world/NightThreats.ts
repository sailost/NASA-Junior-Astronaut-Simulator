import type Phaser from "phaser";
import type { Simulation } from "../systems/Simulation";
import { stations } from "./map";
import { NightPursuit } from "./NightPursuit";
import type { Point } from "./navigation";
/** Fictional adversaries, one per unresolved night mission. */
export class NightThreats {
  private actors: { id: string; node: Phaser.GameObjects.Container; pursuit?: NightPursuit }[] = [];
  private sim?: Simulation;
  constructor(scene: Phaser.Scene) {
    for (const id of ["restore-night", "water-plan", "night-protection"]) {
      const ink = scene.add.graphics();
      ink.fillStyle(0x070f21,.45); ink.fillEllipse(0,18,34,10);
      ink.fillStyle(0x514a76); ink.fillEllipse(0,4,19,25);
      ink.fillStyle(0x81979f); ink.fillEllipse(0,-13,28,29);
      ink.fillStyle(0x111c31); ink.fillEllipse(-7,-14,9,13); ink.fillEllipse(7,-14,9,13);
      ink.fillStyle(0x9ff5d6); ink.fillEllipse(-7,-15,3,7); ink.fillEllipse(7,-15,3,7);
      ink.lineStyle(1,0xb8eddb,.7); ink.lineBetween(-3,-3,3,-3);
      this.actors.push({id,node:scene.add.container(0,0,[ink]).setDepth(19).setVisible(false)});
    }
  }
  update(time: number, sim: Simulation, player?: Point, dt = 0, active = true) {
    if (this.sim !== sim) {
      for (const actor of this.actors) actor.pursuit = undefined;
      this.sim = sim;
    }
    const pending = sim.campaign?.nightMissions(sim) || [];
    const running = active && !sim.paused && sim.status === "playing";
    let contacts = 0;
    for (const actor of this.actors) {
      const mission = pending.find((o)=>o.id===actor.id);
      actor.node.setVisible(!!mission);
      if (!mission) { actor.pursuit = undefined; continue; }
      const station = stations.find((s)=>s.id===mission.stationId)!;
      actor.pursuit ??= new NightPursuit(station);
      if (running && player) actor.pursuit.update(dt, player, sim.campaign!.missionOverdue ? 124 : 110);
      const touching = !!player && actor.pursuit.touches(player);
      if (touching) contacts++;
      actor.node.setPosition(actor.pursuit.x, actor.pursuit.y + Math.sin(time/200+station.x)*2);
      actor.node.setScale(touching && running ? 1.12 + Math.sin(time / 70) * .05 : 1);
    }
    if (running) sim.applyNightAttack(contacts, dt);
  }
}
