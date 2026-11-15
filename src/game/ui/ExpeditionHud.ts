import { auraHologram } from "./AuraHologram";
import { rooms } from "../world/map";
import type { Resource } from "../systems/Simulation";
export const resourceNames: Record<Resource, string> = {
  energy: "Energía",
  oxygen: "Oxígeno",
  water: "Agua",
  food: "Alimentos",
  health: "Salud",
  radiation: "Radiación simulada",
};
const paths: Record<string, string> = {
  energy: "M13 2 5 13h6l-1 9 9-13h-6z",
  oxygen: "M8 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M15 14h5v2l-5 4h5",
  water: "M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z",
  food: "M5 20c1-9 3-15 14-16 0 10-5 15-12 13M7 17l8-8",
  health: "M4 12h5l2-7 3 14 2-7h4",
  radiation: "M12 9v3m0 4v.2M12 2 2 21h20z",
  pause: "M8 5v14M16 5v14",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16",
  mission: "M5 4h14v16H5zM9 8h6M9 12h6M9 16h4",
  help: "M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 3m0 3v.1",
  status: "M4 17V7m8 10V3m8 18V9M2 7h4M10 13h4M18 9h4",
};
export const hudIcon = (name: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.status}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export function renderExpeditionHud() {
  const resources = (Object.keys(resourceNames) as Resource[])
    .map(
      (k) =>
        `<button class="suit-resource" aria-controls="resource-help" aria-expanded="false" type="button" data-resource="${k}" ${k === "radiation" ? "hidden" : ""} aria-label="${resourceNames[k]}: consultar explicación"><span class="suit-icon">${hudIcon(k)}</span><strong id="r-${k}">0</strong><span class="suit-tick"><i id="bar-${k}"></i></span></button>`,
    )
    .join("");
  return `<div class="exploration-hud">
    <div class="sol-watch"><strong id="sol">SOL 01 <span>/ 03</span></strong><small id="clock">DÍA · 00:00</small><div id="day-bar"><i></i></div></div>
    <div class="suit-readings" aria-label="Recursos de supervivencia">${resources}<button id="resources-btn" aria-label="Estado completo de la base (R)" aria-expanded="false" aria-controls="status-drawer">${hudIcon("status")}</button></div>
    <nav class="exploration-actions" aria-label="Accesos de exploración"><button id="mission-btn" aria-label="Misiones (J)" title="Misiones · J" aria-expanded="false" aria-controls="mission-drawer">${hudIcon("mission")}</button><button id="map-btn" aria-label="Mapa de la base (M)" title="Mapa · M" aria-expanded="false" aria-controls="map-drawer">${hudIcon("map")}</button><button id="controls-btn" aria-label="Controles (H)" title="Controles · H">${hudIcon("help")}</button><button id="pause-btn" aria-label="Pausa (Esc)" title="Pausa · Esc">${hudIcon("pause")}</button></nav>
    <button id="current-mission-btn" class="current-mission" aria-label="Abrir todas las misiones" aria-expanded="false" aria-controls="mission-drawer"><span class="current-mission-label">MISIÓN ACTUAL <span>J</span></span><strong id="current-mission-title">Recoge una muestra vegetal</strong><span class="current-mission-meta"><span id="current-mission-destination">Destino: Invernadero</span><b id="current-mission-progress">0 / 3</b></span><span id="current-mission-next">Acércate al bancal y pulsa E.</span></button>
    <div id="processing-readout" class="processing-readout" role="status" hidden></div>
    <div id="objective-direction" class="objective-direction" aria-hidden="true" hidden><span>➤</span><small>OBJETIVO</small></div>
    <aside id="mission-drawer" class="mission exploration-panel" hidden><div class="drawer-heading"><span>Misiones</span><button id="close-mission" aria-label="Cerrar misiones">×</button></div><div id="objectives"></div></aside>
    <aside id="status-drawer" class="status-panel exploration-panel" hidden><div class="drawer-heading"><span>Estado de la base</span><button id="close-status" aria-label="Cerrar estado">×</button></div><p class="panel-caption">Reservas e indicadores del modelo simulado.</p><dl class="reserve-detail">${(Object.keys(resourceNames) as Resource[]).map((k) => `<div tabindex="0" role="button" data-detail-resource="${k}" aria-controls="resource-help" aria-expanded="false"><dt>${hudIcon(k)} ${resourceNames[k]}</dt><dd id="detail-${k}">0 / 100</dd></div>`).join("")}</dl><div id="system-detail"></div><div class="status-links"><button id="science-btn">Archivo científico</button><button id="sound-btn" aria-label="Activar o silenciar sonido">Sonido</button></div></aside>
    <aside class="map exploration-panel" id="map-drawer" hidden><div class="drawer-heading"><span>Base Aurora</span><button id="close-map" aria-label="Cerrar mapa">×</button></div><svg id="minimap" viewBox="0 0 1540 1000" aria-label="Habitaciones, astronauta, objetivo y emergencias"><path d="M285 280V500H1245V720 M765 280V720 M285 500V720 M1245 280V500" stroke="#425766" stroke-width="60" fill="none"/>${rooms.map((r) => `<rect data-map-room="${r.id}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="24" fill="#314958" stroke="#7595a2" stroke-width="5"/><text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 12}" text-anchor="middle" fill="#d0dfe2" font-size="48" font-family="Arial">${({ life: "SOPORTE VITAL", control: "CONTROL", green: "INVERNADERO", engine: "MÁQUINAS", lab: "LABORATORIO", shelter: "REFUGIO" } as Record<string, string>)[r.id]}</text>`).join("")}<g id="map-emergencies"></g><circle id="map-target" r="38" fill="none" stroke="#e8b779" stroke-width="10" visibility="hidden"/><circle id="map-player" r="23" fill="#b5edf1" stroke="#163d47" stroke-width="8"/></svg><div class="map-key"><span>● Tú</span><span>◇ Objetivo</span><span>! Incidencia</span></div><span id="room-name">CENTRO DE CONTROL</span></aside>
    <div class="aura-message" id="aura-message" role="status" hidden>${auraHologram()}<div><strong>AURA</strong><p id="aura-text"></p></div></div>
    <div id="interaction"></div><div id="zone-title" class="zone-title" aria-live="polite"></div>
    </div><div id="modal-layer" class="modal-layer"><section id="modal" role="dialog" aria-modal="true" tabindex="-1"></section></div>`;
}
