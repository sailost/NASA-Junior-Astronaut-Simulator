import type { Simulation } from "./Simulation";
import type { SampleId } from "./Expedition";
import type { Objective } from "./objectives";
import type { SystemId } from "./events";
export type CampaignOutcome = "victory" | "partial" | "defeat";
export const campaignSources = {
  plants: { label: "CSA · Producción de alimentos", url: "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/" },
  water: { label: "NASA · Recuperación de agua en la ISS", url: "https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/" },
  soil: { label: "NASA · Sistemas de cultivo PONDS", url: "https://technology.nasa.gov/advancing-commercial-space/habitation_systems" },
};
export interface Evidence { sample: SampleId; observation: string; interpretation: string; decision?: string; source: { label: string; url: string }; }
export interface CampaignCheckpoint { level: number; time: number; resources: Simulation["resources"]; systems: Simulation["systems"]; decisions: string[]; evidence: Evidence[]; }
/** Narrative progress observes the existing simulator; snapshots never replace live resources. */
export class Campaign {
  level: 1 | 2 | 3 = 1;
  elapsed = 0;
  pending?: "sol2" | "sol3";
  evidence: Evidence[] = [];
  plantPlan?: "economy" | "growth";
  waterPlan?: "recovery" | "reserve";
  soilPlan?: "isolate" | "condition";
  nightRisk: SystemId = "oxygen";
  diagnosed = false;
  nightRepaired = false;
  solarStarted = false;
  protectedDuringAlert = false;
  partialReport = false;
  checkpoints: CampaignCheckpoint[] = [];
  criticalHistory: string[] = [];
  damageHistory: string[] = [];
  private nightFaultStarted = false;
  private trialPeak = 0;
  private finalTrialAt?: number;
  private finalTrialGrowth = 0;
  private finalTrialGain = 0;
  verifiedTrial = false;
  missionRemaining = 20;
  timedMission = "";
  missionOverdue = false;
  nightMissions(sim: Simulation) { return this.level === 2 && !this.pending && sim.status === "playing" ? this.objectives(sim).filter((o) => !o.done) : []; }
  syncMissionClock(sim: Simulation, dt = 0) {
    if (this.level !== 2) { this.timedMission = ""; this.missionRemaining = 20; this.missionOverdue = false; return; }
    const current = this.objectives(sim).find((o) => !o.done);
    const key = current ? `${this.level}:${current.id}` : "";
    if (key !== this.timedMission) { this.timedMission = key; this.missionRemaining = 20; this.missionOverdue = false; return; }
    if (!key || this.pending) return;
    const overdue = Math.max(0, dt - this.missionRemaining);
    this.missionRemaining = Math.max(0, this.missionRemaining - dt);
    this.missionOverdue = this.missionRemaining === 0;
    if (overdue > 0) {
      const count = this.nightMissions(sim).length;
      sim.resources.health = Math.max(0, sim.resources.health - overdue * (.3 + count * .12));
      if (sim.resources.health === 0) { sim.status = "lost"; sim.reason = count ? "La amenaza ficticia de la noche agotó la salud mientras quedaban misiones pendientes fuera de plazo." : "La salud se agotó tras mantener un objetivo pendiente fuera de su plazo de 20 segundos."; }
    }
  }
  get title() { return ["", "SOL 1 · Preparar una colonia autónoma", "SOL 2 · Sostener la noche", "SOL 3 · Demostrar lo aprendido"][this.level]; }
  firstLevelStep(sim: Simulation) {
    if (!sim.expedition.collected.plant) return { id: "sample", title: "recoger la muestra vegetal en el Invernadero" };
    if (!sim.expedition.results.includes("plant")) return { id: "analysis", title: "completar el análisis vegetal en el Laboratorio" };
    if (!this.plantPlan) return { id: "decision", title: "elegir la estrategia de cultivo en el Laboratorio" };
    if (sim.crop < 0) return { id: "trial", title: "plantar con la forma de riego que elegiste" };
    return { id: "energy", title: "preparar una reserva nocturna viable en la Sala de Máquinas" };
  }
  actionLock(action: string, sim: Simulation): string | undefined {
    if (this.level !== 1) return;
    if (this.pending) return "El nivel ya terminó. Continúa la transición para avanzar.";
    if (action.startsWith("repair:") && !sim.systems[action.slice(7) as SystemId]) return;
    const step = this.firstLevelStep(sim);
    const allowed: Record<string, string[]> = { sample: ["collect-plant"], analysis: ["research"], decision: ["campaign-plant-economy", "campaign-plant-growth"], trial: ["plant"], energy: ["battery-reserve", "upgrade", "allocation"] };
    if (!allowed[step.id].includes(action)) return `Primero debes ${step.title}. Las siguientes misiones se desbloquean en orden.`;
  }
  get decisions() { return [this.plantPlan && `Cultivo: ${this.plantPlan === "economy" ? "ahorro de agua" : "crecimiento intensivo"}`, this.waterPlan && `Agua: ${this.waterPlan === "recovery" ? "más recuperación, más carga eléctrica" : "menor consumo de tripulación"}`, this.soilPlan && `Sustrato: ${this.soilPlan === "isolate" ? "circuito aislado" : "acondicionado"}`].filter(Boolean) as string[]; }
  checkpoint(sim: Simulation) {
    const snapshot: CampaignCheckpoint = { level: this.level, time: sim.time, resources: { ...sim.resources }, systems: { ...sim.systems }, decisions: [...this.decisions], evidence: this.evidence.map((e) => ({ ...e, source: { ...e.source } })) };
    this.checkpoints.push(snapshot); return snapshot;
  }
  recordAnalysis(sample: SampleId, sim: Simulation) {
    if (this.evidence.some((e) => e.sample === sample)) return;
    const definitions = {
      plant: ["Comparación del juego: regar menos conserva agua, pero la planta crece más despacio. Regar más acelera el crecimiento y gasta más agua.", "Elige cómo quieres cuidar el cultivo. Esta comparación usa valores inventados para jugar; en un experimento real hay que observar plantas bajo distintas condiciones."],
      water: [`Reserva al analizar: ${Math.round(sim.resources.water)} / 100. El reciclador ${sim.systems.water ? "está operativo" : "está detenido"}; sin electricidad no recupera agua.`, "Recuperar más agua demanda energía; reducir consumo conserva reserva. No se simula potabilidad ni se mide agua real."],
      soil: ["El sustrato es el material donde crecen las raíces. En esta prueba del juego podemos preparar ese material o separar el circuito de agua del cultivo.", "Elige una solución según el agua y la electricidad disponibles. Esta prueba no mide el suelo real de Marte."],
    };
    this.evidence.push({ sample, observation: definitions[sample][0], interpretation: definitions[sample][1], source: sample === "plant" ? campaignSources.plants : campaignSources[sample] });
    sim.note(`EVIDENCIA ${sample}: ${definitions[sample][1]}`);
  }
  nightForecast(sim: Simulation) {
    const load = .12 + .055 * (sim.allocation === "science" ? 5 : 4) + (sim.crop >= 0 ? .035 : 0) - (sim.expedition.reserveMode ? .05 : 0) + (this.waterPlan === "recovery" ? .04 : 0);
    const provision = (sim.expedition.results.includes("water") ? 0 : 12) + (this.solarStarted ? 0 : 6) + (this.nightRepaired ? 0 : 5);
    return sim.resources.energy - load * 90 - provision;
  }
  act(action: string, sim: Simulation): string | undefined {
    if (!action.startsWith("campaign-")) return;
    const locked = this.actionLock(action, sim); if (locked) return locked;
    if (this.pending || sim.status !== "playing") return "Termina la transición antes de continuar.";
    if (action.startsWith("campaign-inspect-")) {
      const system = action.slice(17);
      if (this.level !== 2) return "El diagnóstico nocturno aún no está disponible.";
      if (system !== this.nightRisk) return "Ese circuito no explica la señal marcada. Compara su estado con el síntoma de la misión; puedes inspeccionar el otro equipo sin pagar una reparación.";
      this.diagnosed = true; sim.note(`Diagnóstico: ${this.riskSignal}. La reparación restaurará su producción.`);
      return `Diagnóstico confirmado: ${this.riskSignal}. ${this.nightFaultStarted && !sim.systems[this.nightRisk] ? "Ahora restaura este equipo." : this.nightFaultStarted ? "El circuito ya está restaurado; el registro conecta el síntoma con su reparación." : "La anomalía está evolucionando; comprueba el estado antes de reparar."}`;
    }
    if (action === "campaign-partial") {
      if (this.level !== 3 || sim.research < 2) return "Necesitas al menos las evidencias de planta y agua para enviar un informe parcial.";
      this.partialReport = true; sim.note("Decisión: cerrar con un informe parcial. No se otorgará una victoria científica completa.");
      return "Informe parcial preparado. Alinea la antena para enviarlo; se conservarán las limitaciones en el desenlace.";
    }
    if (action === "campaign-verify") {
      if (this.level !== 3 || !this.soilPlan) return "Primero elige en el Laboratorio cómo preparar el material del cultivo.";
      if (this.verifiedTrial) return "Ya comprobaste el cultivo.";
      if (this.finalTrialGain < 1 || !sim.systems.greenhouse || sim.resources.energy <= .5) return "Todavía no hay crecimiento que comprobar. Revisa el agua y la electricidad; si ya cosechaste, planta de nuevo.";
      this.verifiedTrial = true; sim.note("Comprobación realizada en el Invernadero: el cultivo creció después del cambio.");
      return "Comprobaste que la planta sigue creciendo después de la intervención.";
    }
    const type = action.startsWith("campaign-plant-") ? "plant" : action.startsWith("campaign-water-") ? "water" : action.startsWith("campaign-soil-") ? "soil" : undefined;
    if (!type || !this.evidence.some((e) => e.sample === type)) return "Primero analiza la muestra: la decisión debe apoyarse en su evidencia.";
    if (type === "plant" && !this.plantPlan && this.level === 1 && ["campaign-plant-economy", "campaign-plant-growth"].includes(action)) {
      this.plantPlan = action.endsWith("economy") ? "economy" : "growth";
    } else if (type === "water" && !this.waterPlan && this.level === 2 && ["campaign-water-recovery", "campaign-water-reserve"].includes(action)) {
      this.waterPlan = action.endsWith("recovery") ? "recovery" : "reserve";
    } else if (type === "soil" && !this.soilPlan && this.level === 3 && ["campaign-soil-isolate", "campaign-soil-condition"].includes(action)) {
      const isolate = action.endsWith("isolate");
      if (!sim.spend(isolate ? 5 : 2, isolate ? 2 : 8)) return "Faltan recursos para aplicar esta configuración. Revisa los costes y elige la alternativa viable.";
      this.soilPlan = isolate ? "isolate" : "condition";
      this.finalTrialAt = sim.time; this.finalTrialGrowth = sim.crop;
    } else return "Esta decisión ya está aplicada o no corresponde a la etapa actual.";
    this.evidence.find((e) => e.sample === type)!.decision = this.decisions.at(-1);
    sim.note(`DECISIÓN: ${this.decisions.at(-1)}. Los consumos y el crecimiento cambian desde ahora.`);
    return `${this.decisions.at(-1)}. Observa ahora la tendencia de reservas y cultivo para comprobar el efecto.`;
  }
  get riskSignal() { return this.nightRisk === "power" ? "la alimentación cae y se detiene la recuperación de las reservas" : this.nightRisk === "water" ? "el filtro pierde caudal y deja de recuperar agua" : "la válvula pierde caudal y deja de reponer oxígeno"; }
  advance(sim: Simulation) {
    if (!this.pending || sim.status !== "playing") return false;
    this.level = this.pending === "sol2" ? 2 : 3; this.pending = undefined; this.elapsed = 0;
    if (this.level === 2) {
      this.nightRisk = sim.resources.energy < 40 ? "power" : sim.resources.water < 70 ? "water" : "oxygen";
      this.nightFaultStarted = true; sim.trigger(this.nightRisk);
      sim.note(`SEÑAL NOCTURNA: ${this.riskSignal}. Inspecciona el circuito señalado; el diagnóstico pertenece a este escenario simulado.`);
    } else sim.note("Tierra solicita una conclusión: utiliza las evidencias de cultivo y agua para escoger una configuración de sustrato y demostrar su funcionamiento.");
    this.syncMissionClock(sim); return true;
  }
  update(sim: Simulation, dt: number) {
    if (this.pending || sim.status !== "playing") return;
    this.elapsed += dt; this.trialPeak = Math.max(this.trialPeak, sim.crop);
    for (const [key, value] of Object.entries(sim.resources)) {
      if ((key === "radiation" ? value > 35 : value < (key === "health" ? 55 : 18)) && !this.criticalHistory.includes(key)) this.criticalHistory.push(key);
    }
    for (const [key, working] of Object.entries(sim.systems)) if (!working && !this.damageHistory.includes(key)) this.damageHistory.push(key);
    if (this.level === 2) {
      if (!this.nightFaultStarted && this.elapsed >= 12) { this.nightFaultStarted = true; sim.trigger(this.nightRisk); }
      if (this.nightFaultStarted && sim.systems[this.nightRisk] && !sim.activeEvents.some((e) => e.system === this.nightRisk)) this.nightRepaired = true;
      if (this.nightRepaired && this.diagnosed && !this.solarStarted) { this.solarStarted = true; sim.trigger("solar"); sim.note("EJERCICIO PREVENTIVO: el registro DONKI es contexto histórico, no una predicción de peligro marciano. El aviso y la exposición son simulados."); }
      if (this.solarStarted && sim.shielded && sim.activeEvents.some((e) => e.system === "solar")) this.protectedDuringAlert = true;
    }
    if (this.level === 3 && this.finalTrialAt !== undefined) {
      this.finalTrialGain += Math.max(0, Math.max(0, sim.crop) - Math.max(0, this.finalTrialGrowth));
      this.finalTrialGrowth = sim.crop;
    }
    const dayComplete = this.level === 1 && !!this.plantPlan && sim.crop >= 0 && sim.expedition.batteriesReady && this.nightForecast(sim) >= 8;
    const nightComplete = this.level === 2 && this.nightRepaired && this.diagnosed && !!this.waterPlan && this.protectedDuringAlert;
    if (nightComplete) {
      for (const event of sim.activeEvents) if (event.system === "solar") { event.resolved = true; event.remaining = 0; }
    }
    if (dayComplete || nightComplete) {
      this.checkpoint(sim); this.pending = dayComplete ? "sol2" : "sol3"; sim.paused = true;
      sim.note(`Etapa ${this.level} completada por sus objetivos. Estado conservado para la transición.`);
    }
    if (this.level === 3 && sim.report === "received") {
      const complete = sim.research === 3 && !!this.soilPlan && this.verifiedTrial && this.protectedDuringAlert && !this.partialReport;
      const stable = sim.resources.health >= 55 && sim.resources.radiation < 35 && Object.values(sim.systems).every(Boolean);
      sim.status = complete && stable ? "won" : "partial";
      sim.reason = sim.status === "won" ? "Tierra confirmó las tres evidencias, las decisiones aplicadas y el ensayo final. La colonia demostró autonomía." : "La tripulación continúa a salvo, pero el informe o la estabilidad de la colonia presentan limitaciones. Revisa las evidencias y las decisiones del resumen.";
    }
    if (sim.status === "playing") this.syncMissionClock(sim, dt);
  }
  outcome(sim: Simulation): CampaignOutcome { return sim.status === "won" ? "victory" : sim.status === "partial" ? "partial" : "defeat"; }
  objectives(sim: Simulation): Objective[] {
    const make = (id: string, title: string, stationId: string, room: string, instruction: string, done: boolean, progress = "E · INSPECCIONAR") => ({ id, title, stationId, room, instruction, done, progress });
    const e = sim.expedition;
    const analysis = (sample: SampleId, label: string) => make(`analyze-${sample}`, `Investiga ${label}`, "research", "LABORATORIO", `Coloca la muestra, calibra el escáner y lee su evidencia. ${sample === "plant" ? "La comparación servirá para elegir riego y crecimiento." : sample === "water" ? "Utiliza el resultado para decidir cómo conservar agua durante la noche." : "Compara configuraciones antes de aplicar el ensayo final."}`, e.results.includes(sample), e.processing === sample ? `PROCESANDO · ${Math.ceil(e.remaining)} s · puedes atender otro equipo` : `${sim.research}/3 evidencias`);
    const list = this.level === 1 ? [
      make("collect-plant", "Recoge una hoja en el Invernadero", "greenhouse", "INVERNADERO", "Una muestra es una pequeña parte de una planta: aquí recogemos una hoja. La llevaremos al Laboratorio para empezar una prueba sobre el cuidado del cultivo.", e.collected.plant),
      analysis("plant", "el equilibrio entre riego y crecimiento"),
      make("plant-plan", "Aplica una estrategia de cultivo", "research", "LABORATORIO", "Lee las dos alternativas del ensayo simulado. Elige ahorro de agua o mayor crecimiento: cambiarán el consumo y el rendimiento.", !!this.plantPlan),
      make("plant-trial", "Planta con el riego elegido", "greenhouse", "INVERNADERO", "Ve al Invernadero y pulsa Plantar. Se aplicará el riego que elegiste; el cultivo necesitará agua y electricidad para crecer.", sim.crop >= 0, sim.crop >= 0 ? "CULTIVO INICIADO" : "E · PLANTAR"),
      make("batteries", "Asegura una reserva nocturna viable", "power", "SALA DE MÁQUINAS", "Compara el pronóstico de 90 s sin generación solar. Configura ahorro nocturno o mejora paneles de día; la previsión debe conservar al menos 8 de energía.", e.batteriesReady && this.nightForecast(sim) >= 8, `Previsión simulada: ${Math.floor(this.nightForecast(sim))} energía`),
    ] : this.level === 2 ? [
      make("diagnose-night", "Interpreta la señal nocturna", this.nightRisk, this.nightRisk === "power" ? "SALA DE MÁQUINAS" : "SOPORTE VITAL", `Síntoma: ${this.riskSignal}. Inspecciona ese equipo antes de gastar repuestos.`, this.diagnosed),
      make("restore-night", "Recupera la producción que falta", this.nightRisk, this.nightRisk === "power" ? "SALA DE MÁQUINAS" : "SOPORTE VITAL", "Comprueba la avería y restaura su circuito. Observa después el cambio de tendencia en las reservas.", this.nightRepaired),
      make("collect-water", "Obtén evidencia del reciclaje", "water", "SOPORTE VITAL", "Recoge una muestra con el reciclador operativo. Compararemos recuperación y consumo energético.", e.collected.water),
      analysis("water", "la autonomía del agua"),
      make("water-plan", "Decide cómo conservar el agua", "research", "LABORATORIO", "Aplica la evidencia: aumentar recuperación consume más electricidad; reducir demanda ahorra agua sin acelerar su producción.", !!this.waterPlan),
      make("night-protection", "Aplica el protocolo y supera la noche", "shelter", "REFUGIO", "Tras la reparación se activará un ejercicio preventivo con aviso. Atiende el refugio y termina la investigación durante el protocolo.", this.solarStarted && !sim.activeEvents.some((event) => event.system === "solar"), this.solarStarted ? sim.shielded ? "TRIPULACIÓN A CUBIERTO · protocolo en curso" : "CONSULTA EL AVISO SOLAR" : "EL PROTOCOLO AÚN NO ESTÁ ACTIVO"),
    ] : [
      analysis("soil", "la configuración del sustrato"),
      make("soil-plan", "Aplica lo aprendido al sustrato", "research", "LABORATORIO", "Escoge entre aislar el circuito hidropónico o acondicionar el sustrato experimental. Compara costes y efectos; no son mediciones de suelo marciano real.", !!this.soilPlan),
      make("verify-trial", "Comprueba cómo está creciendo la planta", "greenhouse", "INVERNADERO", "Ve al Invernadero y pulsa Comprobar crecimiento. Así registrarás si la planta creció después del cambio; si ya cosechaste, planta de nuevo.", this.verifiedTrial),
      make("report", "Envía a Tierra lo que aprendiste", "comms", "CENTRO DE CONTROL", "Alinea la antena y envía los resultados. La confirmación llegará después; enviar el informe completa este objetivo.", sim.report !== "none", sim.report === "pending" ? `CONFIRMACIÓN EN ${Math.ceil(Math.max(0, sim.reportDue - sim.time))} s` : "INFORME PREPARADO"),
    ];
    // Group related operations into complete problems, rather than a quest per click.
    const grouped = list.filter((o) => !["plant-plan", "diagnose-night", "collect-water", "analyze-water", "analyze-soil"].includes(o.id)).map((o) => {
      if (o.id === "analyze-plant") return { ...o, title: "Estudia la hoja y elige cómo regar", done: e.results.includes("plant") && !!this.plantPlan, instruction: !e.results.includes("plant") ? "Lleva la hoja al Laboratorio. El lector inicia una prueba del juego para comparar dos formas de regar antes de plantar." : "La prueba terminó. Elige usar menos agua o dar prioridad al crecimiento; esa elección se aplicará cuando plantes." };
      if (o.id === "restore-night") return { ...o, title: "Diagnostica y restaura el soporte vital", done: this.diagnosed && (this.nightRepaired || this.nightFaultStarted && sim.systems[this.nightRisk]), instruction: `Síntoma: ${this.riskSignal}. Inspecciona el circuito y repáralo para recuperar su producción; una reparación sin diagnóstico no explica el problema.` };
      if (o.id === "water-plan") return { ...o, title: "Asegura el agua de la noche", stationId: e.collected.water ? "research" : "water", room: e.collected.water ? "LABORATORIO" : "SOPORTE VITAL", instruction: !e.collected.water ? "Recoge agua del reciclador en Soporte vital. La llevamos al Laboratorio para comparar recuperación y gasto eléctrico, antes de elegir cómo conservarla." : !e.results.includes("water") ? "Lleva el agua al Laboratorio y calibra el análisis. Queremos decidir cómo sostener el agua sin agotar la electricidad." : o.instruction };
      if (o.id === "night-protection") return { ...o, title: "Protege a la tripulación y despeja la base", done: this.protectedDuringAlert, instruction: "Activa el refugio durante el protocolo. Resolver las tres misiones elimina los marcianitos ficticios y permite que amanezca; no necesitas esperar un reloj.", progress: this.protectedDuringAlert ? "PROTECCIÓN APLICADA" : "REFUGIO · PROTOCOLO DE SEGURIDAD" };
      if (o.id === "soil-plan") return { ...o, title: "Prepara el material donde crecen las raíces", instruction: !e.results.includes("soil") ? "El sustrato es el material donde crecen las raíces. Estudia en el Laboratorio el material que ya está guardado y decide cómo preparar el cultivo." : "Elige cómo preparar el material o el circuito de agua del cultivo. Compara lo que cuesta cada opción." };
      return o;
    });
    let blocked = false;
    return grouped.map((objective) => {
      if (this.level === 1) {
        const waiting = blocked;
        if (!objective.done) blocked = true;
        return { ...objective, waiting };
      }
      const processing = objective.id === `analyze-${e.processing}` || objective.id === "plant-trial" && sim.crop >= 0;
      // Water and soil are grouped missions: collecting/analyzing unlocks their
      // decision controls, but must never hide the guide to that first step.
      const prerequisite = objective.id === "plant-trial" && !this.plantPlan || objective.id === "verify-trial" && !this.soilPlan || objective.id === "night-protection" && !this.solarStarted;
      const waiting = blocked || processing || prerequisite;
      if (!objective.done && !processing && !prerequisite) blocked = true;
      return { ...objective, waiting };
    });
  }
}
