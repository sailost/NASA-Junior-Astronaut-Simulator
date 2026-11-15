import { tutorialSteps } from "./steps";
import type { Simulation } from "../systems/Simulation";
import { getObjectives, recommendObjective } from "../systems/objectives";
import { stations } from "../world/map";
import balance from "../config/balance.json";

export const TUTORIAL_KEY = "aurora-tutorial-v1";
export interface TutorialStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export function tutorialTarget(sim: Simulation) {
  const objectives = getObjectives(sim);
  const objective = recommendObjective(objectives);
  return stations.find((s) => s.id === objective?.stationId) ||
    stations.find((s) => s.id === objectives.find((o) => !o.done && !o.waiting && o.stationId)?.stationId) ||
    stations.find((s) => s.kind === "control");
}
export function decisionHint(sim: Simulation) {
  const target = tutorialTarget(sim);
  if (target?.kind === "greenhouse" && !sim.expedition.collected.plant)
    return `Recoge la planta y sigue la misión hasta el Laboratorio. Calibrar su análisis consume ${balance.costs.researchEnergy} energía y ${balance.costs.researchWater} agua; el resultado permite avanzar la investigación.`;
  if (target?.kind === "research")
    return `Coloca y calibra la muestra. El análisis consume ${balance.costs.researchEnergy} energía y ${balance.costs.researchWater} agua y después se procesa automáticamente.`;
  if (target?.system && !sim.systems[target.system])
    return `Restaurar ${target.name.toLowerCase()} consume ${balance.costs.repair} energía y 1 repuesto, pero recupera su funcionamiento. Completa sus controles para decidir hacerlo.`;
  if (target?.kind === "signal")
    return `Transmitir requiere ${balance.costs.transmissionEnergy} energía. La confirmación llegará después; alinear la señal no elimina la distancia a la Tierra.`;
  return "Elige una acción disponible en la consola. Lee su coste y su efecto antes de realizarla. En Control, cambiar prioridades modifica producción y consumo sin un recargo inicial.";
}

/** Stores learning progress only. Never copies, advances or restores simulation state. */
export class TutorialManager {
  active = false;
  index = 0;
  private origin?: { x: number; y: number };
  private distance = 0;
  private learned = new Set<string>();
  private finishedThisSession = false;
  private prologueRead = false;
  setPrologueRead(read: boolean) { this.prologueRead = read; }
  private get visibleSteps() { return tutorialSteps.filter((step) => !this.prologueRead || !["mars", "mission"].includes(step.id)); }
  get stepNumber() { return this.visibleSteps.findIndex((step) => step.id === this.step.id) + 1; }
  get totalSteps() { return this.visibleSteps.length; }
  constructor(private storage: TutorialStorage) {}
  get step() { return tutorialSteps[this.index]; }
  get canNext() { return this.step.kind === "read" || this.step.kind === "resource" || this.learned.has(this.step.id); }
  get allowsMovement() { return this.active && ["movement", "interaction", "decision"].includes(this.step.kind); }
  get shouldStart() {
    if (this.finishedThisSession) return false;
    try { return !["done", "skipped"].includes(this.storage.getItem(TUTORIAL_KEY) || ""); }
    catch { return true; }
  }
  start() { this.active = true; this.index = 0; this.learned.clear(); this.resetMovement(); }
  beginPractice() {
    if (!this.active || this.step.id !== "welcome") return;
    this.index = tutorialSteps.findIndex((step) => step.kind === "movement");
    this.resetMovement();
  }
  next() {
    if (!this.active || !this.canNext) return false;
    if (this.index === tutorialSteps.length - 1) this.finish("done");
    else {
      do { this.index++; } while (this.prologueRead && ["mars", "mission"].includes(this.step.id));
      this.resetMovement();
    }
    return true;
  }
  previous() {
    if (!this.active || this.index === 0) return;
    do { this.index--; } while (this.prologueRead && ["mars", "mission"].includes(this.step.id));
    this.resetMovement();
  }
  observe(player?: { x: number; y: number }) {
    if (!this.active || this.step.kind !== "movement" || !player) return false;
    if (this.origin) {
      const displacement = Math.hypot(player.x - this.origin.x, player.y - this.origin.y);
      // Ignore teleports/reset, count actual successive movement observations.
      if (displacement < 80) this.distance += displacement;
    }
    this.origin = { x: player.x, y: player.y };
    if (this.distance >= 64) { this.learned.add(this.step.id); this.index++; this.resetMovement(); return true; }
    return false;
  }
  interact(id: string, sim: Simulation, player?: { x: number; y: number }) {
    const target = tutorialTarget(sim);
    if (!this.active || this.step.kind !== "interaction" || !target || target.id !== id || !player ||
      Math.hypot(player.x - target.x, player.y - target.y) >= 115) return false;
    this.learned.add(this.step.id); this.index++; return true;
  }
  decision(action: string, succeeded: boolean) {
    const decisions = ["laboratory", "oxygen", "water", "circuit", "signal", "greenhouse", "shelter", "plant", "upgrade", "battery-reserve", "tend", "allocation", "harvest"];
    if (!this.active || this.step.kind !== "decision" || !succeeded || !decisions.includes(action)) return false;
    this.learned.add(this.step.id); this.index++; return true;
  }
  skip() { if (this.active) this.finish("skipped"); }
  cancel() { this.active = false; this.resetMovement(); }
  private resetMovement() { this.origin = undefined; this.distance = 0; }
  private finish(value: string) {
    this.cancel();
    this.finishedThisSession = true;
    try { this.storage.setItem(TUTORIAL_KEY, value); } catch { /* A blocked store must never block play. */ }
  }
}
