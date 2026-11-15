import { auraHologram } from "./AuraHologram";
import { escapeHtml as esc } from "../data/Science";
export const INTRO_ART = { width: 1672, height: 941, directory: "assets/world/intro/", pages: ["prologo-01-marte.png", "prologo-02-tripulacion.png", "prologo-03-primera-mision.png"] } as const;
export interface ComicPage { image?: string; heading?: string; lines?: string[]; facts?: string[]; asset?: string; }
export interface ComicSequence { id: string; pages: ComicPage[]; label: string; allowMenu?: boolean; }
// Measured against the original third PNG, not the window or the LEEME approximation.
export const INTRO_START = { x: 1094 / 1672, y: 800 / 941, width: 536 / 1672, height: 100 / 941 };
export function fitIntro(width: number, height: number) {
  const scale = Math.max(0, Math.min((width - 24) / INTRO_ART.width, (height - 64) / INTRO_ART.height));
  const w = INTRO_ART.width * scale, h = INTRO_ART.height * scale;
  return { width: w, height: h, left: (width - w) / 2, top: (height - 48 - h) / 2 };
}
/** Developable paper surface: integrate local tangents, keeping adjacent strips attached.
 * The free edge leads the turn; the spine and edge never share one rigid rotation. */
export function paperPose(progress: number, count = 28) {
  const p = Math.max(0, Math.min(1, progress));
  const result: { x: number; z: number; angle: number }[] = [];
  let x = 0, z = 0;
  for (let i = 0; i < count; i++) {
    const u = (i + .5) / count;
    const angle = -Math.PI * p - .85 * Math.sin(Math.PI * p) * (u - .5);
    result.push({ x, z, angle });
    x += Math.cos(angle) / count; z -= Math.sin(angle) / count;
  }
  return result;
}
type PrologueCallbacks = { start: (read: boolean) => void; menu: () => void; turnSound?: () => void; startSound?: () => void };
export class Prologue {
  private page = 0;
  private pages: ComicPage[];
  private storyContent!: HTMLElement;
  private get lastPage() { return this.pages.length - 1; }
  private ready = false;
  private busy = false;
  private disposed = false;
  private leaving = false;
  private timer?: ReturnType<typeof setTimeout>;
  private observer?: ResizeObserver;
  private animations: Animation[] = [];
  private pendingTurn?: { target: number; source: number; backward: boolean };
  private frame: HTMLElement;
  private sheet: HTMLElement;
  private picture: HTMLImageElement;
  private images: HTMLImageElement[] = [];
  private loaded = new Set<number>();
  private resize = () => this.layout();
  private key = (event: KeyboardEvent) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || this.disposed) return;
    if (event.code === "Escape") { event.preventDefault(); this.backToMenu(); return; }
    if (event.code === "ArrowLeft") { event.preventDefault(); this.turn(-1); }
    else if (["ArrowRight", "Enter", "Space"].includes(event.code) && !(event.target as HTMLElement)?.closest?.("button, a")) {
      event.preventDefault(); this.page === this.lastPage ? this.launch(true) : this.turn(1);
    } else if (event.code === "ArrowRight") { event.preventDefault(); this.turn(1); }
  };
  constructor(private host: HTMLElement, private callbacks: PrologueCallbacks, private sequence?: ComicSequence) {
    this.pages = sequence?.pages || INTRO_ART.pages.map((name) => ({ image: INTRO_ART.directory + name }));
    host.innerHTML = `<div class="intro-reader" aria-label="Prólogo ilustrado"><div class="intro-loading" role="status">Cargando cómic…</div><div class="intro-frame" hidden><img class="intro-picture" alt="Página 1 del prólogo ilustrado" draggable="false"><div class="intro-shadow" aria-hidden="true"></div><div class="intro-sheet" aria-hidden="true"></div><button id="intro-start" aria-label="Comenzar misión" hidden></button></div><div class="intro-error" role="alert" hidden>No se pudo cargar el cómic. Puedes omitirlo o volver al menú.</div><nav class="intro-controls" aria-label="Navegación del cómic"><button id="intro-menu">Volver al menú</button><span class="intro-pagination"><button id="intro-previous" aria-label="Página anterior">← Anterior</button><span id="intro-counter" role="status" aria-live="polite">1 / 3</span><button id="intro-next" aria-label="Página siguiente">Siguiente →</button></span><button id="intro-skip">Omitir</button></nav><div class="intro-preload" hidden></div><div class="intro-exit" aria-hidden="true"></div></div>`;
    this.frame = host.querySelector(".intro-frame")!; this.sheet = host.querySelector(".intro-sheet")!; this.picture = host.querySelector(".intro-picture")!;
    this.storyContent = document.createElement("div"); this.storyContent.className = "intro-story-content"; this.frame.insertBefore(this.storyContent, this.frame.firstChild);
    this.storyContent.hidden = !sequence;
    if (sequence) {
      host.querySelector(".intro-reader")!.classList.add("intro-interlude");
      host.querySelector("#intro-start")!.textContent = sequence.label;
      host.querySelector("#intro-start")!.setAttribute("aria-label", sequence.label);
      host.querySelector<HTMLButtonElement>("#intro-menu")!.hidden = sequence.allowMenu === false;
    }
    const hotspot = host.querySelector<HTMLElement>("#intro-start")!;
    Object.assign(hotspot.style, { left: `${INTRO_START.x * 100}%`, top: `${INTRO_START.y * 100}%`, width: `${INTRO_START.width * 100}%`, height: `${INTRO_START.height * 100}%` });
    this.button("intro-previous").onclick = () => this.turn(-1);
    this.button("intro-next").onclick = () => this.turn(1);
    this.button("intro-skip").onclick = () => this.launch(false);
    this.button("intro-start").onclick = () => this.launch(true);
    this.button("intro-menu").onclick = () => this.backToMenu();
    const base = import.meta.env?.BASE_URL || "./";
    this.pages.forEach((page, i) => {
      const img = document.createElement("img"); img.alt = ""; img.decoding = "async";
      img.onload = async () => {
        try { await img.decode?.(); } catch { /* load has already succeeded */ }
        if (this.disposed || this.leaving) return;
        this.loaded.add(i);
        if (this.loaded.size === this.pages.length && !this.ready) {
          this.ready = true; this.frame.hidden = false;
          this.host.querySelector<HTMLElement>(".intro-loading")!.hidden = true;
          this.host.querySelector<HTMLElement>(".intro-error")!.hidden = true;
          this.showPage(); this.enter();
        }
      };
      img.onerror = () => {
        if (this.disposed) return;
        this.host.querySelector<HTMLElement>(".intro-error")!.hidden = false;
        this.host.querySelector<HTMLElement>(".intro-loading")!.hidden = true;
      };
      this.images.push(img); this.host.querySelector(".intro-preload")!.append(img); img.src = `${base}${page.image || page.asset || "assets/world/interiors/console-control.png"}`;
    });
    window.addEventListener("resize", this.resize); document.addEventListener("fullscreenchange", this.resize); document.addEventListener("keydown", this.key);
    if (typeof ResizeObserver !== "undefined") { this.observer = new ResizeObserver(this.resize); this.observer.observe(host); }
    this.layout(); this.controls(); this.button("intro-skip").focus({ preventScroll: true });
  }
  private button(id: string) { return this.host.querySelector<HTMLButtonElement>(`#${id}`)!; }
  private reduced() { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; }
  private enter() {
    if (this.reduced()) { this.button("intro-next").focus({ preventScroll: true }); return; }
    // Begin only after every illustration has decoded, so slow connections cannot
    // finish the entrance before the first page is actually available.
    this.busy = true; this.controls();
    const reader = this.host.querySelector(".intro-reader")!;
    reader.classList.add("intro-entering");
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.disposed) return;
      reader.classList.remove("intro-entering"); this.busy = false; this.controls();
      this.button("intro-next").focus({ preventScroll: true });
    }, 1100);
  }
  private layout() {
    if (this.disposed) return;
    const rect = this.host.getBoundingClientRect(), fit = fitIntro(rect.width || window.innerWidth, rect.height || window.innerHeight);
    Object.assign(this.frame.style, { left: `${fit.left}px`, top: `${fit.top}px`, width: `${fit.width}px`, height: `${fit.height}px`, perspective: `${Math.max(900, fit.width * 2.2)}px` });
    // Resizing/fullscreen during a turn settles to the selected page, never a stale-sized mesh.
    if (this.pendingTurn) this.finishTurn();
  }
  private controls() {
    this.button("intro-previous").disabled = !this.ready || this.busy || this.page === 0;
    this.button("intro-next").disabled = !this.ready || this.busy || this.page === this.lastPage;
    this.button("intro-start").hidden = this.page !== this.lastPage || !this.ready;
    this.button("intro-start").disabled = !this.ready || this.busy;
    this.button("intro-skip").disabled = this.busy;
    this.button("intro-menu").disabled = this.busy;
    this.host.querySelector(".intro-reader")!.setAttribute("aria-busy", String(this.busy));
  }
  private showPage() {
    this.paintPage(this.page);
    this.picture.alt = `Página ${this.page + 1} del prólogo ilustrado`;
    this.host.querySelector("#intro-counter")!.textContent = `${this.page + 1} / ${this.pages.length}`; this.controls();
  }
  private narrative(index: number, width?: number, height?: number) {
    const page = this.pages[index];
    return `<div class="comic-narrative" ${width ? `style="width:${width}px;height:${height}px"` : ""}><div class="comic-provisional">ESCENA NARRATIVA · ILUSTRACIÓN DEFINITIVA PENDIENTE</div><div class="comic-narrative-body">${auraHologram(this.sequence?.id === "defeat" ? "alert" : "talking")}<div><span class="comic-aura-name">AURA / REGISTRO DE MISIÓN</span><h2>${esc(page.heading || "Base Aurora")}</h2>${(page.lines || []).map((line) => `<p>${esc(line)}</p>`).join("")}<ul>${(page.facts || []).map((fact) => `<li>${esc(fact)}</li>`).join("")}</ul></div><img src="${this.images[index].src}" alt="" draggable="false"></div></div>`;
  }
  private paintPage(index: number) {
    const narrative = !!this.sequence && !this.pages[index].image;
    this.picture.hidden = narrative; this.storyContent.hidden = !narrative;
    if (narrative) this.storyContent.innerHTML = this.narrative(index);
    else this.picture.src = this.images[index].src;
  }
  turn(direction: number) {
    const target = this.page + direction;
    if (this.disposed || !this.ready || this.busy || target < 0 || target > this.lastPage || Math.abs(direction) !== 1) return;
    this.busy = true; this.pendingTurn = { target, source: direction > 0 ? this.page : target, backward: direction < 0 };
    this.controls(); this.callbacks.turnSound?.();
    if (this.reduced()) {
      // Accessible, brief cross-dissolve is deliberately confined to reduced motion.
      if (this.sequence && !this.pages[this.page].image) this.sheet.innerHTML = this.narrative(this.page);
      else this.sheet.style.backgroundImage = `url("${this.images[this.page].src}")`;
      this.sheet.style.backgroundSize = "100% 100%"; this.sheet.style.opacity = "1";
      this.paintPage(target);
      this.animate(this.sheet, [{ opacity: 1 }, { opacity: 0 }], 120);
      this.timer = setTimeout(() => this.finishTurn(), 120); return;
    }
    this.buildCurl(); this.timer = setTimeout(() => this.finishTurn(), 800);
  }
  private animate(element: HTMLElement, frames: Keyframe[], duration: number) {
    if (typeof element.animate === "function") {
      const animation = element.animate(frames, { duration, easing: "cubic-bezier(.35,0,.25,1)", fill: "both" });
      void animation.finished?.catch(() => {}); // Cancellation on resize/exit is intentional.
      this.animations.push(animation);
    }
    else {
      // CSS keyframes fallback keeps the curved turn in browsers without WAAPI.
      const name = `intro-motion-${this.sheet.childElementCount}-${this.animations.length}-${element.dataset.strip || 'shadow'}`;
      const style = document.createElement("style");
      style.textContent = `@keyframes ${name}{${frames.map((frame, i) => `${i / (frames.length - 1) * 100}%{${Object.entries(frame).filter(([key]) => key !== "offset").map(([key, value]) => `${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('')}}`;
      this.sheet.append(style); element.style.animation = `${name} ${duration}ms cubic-bezier(.35,0,.25,1) both`;
    }
  }
  private buildCurl() {
    const turn = this.pendingTurn!, width = Number.parseFloat(this.frame.style.width), height = Number.parseFloat(this.frame.style.height), count = 28;
    const steps = Array.from({ length: 41 }, (_, step) => paperPose(turn.backward ? 1 - step / 40 : step / 40, count));
    this.paintPage(turn.backward ? this.page : turn.target);
    this.sheet.style.opacity = "1";
    for (let i = 0; i < count; i++) {
      const strip = document.createElement("div"); strip.className = "intro-strip"; strip.dataset.strip = String(i);
      strip.style.width = `${width / count + .45}px`; strip.style.height = `${height}px`;
      strip.innerHTML = `<div class="intro-paper-front"></div><div class="intro-paper-back"></div>`;
      const front = strip.firstElementChild as HTMLElement;
      if (this.sequence && !this.pages[turn.source].image) {
        front.style.overflow = "hidden";
        front.innerHTML = `<div style="position:absolute;left:${-i * width / count}px;top:0">${this.narrative(turn.source, width, height)}</div>`;
      } else Object.assign(front.style, { backgroundImage: `url("${this.images[turn.source].src}")`, backgroundSize: `${width}px ${height}px`, backgroundPosition: `${-i * width / count}px 0` });
      this.sheet.append(strip);
      this.animate(strip, steps.map((pose) => ({ transform: `translate3d(${pose[i].x * width}px,0,${pose[i].z * width}px) rotateY(${pose[i].angle}rad)` })), 800);
      this.animate(front, steps.map((pose) => ({ filter: `brightness(${1 - .26 * Math.abs(Math.sin(pose[i].angle))})` })), 800);
    }
    const shadow = this.host.querySelector<HTMLElement>(".intro-shadow")!;
    this.animate(shadow, [{ opacity: 0 }, { opacity: .5, offset: .45 }, { opacity: 0 }], 800);
  }
  private finishTurn() {
    if (!this.pendingTurn || this.disposed) return;
    if (this.timer) clearTimeout(this.timer); this.timer = undefined;
    this.page = this.pendingTurn.target; this.pendingTurn = undefined;
    this.showPage(); this.cancelAnimations(); this.sheet.replaceChildren(); this.sheet.removeAttribute("style");
    this.busy = false; this.controls();
    (this.page === this.lastPage ? this.button("intro-start") : this.button("intro-next")).focus({ preventScroll: true });
  }
  private cancelAnimations() { this.animations.forEach((animation) => animation.cancel()); this.animations = []; }
  private launch(read: boolean) {
    if (this.disposed || this.busy || this.leaving || read && (!this.ready || this.page !== this.lastPage)) return;
    this.busy = this.leaving = true; this.controls(); this.callbacks.startSound?.();
    const finish = () => { if (!this.disposed) this.callbacks.start(read); };
    if (this.reduced()) { finish(); return; }
    this.host.querySelector(".intro-reader")!.classList.add("intro-leaving"); this.timer = setTimeout(finish, 500);
  }
  private backToMenu() { if (!this.disposed && !this.busy && this.sequence?.allowMenu !== false) this.callbacks.menu(); }
  destroy() {
    this.disposed = true; if (this.timer) clearTimeout(this.timer);
    this.observer?.disconnect(); this.cancelAnimations();
    window.removeEventListener("resize", this.resize); document.removeEventListener("fullscreenchange", this.resize); document.removeEventListener("keydown", this.key);
    this.images.forEach((img) => { img.onload = img.onerror = null; }); this.images = [];
    this.host.replaceChildren();
  }
}
