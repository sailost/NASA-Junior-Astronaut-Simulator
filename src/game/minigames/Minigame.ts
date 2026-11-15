import { waterSolution, rotateMask, waterConnected, oxygenAligned, signalAligned, circuitAligned } from "./puzzles";
import { sampleNames, type SampleId } from "../systems/Expedition";
import { specimenArt, plantArt } from "./machineArt";
export type PuzzleKind = "circuit" | "oxygen" | "water" | "signal" | "laboratory" | "greenhouse" | "shelter";
export interface PuzzleOptions { sample?: SampleId; tutorial?: boolean; untimed?: boolean; clockLabel?: () => string; settleMs?: number; feedback?: (success: boolean) => void; }
export const scanTargets: Record<SampleId, number[]> = { plant: [90, 210], water: [150, 270], soil: [240, 60] };
const titles: Record<PuzzleKind, string> = {
  oxygen: "Estabiliza el aire", water: "Reconecta el agua", circuit: "Restaura el circuito",
  laboratory: "Explora una muestra", signal: "Sintoniza la Tierra", greenhouse: "Cuida el invernadero", shelter: "Prepara el refugio",
};
const instructions: Record<PuzzleKind, string> = {
  oxygen: "Gira cada válvula hasta la marca segura. Clic o arrastra; usa las flechas con el teclado.",
  water: "Gira los conductos. Conecta la entrada con la salida sin dejar fugas.",
  circuit: "Selecciona un nodo a la izquierda y su pareja a la derecha: A con A, B con B y C con C.",
  laboratory: "Coloca la muestra en el escáner. Alinea los puntos cian con las marcas ámbar.",
  signal: "Ajusta frecuencia y fase. Mantén las dos ondas alineadas para abrir el enlace.",
  greenhouse: "Observa las plantas. Dosifica agua y luz para equilibrar ambos indicadores.",
  shelter: "Prepara el acceso, comprueba la tripulación y cierra la puerta del refugio.",
};
/** Owns input and visual feedback; Interface commits costs and results to Simulation. */
export class Minigame {
  private timer?: number;
  private completion?: number;
  private start: number;
  private finished = false;
  private listeners = new AbortController();
  private links = [-1, -1, -1];
  private selected = 0;
  private masks = waterSolution.map((m) => rotateMask(m, 1 + Math.floor(Math.random() * 3)));
  private valves = [20, 20, 20];
  private rings = [0, 0];
  private placed = false;
  private frequency = 20;
  private phase = 70;
  private stable = 0;
  private water = 1;
  private light = 4;
  private shelterStep = 0;
  private sample: SampleId;
  constructor(private root: HTMLElement, private kind: PuzzleKind, private now: () => number,
    private done: (won: boolean) => void, private options: PuzzleOptions = {}) {
    this.sample = options.sample || "plant";
    this.start = now(); this.render();
    this.timer = window.setInterval(() => {
      if (this.finished) return;
      const left = Math.max(0, 75 - (now() - this.start));
      const clock = this.root.querySelector("#puzzle-time")!;
      const text = options.tutorial ? "APRENDE A TU RITMO" : options.untimed ? "SIN LÍMITE DE TIEMPO" : options.clockLabel?.() || `${Math.ceil(left)} s · puedes corregir`;
      if (clock.textContent !== text) clock.textContent = text;
      if (!options.tutorial && !options.untimed && left <= 0) { this.finish(false); return; }
      if (kind === "signal") {
        this.stable = signalAligned(this.frequency, this.phase) ? this.stable + 1 : 0;
        (this.root.querySelector("#signal-lock") as HTMLElement).style.width = `${Math.min(100, this.stable * 10)}%`;
        if (this.stable >= 10) this.finish(true);
      }
    }, 100);
  }
  destroy() {
    window.clearInterval(this.timer); window.clearTimeout(this.completion);
    this.listeners.abort(); this.finished = true;
  }
  private finish(won: boolean) {
    if (this.finished) return;
    this.finished = true; window.clearInterval(this.timer); this.listeners.abort();
    this.root.classList.add(won ? "machine-complete" : "machine-failed");
    this.feedback(won ? "✓ Conexión estable. Secuencia completada." : "Tiempo agotado. Puedes volver a intentarlo.", won);
    this.root.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.disabled = true);
    if (this.options.settleMs === 0) this.done(won);
    else this.completion = window.setTimeout(() => this.done(won), this.options.settleMs ?? 650);
  }
  private feedback(text: string, success = false) {
    this.root.querySelector("#puzzle-feedback")!.textContent = text;
    this.options.feedback?.(success);
  }
  private listen(node: Element, event: string, fn: (e: any) => void) { node.addEventListener(event, fn, { signal: this.listeners.signal }); }
  private render() {
    this.root.className = `machine-console machine-${this.kind}`;
    this.root.innerHTML = `<header class="machine-header"><span class="machine-serial">AURORA / ${this.kind.toUpperCase()}</span><span class="machine-led">● ENLACE LOCAL</span></header><h2>${titles[this.kind]}</h2><p class="machine-instruction">${instructions[this.kind]}</p><div id="puzzle-area" class="machine-stage"></div><div class="machine-footer"><span id="puzzle-feedback" role="status">Listo para operar · controles simulados</span><span id="puzzle-time">${this.options.tutorial ? "APRENDE A TU RITMO" : "75 s · puedes corregir"}</span></div>`;
    const area = this.root.querySelector<HTMLElement>("#puzzle-area")!;
    this.root.querySelector("#puzzle-time")!.textContent = this.options.tutorial ? "APRENDE A TU RITMO" : this.options.untimed ? "SIN LÍMITE DE TIEMPO" : this.options.clockLabel?.() || "75 s · puedes corregir";
    if (this.kind === "oxygen") this.oxygen(area);
    else if (this.kind === "water") this.pipes(area);
    else if (this.kind === "circuit") this.circuit(area);
    else if (this.kind === "laboratory") this.laboratory(area);
    else if (this.kind === "signal") this.signal(area);
    else if (this.kind === "greenhouse") this.greenhouse(area);
    else this.shelter(area);
    area.querySelector<HTMLElement>("button")?.focus();
  }
  private dial(node: HTMLElement, get: () => number, set: (value: number) => void, max: number, step: number) {
    let origin: { x: number; y: number; value: number } | undefined, dragged = false;
    const adjust = (value: number, wrap = false) => {
      if (!this.finished) set(wrap ? (value + max + step) % (max + step) : Math.max(0, Math.min(max, Math.round(value / step) * step)));
    };
    this.listen(node, "click", () => { if (!dragged) adjust(get() + step, true); dragged = false; });
    this.listen(node, "keydown", (e: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
      e.preventDefault(); adjust(e.key === "Home" ? 0 : e.key === "End" ? max : get() + (["ArrowLeft", "ArrowDown"].includes(e.key) ? -step : step));
    });
    this.listen(node, "pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return;
      origin = { x: e.clientX, y: e.clientY, value: get() }; dragged = false; node.setPointerCapture?.(e.pointerId);
    });
    this.listen(node, "pointermove", (e: PointerEvent) => {
      if (!origin) return;
      const distance = e.clientX - origin.x - (e.clientY - origin.y);
      if (Math.abs(distance) > 4) { dragged = true; adjust(origin.value + distance * max / 180); }
    });
    this.listen(node, "pointerup", () => origin = undefined);
    this.listen(node, "pointercancel", () => { origin = undefined; dragged = false; });
  }
  private oxygen(area: HTMLElement) {
    const targets = [40, 65, 55], labels = ["Entrada", "Mezcla", "Presión"];
    area.innerHTML = `<div class="air-manifold"><div class="flow-header"><i></i><span>DEPÓSITO → MEZCLA → HÁBITAT</span><i></i></div><div class="valve-bank">${targets.map((target, i) => `<div class="valve-module"><div class="air-column"><span style="bottom:${target}%" class="safe-band"></span><i id="air-${i}"></i></div><button class="valve-dial" id="val${i}" role="slider" aria-label="${labels[i]} · objetivo ${target}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="20"><span class="valve-wheel"><i></i><i></i><i></i></span><span class="valve-hub"></span></button><strong>${labels[i]}</strong><output id="out${i}">20 / ${target}</output></div>`).join("")}</div><div class="flow-pipe"></div></div>`;
    const paint = (i: number) => {
      const node = area.querySelector<HTMLElement>(`#val${i}`)!, good = Math.abs(this.valves[i] - targets[i]) <= 3;
      node.setAttribute("aria-valuenow", String(this.valves[i])); node.style.setProperty("--turn", `${this.valves[i] * 2.7 - 135}deg`); node.classList.toggle("calibrated", good);
      (area.querySelector(`#air-${i}`) as HTMLElement).style.height = `${this.valves[i]}%`;
      area.querySelector(`#out${i}`)!.textContent = `${good ? "✓ " : ""}${this.valves[i]} / ${targets[i]}`;
      if (good) this.feedback(`${labels[i]} estable.`, true);
      if (oxygenAligned(this.valves)) this.finish(true);
    };
    this.valves.forEach((_, i) => {
      this.dial(area.querySelector(`#val${i}`)!, () => this.valves[i], (v) => { this.valves[i] = v; paint(i); }, 100, 5); paint(i);
    });
  }
  private pipes(area: HTMLElement) {
    area.innerHTML = `<div class="water-machine"><div class="water-tank"><i></i><span>01<br>ORIGEN</span></div><div><div class="pipe-label">ENTRADA →</div><div class="pipes">${this.masks.map((_, i) => `<button aria-label="Girar conducto ${i + 1}" data-pipe="${i}"></button>`).join("")}</div><div class="pipe-label end">SALIDA →</div></div><div class="water-tank destination"><i></i><span>02<br>DESTINO</span></div></div>`;
    const paint = (i: number) => {
      const node = area.querySelector(`[data-pipe="${i}"]`)!;
      node.innerHTML = `<svg viewBox="0 0 80 80" aria-hidden="true"><rect x="4" y="4" width="72" height="72" rx="9" fill="#142c3b"/>${[1, 2, 4, 8].map((bit, d) => this.masks[i] & bit ? `<path d="M40 40 L${[40, 80, 40, 0][d]} ${[0, 40, 80, 40][d]}" stroke="#527c8b" stroke-width="17" fill="none"/><path class="water-flow" d="M40 40 L${[40, 80, 40, 0][d]} ${[0, 40, 80, 40][d]}" stroke="#72dfe4" stroke-width="7" fill="none"/>` : "").join("")}<circle cx="40" cy="40" r="10" fill="#274858" stroke="#a2e4e5" stroke-width="2"/></svg>`;
      node.setAttribute("aria-description", `Conexiones: ${["arriba", "derecha", "abajo", "izquierda"].filter((_, d) => this.masks[i] & (1 << d)).join(", ")}`);
    };
    this.masks.forEach((_, i) => {
      paint(i); this.listen(area.querySelector(`[data-pipe="${i}"]`)!, "click", () => {
        this.masks[i] = rotateMask(this.masks[i], 1); paint(i); this.feedback("Conducto girado. Sigue el recorrido desde la entrada.");
        if (waterConnected(this.masks)) this.finish(true);
      });
    });
  }
  private circuit(area: HTMLElement) {
    area.innerHTML = `<div class="battery-bus"><span>☀ GENERACIÓN</span><span>▰ ALMACENAMIENTO</span><span>ϟ COLONIA</span></div><div class="circuit"><div>${["A · SOLAR", "B · BATERÍA", "C · CARGA"].map((name, i) => `<button class="terminal ${i === 0 ? "selected" : ""}" data-left="${i}" aria-pressed="${i === 0}">${name}<i>◉</i></button>`).join("")}</div><svg viewBox="0 0 200 190" id="wires" aria-label="Conexiones eléctricas"></svg><div>${["B · BATERÍA", "C · CARGA", "A · SOLAR"].map((name, i) => `<button class="terminal" data-right="${i}"><i>◉</i>${name}</button>`).join("")}</div></div><div class="circuit-status">◉ <span id="circuit-count">0 / 3 conexiones</span></div>`;
    area.querySelectorAll<HTMLElement>("[data-left]").forEach((b) => this.listen(b, "click", () => {
      this.selected = Number(b.dataset.left); area.querySelectorAll("[data-left]").forEach((node) => {
        node.classList.toggle("selected", node === b); node.setAttribute("aria-pressed", String(node === b));
      });
    }));
    area.querySelectorAll<HTMLElement>("[data-right]").forEach((b) => this.listen(b, "click", () => {
      const target = Number(b.dataset.right), correct = [2, 0, 1];
      this.links = this.links.map((v) => v === target ? -1 : v); this.links[this.selected] = target;
      area.querySelector("#wires")!.innerHTML = this.links.map((v, i) => v < 0 ? "" : `<path class="${v === correct[i] ? "energized" : "wire-error"}" d="M0 ${30 + i * 63} C75 ${30 + i * 63},125 ${30 + v * 63},200 ${30 + v * 63}" fill="none" stroke="${v === correct[i] ? "#7ce5e7" : "#e7ae75"}" stroke-width="4"/>`).join("");
      const count = this.links.filter((v, i) => v === correct[i]).length;
      area.querySelector("#circuit-count")!.textContent = `${count} / 3 conexiones · ${count === 3 ? "✓ CIRCUITO CERRADO" : "corrige los cables ámbar"}`;
      this.feedback(count ? "La energía recorre los cables iluminados." : "Revisa las letras de ambos extremos.", count > 0);
      if (circuitAligned(this.links)) this.finish(true);
    }));
  }
  private laboratory(area: HTMLElement) {
    const targets = scanTargets[this.sample];
    area.innerHTML = `<div class="scanner-machine"><div class="sample-tray"><span>MUESTRA SELLADA</span><button id="place-sample" draggable="true" aria-label="Colocar ${sampleNames[this.sample]} en el escáner">${specimenArt(this.sample)}<strong>${sampleNames[this.sample]}</strong><small>Arrastra o pulsa para colocar</small></button></div><div class="scanner-chamber" id="scanner-drop"><div class="scanner-holo">${specimenArt(this.sample)}</div><div class="scan-sweep"></div><svg viewBox="0 0 260 260" aria-hidden="true">${targets.map((angle, i) => `<circle cx="130" cy="130" r="${105 - i * 21}" fill="none" stroke="#45717e" stroke-width="2" stroke-dasharray="3 6"/><path d="M126 ${21 + i * 21}h8l-4 10z" fill="#e9b874" transform="rotate(${angle} 130 130)"/><g id="scan-ring-${i}" transform="rotate(0 130 130)"><circle cx="130" cy="${25 + i * 21}" r="5" fill="#89eceb"/></g>`).join("")}</svg><span class="scanner-bed"></span></div><div class="scan-controls">${targets.map((target, i) => `<button data-ring="${i}" role="slider" aria-label="Anillo ${i + 1} · alinear a ${target} grados" aria-valuemin="0" aria-valuemax="330" aria-valuenow="0"><span>◎</span>ANILLO ${i + 1}<output id="ring-out-${i}">0° → ${target}°</output></button>`).join("")}</div></div>`;
    const place = () => {
      if (this.placed) return;
      this.placed = true; area.classList.add("sample-placed"); (area.querySelector("#place-sample") as HTMLButtonElement).disabled = true;
      this.feedback("Muestra colocada. Alinea los puntos cian con las marcas ámbar.", true);
      area.querySelector<HTMLElement>('[data-ring="0"]')?.focus(); this.checkScan();
    };
    this.listen(area.querySelector("#place-sample")!, "click", place);
    this.listen(area.querySelector("#place-sample")!, "dragstart", (e: DragEvent) => e.dataTransfer?.setData("text/plain", this.sample));
    this.listen(area.querySelector("#scanner-drop")!, "dragover", (e: DragEvent) => e.preventDefault());
    this.listen(area.querySelector("#scanner-drop")!, "drop", (e: DragEvent) => { e.preventDefault(); if (e.dataTransfer?.getData("text/plain") === this.sample) place(); });
    targets.forEach((target, i) => {
      const node = area.querySelector<HTMLElement>(`[data-ring="${i}"]`)!;
      this.dial(node, () => this.rings[i], (value) => {
        this.rings[i] = value; node.setAttribute("aria-valuenow", String(value));
        area.querySelector(`#scan-ring-${i}`)!.setAttribute("transform", `rotate(${value} 130 130)`);
        area.querySelector(`#ring-out-${i}`)!.textContent = `${value === target ? "✓ " : ""}${value}° → ${target}°`;
        node.classList.toggle("calibrated", value === target); this.checkScan();
      }, 330, 30);
    });
  }
  private checkScan() { if (this.placed && this.rings.every((v, i) => v === scanTargets[this.sample][i])) this.finish(true); }
  private signal(area: HTMLElement) {
    area.innerHTML = `<div class="signal-console"><div class="signal-grid"><span>TIERRA / ONDA DE REFERENCIA</span><svg id="wave" viewBox="0 0 480 160" aria-label="Señal blanca de referencia y señal cian ajustable"></svg><div class="signal-lock"><i id="signal-lock"></i></div></div><div class="signal-controls">${["freq", "phase"].map((name, i) => `<div><span>${i ? "FASE" : "FRECUENCIA"} <b id="${name}-out"></b></span><div><button data-tune="${name}" data-delta="-2" aria-label="Reducir ${i ? "fase" : "frecuencia"}">−</button><strong>${i ? "⤾" : "∿"}</strong><button data-tune="${name}" data-delta="2" aria-label="Aumentar ${i ? "fase" : "frecuencia"}">+</button></div><small>Referencia: ${i ? "34" : "62"}</small></div>`).join("")}</div></div>`;
    const paint = () => {
      const path = (f: number, p: number) => Array.from({ length: 121 }, (_, i) => `${i ? "L" : "M"}${i * 4} ${80 + Math.sin(i / 120 * f / 10 * Math.PI * 2 + p / 100 * Math.PI * 2) * 48}`).join(" ");
      area.querySelector("#wave")!.innerHTML = `<path d="${path(62, 34)}" fill="none" stroke="#eef3e8" opacity=".6" stroke-width="3"/><path d="${path(this.frequency, this.phase)}" fill="none" stroke="#70e9ee" stroke-width="2"/>`;
      area.querySelector("#freq-out")!.textContent = String(this.frequency); area.querySelector("#phase-out")!.textContent = String(this.phase);
      this.feedback(signalAligned(this.frequency, this.phase) ? "Mantén la señal: enlace estable…" : "Superpone la onda cian a la blanca.");
    };
    area.querySelectorAll<HTMLElement>("[data-tune]").forEach((b) => this.listen(b, "click", () => {
      const delta = Number(b.dataset.delta);
      if (b.dataset.tune === "freq") this.frequency = Math.max(10, Math.min(100, this.frequency + delta));
      else this.phase = Math.max(0, Math.min(100, this.phase + delta)); paint();
    })); paint();
  }
  private greenhouse(area: HTMLElement) {
    area.innerHTML = `<div class="grow-machine"><div class="grow-lamps"><i></i><i></i><i></i></div><div class="plant-window">${plantArt()}${plantArt()}${plantArt()}<div class="irrigation-drops"></div></div><div class="grow-bed"></div><div class="grow-controls">${["water", "light"].map((name, i) => `<div><span>${i ? "LUZ" : "RIEGO"}</span><div class="grow-meter" id="grow-${name}">${[1, 2, 3, 4, 5].map((n) => `<i data-level="${n}"></i>`).join("")}</div><div><button data-grow="${name}" data-delta="-1" aria-label="Reducir ${i ? "luz" : "riego"}">−</button><output id="grow-out-${name}"></output><button data-grow="${name}" data-delta="1" aria-label="Aumentar ${i ? "luz" : "riego"}">+</button></div></div>`).join("")}</div></div>`;
    const paint = () => {
      for (const [name, value, target] of [["water", this.water, 3], ["light", this.light, 2]] as const) {
        area.querySelector(`#grow-out-${name}`)!.textContent = `${value} / 5 · objetivo ${target}`;
        area.querySelectorAll<HTMLElement>(`#grow-${name} i`).forEach((node) => node.classList.toggle("active", Number(node.dataset.level) <= value));
      }
      area.style.setProperty("--plant-light", String(0.35 + this.light * 0.13)); area.classList.toggle("watering", this.water >= 2 && this.water <= 3);
      area.classList.toggle("plants-balanced", this.water === 3 && this.light === 2);
      if (this.water === 3 && this.light === 2) this.finish(true);
    };
    area.querySelectorAll<HTMLElement>("[data-grow]").forEach((b) => this.listen(b, "click", () => {
      const change = Number(b.dataset.delta);
      if (b.dataset.grow === "water") this.water = Math.max(0, Math.min(5, this.water + change)); else this.light = Math.max(0, Math.min(5, this.light + change));
      this.feedback(this.water > 3 ? "Demasiada agua. Reduce el riego." : this.light > 2 ? "La luz es intensa. Reduce la iluminación." : "Equilibra los dos indicadores."); paint();
    })); paint();
  }
  private shelter(area: HTMLElement) {
    const steps = ["Comprobar acceso", "Reunir a los 4 tripulantes", "Cerrar puerta blindada"];
    area.innerHTML = `<div class="shelter-machine"><div class="shelter-frame"><div class="shelter-door left"></div><div class="shelter-door right"></div><span class="shelter-emblem">⬡</span><div class="crew-lights">${[1, 2, 3, 4].map((n) => `<i aria-label="Tripulante ${n}">♙</i>`).join("")}</div></div><div class="shelter-sequence">${steps.map((step, i) => `<button data-safety="${i}" aria-label="Paso ${i + 1}: ${step}"><b>${i + 1}</b><span>${step}</span><i>○</i></button>`).join("")}</div></div><p class="physical-shielding">Protección física: paredes y materiales del refugio. La energía opera puertas y comunicaciones; no crea un escudo contra radiación.</p>`;
    area.querySelectorAll<HTMLElement>("[data-safety]").forEach((b) => this.listen(b, "click", () => {
      const step = Number(b.dataset.safety);
      if (step !== this.shelterStep) { this.feedback(`Siguiente paso: ${steps[this.shelterStep]}.`); return; }
      this.shelterStep++; b.classList.add("calibrated"); b.setAttribute("disabled", ""); b.querySelector("i")!.textContent = "✓";
      if (this.shelterStep >= 2) area.classList.add("crew-safe");
      this.feedback(this.shelterStep === 1 ? "Acceso disponible. Reúne a la tripulación." : "Cuatro tripulantes dentro. Cierra la puerta.", true);
      if (this.shelterStep === 3) { area.classList.add("doors-sealed"); this.finish(true); }
    }));
  }
}
