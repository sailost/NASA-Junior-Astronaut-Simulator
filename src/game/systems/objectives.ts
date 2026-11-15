import type { Simulation } from "./Simulation";
import { stations, rooms } from "../world/map";
export interface Objective {
  id: string;
  title: string;
  room: string;
  stationId?: string;
  instruction: string;
  progress: string;
  done: boolean;
  urgent?: boolean;
  optional?: boolean;
  waiting?: boolean;
}
export function getObjectives(sim: Simulation): Objective[] {
  if (sim.campaign) return sim.campaign.objectives(sim);
  const emergencies = sim.activeEvents
    .filter((e) => e.system !== "solar" || !sim.shielded)
    .sort(
      (a, b) =>
        Number(b.system === "solar") - Number(a.system === "solar") ||
        b.severity - a.severity,
    )
    .map((e) => {
      const stationId =
        e.system === "solar"
          ? "shelter"
          : e.system === "comms"
            ? "comms"
            : e.system;
      const s = stations.find((s) => s.id === stationId)!;
      return {
        id: e.id,
        title:
          e.system === "solar"
            ? "Activa el refugio"
            : `Repara ${e.system === "oxygen" ? "el oxígeno" : e.system === "water" ? "el reciclador" : e.system === "power" ? "las baterías" : e.system === "greenhouse" ? "el riego" : "la antena"}`,
        room: rooms.find((r) => r.id === s.room)!.name,
        stationId: s.id,
        instruction:
          e.system === "solar"
            ? "Pulsa E en el refugio, selecciona «Preparar a la tripulación» y completa la secuencia de seguridad."
            : `Busca ${s.name.toLowerCase()}, pulsa E y completa la reparación.`,
        progress:
          e.warning > 0
            ? `${Math.ceil(e.warning)} s de aviso`
            : "AVERÍA ACTIVA",
        done: false,
        urgent: true,
      };
    });
  return [
    ...emergencies,
    ...[
    ...expeditionObjectives(sim),
    {
      id: "report",
      title: "Envía el informe a la Tierra",
      room: "CENTRO DE CONTROL",
      stationId: "comms",
      instruction:
        sim.research < 3
          ? "Primero completa las 3 muestras en el laboratorio. Después busca «Enlace con la Tierra» en Control."
          : sim.report === "pending"
            ? "La señal ya salió. Sigue manteniendo la base hasta recibir la confirmación."
            : "Busca «Enlace con la Tierra», pulsa E y alinea la señal para transmitir el informe.",
      progress:
        sim.report === "received"
          ? "INFORME CONFIRMADO"
          : sim.report === "pending"
            ? `Respuesta en ${Math.ceil(Math.max(0, sim.reportDue - sim.time))} s`
            : sim.research < 3
              ? "Requiere 3 muestras"
              : "LISTO PARA ENVIAR",
      waiting: sim.report === "pending" || sim.research < 3,
      done: sim.report === "received",
    },
    {
      id: "survive",
      title: "Mantén la base durante 3 soles",
      room: "TODA LA BASE",
      instruction:
        "Repara los sistemas con alerta. Conserva oxígeno, agua, alimentos y energía hasta finalizar el tercer sol.",
      progress: `Sol ${sim.sol} / 3`,
      done: sim.status === "won",
    },
    {
      id: "grow",
      title: "Cultiva y cosecha alimentos",
      room: "INVERNADERO",
      stationId: "greenhouse",
      instruction:
        sim.crop >= 100
          ? "Vuelve al bancal hidropónico, pulsa E y selecciona «Cosechar»."
          : "Ve al bancal hidropónico, pulsa E y selecciona «Plantar». Necesita agua y energía para crecer.",
      progress:
        sim.harvests > 0
          ? "COSECHA ALMACENADA"
          : sim.crop >= 0
            ? `Cultivo ${Math.floor(sim.crop)} %`
            : "APOYO · OPCIONAL",
      done: sim.harvests > 0,
      optional: true,
    },
    {
      id: "upgrade",
      title: "Mejora la producción solar",
      room: "SALA DE MÁQUINAS",
      stationId: "upgrade",
      instruction:
        "Busca el regulador solar. Pulsa E y selecciona «Optimizar paneles». Cuesta 16 energía y 2 repuestos.",
      progress: sim.upgrades ? "PANELES OPTIMIZADOS" : "APOYO · OPCIONAL",
      done: sim.upgrades > 0,
      optional: true,
    },
    ],
  ];
}
export function recommendObjective(objectives: Objective[]) {
  return (
    objectives.find((o) => o.urgent && !o.done) ||
    objectives.find((o) => o.id !== "survive" && !o.optional && !o.done && !o.waiting) ||
    objectives.find((o) => o.optional && !o.done && !o.waiting) ||
    objectives.find((o) => !o.done && !o.waiting)
  );
}

function expeditionObjectives(sim: Simulation): Objective[] {
  const e = sim.expedition;
  const collect = (id: "plant" | "water", title: string, room: string, stationId: string): Objective => ({
    id: `collect-${id}`, title, room, stationId,
    instruction: "Acércate al equipo, pulsa E y recoge la muestra en el recipiente sellado.",
    progress: e.collected[id] ? "EN TU INVENTARIO" : "E · RECOGER",
    done: e.collected[id], waiting: id === "water" && !e.batteriesReady,
  });
  const analyze = (id: "plant" | "water" | "soil", name: string): Objective => {
    const processing = e.processing === id, done = e.results.includes(id);
    return {
      id: `analyze-${id}`, title: e.loaded === id ? `Calibra el escáner: ${name}` : `Analiza la muestra de ${name}`,
      room: "LABORATORIO", stationId: "research",
      instruction: processing ? "El resultado se guarda automáticamente. Continúa con la siguiente tarea." :
        e.collected[id] ? "Pulsa E en el analizador. Coloca la muestra y alinea los anillos con sus marcas." : "Recoge primero esta muestra en su habitación.",
      progress: done ? "RESULTADO GUARDADO" : processing ? `PROCESANDO · ${Math.ceil(e.remaining)} s` : `${sim.research}/3 resultados · 12 energía + 5 agua`,
      done, waiting: processing || !e.collected[id] || (id !== "plant" && !e.batteriesReady) ||
        (id === "water" && !e.results.includes("plant")) || (id === "soil" && !e.results.includes("water")),
    };
  };
  return [
    collect("plant", "Recoge una muestra vegetal", "INVERNADERO", "greenhouse"),
    analyze("plant", "planta"),
    { id: "batteries", title: "Prepara las baterías para la noche", room: "SALA DE MÁQUINAS", stationId: "power",
      instruction: "Pulsa E en las baterías. Elige reserva nocturna o mejora la captación solar en el regulador.",
      progress: e.batteriesReady ? "RESERVA PREPARADA" : "AHORRO O MEJORA SOLAR", done: e.batteriesReady,
      waiting: !e.processing && !e.results.includes("plant"),
    },
    collect("water", "Obtén una muestra de agua", "SOPORTE VITAL", "water"),
    analyze("water", "agua"), analyze("soil", "suelo marciano"),
  ];
}
