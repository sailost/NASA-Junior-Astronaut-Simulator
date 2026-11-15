import { auraHologram } from "./AuraHologram";
import { escapeHtml as esc, sourceLink } from "../data/Science";
import type { MissionLesson } from "./MissionLearning";

export const LESSON_READ_MS = 5000;

export class MissionLessonView {
  private elapsed = 0;
  private previous = performance.now();
  private timer: ReturnType<typeof setInterval>;
  private disposed = false;
  private finished = false;
  private lastSecond = -1;
  private beat = 0;
  private readonly beats: Array<{ label: string; text: string; extra?: string }>;
  get canContinue() { return this.elapsed >= LESSON_READ_MS; }

  constructor(private host: HTMLElement, private lesson: MissionLesson, private done: () => void, private now = () => performance.now()) {
    this.previous = now();
    this.beats = [
      { label: "LO QUE PASÓ", text: lesson.why },
      { label: "DATO DE CIENCIA", text: lesson.real },
      { label: "CONSECUENCIA", text: lesson.effect, extra: lesson.next },
    ];
    host.innerHTML = `<div class="lesson-scene"><aside class="lesson-aura">${auraHologram("talking")}<span>AURA</span></aside><article class="lesson-conversation"><header class="mission-lesson-header"><div><span class="lesson-complete">✓ ${lesson.objective ? "OBJETIVO COMPLETADO" : "ACCIÓN REGISTRADA"}</span><h2>${esc(lesson.title)}</h2></div></header><section class="lesson-copy" aria-label="Conversación con AURA" aria-live="polite" aria-atomic="true"><span id="lesson-beat-label" class="lesson-speaker"></span><p id="lesson-beat-text"></p><div id="lesson-beat-extra" class="lesson-beat-extra" hidden></div></section><footer class="lesson-footer"><div class="lesson-reading"><progress id="lesson-progress" max="5000" value="0" aria-label="Progreso de lectura"></progress><span id="lesson-countdown" role="status" aria-live="polite"></span></div><button id="lesson-continue" disabled>Continuar · 5 s</button></footer><div class="lesson-hint">Pulsa continuar para escuchar a AURA · Esc también avanza</div></article></div>`;
    host.querySelector<HTMLButtonElement>("#lesson-continue")!.onclick = () => this.advance();
    host.focus({ preventScroll: true });
    this.renderBeat(); this.paint(); this.timer = setInterval(() => this.update(), 100);
  }

  private renderBeat() {
    const current = this.beats[this.beat];
    this.host.querySelector("#lesson-beat-label")!.textContent = current.label;
    this.host.querySelector("#lesson-beat-text")!.textContent = current.text;
    const extra = this.host.querySelector<HTMLElement>("#lesson-beat-extra")!;
    extra.hidden = !current.extra && !(this.beat === 1 && this.lesson.source);
    extra.innerHTML = `${current.extra ? `<div class="lesson-next"><h3>Ahora vamos a…</h3><p>${esc(current.extra)}</p></div>` : ""}${this.beat === 1 && this.lesson.source ? `<div class="lesson-source">${sourceLink(this.lesson.source.url, this.lesson.source.label)}</div>` : ""}`;
    this.host.querySelectorAll(".lesson-aura .aura-portrait").forEach((portrait) => (portrait as HTMLElement).dataset.mood = this.beat === 2 ? "happy" : "talking");
    this.host.dataset.beat = String(this.beat + 1);
  }

  update() {
    if (this.disposed) return;
    const time = this.now();
    if (!document.hidden) this.elapsed = Math.min(LESSON_READ_MS, this.elapsed + Math.max(0, time - this.previous));
    this.previous = time; this.paint();
  }

  private paint() {
    const seconds = Math.ceil((LESSON_READ_MS - this.elapsed) / 1000);
    (this.host.querySelector("#lesson-progress") as HTMLProgressElement).value = this.elapsed;
    if (seconds === this.lastSecond) return;
    this.lastSecond = seconds;
    const button = this.host.querySelector<HTMLButtonElement>("#lesson-continue")!;
    button.disabled = !this.canContinue;
    button.textContent = this.canContinue ? (this.beat === this.beats.length - 1 ? "Volver a explorar →" : "Continuar →") : `Continuar · ${seconds} s`;
    this.host.querySelector("#lesson-countdown")!.textContent = this.canContinue ? `Conversación ${this.beat + 1} de ${this.beats.length}` : "Partida en pausa mientras lees.";
  }

  key(event: KeyboardEvent) {
    if (!(event.code === "Escape" || event.code === "Enter" || event.code === "Space")) return;
    if (event.code !== "Escape" && (event.target as HTMLElement)?.closest?.("button,a,summary")) return;
    event.preventDefault(); this.advance();
  }

  private advance() {
    this.update();
    if (this.disposed || this.finished || !this.canContinue) return;
    if (this.beat < this.beats.length - 1) {
      this.beat++; this.lastSecond = -1; this.renderBeat(); this.paint();
      return;
    }
    this.finished = true; this.done();
  }

  destroy() { this.disposed = true; clearInterval(this.timer); }
}
