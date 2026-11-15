import type { Simulation } from "../systems/Simulation";
import type { Station } from "../world/map";
import { escapeHtml as esc, sourceLink } from "../data/Science";
const optionMarkup = (action: string, title: string, detail: string, disabled: boolean) => `<button class="machine-command" data-command="campaign-${action}" ${disabled ? "disabled" : ""}><span>${title}</span><small>${esc(detail)}</small><b>↗</b></button>`;
export function renderCampaignTerminal(station: Station, sim: Simulation) {
  const c = sim.campaign; if (!c) return "";
  const option = (action: string, title: string, detail: string) => {
    const locked = c.actionLock(`campaign-${action}`, sim) || (action === "bypass" && sim.resources.energy < 3 ? "Necesitas 3 de energía para alimentar el puente temporal." : undefined);
    return optionMarkup(action, title, locked || detail, !!locked);
  };
  let body = `<div class="campaign-caption">${esc(c.title)}</div>`;
  if (["control", "circuit", "research"].includes(station.kind)) body += `<aside class="campaign-scenario"><b>Operación variable: ${esc(c.scenario.title)}</b><p>${esc(c.scenario.briefing)}</p><p class="scenario-science">${esc(c.scenario.scienceNote)}</p><small>Valores de esta colonia: simulación educativa. Referencia para aprender: ${sourceLink(c.scenario.source.url, c.scenario.source.label)}</small></aside>`;
  if (["control", "circuit", "oxygen", "water", "greenhouse", "signal"].includes(station.kind)) {
    body += `<p class="campaign-telemetry">Energía ${Math.ceil(sim.resources.energy)} · Agua ${Math.ceil(sim.resources.water)} · Oxígeno ${Math.ceil(sim.resources.oxygen)}<br>Producción solar: ${sim.daylight && sim.systems.power ? "activa" : "sin generación"}. Previsión de 90 s de noche: ${Math.floor(c.nightForecast(sim))} energía. Reserva los costes pendientes de análisis de agua (12), protocolo (6) y un mantenimiento (5). Estimación del modelo, no medición NASA.</p>`;
    if (c.level === 2 && station.id === c.riskStation) body += `<p>Señal registrada: ${esc(c.riskSignal)}. Este circuito está ${sim.systems[station.system!] ? "operativo; comprueba si explica el síntoma" : "averiado: su producción se ha detenido"}.</p>${!c.diagnosed ? option(`inspect-${station.id}`, "Inspeccionar este circuito", "Sin coste · encuentra la avería antes de repararla") : !sim.systems[c.nightRisk] ? option("bypass", "Conectar un puente temporal", "3 energía · conserva el repuesto, pero deja el equipo al 55 % de producción") : "<p>Diagnóstico registrado. Elige reparación completa o mantén la configuración actual.</p>"}`;
  }
  if (station.kind === "research" || station.kind === "control" || station.kind === "signal") body += c.evidence.map((e) => `<article class="campaign-evidence"><h3>Lo que aprendimos · ${esc(({ plant: "Plantas", water: "Agua", soil: "Material del cultivo" })[e.sample])}</h3><p>${esc(e.observation)}</p><p>${esc(e.interpretation)}</p><small>${esc(e.decision || "Elige una opción para continuar")}</small></article>`).join("");
  if (station.kind === "research") {
    if (c.level === 1 && c.evidence.some((e) => e.sample === "plant") && !c.plantPlan) body += option("plant-economy", "Ahorrar agua en el cultivo", "Modelo: −35 % agua de riego y −20 % crecimiento") + option("plant-growth", "Priorizar el crecimiento", "Modelo: +20 % crecimiento y +25 % agua de riego");
    if (c.level === 2 && c.evidence.some((e) => e.sample === "water") && !c.waterPlan) body += option("water-recovery", "Aumentar la recuperación", "Modelo: +20 % recuperación; +0,04 energía por segundo de consumo") + option("water-reserve", "Reducir demanda de agua", "Modelo: −20 % consumo de la tripulación; no aumenta producción");
    if (c.level === 3 && c.evidence.some((e) => e.sample === "soil") && !c.soilPlan) body += option("soil-isolate", "Aislar el circuito hidropónico", "5 energía + 2 agua; crecimiento +5 % en el modelo") + option("soil-condition", "Acondicionar el sustrato experimental", "2 energía + 8 agua; crecimiento +15 % en el modelo");
    if (c.soilPlan && !c.verifiedTrial) body += "<p>Ve al Invernadero y pulsa Comprobar crecimiento. Si la planta ya estaba lista para cosechar, recoge la cosecha y planta de nuevo.</p>";
  }
  if (station.kind === "signal" && c.level === 3 && !c.partialReport && sim.report === "none" && sim.research >= 2) body += option("partial", "Declarar un cierre parcial", "Permite transmitir sin completar el ensayo final. El desenlace reconocerá sus limitaciones, sin victoria completa.");
  return `<section class="campaign-terminal" aria-label="Evidencias y decisiones de la operación">${body}</section>`;
}
