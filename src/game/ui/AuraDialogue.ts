import type { Simulation, Resource } from "../systems/Simulation";
import { getObjectives, recommendObjective, type Objective } from "../systems/objectives";
import { rooms, stations } from "../world/map";
import { auraMessage } from "./Aura";
import { resourceHelp } from "./ResourceHelp";
import { resourceNames } from "./ExpeditionHud";
import type { ScienceData } from "../data/Science";
import type { AuraMood } from "./AuraHologram";
export interface AuraContext { sim: Simulation; player?: { x: number; y: number }; objectiveId?: string; science?: ScienceData; }
export interface AuraChoice { id: string; label: string; next?: string; action?: "guide" | "map"; }
export interface AuraDialogueNode { id: string; title: string; text: string; mood: AuraMood; choices: AuraChoice[]; references?: { label: string; url: string }[]; stationId?: string; }
const choice = (id: string, label: string, next = id): AuraChoice => ({ id, label, next });
export function auraObjective(context: AuraContext): Objective | undefined {
  const objectives = getObjectives(context.sim);
  return objectives.find((o) => o.urgent && !o.done) || objectives.find((o) => o.id === context.objectiveId && !o.done && !o.waiting) || recommendObjective(objectives);
}
export function auraStateMood(sim: Simulation): AuraMood {
  if (sim.resources.health < 35 || sim.resources.oxygen < 8 || sim.resources.water < 8 || sim.resources.energy < 8 || sim.resources.food < 5 || sim.resources.radiation > 40 ||
    sim.activeEvents.some((e) => e.system === "solar" && e.warning <= 0 && !sim.shielded)) return "emergency";
  if (sim.activeEvents.some((e) => e.system !== "solar" || !sim.shielded) || [sim.resources.energy, sim.resources.oxygen, sim.resources.water, sim.resources.food].some((v) => v < 22)) return "alert";
  if (sim.expedition.processing) return "thinking";
  return "idle";
}
/** Pure, offline RPG dialogue. Choices explain state; they never apply game actions. */
export function auraDialogue(topic: string, context: AuraContext): AuraDialogueNode {
  const { sim, science, player } = context, objective = auraObjective(context);
  const warning = auraMessage(sim, objective);
  const critical = warning?.id.startsWith("critical-") ? warning.text : undefined;
  const base = (title: string, text: string, choices: AuraChoice[], mood: AuraMood = "talking"): AuraDialogueNode => ({ id: topic, title, text, choices, mood });
  const back = choice("home", "Tengo otra pregunta");
  if (topic === "evidence" && sim.campaign) {
    const entries = sim.campaign.evidence;
    const node = base("Lo que sabemos y lo que decidimos", entries.length ? entries.map((e) => `${e.observation} ${e.decision || "Todavía falta aplicar una decisión a esta evidencia."}`).join(" ") : "Aún no hay resultados. La muestra vegetal permite comparar consumo de agua y crecimiento antes de elegir un perfil.", [choice("mission", "¿Cómo lo aplico ahora?"), choice("science", "Fuentes y límites del modelo"), back], "thinking");
    node.references = entries.map((e) => e.source); return node;
  }
  if (topic === "consequences" && sim.campaign) return base(sim.campaign.title, `${objective?.instruction || "Consulta el resumen de la operación."} ${sim.campaign.decisions.join(". ")} Estas decisiones cambian tasas del modelo; los porcentajes no son mediciones NASA.`, [choice("evidence", "Revisemos las evidencias"), choice("route", "Guíame al equipo"), back], "thinking");
  if (topic === "mission") return base("Nuestra misión", objective ? `${objective.title}. Destino: ${objective.room.toLowerCase()}. ${objective.progress}. ${objective.instruction}` : "La operación ha terminado. Consulta el informe de misión.", [choice("route", "¿Cómo llego allí?"), choice("consequences", "¿Por qué es importante?"), back], objective?.urgent ? auraStateMood(sim) : "talking");
  if (topic === "route") {
    const target = stations.find((s) => s.id === objective?.stationId);
    if (!target) return base("Orientación", "Este objetivo se cumple manteniendo la base. Consulta las reservas y el mapa para decidir qué sistema necesita atención.", [{ id: "map", label: "Abrir el mapa", action: "map" }, back]);
    const room = rooms.find((r) => r.id === target.room)!;
    const near = player && Math.hypot(player.x - target.x, player.y - target.y) < 115;
    const node = base("Vamos paso a paso", `${target.name}, en ${room.name.toLowerCase()}. ${near ? "Ya estás al alcance: pulsa E para utilizarlo." : "Sigue los pasillos de conexión y la marca del equipo. Al acercarte, pulsa E."}`, [{ id: "guide", label: near ? "Señala el equipo" : "Sí, muéstrame el camino", action: "guide" }, choice("mission", "Recuérdame qué hacer"), back]);
    node.stationId = target.id; return node;
  }
  if (topic === "resources" || topic === "resources-more") {
    const keys: Resource[] = topic === "resources" ? ["energy", "oxygen", "water"] : ["food", "health", "radiation"];
    return base("Conozcamos las reservas", "Elige un indicador. Te explicaré su valor actual, qué lo consume y cómo cuidarlo.", [...keys.map((key) => choice(`resource:${key}`, resourceNames[key])), choice(topic === "resources" ? "resources-more" : "home", topic === "resources" ? "Comida, salud y radiación" : "Volver a conversar")]);
  }
  if (topic.startsWith("resource:")) {
    const key = topic.slice(9) as Resource;
    if (Object.hasOwn(resourceHelp, key)) {
      const info = resourceHelp[key];
      return base(`${resourceNames[key]} · ${Math.ceil(sim.resources[key])}${key === "radiation" ? "/100" : "%"}`, `${info.purpose} ${info.consumes} ${info.recovery}`, [choice("resources", "Consultar otro recurso"), choice("mission", "¿Qué conviene hacer ahora?"), choice(key === "food" || key === "water" ? "science-food" : key === "radiation" ? "science-radiation" : "science", "¿Qué dice la ciencia?")], key === "radiation" && sim.activeEvents.some((e) => e.system === "solar") ? "alert" : "talking");
    }
  }
  if (topic === "science" || topic === "science-more") return base("Ciencia y exploración", "Podemos consultar los estudios y fuentes del archivo. Los resultados y las reservas de Base Aurora pertenecen a un modelo educativo.", topic === "science" ? [choice("science-plants", "Plantas en el espacio · NASA"), choice("science-food", "Cultivar alimentos · CSA"), choice("science-comms", "Hablar con la Tierra · NASA"), choice("science-more", "Sol, radiación y mapas")] : [choice("science-solar", "Actividad solar · DONKI"), choice("science-radiation", "Radiación · NASA RadLab"), choice("science-map", "Mapas de Marte · Mars Trek"), back], "thinking");
  if (topic === "science-solar") {
    const record = sim.solarRecord;
    const node = base("Actividad solar", `${record ? `Registro histórico seleccionado: ${record.id} (${record.date}). ` : "DONKI reúne observaciones de actividad solar. "}Un registro no demuestra por sí solo una amenaza para Marte. Las alertas, la duración y la exposición de esta colonia son simuladas.`, [choice("consequences", "¿Qué significa para nuestra base?"), choice("science", "Consultar otra fuente"), back], sim.activeEvents.some((e) => e.system === "solar") ? "alert" : "talking");
    node.references = [{ label: record ? "NASA CCMC / DONKI · registro histórico" : "NASA Open APIs · DONKI", url: record?.url || "https://api.nasa.gov/" }]; return node;
  }
  if (topic === "science-radiation") {
    const node = base("Mediciones y simulación", science ? science.radiation.explanation : "RadLab contiene mediciones científicas con instrumento y ubicación. La escala 0–100 del juego no es una dosis real ni una medición de Marte.", [choice("resource:radiation", "¿Cómo protejo a la tripulación?"), choice("science", "Consultar otra fuente"), back], "thinking");
    if (science) node.references = [{ label: "NASA OSDR RadLab · fuente y contexto", url: science.radiation.url }]; return node;
  }
  if (topic.startsWith("science-")) {
    const search: Record<string, string> = { "science-plants": "OSD-37", "science-food": "food-production", "science-comms": "mars-relay", "science-map": "trek.nasa" };
    const card = science?.cards.find((c) => c.url.includes(search[topic] || "__unknown__"));
    const node = base(card?.title || "Archivo científico", card?.body || "El archivo científico local aún no está disponible. Puedes continuar explorando y consultar de nuevo cuando termine de cargar.", [choice("science", "Otra pregunta científica"), choice("mission", "Volvamos a nuestra misión"), back], "thinking");
    if (card) node.references = [{ label: card.source, url: card.url }]; return node;
  }
  if (topic === "consequences") {
    const broken = Object.entries(sim.systems).filter(([, working]) => !working).map(([id]) => ({ power: "generación y baterías", oxygen: "oxígeno", water: "reciclaje de agua", greenhouse: "cultivos", comms: "comunicaciones" }[id]));
    const text = sim.activeEvents.some((e) => e.system === "solar") ? `El escenario solar está activo. ${sim.shielded ? "La tripulación ya está en el refugio físico." : "El refugio reduce la exposición simulada; su protocolo opera puertas y traslado de tripulación."}` : broken.length ? `Sistemas con averías: ${broken.join(", ")}. Sin mantenimiento, su producción o funcionamiento sigue limitado y las reservas pueden agotarse.` : sim.expedition.processing ? "El laboratorio trabaja en segundo plano y guarda el resultado solo. Mientras tanto, sigue el siguiente objetivo sin volver a confirmar nada." : sim.report === "pending" ? `El informe ya salió. La respuesta llegará en unos ${Math.ceil(Math.max(0, sim.reportDue - sim.time))} segundos simulados; no hace falta reenviarlo.` : "Cuidar la base y obtener tres resultados permite enviar el informe. También debemos sobrevivir los tres soles: la ciencia no sustituye al soporte vital.";
    return base("Cada decisión cuenta", critical || text, [choice("mission", "¿Qué hago ahora?"), choice("route", "¿Cómo llego al equipo?"), back], auraStateMood(sim) === "idle" ? "talking" : auraStateMood(sim));
  }
  return base("Estoy contigo", critical || (objective?.urgent ? `Hay una incidencia que atender: ${objective.title.toLowerCase()}. Puedo explicarte qué ocurre o señalar el equipo.` : `Sol ${sim.sol}. ${sim.daylight ? "Todavía tenemos luz solar." : "Estamos utilizando la reserva de baterías."} ${sim.research}/3 resultados guardados. ¿Qué quieres revisar?`), [choice("mission", "¿Cuál es nuestra misión?"), choice("resources", "Explícame los recursos"), choice("consequences", "¿Cómo está la base?"), choice("science", "Quiero saber más ciencia")], auraStateMood(sim) === "idle" ? "talking" : auraStateMood(sim));
}
