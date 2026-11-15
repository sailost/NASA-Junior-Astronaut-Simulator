import { escapeHtml as esc } from "../data/Science";
import { type Objective } from "../systems/objectives";
export function renderMissionTracker(
  objectives: Objective[],
  active?: Objective,
) {
  const main = objectives.filter((o) => !o.optional && !o.urgent),
    urgent = objectives.filter((o) => o.urgent);
  const row = (o: Objective, index: number) =>
    `<button class="quest ${o.id === active?.id ? "tracked" : ""} ${o.done ? "quest-done" : ""} ${o.urgent ? "quest-urgent" : ""}" data-track="${esc(o.id)}" aria-pressed="${o.id === active?.id}"><span class="quest-index">${o.done ? "✓" : o.urgent ? "!" : String(index + 1).padStart(2, "0")}</span><span class="quest-copy"><strong>${esc(o.title)}</strong><span class="quest-room">IR A: ${esc(o.room)}</span>${o.id === active?.id ? `<span class="quest-instruction">${esc(o.instruction)}</span><span class="quest-hint">${o.stationId ? "Sigue la ruta marcada en el suelo" : "Revisa recursos y alertas"}</span>` : ""}<span class="quest-progress">${esc(o.progress)}</span></span>${o.id === active?.id ? '<span class="tracking-dot"></span>' : ""}</button>`;
  return `${urgent.length ? `<div class="quest-section danger-label">ATENCIÓN INMEDIATA</div>${urgent.map(row).join("")}` : ""}<div class="quest-section">MISIÓN PRINCIPAL <span>${main.filter((o) => o.done).length} / ${main.length}</span></div>${main.map(row).join("")}<details class="support-quests" ${active?.optional ? "open" : ""}><summary>Preparación de la base <span>OPCIONAL</span></summary>${objectives
    .filter((o) => o.optional)
    .map(row)
    .join("")}</details>`;
}
