import { auraHologram, auraMoodLabels, type AuraMood } from "./AuraHologram";
import { auraDialogue, auraStateMood, type AuraContext } from "./AuraDialogue";
import type { AuraTip } from "./AuraCoach";
import { escapeHtml as esc, sourceLink } from "../data/Science";
import { auraWelcomeTitle, auraWelcomeText, auraWelcomeOverview } from "./AuraWelcome";
export class AuraCompanion {
  readonly element: HTMLElement;
  private opened = false;
  private topic = "home";
  private nodeMarkup = "";
  private choicesMarkup = "";
  private lastTip = "";
  private speakingUntil = 0;
  private thinkingUntil = 0;
  private happyUntil = 0;
  private discoveryPending = true;
  private highlighted?: Element;
  constructor(private root: HTMLElement, private context: () => AuraContext,
    private allowed: () => boolean, private guide: (id?: string) => void) {
    this.element = document.createElement("div"); this.element.id = "aura-companion"; this.element.hidden = true;
    this.element.innerHTML = `<button id="aura-call" aria-label="Conversar con AURA (C)" aria-controls="aura-conversation" aria-expanded="false">${auraHologram()}<span>AURA <kbd>C</kbd></span><small id="aura-presence">En línea</small></button><section id="aura-conversation" role="dialog" aria-modal="false" aria-label="Conversación con AURA" hidden><header><span>AURA / ASISTENTE DE MISIÓN</span><button id="aura-close" aria-label="Cerrar conversación">×</button></header><div class="aura-dialogue-scene"><div class="aura-dialogue-portrait">${auraHologram()}<small id="aura-emotion"></small></div><div class="aura-dialogue-copy" aria-live="polite" aria-atomic="true"><h2 id="aura-dialogue-title"></h2><p id="aura-dialogue-text"></p><div id="aura-dialogue-sources"></div></div></div><nav id="aura-replies" aria-label="Respuestas a AURA"></nav><footer>La colonia continúa · C / Esc para cerrar</footer></section>`;
    root.append(this.element);
    const discovery = document.createElement("section");
    discovery.id = "aura-discovery"; discovery.hidden = true;
    discovery.setAttribute("aria-label", "Conoce a tu asistente AURA");
    discovery.setAttribute("role", "dialog");
    discovery.setAttribute("aria-labelledby", "aura-welcome-title");
    discovery.innerHTML = `<header class="aura-welcome-heading">${auraHologram("talking")}<div><span>AURA / ASISTENTE DE MISIÓN</span><h2 id="aura-welcome-title">${auraWelcomeTitle}</h2><p>${auraWelcomeText}</p></div></header>${auraWelcomeOverview()}<button id="aura-discovery-ask">Quiero saber más sobre los recursos</button><button id="aura-discovery-dismiss">Entendido, vamos a explorar</button>`;
    this.element.append(discovery);
    discovery.querySelector("#aura-discovery-ask")!.addEventListener("click", () => this.open("resources"));
    discovery.querySelector("#aura-discovery-dismiss")!.addEventListener("click", () => { this.dismissWelcome(); this.element.querySelector<HTMLElement>("#aura-call")!.focus({ preventScroll: true }); });
    discovery.addEventListener("click", (event) => {
      const resource = (event.target as HTMLElement).closest<HTMLElement>("[data-aura-intro-resource]");
      if (resource) this.open(`resource:${resource.dataset.auraIntroResource}`);
    });
    this.element.querySelector("#aura-call")!.addEventListener("click", () => this.toggle());
    this.element.querySelector("#aura-close")!.addEventListener("click", () => this.close(true));
    this.element.querySelector("#aura-replies")!.addEventListener("click", (event) => {
      const reply = (event.target as HTMLElement).closest<HTMLElement>("[data-aura-reply]");
      if (reply) this.select(reply.dataset.auraReply!);
    });
  }
  get isOpen() { return this.opened; }
  acknowledgeWelcome() { this.dismissWelcome(); }
  private dismissWelcome() {
    this.discoveryPending = false;
    this.element.querySelector<HTMLElement>("#aura-discovery")!.hidden = true;
    this.element.classList.remove("aura-welcoming");
  }
  toggle() {
    if (!this.allowed()) return;
    if (this.opened) { this.close(true); return; }
    this.open();
  }
  open(topic = "home") {
    if (!this.allowed()) return;
    this.element.hidden = false;
    this.dismissWelcome();
    this.opened = true; this.topic = topic;
    this.speakingUntil = performance.now() + 3500;
    this.element.querySelector<HTMLElement>("#aura-conversation")!.hidden = false;
    this.element.querySelector("#aura-call")!.setAttribute("aria-expanded", "true");
    this.render(); this.element.querySelector<HTMLElement>("[data-aura-reply]")?.focus();
  }
  close(focus = false) {
    if (!this.opened && this.element.querySelector<HTMLElement>("#aura-conversation")!.hidden) return;
    this.opened = false;
    this.highlighted?.classList.remove("aura-resource-focus"); this.highlighted = undefined;
    this.element.querySelector<HTMLElement>("#aura-conversation")!.hidden = true;
    this.element.querySelector("#aura-call")!.setAttribute("aria-expanded", "false");
    if (focus) this.element.querySelector<HTMLElement>("#aura-call")!.focus({ preventScroll: true });
  }
  celebrate() { this.happyUntil = performance.now() + 2600; }
  reset() { this.close(); this.topic = "home"; this.lastTip = ""; this.happyUntil = this.thinkingUntil = this.speakingUntil = 0; this.discoveryPending = true; }
  key(event: KeyboardEvent) {
    if (!this.allowed() || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return false;
    if (event.code === "KeyC" || this.opened && event.code === "Escape") {
      event.preventDefault(); event.code === "Escape" ? this.close(true) : this.toggle(); return true;
    }
    if (this.opened && /^Digit[1-4]$/.test(event.code)) {
      const node = auraDialogue(this.topic, this.context()), item = node.choices[Number(event.code.slice(-1)) - 1];
      if (item) { event.preventDefault(); this.select(item.id); return true; }
    }
    return false;
  }
  private select(id: string) {
    if (!this.opened || !this.allowed()) return;
    // Re-resolve against live state, including a new emergency or a finished analysis.
    const node = auraDialogue(this.topic, this.context()), selected = node.choices.find((c) => c.id === id);
    if (!selected) return;
    if (selected.action) { this.guide(selected.action === "guide" ? node.stationId : undefined); this.close(true); return; }
    this.topic = selected.next || "home";
    this.thinkingUntil = performance.now() + 250;
    this.speakingUntil = performance.now() + 4250;
    this.render();
  }
  private render() {
    const node = auraDialogue(this.topic, this.context());
    const resource = this.topic.startsWith("resource:") ? this.topic.slice(9) : undefined;
    const indicator = resource ? this.root.querySelector(`[data-resource="${resource}"]`) : undefined;
    if (indicator !== this.highlighted) {
      this.highlighted?.classList.remove("aura-resource-focus");
      this.highlighted = indicator || undefined;
      this.highlighted?.classList.add("aura-resource-focus");
    }
    const markup = JSON.stringify([node.title, node.text, node.references]);
    if (markup !== this.nodeMarkup) {
      this.element.querySelector("#aura-dialogue-title")!.textContent = node.title;
      this.element.querySelector("#aura-dialogue-text")!.textContent = node.text;
      this.element.querySelector("#aura-dialogue-sources")!.innerHTML = (node.references || []).map((reference) => sourceLink(reference.url, reference.label)).join("");
      this.nodeMarkup = markup;
    }
    const replies = node.choices.map((c, i) => `<button data-aura-reply="${esc(c.id)}"><kbd>${i + 1}</kbd><span>${esc(c.label)}</span><b aria-hidden="true">›</b></button>`).join("");
    if (replies !== this.choicesMarkup) {
      const focused = (document.activeElement as HTMLElement)?.dataset.auraReply;
      this.element.querySelector("#aura-replies")!.innerHTML = replies;
      this.choicesMarkup = replies;
      if (focused) this.element.querySelector<HTMLElement>("[data-aura-reply]")?.focus({ preventScroll: true });
    }
    return node;
  }
  update(visible: boolean, message?: AuraTip, allowDiscovery = true) {
    this.element.hidden = !visible;
    if (!visible) { this.close(); return; }
    const now = performance.now(), context = this.context();
    const discovery = this.element.querySelector<HTMLElement>("#aura-discovery")!;
    const welcoming = allowDiscovery && this.discoveryPending && !this.opened;
    const justAppeared = welcoming && discovery.hidden;
    discovery.hidden = !welcoming;
    if (justAppeared) discovery.querySelector<HTMLElement>("#aura-discovery-dismiss")!.focus({ preventScroll: true });
    this.element.classList.toggle("aura-welcoming", welcoming);
    const footer = this.element.querySelector("#aura-conversation > footer")!;
    const footerText = context.sim.paused ? "Aprendizaje protegido · C / Esc para volver" : "La colonia continúa · C / Esc para cerrar";
    if (footer.textContent !== footerText) footer.textContent = footerText;
    if (message && message.id !== this.lastTip) { this.lastTip = message.id; this.speakingUntil = now + 3500; }
    const state = auraStateMood(context.sim), node = this.opened ? this.render() : undefined;
    let mood: AuraMood = state;
    if (state !== "emergency" && state !== "alert") {
      mood = now < this.happyUntil ? "happy" : now < this.thinkingUntil ? "thinking" :
        node?.mood === "thinking" ? "thinking" : now < this.speakingUntil ? "talking" : state;
    }
    if (this.element.dataset.mood !== mood) {
      this.element.dataset.mood = mood;
      this.element.querySelectorAll<SVGElement>(".aura-portrait").forEach((portrait) => portrait.dataset.mood = mood);
      this.element.querySelector("#aura-presence")!.textContent = auraMoodLabels[mood];
      this.element.querySelector("#aura-emotion")!.textContent = auraMoodLabels[mood];
    }
    const toast = this.root.querySelector<SVGElement>("#aura-message .aura-portrait");
    if (toast && toast.dataset.mood !== mood) toast.dataset.mood = mood;
  }
}
