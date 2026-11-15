import type { Simulation } from "../systems/Simulation";
import type { Objective } from "../systems/objectives";
import { auraMessage } from "./Aura";
export interface AuraTip { id: string; text: string; }
/** Delivers milestones once and context-dependent hints at bounded intervals. */
export class AuraCoach {
  private seen = new Set<string>();
  private active?: AuraTip & { until: number; goal?: string };
  private progress = "";
  private progressAt = 0;
  private reminderAt = -100;
  private lastCritical?: { id: string; time: number };
  reset() { this.seen.clear(); this.active = undefined; this.progress = ""; this.progressAt = 0; this.reminderAt = -100; this.lastCritical = undefined; }
  update(sim: Simulation, objective?: Objective, nearest?: string): AuraTip | undefined {
    const progress = `${objective?.id}:${sim.research}:${sim.repairs}:${sim.expedition.collected.plant}:${sim.expedition.collected.water}:${sim.expedition.batteriesReady}`;
    if (progress !== this.progress) { this.progress = progress; this.progressAt = sim.time; }
    const solar = sim.activeEvents.find((e) => e.system === "solar");
    const emergency = sim.activeEvents.find((e) => e.system !== "solar");
    const base = auraMessage(sim, objective);
    if (base?.id.startsWith("critical-")) {
      if (this.active?.id === base.id && this.active.until > sim.time) return this.active;
      if (this.lastCritical?.id !== base.id || sim.time - this.lastCritical.time >= 30) {
        this.lastCritical = { id: base.id, time: sim.time };
        this.active = { ...base, until: sim.time + 7 }; return this.active;
      }
      // Do not suggest spending scarce resources while the warning is still true.
      this.active = undefined; return undefined;
    }
    this.lastCritical = undefined;
    const candidates: (AuraTip & { goal?: string })[] = [];
    if (base?.id.startsWith("critical-")) candidates.push(base);
    if (solar && !sim.shielded) candidates.push({ id: "first-solar", text: `Alerta solar: revisa el refugio. ${sim.solarRecord ? `Contexto histórico NASA DONKI: ${sim.solarRecord.id}. ` : ""}El peligro de la colonia es simulado; ese registro no demuestra una amenaza para Marte.` });
    if (emergency && objective?.urgent) candidates.push({ id: "first-emergency", text: `Tenemos una avería. Busca el equipo señalado y realiza el mantenimiento. Destino: ${objective.room.toLowerCase()}.`, goal: objective.id });
    if (this.active && this.active.until > sim.time && (!this.active.goal || this.active.goal === objective?.id) &&
      !(this.active.id.startsWith("critical-") && base?.id !== this.active.id) &&
      !(this.active.id.startsWith("processing-") && !sim.expedition.processing) &&
      !(this.active.id.startsWith("near-") && nearest !== objective?.stationId) &&
      !(this.active.id === "first-night" && sim.daylight) &&
      !(this.active.id === "first-solar" && (!solar || sim.shielded)) && !(this.active.id === "first-emergency" && !emergency)) {
      const priority = candidates.find((c) => !this.seen.has(c.id));
      if (!priority) return this.active;
    }
    if (!sim.daylight) candidates.push({ id: "first-night", text: "El Sol está desapareciendo. Desde ahora dependemos de las baterías. Consulta la energía arriba o abre Reservas con R." });
    if (sim.expedition.processing || sim.research > 0) candidates.push({ id: "first-analysis", text: "Investigar consume energía y agua. El laboratorio guarda los resultados automáticamente; puedes continuar la siguiente tarea mientras procesa." });
    if (objective?.urgent) candidates.push({ id: `urgent-${objective.id}`, text: `${objective.title}. Destino: ${objective.room.toLowerCase()}.`, goal: objective.id });
    if (sim.research > 0) {
      const sample = sim.expedition.results.at(-1);
      const lesson = sample === "plant" ? "NASA OSD-37 compara plantas en vuelo espacial y en Tierra; nuestra muestra es simulada." : sample === "water" ? "Los cultivos necesitan agua, luz y tiempo (CSA)." : "Arcadia Planitia es real; la muestra y los resultados de Base Aurora son ficticios.";
      candidates.push({ id: `discovery-${sim.research}`, text: `Resultado guardado ${sim.research}/3. ${lesson} Más en el Archivo científico (R).` });
    }
    if (base && !base.id.startsWith("critical-") && !base.id.startsWith("goal-")) candidates.push(base);
    if (sim.expedition.processing && objective && !objective.waiting)
      candidates.push({ id: `processing-${sim.expedition.processing}`, text: `El laboratorio sigue procesando. Mientras tanto: ${objective.title.toLowerCase()}. Destino: ${objective.room.toLowerCase()}.`, goal: objective.id });
    if (nearest && nearest === objective?.stationId)
      candidates.push({ id: `near-${objective.id}`, text: `Estás junto al equipo correcto. Pulsa E. ${objective.instruction}`, goal: objective.id });
    if (objective && !objective.done)
      candidates.push({ id: `goal-${objective.id}`, text: `${objective.title}. ${objective.room.toLowerCase()} · Pulsa E junto al equipo.`, goal: objective.id });
    let next = candidates.find((c) => !this.seen.has(c.id));
    if (!next && objective && sim.time - this.progressAt > 25 && sim.time - this.reminderAt > 30) {
      next = { id: `reminder-${objective.id}-${Math.floor(sim.time)}`, text: `${objective.title}. ${objective.instruction}`, goal: objective.id };
      this.reminderAt = sim.time;
    }
    if (!next) { this.active = undefined; return undefined; }
    this.seen.add(next.id); this.active = { ...next, until: sim.time + 7 };
    return this.active;
  }
}
