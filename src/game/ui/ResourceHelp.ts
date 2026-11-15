import type { Resource, Simulation } from "../systems/Simulation";
import { resourceNames } from "./ExpeditionHud";
import { escapeHtml as esc } from "../data/Science";
export const resourceHelp: Record<Resource, { purpose: string; consumes: string; recovery: string }> = {
  energy: { purpose: "Alimenta máquinas y soporte vital.", consumes: "Las instalaciones, los cultivos, los análisis y las reparaciones utilizan energía.", recovery: "Los paneles generan electricidad de día si el sistema está operativo. Las baterías guardan la reserva para la noche; la mejora solar aumenta la generación diurna." },
  oxygen: { purpose: "Permite respirar a los cuatro astronautas.", consumes: "La tripulación lo consume continuamente.", recovery: "El soporte vital recupera oxígeno si está operativo y tiene electricidad. Repara sus válvulas y revisa las prioridades en Control." },
  water: { purpose: "Sostiene a la tripulación, los cultivos y los análisis.", consumes: "Se usa para vivir, plantar, mantener cultivos e investigar.", recovery: "El reciclador recupera parte con electricidad. Repara las tuberías si fallan y ajusta prioridades en Control." },
  food: { purpose: "Alimenta a la tripulación durante los tres soles.", consumes: "Los cuatro astronautas comen con el paso del tiempo.", recovery: "Planta en el Invernadero y cosecha cuando el cultivo termine. Necesita agua, energía y tiempo; equilibrar luz y riego mejora sus condiciones." },
  health: { purpose: "Resume el estado de la tripulación.", consumes: "La falta de oxígeno, agua o comida y una exposición elevada empeoran la salud.", recovery: "Mantén las reservas y protege a la tripulación en el refugio. Con recursos suficientes y baja exposición, la salud se recupera lentamente." },
  radiation: { purpose: "Escala de exposición del modelo educativo, de 0 a 100. No es una dosis científica.", consumes: "Aumenta durante el escenario solar simulado si la tripulación queda sin protección.", recovery: "El refugio físico reduce la exposición durante la alerta; no borra la exposición acumulada. Un evento histórico DONKI no demuestra por sí solo una amenaza para Marte." },
};
export class ResourceHelp {
  private element: HTMLElement;
  private selected?: Resource;
  private pinned = false;
  private markup = "";
  constructor(private root: HTMLElement, private sim: () => Simulation, private allowed: () => boolean) {
    this.element = document.createElement("aside"); this.element.id = "resource-help"; this.element.hidden = true;
    this.element.innerHTML = '<button id="close-resource-help" aria-label="Cerrar explicación">×</button><div id="resource-help-copy"></div>';
    root.append(this.element);
    this.element.querySelector("button")!.onclick = () => this.close();
    root.querySelectorAll<HTMLElement>("[data-resource], [data-detail-resource]").forEach((button) => {
      const key = (button.dataset.resource || button.dataset.detailResource) as Resource;
      button.addEventListener("mouseenter", () => { if (!this.pinned) this.open(key, button); });
      button.addEventListener("mouseleave", () => { if (!this.pinned) this.close(); });
      button.addEventListener("focus", () => { if (!this.pinned) this.open(key, button); });
      button.addEventListener("blur", () => { if (!this.pinned) this.close(); });
      button.addEventListener("click", () => {
        if (this.selected === key && this.pinned) this.close();
        else this.open(key, button, true);
      });
      if (button.tagName !== "BUTTON") button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); button.click(); }
      });
    });
    window.addEventListener("resize", () => this.close());
  }
  get isOpen() { return !this.element.hidden; }
  close() {
    this.element.hidden = true; this.pinned = false; this.selected = undefined;
    this.root.querySelectorAll('[aria-controls="resource-help"]').forEach((b) => { b.setAttribute("aria-expanded", "false"); b.removeAttribute("aria-describedby"); });
  }
  private open(key: Resource, anchor: HTMLElement, pinned = false) {
    if (!this.allowed()) return;
    this.close(); this.selected = key; this.pinned = pinned;
    this.element.hidden = false; this.element.setAttribute("role", pinned ? "dialog" : "tooltip");
    this.element.setAttribute("aria-label", `Ayuda: ${resourceNames[key]}`);
    (this.element.querySelector("button") as HTMLElement).hidden = !pinned;
    anchor.setAttribute("aria-expanded", "true"); anchor.setAttribute("aria-describedby", "resource-help-copy");
    this.update();
    const rect = anchor.getBoundingClientRect(), parent = this.root.getBoundingClientRect();
    const width = parent.width || window.innerWidth, height = parent.height || window.innerHeight;
    const panelWidth = Math.min(320, width - 32);
    this.element.style.width = `${panelWidth}px`;
    const panelHeight = this.element.getBoundingClientRect().height || 260;
    let x = rect.x - parent.x + rect.width / 2 - panelWidth / 2;
    let y = rect.bottom - parent.y + 14;
    if (y + panelHeight > height - 16) y = Math.max(16, rect.top - parent.y - panelHeight - 14);
    Object.assign(this.element.style, { width: `${panelWidth}px`, left: `${Math.max(16, Math.min(width - panelWidth - 16, x))}px`, top: `${Math.max(16, y)}px` });
  }
  update() {
    if (!this.selected || this.element.hidden) return;
    const sim = this.sim(), data = resourceHelp[this.selected];
    const value = Math.ceil(sim.resources[this.selected]);
    const status = this.selected === "energy" ? `${sim.daylight ? "Día · producción solar posible" : "Noche · reserva de baterías"}. Sistema ${sim.systems.power ? "operativo" : "averiado"}.` : "Valores del modelo educativo, sin unidades físicas.";
    const html = `<strong>${esc(resourceNames[this.selected])} <b>${value}${this.selected === "radiation" ? "/100" : "%"}</b></strong><p>${esc(data.purpose)}</p><p><em>${this.selected === "radiation" ? "Cuándo aumenta" : "Qué lo consume"}</em> ${esc(data.consumes)}</p><p><em>Cómo cuidarlo</em> ${esc(data.recovery)}</p><small>${esc(status)}</small>`;
    if (html !== this.markup) { this.element.querySelector("#resource-help-copy")!.innerHTML = html; this.markup = html; }
  }
}
