import balance from "../config/balance.json";
import { Expedition, sampleNames, type SampleId } from "./Expedition";
import { createEmergency, type Emergency, type SystemId } from "./events";
import { Campaign } from "./Campaign";
export type Resource = keyof typeof balance.initial;
export type Allocation = "balanced" | "survival" | "science";
export class Simulation {
  resources = { ...balance.initial };
  systems: Record<SystemId, boolean> = {
    power: true,
    oxygen: true,
    water: true,
    greenhouse: true,
    comms: true,
  };
  systemEfficiency: Record<SystemId, number> = { power: 1, oxygen: 1, water: 1, greenhouse: 1, comms: 1 };
  time = 0;
  paused = false;
  status: "playing" | "won" | "partial" | "lost" = "playing";
  campaign?: Campaign;
  startCampaign() {
    if (this.campaign || this.time > 0 || this.status !== "playing") return;
    this.campaign = new Campaign(this.seed);
    this.campaign.syncMissionClock(this);
    this.resources.water = this.campaign.scenario.initialWater;
    this.resources.energy = this.campaign.scenario.initialEnergy;
    this.resources.oxygen = this.campaign.scenario.initialOxygen;
    this.resources.food = this.campaign.scenario.id === "crew" ? 27 : 38;
    this.note(`Escenario: ${this.campaign.scenario.title}. ${this.campaign.scenario.briefing}`);
    this.note("Operación de autonomía iniciada: decisiones, evidencias y tres etapas. El tiempo no completa los objetivos por sí solo.");
  }
  reason = "";
  research = 0;
  researchCooldown = 0;
  expedition = new Expedition();
  crop = -1;
  harvests = 0;
  repairs = 0;
  upgrades = 0;
  spareParts = 10;
  allocation: Allocation = "balanced";
  sheltered = false;
  shielded = false;
  report: "none" | "pending" | "received" = "none";
  reportDue = 0;
  events: Emergency[] = [];
  log: { time: number; text: string }[] = [];
  achievements: string[] = [];
  solarRecord?: { id: string; date: string; url: string; type: string };
  private fired = new Set<string>();
  private critical = 0;
  private lowWarning = false;
  nightAttackUntil = 0;
  /** Contact damage from the fictional pursuers; paused lessons remain protected. */
  applyNightAttack(contacts: number, dt: number) {
    const pending = this.campaign?.nightMissions(this).length || 0;
    if (this.paused || !pending || this.status !== "playing" || dt <= 0 || contacts <= 0) return 0;
    const damage = Math.min(Math.floor(contacts), pending) * dt * (this.campaign!.missionOverdue ? 1.65 : 1.1);
    this.resources.health = Math.max(0, this.resources.health - damage);
    this.nightAttackUntil = this.time + .35;
    if (this.resources.health === 0) {
      this.status = "lost";
      this.reason = "Los marcianitos agotaron tu salud durante la noche. Mantén la distancia y completa las misiones para hacerlos desaparecer.";
    }
    return damage;
  }
  constructor(public seed = Math.floor(Math.random() * 10000)) {
    this.note("Base Aurora operativa. Dotación: cuatro tripulantes.");
  }
  get sol() {
    if (this.campaign) return this.campaign.level;
    return Math.min(3, Math.floor(this.time / balance.solSeconds) + 1);
  }
  get phase() {
    if (this.campaign) return this.campaign.level === 2 ? .78 : this.campaign.level === 3 ? .04 : .18;
    return (this.time % balance.solSeconds) / balance.solSeconds;
  }
  get daylight() {
    return this.phase < balance.dayFraction;
  }
  get duration() {
    return balance.solSeconds * 3;
  }
  get score() {
    return Math.round(
      this.resources.health * 10 +
        this.research * 180 +
        this.repairs * 60 +
        this.harvests * 90 +
        this.upgrades * 100 -
        this.resources.radiation * 5,
    );
  }
  get activeEvents() {
    return this.events.filter((e) => !e.resolved);
  }
  note(text: string) {
    this.log.push({ time: this.time, text });
  }
  private once(id: string, fn: () => void) {
    if (!this.fired.has(id)) {
      this.fired.add(id);
      fn();
    }
  }
  spend(energy: number, water = 0) {
    if (this.resources.energy < energy || this.resources.water < water)
      return false;
    this.resources.energy -= energy;
    this.resources.water -= water;
    return true;
  }
  trigger(system: Emergency["system"]) {
    if (this.activeEvents.some((e) => e.system === system)) return;
    const e = createEmergency(system, this.sol);
    this.events.push(e);
    if (system !== "solar") this.systems[system] = false;
    else if (this.solarRecord) {
      e.science += ` Registro histórico de contexto: ${this.solarRecord.id} (${this.solarRecord.date}).`;
      e.remaining = this.solarRecord.type === "CME" ? 48 : 42;
      this.note(
        `ARCHIVO DONKI: ${this.solarRecord.id}. Recreación preventiva, no predicción ni dosis en Marte.`,
      );
    }
    this.note(`ALERTA: ${e.description}. ${e.options[0]}.`);
  }
  tick(dt: number) {
    if (this.paused || this.status !== "playing" || dt <= 0) return;
    if (this.resources.health <= 0) {
      this.status = "lost";
      this.reason =
        "La salud de la tripulación llegó a cero. Revisa el soporte vital y los protocolos de protección.";
      return;
    }
    // Fixed substeps make resource consumption independent of rendering frame rate.
    let remaining = dt;
    while (remaining > 0 && this.status === "playing" && !this.paused) {
      const step = Math.min(0.25, remaining);
      this.step(step);
      remaining -= step;
    }
  }
  private step(dt: number) {
    const oldDay = this.daylight,
      oldSol = this.sol;
    this.time += dt;
    const r = this.resources,
      b = balance.rates;
    if (oldDay !== this.daylight)
      this.note(
        this.daylight
          ? "Amanece. Los paneles vuelven a producir."
          : "Comienza la noche. Ahora dependemos de las baterías.",
      );
    if (oldSol !== this.sol)
      this.note(
        `SOL ${this.sol}: ${this.sol === 2 ? "prioriza tus reservas." : "completa el informe y protege la base."}`,
      );
    const powered = r.energy > 0.5;
    const life =
      this.allocation === "survival"
        ? 1.3
        : this.allocation === "science"
          ? 0.78
          : 1;
    const plantFactor = this.campaign?.plantPlan === "economy" ? .8 : this.campaign?.plantPlan === "growth" ? 1.2 : 1;
    const substrateFactor = this.campaign?.soilPlan === "isolate" ? 1.05 : this.campaign?.soilPlan === "condition" ? 1.15 : 1;
    const plants = (this.allocation === "survival" ? 0.45 : 1) * plantFactor * substrateFactor;
    const load =
      b.basePower +
      b.systemPower * (this.allocation === "science" ? 5 : 4) +
      (this.crop >= 0 ? 0.035 : 0) -
      (!this.daylight && this.expedition.reserveMode ? 0.05 : 0) + (this.campaign?.waterPlan === "recovery" ? .04 : 0) + (!this.daylight ? this.campaign?.scenario.nightLoad || 0 : 0);
    r.energy +=
      ((this.daylight && this.systems.power
        ? b.solar * this.systemEfficiency.power * (this.upgrades ? 1.22 : 1) * (this.campaign?.scenario.solarFactor || 1)
        : 0) -
        load) *
      dt;
    r.oxygen +=
      ((powered && this.systems.oxygen ? b.oxygenProduction * life * this.systemEfficiency.oxygen : 0) -
        b.oxygenUse) *
      dt;
    r.water +=
      ((powered && this.systems.water ? b.waterRecovery * life * this.systemEfficiency.water * (this.campaign?.waterPlan === "recovery" ? 1.2 : 1) : 0) -
        b.waterUse * (this.campaign?.waterPlan === "reserve" ? .8 : 1)) *
      dt;
    r.food -= b.foodUse * dt;
    if (
      this.crop >= 0 &&
      this.crop < 100 &&
      powered &&
      this.systems.greenhouse &&
      r.water > 1
    ) {
      this.crop += b.cropGrowth * plants * this.systemEfficiency.greenhouse * dt *
        (!this.daylight && this.expedition.reserveMode ? 0.7 : 1) *
        (this.expedition.greenhouseTended ? 1.1 : 1);
      r.water -= b.cropWater * dt * (this.campaign?.plantPlan === "economy" ? .65 : this.campaign?.plantPlan === "growth" ? 1.25 : 1);
      if (this.crop >= 100) {
        this.crop = 100;
        this.note("Cultivo listo. Vuelve al invernadero para cosechar.");
      }
    }
    if (!this.systems.greenhouse && this.crop > 0)
      this.crop = Math.max(0, this.crop - 0.1 * dt);
    if (r.oxygen < 15 || r.water < 8 || r.food < 5) r.health -= 0.5 * dt;
    else if (r.radiation < 35) r.health += 0.025 * dt;
    if (this.expedition.processing && powered) {
      this.expedition.remaining = Math.max(0, this.expedition.remaining - dt);
      if (this.expedition.remaining === 0) {
        const sample = this.expedition.processing;
        this.expedition.results.push(sample);
        this.expedition.processing = undefined;
        this.research = this.expedition.results.length;
        this.campaign?.recordAnalysis(sample, this);
        this.note(`Resultado guardado: ${sampleNames[sample]}. Puedes seguir explorando; no hace falta recogerlo.`);
        if (this.research === 3) this.achieve("Ciencia para la Tierra");
      }
    }
    this.researchCooldown = this.expedition.remaining;
    this.once("tutorial", () =>
      this.note(
        "Plan inicial: completar tres análisis, asegurar reservas y transmitir el informe.",
      ),
    );
    if (!this.campaign) {
    if (this.time >= 80) this.once("oxygen", () => this.trigger("oxygen"));
    if (this.time >= 145)
      this.once("water", () => this.trigger(this.seed % 2 ? "water" : "power"));
    if (this.time >= 218) this.once("solar", () => this.trigger("solar"));
    if (this.time >= 335)
      this.once("plants", () =>
        this.trigger(this.crop >= 0 ? "greenhouse" : "water"),
      );
    if (this.time >= 400)
      this.once("comms", () =>
        this.trigger(this.resources.energy < 35 ? "power" : "comms"),
      );
    }
    for (const e of this.activeEvents) {
      if (e.system === "solar") {
        if (e.warning > 0) {
          e.warning = Math.max(0, e.warning - dt);
          if (e.warning === 0)
            this.note(
              "Protocolo solar activo. Mantén a la tripulación en el refugio.",
            );
        } else {
          e.remaining -= dt;
          if (!this.shielded) r.radiation += 0.72 * dt;
          else r.radiation += 0.025 * dt;
          if (e.remaining <= 0) {
            e.resolved = true;
            this.shielded = false;
            this.note(
              "Actividad solar finalizada. Fin del protocolo preventivo.",
            );
            if (r.radiation < 8) this.achieve("Tripulación protegida");
          }
        }
      } else {
        e.remaining = Math.max(0, e.remaining - dt);
        if (e.remaining === 0 && e.severity === 2) {
          e.severity = 3;
          this.note(
            `Urgente: ${e.description}. El fallo sigue afectando a las reservas.`,
          );
        }
      }
    }
    if (r.radiation > 40) r.health -= 0.22 * dt;
    if (this.report === "pending" && this.time >= this.reportDue) {
      this.report = "received";
      this.spareParts += 2;
      this.achieve("Contacto con la Tierra");
      this.note(
        "Tierra confirmó el informe. Protocolo de fabricación recibido: +2 repuestos.",
      );
    }
    for (const key of Object.keys(r) as Resource[])
      r[key] = Math.max(0, Math.min(100, r[key]));
    if (r.energy < 18 && !this.lowWarning) {
      this.lowWarning = true;
      this.note(
        "Reserva energética baja. Reduce la carga en el centro de control.",
      );
    }
    if (r.energy > 30) this.lowWarning = false;
    if (r.oxygen <= 0 || r.water <= 0 || r.food <= 0) this.critical += dt;
    else this.critical = Math.max(0, this.critical - dt);
    if (r.health <= 0 || this.critical >= balance.criticalGrace) {
      this.status = "lost";
      this.reason =
        "El soporte vital no pudo sostener a la tripulación. Las reservas críticas permanecieron agotadas.";
    } else if (!this.campaign && this.time >= this.duration) {
      this.status =
        this.research >= balance.researchGoal && this.report === "received"
          ? "won"
          : "lost";
      this.reason =
        this.status === "won"
          ? "Operación de tres soles completada. Estado de la tripulación estable e informe confirmado por Tierra."
          : "La base resistió, pero faltó completar 3 investigaciones o recibir la confirmación del informe.";
    }
    this.campaign?.update(this, dt);
  }
  achieve(name: string) {
    if (!this.achievements.includes(name)) {
      this.achievements.push(name);
      this.note(`HITO: ${name}`);
    }
  }
  repair(system: SystemId) {
    if (this.status !== "playing") return false;
    if (this.campaign?.actionLock(`repair:${system}`, this)) return false;
    if (this.campaign && this.systems[system]) return false;
    if (this.spareParts < 1 || !this.spend(balance.costs.repair)) return false;
    this.spareParts--;
    this.systems[system] = true;
    this.systemEfficiency[system] = 1;
    this.repairs++;
    if (this.campaign?.level === 2 && system === this.campaign.nightRisk) this.campaign.nightRepairPlan = "full";
    if (this.campaign?.level === 2 && system === this.campaign.nightRisk) this.campaign.nightRepairPlan = "full";
    for (const e of this.activeEvents)
      if (e.system === system) e.resolved = true;
    this.note(`Sistema restaurado: ${system}. −5 energía, −1 repuesto.`);
    this.achieve("Ingeniería de campo");
    return true;
  }
  collectSample(id: SampleId) {
    if (this.status !== "playing") return "La misión ya terminó.";
    const locked = this.campaign?.actionLock(`collect-${id}`, this); if (locked) return locked;
    if (this.expedition.collected[id]) return "Esta muestra ya está en tu inventario.";
    if (id === "water" && (!this.systems.water || this.resources.energy <= 0.5))
      return "Restaura el reciclador y su energía antes de recoger agua.";
    this.expedition.collected[id] = true;
    this.note(`Has recogido ${sampleNames[id]}. Llévala al laboratorio.`);
    return "Muestra sellada y guardada en el inventario.";
  }
  loadSample() {
    if (this.campaign?.actionLock("research", this)) return false;
    const e = this.expedition, sample = e.nextSample;
    if (this.status !== "playing" || e.processing || !sample || !e.collected[sample]) return false;
    if (!this.campaign && sample !== "plant" && !e.batteriesReady) return false;
    if (this.campaign && (sample === "water" && this.campaign.level < 2 || sample === "soil" && this.campaign.level < 3)) return false;
    e.loaded = sample;
    return true;
  }
  startAnalysis() {
    const locked = this.campaign?.actionLock("research", this); if (locked) return locked;
    const e = this.expedition, sample = e.loaded;
    if (this.status !== "playing" || !sample || e.processing || e.results.includes(sample))
      return "Prepara una muestra nueva en el escáner.";
    if (this.resources.energy <= 0.5 || !this.spend(balance.costs.researchEnergy, balance.costs.researchWater))
      return "Necesitas 12 energía y 5 agua para el análisis.";
    if (this.campaign) {
      e.loaded = undefined; e.results.push(sample); e.remaining = 0; this.researchCooldown = 0;
      this.research = e.results.length; this.campaign.recordAnalysis(sample, this);
      this.note(`Prueba completada: ${sampleNames[sample]}. El resultado ya está disponible para elegir cómo cuidar el cultivo.`);
      return "Prueba terminada. Lee las dos opciones y elige cómo cuidar el cultivo.";
    }
    e.processing = sample;
    e.loaded = undefined;
    e.remaining = this.allocation === "science" ? 6 : 8;
    this.researchCooldown = e.remaining;
    this.note(`Escaneo calibrado: ${sampleNames[sample]}. Procesamiento automático; continúa con la siguiente tarea.`);
    return "Procesamiento iniciado. Los resultados se guardarán automáticamente.";
  }
  action(action: string): string {
    if (this.status !== "playing") return "La misión ya terminó.";
    const locked = this.campaign?.actionLock(action, this); if (locked) return locked;
    const campaignAction = this.campaign?.act(action, this);
    if (campaignAction !== undefined) return campaignAction;
    if (action === "research") {
      return this.startAnalysis();
    }
    if (action === "battery-reserve") {
      if (this.expedition.batteriesReady) return "La preparación de baterías ya está registrada.";
      if (!this.systems.power || !this.spend(2)) return "Restaura las baterías y reserva 2 energía.";
      this.expedition.batteriesReady = true;
      this.expedition.reserveMode = true;
      if (this.campaign) this.campaign.powerPlan = "reserve";
      this.note("Reserva nocturna preparada: −2 energía ahora, menor consumo nocturno y crecimiento nocturno un 30 % más lento.");
      return "Reserva preparada. Ahorrarás energía de noche; las plantas crecerán más despacio.";
    }
    if (action === "tend") {
      if (this.expedition.greenhouseTended) return "El riego y la luz ya están equilibrados.";
      if (!this.systems.greenhouse || !this.spend(2, 2)) return "Necesitas riego operativo, 2 energía y 2 agua.";
      this.expedition.greenhouseTended = true;
      this.note("Luz y riego equilibrados: −2 energía y −2 agua. Crecimiento mejorado un 10 %, sin cosecha instantánea.");
      return "Condiciones mejoradas. El cultivo seguirá necesitando tiempo, agua y electricidad.";
    }
    if (action === "plant") {
      if (this.crop >= 0) return "Ya hay un cultivo en marcha.";
      if (!this.spend(3, balance.costs.plantWater))
        return "Necesitas 3 energía y 8 agua.";
      this.crop = 0;
      this.note(
        "Semillas plantadas. El cultivo consume agua y energía durante su crecimiento.",
      );
      return "Cultivo iniciado. Regresa cuando alcance el 100 %.";
    }
    if (action === "harvest") {
      if (this.crop < 100) return "El cultivo aún no está listo.";
      this.resources.food = Math.min(100, this.resources.food + 28);
      this.crop = -1;
      this.harvests++;
      this.achieve("Primera cosecha");
      this.note("Cosecha recogida: +28 comida (unidades simuladas).");
      return "Cosecha almacenada. Puedes plantar de nuevo.";
    }
    if (action === "upgrade") {
      if (this.upgrades) return "Los paneles ya tienen la mejora.";
      if (this.spareParts < 2 || !this.spend(balance.costs.upgradeEnergy))
        return "Necesitas 16 energía y 2 repuestos.";
      this.spareParts -= 2;
      this.upgrades = 1;
      this.expedition.batteriesReady = true;
      if (this.campaign) this.campaign.powerPlan = "upgrade";
      this.note(
        "Paneles optimizados: +22 % producción simulada. −16 energía, −2 repuestos.",
      );
      return "Mejora instalada. Recuperarás la inversión durante el día.";
    }
    if (action === "shelter") {
      if (this.shielded) return "La tripulación ya está protegida.";
      if (!this.spend(6))
        return "Necesitas 6 energía para activar el protocolo.";
      this.shielded = true;
      if (this.campaign?.level === 2 && this.activeEvents.some((event)=>event.system === "solar")) this.campaign.protectedDuringAlert = true;
      this.sheltered = true;
      this.note(
        "Toda la tripulación se traslada al refugio. Puedes continuar el mantenimiento.",
      );
      return "Tripulación protegida hasta el fin de la alerta. La exposición del juego es una escala simulada, no una dosis real.";
    }
    if (action === "transmit") {
      if (this.campaign && (this.campaign.level !== 3 || !this.campaign.partialReport && (!this.campaign.verifiedTrial || !this.campaign.soilPlan))) return "Completa el ensayo aplicado o declara explícitamente un informe parcial.";
      if (this.research < (this.campaign?.partialReport ? 2 : 3))
        return "Completa 3 investigaciones antes de transmitir.";
      if (!this.systems.comms) return "Primero repara la antena.";
      if (this.report !== "none") return "El informe ya fue enviado.";
      if (!this.spend(balance.costs.transmissionEnergy))
        return "Necesitas 8 energía.";
      this.report = "pending";
      const delay = (this.campaign ? 8 : balance.communicationDelay) / Math.max(.25, this.systemEfficiency.comms);
      this.reportDue = this.time + delay;
      this.note(`Informe enviado. La confirmación llegará en ${delay} s de juego.`);
      return "Transmisión en curso. La espera está acelerada en esta simulación.";
    }
    return "Acción no disponible.";
  }
}
