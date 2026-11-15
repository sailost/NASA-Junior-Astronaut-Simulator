import { auraHologram } from "./AuraHologram";
import { escapeHtml as esc } from "../data/Science";
import type { MissionLesson } from "./MissionLearning";
export const LESSON_READ_MS = 5000;
export class MissionLessonView {
  private elapsed = 0;
  private previous = performance.now();
  private timer: ReturnType<typeof setInterval>;
  private disposed = false;
  private finished = false;
  private lastSecond = -1;
  get canContinue() { return this.elapsed >= LESSON_READ_MS; }
  constructor(private host: HTMLElement, lesson: MissionLesson, private done: () => void, private now = () => performance.now()) {
    this.previous = now();
    host.innerHTML = `<header class="mission-lesson-header">${auraHologram("happy")}<div><span class="lesson-complete">✓ OBJETIVO COMPLETADO</span><h2>${esc(lesson.title)}</h2></div></header><section class="lesson-copy" aria-label="Explicación de AURA"><span class="lesson-speaker">AURA</span><p>${esc(lesson.why)}</p><p class="lesson-knowledge">${esc(lesson.real)}</p></section><section class="lesson-next"><h3>Ahora vamos a…</h3><p>${esc(lesson.next)}</p></section><footer class="lesson-footer"><div class="lesson-reading"><progress id="lesson-progress" max="5000" value="0" aria-label="Tiempo mínimo de lectura"></progress><span id="lesson-countdown" role="status" aria-live="polite"></span></div><button id="lesson-continue" disabled>Continuar · 5 s</button></footer>`;
    host.querySelector<HTMLButtonElement>("#lesson-continue")!.onclick = () => this.finish();
    host.focus({preventScroll:true});
    this.paint(); this.timer = setInterval(() => this.update(), 100);
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
    if (seconds === this.lastSecond) return; this.lastSecond = seconds;
    const button = this.host.querySelector<HTMLButtonElement>("#lesson-continue")!;
    button.disabled = !this.canContinue; button.textContent = this.canContinue ? "Continuar →" : `Continuar · ${seconds} s`;
    this.host.querySelector("#lesson-countdown")!.textContent = this.canContinue ? "Continúa cuando quieras." : "Partida en pausa mientras lees.";
  }
  key(event: KeyboardEvent) {
    if (!["Escape", "Enter", "Space"].includes(event.code)) return;
    if (event.code !== "Escape" && (event.target as HTMLElement)?.closest?.("button,a,summary")) return;
    event.preventDefault(); this.finish();
  }
  private finish() {
    this.update(); if (this.disposed || this.finished || !this.canContinue) return;
    this.finished = true; this.done();
  }
  destroy() { this.disposed = true; clearInterval(this.timer); }
}
