import type { Simulation } from "../systems/Simulation";
import { sampleNames } from "../systems/Expedition";
import type { Station } from "../world/map";
import type { PuzzleKind } from "../minigames/Minigame";
import { specimenArt, plantArt } from "../minigames/machineArt";
import { escapeHtml as esc } from "../data/Science";
import { marsRadReference, absorbedDoseMicrogray } from "../data/Radiation";
import { sourceLink } from "../data/Science";
import { renderCampaignTerminal } from "./CampaignTerminal";

export function stationPuzzle(s: Station): PuzzleKind | undefined {
  return ({ oxygen: "oxygen", water: "water", circuit: "circuit", research: "laboratory", signal: "signal", greenhouse: "greenhouse", shelter: "shelter" } as Record<string, PuzzleKind>)[s.kind];
}

export function renderMachineTerminal(s: Station, sim: Simulation) {
  const command = (action: string, title: string, detail: string, disabled = false) => {
    const locked = sim.campaign?.actionLock(action, sim);
    return `<button class="machine-command" data-command="${action}" ${disabled || locked ? "disabled" : ""}><span>${title}</span><small>${esc(locked || detail)}</small><b aria-hidden="true">↗</b></button>`;
  };
  const e = sim.expedition, broken = !!s.system && !sim.systems[s.system];
  const launch = (label: string, cost: string, unavailable = "") => {
    const action = s.kind === "research" ? "research" : s.kind === "signal" ? broken ? "repair:comms" : "transmit" : s.kind === "greenhouse" ? broken ? "repair:greenhouse" : "tend" : s.kind === "shelter" ? "shelter" : `repair:${s.system}`;
    const reason = sim.campaign?.actionLock(action, sim) || (sim.campaign && !broken && ["oxygen", "water", "circuit"].includes(s.kind) ? "Sistema operativo: no necesita reparación. Revisa sus señales y reservas." : unavailable);
    return `<button class="machine-command launch-machine" id="puzzle-launch" ${reason ? "disabled" : ""}><span>${label}</span><small>${esc(reason || cost)}</small><b aria-hidden="true">↗</b></button>`;
  };
  let art = `<div class="terminal-core"><span>ϟ</span><i></i><i></i><i></i></div>`, content = "";
  if (s.kind === "research") {
    const sample = sim.campaign ? ({1:"plant",2:"water",3:"soil"} as const)[sim.campaign.level] : e.nextSample;
    const label = sample === "plant" ? "Hoja de la planta" : sample === "water" ? "Agua del reciclador" : "Material donde crecen las raíces";
    const sampleLabels = sim.campaign ? {plant:"Hoja",water:"Agua",soil:"Material de cultivo"} : sampleNames;
    art = `<div class="terminal-specimen">${specimenArt(e.processing || sample || "soil")}<span class="scanner-bed"></span></div>`;
    content = `<span class="terminal-state">${sim.research} / 3 RESULTADOS GUARDADOS</span>`;
    if (e.processing) content += `<h3>Análisis en segundo plano</h3><p>${esc(sampleNames[e.processing])} · ${Math.ceil(e.remaining)} s ${sim.resources.energy <= .5 ? "· sin alimentación" : ""}</p><p>El resultado se guardará solo. ${sim.campaign?.level === 1 ? "La elección de cultivo se desbloqueará al terminar. Puedes consultar las reservas y a AURA durante el procesamiento." : !e.batteriesReady ? "Prepara las baterías en Máquinas." : !e.collected.water ? "Recoge agua en Soporte vital." : "Comprueba cultivos y reservas."}</p>`;
    else if (sample && !e.results.includes(sample)) content += `<h3>${sim.campaign ? label : esc(sampleNames[sample])}</h3><p>${sim.campaign ? sample === "plant" ? "Una muestra vegetal es una pequeña parte de una planta. Aquí usamos una hoja para comenzar una prueba del juego sobre el riego. Ajusta el lector y después elige cómo cuidar el cultivo." : sample === "water" ? "Estudiaremos el agua para elegir entre recuperar más o gastar menos. Ajusta el lector para completar la prueba." : "El sustrato es el material donde crecen las raíces. Esta muestra ya está guardada: estudiaremos cómo preparar el cultivo." : sample === "soil" ? "Muestra ya recogida y almacenada en la base; no necesitas salir." : e.collected[sample] ? "Recipiente sellado listo para el escáner." : `Recoge la muestra en ${sample === "plant" ? "el Invernadero" : "Soporte vital"}.`}</p>${launch(sim.campaign ? "Estudiar y comparar opciones" : "Preparar escáner", "12 energía + 5 agua · al completar la prueba", !e.collected[sample] ? "Falta recoger esta muestra" : !sim.campaign && sample !== "plant" && !e.batteriesReady ? "Primero prepara las baterías en Máquinas" : "")}`;
    else content += sim.campaign ? `<h3>Prueba terminada</h3><p>Ya puedes elegir una de las opciones de abajo. Esa elección se aplicará a la colonia.</p>` : `<h3>Investigación completada</h3><p>Los tres resultados están guardados. Sintoniza el enlace con la Tierra en Control.</p>`;
    content += `<div class="specimen-inventory">${(["plant", "water", "soil"] as const).map((id) => `<span>${e.results.includes(id) ? "✓" : e.processing === id ? "◌" : e.collected[id] ? "◈" : "○"} ${esc(sampleLabels[id])}</span>`).join("")}</div>`;
  } else if (s.kind === "greenhouse") {
    art = `<div class="terminal-plants">${plantArt()}${plantArt()}</div>`;
    content = `<span class="terminal-state">${broken ? "! RIEGO AVERIADO" : "CULTIVO / LUZ / AGUA"}</span><h3>${sim.crop < 0 ? "Bancal disponible" : `Crecimiento ${Math.floor(sim.crop)} %`}</h3>`;
    if (!e.collected.plant) content += command("collect-plant", sim.campaign ? "Recoger una hoja" : "Recoger muestra vegetal", "Una pequeña parte de la planta para estudiar en el Laboratorio");
    content += sim.crop >= 100 ? command("harvest", "Recoger cosecha", "+28 alimentos · cultivo completado") : sim.crop < 0 ? command("plant", "Plantar semillas", "3 energía + 8 agua · crecimiento gradual", broken) : `<p>El cultivo necesita tiempo, electricidad y agua. Vuelve para cosechar cuando esté listo.</p>`;
    content += launch(broken ? "Restaurar luz y riego" : "Equilibrar luz y riego", broken ? "5 energía + 1 repuesto" : "2 energía + 2 agua · crecimiento +10 %", !broken && e.greenhouseTended ? "✓ Condiciones ya equilibradas" : "");
    if (sim.campaign?.level === 3 && sim.campaign.soilPlan && !sim.campaign.verifiedTrial) content += command("campaign-verify", "Comprobar crecimiento", "Registra si la planta creció después del cambio. Completa este objetivo al comprobarla.");
  } else if (s.kind === "water") {
    art = `<div class="terminal-specimen">${specimenArt("water")}</div>`;
    content = `<span class="terminal-state">${broken ? "! RECICLADOR DETENIDO" : "RECICLADOR DISPONIBLE"}</span><h3>Agua en circulación</h3>`;
    if (!e.collected.water) content += command("collect-water", "Obtener muestra de agua", broken ? "Repara primero el reciclador" : "Recipiente sellado para el laboratorio", broken || sim.resources.energy <= .5);
    content += launch("Reconectar tuberías", "5 energía + 1 repuesto · mantenimiento");
  } else if (s.kind === "circuit") {
    content = `<span class="terminal-state">${broken ? "! BATERÍAS DESCONECTADAS" : `${Math.ceil(sim.resources.energy)} % RESERVA`}</span><h3>Prepara la noche</h3>`;
    if (!e.batteriesReady) content += command("battery-reserve", "Preparar reserva nocturna", "2 energía ahora · ahorra de noche; cultivos nocturnos −30 %", broken) + `<p>Alternativa: mejora la captación solar en el regulador de esta sala (16 energía + 2 repuestos).</p>`;
    else content += `<p>✓ ${e.reserveMode ? "Reserva nocturna configurada" : "Captación solar mejorada"}. La preparación afecta las reservas reales.</p>`;
    content += launch("Reconectar banco de baterías", "5 energía + 1 repuesto · mantenimiento");
  } else if (s.kind === "signal") {
    art = `<div class="terminal-antenna">⌁<i></i><span>TIERRA ↔ MARTE</span></div>`;
    content = `<span class="terminal-state">${broken ? "! ANTENA DESCALIBRADA" : sim.report === "pending" ? "INFORME EN TRÁNSITO" : sim.report === "received" ? "✓ INFORME CONFIRMADO" : "ENLACE DISPONIBLE"}</span><h3>Contacto con la Tierra</h3><p>La confirmación tarda 28 s de juego. La espera está acelerada; la señal no viaja instantáneamente.</p>`;
    content += launch(broken ? "Restaurar la antena" : "Sintonizar y transmitir", broken ? "5 energía + 1 repuesto · después podrás transmitir" : "8 energía · informe con evidencias y limitaciones", !broken && sim.report !== "none" ? "El informe ya fue enviado" : !broken && sim.research < (sim.campaign?.partialReport ? 2 : 3) ? "Completa las evidencias o declara un cierre parcial en el amanecer" : sim.campaign && !sim.campaign.partialReport && !sim.campaign.verifiedTrial ? "Falta comprobar el ensayo aplicado en el cultivo" : "");
  } else if (s.kind === "shelter") {
    art = `<div class="terminal-shield">⬡<span>4 TRIPULANTES</span></div>`;
    const referenceDose = absorbedDoseMicrogray(marsRadReference.rateMicrograyPerSol, 1);
    content = `<span class="terminal-state">${sim.shielded ? "✓ TRIPULACIÓN A CUBIERTO" : "REFUGIO FÍSICO DISPONIBLE"}</span><h3>Protocolo de protección</h3><p>Las paredes y los materiales reducen la exposición simulada. La energía acciona puertas y comunicaciones.</p><section class="radiation-calculator" aria-label="Calculadora educativa de dosis absorbida"><h4>Calcula una dosis de referencia en Marte</h4><label for="radiation-duration">Tiempo de exposición: <output id="radiation-duration-label">1 sol</output></label><input id="radiation-duration" type="range" min="1" max="10" step="1" value="1"><output id="radiation-dose" aria-live="polite">${referenceDose} μGy absorbidos</output><p id="radiation-equation">${marsRadReference.rateMicrograyPerSol} μGy/sol × 1 sol = ${referenceDose} μGy</p><small>Ejemplo con el promedio histórico medido por Curiosity/RAD en la superficie de Marte. La duración elegida es una práctica matemática, no una previsión para Base Aurora. μGy mide dosis absorbida; el índice 0–100 del juego no tiene unidad física.</small>${sourceLink(marsRadReference.url, marsRadReference.source)}</section>${launch("Preparar a la tripulación", "6 energía · traslado al refugio", sim.shielded ? "El protocolo ya está activo" : "")}`;
    if (sim.campaign?.level === 2 && sim.campaign.solarStarted && !sim.shielded && sim.activeEvents.some((event) => event.system === "solar")) content += command("campaign-accept-exposure", "Mantener los equipos activos", "Sin coste de energía · +18 exposición simulada (0–100), sin protección y con desenlace parcial");
  } else if (s.kind === "upgrade") {
    content = `<span class="terminal-state">CAPTACIÓN SOLAR</span><h3>Más energía durante el día</h3><p>La optimización aumenta la producción simulada un 22 %. De noche no hay generación solar.</p>${command("upgrade", "Optimizar paneles", "16 energía + 2 repuestos", !!sim.upgrades)}`;
  } else {
    content = `<span class="terminal-state">${broken ? "! AVERÍA EN SOPORTE VITAL" : "SISTEMA OPERATIVO"}</span><h3>Flujo de aire del hábitat</h3><p>Gira tres válvulas para mantener el aire en circulación.</p>${launch("Operar válvulas", "5 energía + 1 repuesto · mantenimiento")}`;
  }
  if (s.kind === "control") {
    content = `<span class="terminal-state">DISTRIBUCIÓN DE RECURSOS</span><h3>Decide qué priorizar</h3><p>Soporte vital mejora agua y oxígeno, pero ralentiza plantas. Ciencia acelera el procesamiento a 6 s, con mayor consumo y menor soporte vital.</p><div class="allocation">${(["balanced", "survival", "science"] as const).map((a, i) => `<button data-allocation="${a}" class="${sim.allocation === a ? "selected" : ""}">${["Equilibrado", "Soporte vital", "Ciencia"][i]}</button>`).join("")}</div><div class="system-list">${Object.entries(sim.systems).map(([key, ok]) => `<span>${({ power: "Baterías", oxygen: "Oxígeno", water: "Agua", greenhouse: "Cultivos", comms: "Antena" } as Record<string, string>)[key]} <b>${ok ? "✓" : "!"}</b></span>`).join("")}</div>`;
  }
  return `<div class="station-machine-art" aria-hidden="true">${art}</div><div class="station-machine-actions">${content}${renderCampaignTerminal(s, sim)}</div>`;
}
