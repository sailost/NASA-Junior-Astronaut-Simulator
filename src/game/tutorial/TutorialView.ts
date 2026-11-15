import { auraHologram } from "../ui/AuraHologram";
import { escapeHtml as esc } from "../data/Science";
import { decisionHint, tutorialTarget, type TutorialManager } from "./TutorialManager";
import type { Simulation } from "../systems/Simulation";
import { auraWelcomeOverview } from "../ui/AuraWelcome";

export function tutorialPanelPosition(width: number, height: number, target?: { x: number; y: number; width: number; height: number }, actorX = width / 2, panelHeight = 245, centered = false) {
  const panelWidth = Math.min(centered ? 600 : 360, width - 32);
  if (centered) return { x: (width - panelWidth) / 2, y: Math.max(16, (height - Math.min(panelHeight, height - 32)) / 2), width: panelWidth };
  let x = actorX > width / 2 ? 22 : width - panelWidth - 22;
  let y = height - panelHeight - 22;
  if (target) {
    x = target.x + target.width / 2 - panelWidth / 2;
    y = target.y + target.height + 16;
    if (y + panelHeight > height - 16) y = target.y - panelHeight - 16;
  }
  return { x: Math.max(16, Math.min(width - panelWidth - 16, x)), y: Math.max(16, Math.min(height - panelHeight - 16, y)), width: panelWidth };
}
export class TutorialView {
  readonly element: HTMLElement;
  private markup = "";
  constructor(private root: HTMLElement, private manager: TutorialManager, onChange: () => void, askAura: (topic?: string) => void = () => {}) {
    this.element = document.createElement("div");
    this.element.id = "tutorial-overlay"; this.element.hidden = true;
    this.element.innerHTML = `<svg class="tutorial-shade" aria-hidden="true"><path></path></svg><div id="tutorial-focus" aria-hidden="true"></div><div id="tutorial-walk-hint" hidden><span>WASD / ↑ ↓ ← →</span></div><section id="tutorial-panel" aria-label="Tutorial de AURA"><div id="tutorial-copy" role="status" aria-live="polite" aria-atomic="true"></div><div id="aura-intro-replies" hidden><button id="aura-intro-systems">Explícame los sistemas</button><button id="aura-intro-explore">Enséñame mientras exploramos</button></div><nav aria-label="Pasos del tutorial"><button id="tutorial-back">Anterior</button><button id="tutorial-next">Siguiente</button><button id="tutorial-skip">Omitir</button></nav></section>`;
    root.append(this.element);
    const ask = document.createElement("button");
    ask.id = "aura-intro-ask"; ask.textContent = "Preguntarle a AURA por los recursos";
    this.element.querySelector("#aura-intro-replies")!.prepend(ask);
    ask.addEventListener("click", () => askAura());
    this.element.addEventListener("click", (event) => {
      const resource = (event.target as HTMLElement).closest<HTMLElement>("[data-aura-intro-resource]");
      if (resource) askAura(`resource:${resource.dataset.auraIntroResource}`);
    });
    this.element.querySelector("#tutorial-next")!.addEventListener("click", () => { manager.next(); onChange(); });
    this.element.querySelector("#tutorial-back")!.addEventListener("click", () => { manager.previous(); onChange(); });
    this.element.querySelector("#tutorial-skip")!.addEventListener("click", () => { manager.skip(); onChange(); });
    this.element.querySelector("#aura-intro-systems")!.addEventListener("click", () => { manager.next(); onChange(); });
    this.element.querySelector("#aura-intro-explore")!.addEventListener("click", () => { manager.beginPractice(); onChange(); });
  }
  hide() {
    if (this.element.hidden) return;
    this.element.hidden = true;
    this.root.querySelectorAll(".tutorial-map-focus").forEach((el) => el.classList.remove("tutorial-map-focus"));
  }
  update(sim: Simulation, visible: boolean, actor: { x: number; y: number }, player?: { x: number; y: number }) {
    if (!this.manager.active || !visible) { this.hide(); return; }
    this.element.hidden = false;
    this.root.querySelectorAll(".tutorial-map-focus").forEach((el) => el.classList.remove("tutorial-map-focus"));
    const step = this.manager.step, target = tutorialTarget(sim);
    const near = target && player && Math.hypot(player.x - target.x, player.y - target.y) < 115;
    const text = step.kind === "decision" ? decisionHint(sim) : step.kind === "interaction" ? `${near ? "Equipo al alcance. Pulsa E para interactuar." : step.text} Destino: ${target?.name || "equipo de la misión"}.` : step.text;
    const markup = `${auraHologram(step.kind === "movement" || step.kind === "decision" ? "thinking" : step.kind === "interaction" ? "happy" : "talking")}<div><span class="tutorial-eyebrow">AURA · ${this.manager.stepNumber} / ${this.manager.totalSteps}</span><h2>${esc(step.title)}</h2><p>${esc(text)}</p><small>APRENDIZAJE PROTEGIDO · reloj detenido</small></div>`;
    this.element.querySelector<HTMLElement>("#aura-intro-replies")!.hidden = step.id !== "welcome";
    const welcomeMarkup = markup + (step.id === "welcome" ? auraWelcomeOverview() : "");
    if (welcomeMarkup !== this.markup) { this.element.querySelector("#tutorial-copy")!.innerHTML = welcomeMarkup; this.markup = welcomeMarkup; }
    this.element.classList.toggle("aura-welcome-tutorial", step.id === "welcome");
    (this.element.querySelector("#tutorial-back") as HTMLButtonElement).disabled = this.manager.index === 0;
    const next = this.element.querySelector<HTMLButtonElement>("#tutorial-next")!;
    next.disabled = !this.manager.canNext;
    next.textContent = this.manager.canNext ? step.id === "help" ? "Comenzar misión" : "Siguiente" : step.kind === "movement" ? "Camina para continuar" : step.kind === "interaction" ? "Usa E en el equipo" : "Completa una acción";
    const bounds = this.root.getBoundingClientRect();
    const width = bounds.width || window.innerWidth, height = bounds.height || window.innerHeight;
    let focus: { x: number; y: number; width: number; height: number } | undefined;
    if (step.resource || step.id === "welcome") {
      const node = this.root.querySelector(step.id === "welcome" ? "#aura-call" : step.resource === "radiation" ? '[data-detail-resource="radiation"]' : `[data-resource="${step.resource}"]`);
      const rect = node?.getBoundingClientRect();
      if (rect && rect.width && rect.height) focus = { x: rect.x - bounds.x - 6, y: rect.y - bounds.y - 6, width: rect.width + 12, height: rect.height + 12 };
    } else if (step.kind === "movement") focus = { x: actor.x - 30, y: actor.y - 30, width: 60, height: 60 };
    if (step.resource === "energy") this.root.querySelector('[data-map-room="engine"]')?.classList.add("tutorial-map-focus");
    const box = this.element.querySelector<HTMLElement>("#tutorial-focus")!;
    box.hidden = !focus;
    if (focus) Object.assign(box.style, { left: `${focus.x}px`, top: `${focus.y}px`, width: `${focus.width}px`, height: `${focus.height}px`, borderRadius: step.kind === "movement" ? "50%" : "8px" });
    const shade = this.element.querySelector(".tutorial-shade")!;
    shade.setAttribute("viewBox", `0 0 ${width} ${height}`);
    shade.querySelector("path")!.setAttribute("d", `M0 0H${width}V${height}H0Z${focus ? ` M${focus.x} ${focus.y}v${focus.height}h${focus.width}v-${focus.height}Z` : ""}`);
    shade.classList.toggle("practice-shade", this.manager.allowsMovement);
    const panel = this.element.querySelector<HTMLElement>("#tutorial-panel")!;
    panel.style.width = `${Math.min(step.id === "welcome" ? 600 : 360, width - 32)}px`;
    const layout = tutorialPanelPosition(width, height, step.kind === "resource" ? focus : undefined, actor.x, panel.getBoundingClientRect().height || 245, step.id === "welcome");
    Object.assign(this.element.querySelector<HTMLElement>("#tutorial-panel")!.style, { left: `${layout.x}px`, top: `${layout.y}px`, width: `${layout.width}px` });
    const hint = this.element.querySelector<HTMLElement>("#tutorial-walk-hint")!;
    hint.hidden = step.kind !== "movement";
    Object.assign(hint.style, { left: `${Math.max(95, Math.min(width - 95, actor.x))}px`, top: `${Math.max(80, Math.min(height - 60, actor.y - 65))}px` });
  }
}
