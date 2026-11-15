import { hudIcon, renderExpeditionHud, resourceNames } from "./ExpeditionHud";
import { renderMachineTerminal, stationPuzzle } from "./MachineTerminal";
import { sampleNames } from "../systems/Expedition";
import { objectiveDirection } from "./direction";
import { AuraCompanion } from "./AuraCompanion";
import { AuraCoach } from "./AuraCoach";
import { ResourceHelp } from "./ResourceHelp";
import { TutorialManager, tutorialTarget } from "../tutorial/TutorialManager";
import { TutorialView } from "../tutorial/TutorialView";
import { getObjectives, recommendObjective } from "../systems/objectives";
import { renderMissionTracker } from "./MissionTracker";
import { renderScienceArchive } from "./ScienceArchive";
import { CinematicMenu } from "./CinematicMenu";
import { CampaignCinematic, campaignVideos } from "./CampaignCinematic";
import { absorbedDoseMicrogray, marsRadReference } from "../data/Radiation";
import { MissionLearning } from "./MissionLearning";
import { MissionLessonView } from "./MissionLessonView";
import type { CampaignOutcome } from "../systems/Campaign";
import {
  Simulation,
  type Allocation,
  type Resource,
} from "../systems/Simulation";
import type { BaseScene } from "../scenes/BaseScene";
import { rooms, stations, type Station } from "../world/map";
import { StationAudio } from "../audio/Audio";
import { Minigame, type PuzzleKind } from "../minigames/Minigame";
import {
  loadScience,
  escapeHtml as esc,
  sourceLink,
  type ScienceData,
} from "../data/Science";
const labels = resourceNames;
export class Interface {
  private modal!: HTMLElement;
  private layer!: HTMLElement;
  private puzzle?: Minigame;
  private learned = new Set<PuzzleKind>();
  private tutorial: TutorialManager;
  private tutorialView!: TutorialView;
  private resources!: ResourceHelp;
  private coach = new AuraCoach();
  private companion!: AuraCompanion;
  private tutorialDrawerStep = "";
  private shownEnd = false;
  private lastRender = 0;
  private hudNodes = new Map<string, Element>();
  private hudValues = new Map<string, string>();
  private hudNode(selector: string) {
    let node = this.hudNodes.get(selector);
    if (!node) {
      node = this.root.querySelector(selector)!;
      this.hudNodes.set(selector, node);
    }
    return node;
  }
  private writeHud(selector: string, value: string, html = false) {
    const key = `${html ? "html" : "text"}:${selector}`;
    if (this.hudValues.get(key) === value) return;
    const node = this.hudNode(selector);
    if (html) node.innerHTML = value;
    else node.textContent = value;
    this.hudValues.set(key, value);
  }
  private hudAttribute(selector: string, name: string, value: string) {
    const key = `${name}:${selector}`;
    if (this.hudValues.get(key) === value) return;
    this.hudNode(selector).setAttribute(name, value);
    this.hudValues.set(key, value);
  }
  private animateResourceChanges(before: Partial<Record<Resource, number>>, source?: HTMLElement) {
    const sourceRect = source?.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    for (const key of Object.keys(labels) as Resource[]) {
      const delta = this.sim.resources[key] - (before[key] ?? this.sim.resources[key]);
      if (!Number.isFinite(delta) || Math.abs(delta) < 0.05) continue;
      const target = this.root.querySelector<HTMLElement>(`[data-resource="${key}"]`);
      if (!target || target.hidden) continue;
      const targetRect = target.getBoundingClientRect();
      const startX = sourceRect ? sourceRect.left + sourceRect.width / 2 : rootRect.left + rootRect.width / 2;
      const startY = sourceRect ? sourceRect.top + sourceRect.height / 2 : rootRect.top + rootRect.height * 0.66;
      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + targetRect.height / 2;
      const badge = document.createElement("div");
      badge.className = `resource-flight ${delta >= 0 ? "gain" : "loss"}`;
      badge.setAttribute("aria-hidden", "true");
      badge.innerHTML = `${hudIcon(key)}<b>${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(1).replace(/\.0$/, "")}</b>`;
      badge.style.left = `${startX - rootRect.left}px`;
      badge.style.top = `${startY - rootRect.top}px`;
      badge.style.setProperty("--flight-x", `${endX - startX}px`);
      badge.style.setProperty("--flight-y", `${endY - startY}px`);
      this.root.append(badge);
      const cleanup = () => {
        badge.remove(); target.classList.remove("resource-arrived");
        void target.offsetWidth; target.classList.add("resource-arrived");
        window.setTimeout(() => target.classList.remove("resource-arrived"), 650);
      };
      badge.addEventListener("animationend", cleanup, { once: true });
      window.setTimeout(() => { if (badge.isConnected) cleanup(); }, 950);
    }
  }
  private science?: ScienceData;
  private screen = "menu";
  private returnScreen = "game";
  private lastFocus?: HTMLElement;
  private trackedId?: string;
  private lastEmergencyId?: string;
  private missionMarkup = "";
  private menuView?: CinematicMenu;
  private cinematic?: CampaignCinematic;
  private solarAlertCinematicShown = false;
  private missionStarted = false;
  private endingNarrated = false;
  private learning = new MissionLearning();
  private lessonView?: MissionLessonView;

  private zoneName = "";
  private zoneUntil = 0;
  constructor(
    private root: HTMLElement,
    public sim: Simulation,
    private scene: BaseScene,
    private audio: StationAudio,
    private options: { campaign?: boolean; lessons?: boolean } = {},
  ) {
    this.tutorial = new TutorialManager({
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
    });
    this.shell();
    this.menu();
    scene.onInteract = (s) => {
      this.tutorial.interact(s.id, this.sim, this.scene.player);
      this.terminal(s);
    };
    scene.onFrame = () => this.update();
    void loadScience()
      .then((d) => {
        this.science = d;
        this.selectSolarRecord();
      })
      .catch(() => {});
    document.addEventListener("keydown", (e) => {
      if (this.screen === "lesson") { if (!e.repeat) this.lessonView?.key(e); return; }
      if (this.screen === "prologue" || this.screen === "story") return; // The reader owns navigation.
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (this.companion.key(e)) return;
      if (this.screen === "game" && this.resources.isOpen && e.code === "Escape") {
        e.preventDefault(); this.resources.close(); return;
      }
      if (this.tutorial.active && !this.companion.isOpen && this.screen === "game" && this.tutorial.canNext &&
        !(e.target as HTMLElement)?.closest?.("button, a, input, [role=button]")) {
        if (["Enter", "Space", "ArrowRight"].includes(e.code)) {
          e.preventDefault(); this.tutorial.next(); this.refreshTutorial(); return;
        }
        if (e.code === "ArrowLeft") { e.preventDefault(); this.tutorial.previous(); this.refreshTutorial(); return; }
      }
      if (this.screen === "game" && e.code === "KeyH") {
        e.preventDefault();
        this.help();
        return;
      }
      if (
        this.screen === "game" &&
        (e.code === "KeyJ" || e.code === "KeyM" || e.code === "KeyR")
      ) {
        e.preventDefault();
        this.toggleDrawer(
          e.code === "KeyJ" ? "mission" : e.code === "KeyM" ? "map" : "status",
        );
        return;
      }
      if (e.code === "Escape") {
        e.preventDefault();
        if (this.screen === "game") {
          if (!this.root.querySelector<HTMLElement>("#map-drawer")!.hidden)
            this.toggleDrawer("map", false);
          else if (
            !this.root.querySelector<HTMLElement>("#mission-drawer")!.hidden
          )
            this.toggleDrawer("mission", false);
          else if (
            !this.root.querySelector<HTMLElement>("#status-drawer")!.hidden
          )
            this.toggleDrawer("status", false);
          else this.pause();
        } else if (this.screen === "menu") return;
        else if (this.screen === "end") return;
        else this.close();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.screen === "game") this.pause();
    });
  }
  private shell() {
    this.root.innerHTML = renderExpeditionHud();
    const pressure = document.createElement("span"); pressure.id = "mission-pressure";
    this.root.querySelector("#current-mission-btn")!.append(pressure);
    this.layer = this.root.querySelector("#modal-layer")!;
    this.modal = this.root.querySelector("#modal")!;
    this.root.querySelector<HTMLButtonElement>("#mission-btn")!.onclick = () =>
      this.toggleDrawer("mission");
    this.root.querySelector<HTMLButtonElement>("#close-mission")!.onclick =
      () => this.toggleDrawer("mission", false);
    this.root.querySelector<HTMLButtonElement>("#map-btn")!.onclick = () =>
      this.toggleDrawer("map");
    this.root.querySelector<HTMLButtonElement>(
      "#current-mission-btn",
    )!.onclick = () => this.toggleDrawer("mission");
    this.root.querySelector<HTMLButtonElement>("#resources-btn")!.onclick =
      () => this.toggleDrawer("status");
    this.root.querySelector<HTMLButtonElement>("#close-status")!.onclick = () =>
      this.toggleDrawer("status", false);
    this.root.querySelector<HTMLButtonElement>("#close-map")!.onclick = () =>
      this.toggleDrawer("map", false);
    this.root.querySelector<HTMLButtonElement>("#controls-btn")!.onclick = () =>
      this.help();
    this.root.querySelector<HTMLButtonElement>("#pause-btn")!.onclick = () =>
      this.pause();
    const joystick = this.root.querySelector<HTMLElement>("#touch-joystick")!;
    const joystickKnob = this.root.querySelector<HTMLElement>("#touch-joystick-knob")!;
    let joystickPointer: number | undefined;
    const moveJoystick = (event: PointerEvent) => {
      if (event.pointerId !== joystickPointer) return;
      event.preventDefault();
      const rect = joystick.getBoundingClientRect();
      const maxRadius = Math.min(rect.width, rect.height) * 0.3;
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;
      let dx = event.clientX - originX;
      let dy = event.clientY - originY;
      const distance = Math.hypot(dx, dy);
      const clampedDistance = Math.min(distance, maxRadius);
      const ratio = maxRadius ? clampedDistance / maxRadius : 0;
      const deadZone = 0.12;
      const amount = ratio <= deadZone ? 0 : (ratio - deadZone) / (1 - deadZone);
      const directionX = distance ? dx / distance : 0;
      const directionY = distance ? dy / distance : 0;
      if (distance > maxRadius && distance > 0) {
        dx = directionX * maxRadius;
        dy = directionY * maxRadius;
      }
      this.scene.setTouchJoystick(directionX * amount, directionY * amount);
      joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    joystick.addEventListener("pointerdown", (event) => {
      if (this.screen !== "game" || this.scene.blocked) return;
      event.preventDefault();
      joystickPointer = event.pointerId;
      joystick.classList.add("is-active");
      joystick.setPointerCapture?.(event.pointerId);
      moveJoystick(event);
    });
    joystick.addEventListener("pointermove", moveJoystick);
    const releaseJoystick = (event: PointerEvent) => {
      if (event.pointerId !== joystickPointer) return;
      joystickPointer = undefined;
      joystick.classList.remove("is-active");
      joystickKnob.style.transform = "translate(-50%, -50%)";
      this.scene.releaseTouchJoystick();
    };
    joystick.addEventListener("pointerup", releaseJoystick);
    joystick.addEventListener("pointercancel", releaseJoystick);
    joystick.addEventListener("lostpointercapture", releaseJoystick);
    this.root.querySelector<HTMLButtonElement>("#touch-interact")!.onclick = () => this.scene.requestTouchInteract();
    this.root.querySelector<HTMLButtonElement>("#science-btn")!.onclick = () =>
      this.archive();
    this.root.querySelector<HTMLButtonElement>("#sound-btn")!.onclick = () => {
      this.audio.unlock();
      this.audio.toggle();
      this.updateSound();
    };
    this.updateSound();
    this.resources = new ResourceHelp(this.root, () => this.sim, () => this.screen === "game" && !this.tutorial.active);
    this.tutorialView = new TutorialView(this.root, this.tutorial, () => this.refreshTutorial(), (topic = "resources") => { this.companion.open(topic); this.refreshTutorial(); });
    this.companion = new AuraCompanion(this.root,
      () => ({ sim: this.sim, player: this.scene.player, objectiveId: this.trackedId, science: this.science }),
      () => this.screen === "game" && (!this.tutorial.active || this.tutorial.step.id === "welcome"),
      (id) => {
        this.resources.close();
        if (id) {
          this.trackedId = getObjectives(this.sim).find((o) => o.stationId === id && !o.done && !o.waiting)?.id;
          this.renderMissions();
        }
        this.toggleDrawer("map", true);
      });
    this.layer.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        this.modal.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,a[href]",
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (document.activeElement === this.modal) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    this.root.addEventListener("click", (e) => {
      if (!(e.target as HTMLElement).closest("button")) return;
      if (this.screen === "menu") this.audio.playMenuConfirm();
      else this.audio.tone();
    }, true);
    this.root.addEventListener("click", (e) => {
      const track = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-track]",
      );
      if (track && this.screen === "game") {
        this.trackedId = track.dataset.track;
        this.renderMissions();
      }
    });
  }
  private refreshTutorial() {
    this.syncTutorial(); this.lastRender = -1000; this.update();
  }
  /** Narrative transitions may call this after they release control. Never moves the camera. */
  startTutorial() {
    if (this.screen !== "game") return;
    this.resources.close(); this.companion.close(); this.tutorial.start(); this.tutorialDrawerStep = "";
    this.companion.acknowledgeWelcome();
    this.companion.update(true, undefined, false);
    this.refreshTutorial();
  }
  private syncTutorial() {
    const active = this.tutorial.active, game = this.screen === "game";
    this.scene.tutorialMovement = active && game && this.tutorial.allowsMovement;
    if (game) {
      this.sim.paused = active || !!this.sim.campaign?.pending;
      this.scene.blocked = active && !this.tutorial.allowsMovement;
      const keyboard = this.scene.input.keyboard!;
      const enabled = !this.scene.blocked;
      if (keyboard.enabled !== enabled) {
        keyboard.resetKeys(); keyboard.enabled = enabled;
        if (!enabled) keyboard.clearCaptures();
        else keyboard.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "SPACE", "E"]);
      }
      const id = active ? this.tutorial.step.id : "";
      if (this.tutorialDrawerStep !== id) {
        for (const kind of ["map", "status"] as const) this.toggleDrawer(kind, false);
        if (id === "energy") this.toggleDrawer("map", true);
        if (id === "radiation") this.toggleDrawer("status", true);
        this.tutorialDrawerStep = id;
      }
    }
    if (!active || !game) { this.tutorialView.hide(); return; }
    const view = this.scene.cameras.main.worldView;
    const bounds = this.root.getBoundingClientRect();
    const width = bounds.width || window.innerWidth, height = bounds.height || window.innerHeight;
    const player = this.scene.player;
    const actor = player && view ? { x: (player.x - view.x) / view.width * width, y: (player.y - view.y) / view.height * height } : { x: width / 2, y: height / 2 };
    if (this.tutorial.step.id === "welcome" && this.companion.isOpen) this.tutorialView.hide();
    else this.tutorialView.update(this.sim, game, actor, player);
  }
  private toggleDrawer(kind: "mission" | "map" | "status", force?: boolean) {
    if (this.screen !== "game") return;
    const drawer = this.root.querySelector<HTMLElement>(
      kind === "mission"
        ? "#mission-drawer"
        : kind === "map"
          ? "#map-drawer"
          : "#status-drawer",
    )!;
    const open = force ?? drawer.hidden;
    if (!open && kind === "status") this.resources?.close();
    drawer.hidden = !open;
    this.root
      .querySelector(
        kind === "mission"
          ? "#mission-btn"
          : kind === "map"
            ? "#map-btn"
            : "#resources-btn",
      )!
      .setAttribute("aria-expanded", String(open));
    if (kind === "mission")
      this.root
        .querySelector("#current-mission-btn")!
        .setAttribute("aria-expanded", String(open));
  }
  private updateSound() {
    this.root.querySelector("#sound-btn")!.textContent = this.audio.muted
      ? "Sonido: no"
      : "Sonido: sí";
  }
  private show(screen: string, content: string, pause = false, wide = false) {
    this.lessonView?.destroy(); this.lessonView = undefined;
    this.cinematic?.destroy(); this.cinematic = undefined;
    this.layer.classList.remove("prologue-layer");
    this.resources.close(); this.companion?.update(false);
    if (this.tutorial.active) this.tutorialDrawerStep = "";
    this.menuView?.destroy();
    this.menuView = undefined;
    this.layer.classList.remove("cinematic-layer");
    this.layer.classList.remove("machine-layer");
    this.lastFocus = document.activeElement as HTMLElement;
    this.screen = screen;
    this.layer.classList.toggle("machine-layer", screen === "terminal" || screen === "puzzle" || screen === "result");
    this.root.dataset.screen = screen;
    this.root.querySelector<HTMLElement>("#mission-drawer")!.hidden = true;
    this.root.querySelector<HTMLElement>("#map-drawer")!.hidden = true;
    this.root.querySelector<HTMLElement>("#status-drawer")!.hidden = true;
    this.root
      .querySelector("#resources-btn")!
      .setAttribute("aria-expanded", "false");
    this.root
      .querySelector("#mission-btn")!
      .setAttribute("aria-expanded", "false");
    this.root.querySelector("#map-btn")!.setAttribute("aria-expanded", "false");
    this.scene.blocked = true;
    this.scene.input.keyboard!.resetKeys();
    this.scene.input.keyboard!.enabled = false;
    this.scene.input.keyboard!.clearCaptures();
    this.sim.paused = pause || this.tutorial.active || !!this.sim.campaign?.pending;
    this.layer.hidden = false;
    this.modal.className = screen === "terminal" ? "station-console" : screen === "puzzle" ? "puzzle-console" : screen === "result" ? "machine-result" : wide ? "wide" : "";
    this.modal.innerHTML = content;
    this.modal.setAttribute(
      "aria-label",
      this.modal.querySelector("h2")?.textContent || "Terminal de misión",
    );
    this.modal.focus();
    this.syncTutorial();
  }
  private button(id: string, fn: () => void) {
    this.modal.querySelector<HTMLButtonElement>(`#${id}`)!.onclick = fn;
  }
  private closeButton() {
    this.modal.querySelector<HTMLButtonElement>(".close")!.onclick = () =>
      this.close();
  }
  private close() {
    if (this.screen === "lesson" && this.lessonView && !this.lessonView.canContinue) return;
    this.lessonView?.destroy(); this.lessonView = undefined;
    this.cinematic?.destroy(); this.cinematic = undefined;
    this.layer.classList.remove("prologue-layer");
    if (this.screen === "result" && this.modal.querySelector(".result-beacon.success")) this.companion.celebrate();
    this.puzzle?.destroy();
    this.puzzle = undefined;
    if (
      this.returnScreen === "menu" &&
      (this.screen === "science" || this.screen === "help")
    ) {
      this.returnScreen = "game";
      this.menu();
      return;
    }
    this.menuView?.destroy();
    this.menuView = undefined;
    this.layer.classList.remove("cinematic-layer");
    this.layer.classList.remove("machine-layer");
    this.screen = "game";
    this.root.dataset.screen = "game";
    this.scene.blocked = false;
    this.scene.input.keyboard!.resetKeys();
    this.scene.input.keyboard!.enabled = true;
    this.scene.input.keyboard!.addCapture([
      "UP",
      "DOWN",
      "LEFT",
      "RIGHT",
      "SPACE",
      "E",
    ]);
    this.sim.paused = this.tutorial.active || !!this.sim.campaign?.pending;
    this.layer.hidden = true;
    this.toggleDrawer("mission", false);
    this.renderMissions();
    // Return focus to the game instead of a hidden menu or a toolbar button.
    const canvas = this.scene.game?.canvas;
    if (canvas) {
      canvas.tabIndex = 0;
      canvas.focus({ preventScroll: true });
    } else {
      this.lastFocus?.blur();
    }
    this.syncTutorial();
  }
  menu() {
    this.tutorial.cancel(); this.scene.tutorialMovement = false;
    this.show("menu", "", true);
    this.layer.classList.add("cinematic-layer");
    this.modal.className = "cinematic-menu";
    this.modal.setAttribute("aria-label", "SOL-3: Base Aurora. Menú principal");
    this.menuView = new CinematicMenu(this.modal, {
      start: () => {
        this.audio.unlock();
        this.menuView?.transitionOut(() => this.openPrologue());
      },
      help: () => {
        this.returnScreen = "menu";
        this.help();
      },
      archive: () => {
        this.returnScreen = "menu";
        this.archive();
      },
    });
  }
  private openPrologue() {
    this.show("prologue", "", true);
    this.layer.classList.add("prologue-layer"); this.modal.className = "prologue-modal";
    this.modal.setAttribute("aria-label", "Cinemática de introducción de Base Aurora");
    this.cinematic = new CampaignCinematic(this.modal, {
      source: campaignVideos.intro, title: "SOL-3 · Base Aurora",
      onComplete: (read) => {
        this.cinematic?.destroy(); this.cinematic = undefined;
        this.tutorial.setPrologueRead(read);
        if (this.missionStarted) this.restart(); else {
          if (this.options.campaign !== false) this.sim.startCampaign();
          this.close();
        }
        this.missionStarted = true;
        this.scene.cameras.main.fadeIn(650);
        if (this.tutorial.shouldStart && !this.tutorial.active) this.startTutorial();
      },
    });
  }
  private openCampaignCinematic(id: "sol2" | "sol3" | CampaignOutcome, done: () => void) {
    this.puzzle?.destroy(); this.puzzle = undefined;
    this.show("story", "", true); this.layer.classList.add("prologue-layer"); this.modal.className = "prologue-modal";
    this.modal.setAttribute("aria-label", "Cinemática de la operación de Base Aurora");
    let completed = false;
    const titles: Record<typeof id, string> = {
      sol2: "SOL 1 · La noche se acerca",
      sol3: "SOL 3 · Comienza el amanecer",
      victory: "Informe final · Éxito",
      partial: "Informe final · Éxito parcial",
      defeat: "Informe final · Misión interrumpida",
    };
    this.cinematic = new CampaignCinematic(this.modal, {
      source: campaignVideos[id], title: titles[id],
      onComplete: () => { if (completed) return; completed = true; this.cinematic?.destroy(); this.cinematic = undefined; done(); },
    });
  }
  private openSolarAlertCinematic() {
    this.show("story", "", true); this.layer.classList.add("prologue-layer"); this.modal.className = "prologue-modal";
    this.modal.setAttribute("aria-label", "Cinemática del protocolo solar preventivo");
    this.cinematic = new CampaignCinematic(this.modal, {
      source: campaignVideos.solarAlert,
      title: "Aviso solar · Ejercicio simulado",
      onComplete: () => {
        this.cinematic?.destroy(); this.cinematic = undefined;
        this.close(); this.lastRender = -1000; this.update();
      },
    });
  }
  private help() {
    this.show(
      "help",
      `<button class="close" aria-label="Cerrar">×</button><div class="eyebrow">MANUAL DE MISIÓN / 01</div><h2>Procedimientos de operación</h2><p>Mantén a los cuatro tripulantes a salvo durante <b>tres etapas: día, noche y amanecer</b>. La primera práctica de cada consola detiene el reloj para aprender; los siguientes intentos mantienen la colonia en marcha.</p><p class="help-shortcuts"><kbd>J</kbd> Misiones &middot; <kbd>M</kbd> Mapa &middot; <kbd>R</kbd> Reservas &middot; <kbd>H</kbd> Controles &middot; <kbd>C</kbd> Conversar con AURA</p><ol class="instructions"><li><b>Explora con WASD o las flechas; en móvil, usa el joystick virtual.</b> Acércate a una máquina y pulsa E o toca USAR. El plano muestra dónde estás.</li><li><b>Investiga en el laboratorio.</b> Recoge planta en el Invernadero y agua en Soporte vital; el suelo ya está en el Laboratorio. Coloca cada muestra y calibra el escáner. Los resultados se guardan solos.</li><li><b>Prepara la noche.</b> Planta, cosecha y optimiza paneles. Sin Sol, las baterías se vacían.</li><li><b>Responde a las alertas.</b> Repara las máquinas en su habitación. Ante el aviso solar, activa el refugio.</li><li><b>Envía tu informe.</b> Alinea la antena en control y espera la confirmación de la Tierra antes del final.</li></ol><p class="science-note">La pausa y el archivo detienen el reloj. Los números del juego son simulados. El archivo identifica los datos reales y sus fuentes.</p><button id="repeat-tutorial" class="full secondary" ${this.returnScreen === "menu" ? "disabled" : ""}>Repetir tutorial${this.returnScreen === "menu" ? " · inicia una misión primero" : ""}</button><button class="primary" id="ready">Entendido </button>`,
      true,
    );
    this.closeButton();
    this.button("ready", () => this.close());
    this.button("repeat-tutorial", () => { this.close(); this.startTutorial(); });
  }
  private pause() {
    if (this.screen !== "game") return;
    this.show(
      "pause",
      `<div class="eyebrow">OPERACIONES EN ESPERA</div><h2>Misión en pausa</h2><p>La simulación está detenida. Los recursos y las incidencias conservan su estado.</p><button id="resume" class="primary">Continuar misión </button><button id="help" class="full secondary">Manual de misión</button><button id="restart" class="full secondary">Reiniciar partida</button><button id="main-menu" class="full secondary">Volver al menú principal</button>`,
      true,
    );
    this.button("resume", () => this.close());
    this.button("help", () => this.help());
    this.button("restart", () => this.restart());
    this.button("main-menu", () => this.menu());
  }
  private archive() {
    this.show(
      "science",
      renderScienceArchive(this.science, this.sim.solarRecord),
      true,
      true,
    );
    this.closeButton();
  }
  private terminal(s: Station) {
    if (this.screen !== "game") return;
    this.show("terminal", `<button class="close" aria-label="Cerrar consola">×</button><div class="station-caption">${esc(rooms.find((r) => r.id === s.room)?.name)} / ${esc(s.name)}</div><div class="station-machine-layout">${renderMachineTerminal(s, this.sim)}</div><div id="terminal-message" role="status"></div>`, false);
    this.closeButton();
    this.modal.querySelectorAll<HTMLElement>("[data-command]").forEach((b) => b.onclick = () => {
      const before = this.sim.log.length;
      const resourcesBefore = { ...this.sim.resources };
      const action = b.dataset.command!;
      const result = action === "collect-plant" || action === "collect-water"
        ? this.sim.collectSample(action === "collect-plant" ? "plant" : "water") : this.sim.action(action);
      const completed = this.sim.log.length > before;
      if (completed) this.animateResourceChanges(resourcesBefore, b);
      if (!completed) this.audio.tone("alert");
      else if (action === "collect-plant" || action === "collect-water") this.audio.play("recoleccion");
      else if (action.startsWith("repair:")) this.audio.play("reparacion");
      else this.audio.tone("success");
      if (completed) { this.scene.celebrateStation?.(s.id); this.companion.celebrate(); }
      this.tutorial.decision(action, completed);
      if (completed && this.options.lessons !== false) {
        this.learning.action(action, this.sim);
        if (this.openNextLesson()) return;
      }
      this.screen = "game"; this.terminal(s);
      this.modal.querySelector("#terminal-message")!.textContent = result;
    });
    const radiationDuration = this.modal.querySelector<HTMLInputElement>("#radiation-duration");
    if (radiationDuration) {
      const refreshDose = () => {
        const sols = Number(radiationDuration.value);
        const dose = absorbedDoseMicrogray(marsRadReference.rateMicrograyPerSol, sols);
        this.modal.querySelector("#radiation-duration-label")!.textContent = `${sols} ${sols === 1 ? "sol" : "soles"}`;
        this.modal.querySelector("#radiation-dose")!.textContent = `${dose.toFixed(0)} μGy absorbidos`;
        this.modal.querySelector("#radiation-equation")!.textContent = `${marsRadReference.rateMicrograyPerSol} μGy/sol × ${sols} ${sols === 1 ? "sol" : "soles"} = ${dose.toFixed(0)} μGy`;
      };
      radiationDuration.addEventListener("input", refreshDose);
      radiationDuration.addEventListener("change", refreshDose);
    }
    this.modal.querySelectorAll<HTMLButtonElement>("[data-allocation]").forEach((b) => {
      const reason = this.sim.campaign?.actionLock("allocation", this.sim);
      b.disabled = !!reason; b.title = reason || "";
      b.onclick = () => {
      const locked = this.sim.campaign?.actionLock("allocation", this.sim);
      if (locked) { this.modal.querySelector("#terminal-message")!.textContent = locked; return; }
      this.sim.allocation = b.dataset.allocation as Allocation;
      this.tutorial.decision("allocation", true);
      this.sim.note(`Prioridad: ${b.textContent}. La producción y el consumo cambian desde ahora.`);
      this.screen = "game"; this.terminal(s);
      };
    });
    const launch = this.modal.querySelector<HTMLButtonElement>("#puzzle-launch");
    if (launch) launch.onclick = () => this.launchPuzzle(s);
  }
  private launchPuzzle(s: Station) {
    const kind = stationPuzzle(s);
    if (!kind || this.puzzle) return;
    const broken = !!s.system && !this.sim.systems[s.system];
    const repair = ["oxygen", "water", "circuit"].includes(kind) || (broken && (kind === "signal" || kind === "greenhouse"));
    const action = repair ? `repair:${s.system}` : kind === "laboratory" ? "research" : kind === "signal" ? "transmit" : kind === "shelter" ? "shelter" : "tend";
    const locked = this.sim.campaign?.actionLock(action, this.sim);
    if (locked) { this.modal.querySelector("#terminal-message")!.textContent = locked; return; }
    let unavailable = "";
    if (repair && (this.sim.resources.energy < 5 || this.sim.spareParts < 1)) unavailable = "Necesitas 5 energía y 1 repuesto. Puedes ajustar prioridades en Control.";
    if (repair && this.sim.campaign && !broken) unavailable = "El sistema está operativo. Inspecciona las señales antes de gastar repuestos.";
    if (kind === "laboratory") {
      if (this.sim.resources.energy < 12 || this.sim.resources.water < 5) unavailable = "Necesitas 12 energía y 5 agua. Revisa baterías y reciclador.";
      else if (!this.sim.loadSample()) unavailable = "No hay una muestra disponible. Sigue el objetivo actual o deja terminar el procesamiento.";
    }
    if (kind === "signal" && !broken && (this.sim.research < (this.sim.campaign?.partialReport ? 2 : 3) || this.sim.report !== "none" || this.sim.resources.energy < 8)) unavailable = "Completa el informe y reserva 8 energía. Cada informe solo se envía una vez.";
    if (kind === "signal" && !broken && this.sim.campaign && !this.sim.campaign.partialReport && !this.sim.campaign.verifiedTrial) unavailable = "Falta demostrar el ensayo aplicado. Puedes declarar un cierre parcial en la antena si no puedes completarlo.";
    if (kind === "greenhouse" && !broken && (this.sim.expedition.greenhouseTended || this.sim.resources.energy < 2 || this.sim.resources.water < 2)) unavailable = "Necesitas 2 energía y 2 agua; las condiciones solo necesitan equilibrarse una vez.";
    if (kind === "shelter" && (this.sim.shielded || this.sim.resources.energy < 6)) unavailable = "El protocolo ya está activo o faltan 6 energía para operar las puertas.";
    if (unavailable) { this.modal.querySelector("#terminal-message")!.textContent = unavailable; return; }
    const tutorial = !this.learned.has(kind);
    this.show("puzzle", '<button class="close" aria-label="Cerrar minijuego">×</button><div id="minigame"></div>', tutorial);
    this.closeButton();
    const sample = this.sim.expedition.loaded;
    let lastFeedbackTone = -100;
    this.puzzle = new Minigame(this.modal.querySelector("#minigame")!, kind, () => this.sim.time, (won) => {
      // The minigame callback is single-use; commit only against the current simulation.
      const before = this.sim.log.length;
      const resourcesBefore = { ...this.sim.resources };
      let message = "No se completó la secuencia. Corrige los controles y vuelve a intentarlo.";
      if (won) {
        this.learned.add(kind);
        if (repair) message = this.sim.repair(s.system!) ? "Mantenimiento completado: sistema operativo. −5 energía y −1 repuesto." : "Los recursos cambiaron: necesitas 5 energía y 1 repuesto. Puedes reintentarlo.";
        else message = kind === "laboratory" ? this.sim.startAnalysis() : this.sim.action(kind === "signal" ? "transmit" : kind === "shelter" ? "shelter" : "tend");
      } else if (!tutorial) {
        this.sim.spend(Math.min(1, this.sim.resources.energy));
        this.sim.note("Intento de mantenimiento agotado: −1 energía. Puedes corregir y reintentar.");
      }
      const success = won && this.sim.log.length > before;
      if (success || !won && !tutorial) this.animateResourceChanges(resourcesBefore);
      this.tutorial.decision(kind, success);
      this.puzzle?.destroy(); this.puzzle = undefined;
      if (success && this.options.lessons !== false) {
        this.learning.action(repair ? `repair:${s.system}` : kind === "laboratory" ? "research" : kind === "signal" ? "transmit" : kind === "shelter" ? "shelter" : "tend", this.sim);
        if (this.openNextLesson()) return;
      }
      if (!success) this.audio.tone("failure");
      else if (repair) this.audio.play("reparacion");
      else if (kind === "shelter") this.audio.play("puerta");
      else if (kind === "signal") this.audio.play("transmision");
      else this.audio.tone("success");
      if (success) { this.scene.celebrateStation?.(s.id); this.companion.celebrate(); }
      if (success && this.sim.campaign) { this.screen = "game"; this.terminal(s); this.modal.querySelector("#terminal-message")!.textContent = message; return; }
      if (success && kind === "laboratory") { this.close(); return; }
      const card = this.science?.cards.find((c) => kind === "greenhouse" ? /CSA|Food/i.test(c.source + c.title) : kind === "shelter" ? /RadLab/i.test(c.source + c.title) : kind === "signal" ? /comunica/i.test(c.title) : /soporte|agua|oxígeno/i.test(c.title));
      const lesson = kind === "shelter" ? "El refugio usa materiales como protección física. El indicador del juego no representa una dosis real de radiación." : kind === "signal" ? "Una onda de radio viaja a la velocidad de la luz: Tierra y Marte necesitan tiempo para intercambiar mensajes." : kind === "greenhouse" ? "Equilibrar luz y agua mejora el cultivo; no lo hace crecer instantáneamente." : "Una máquina necesita un recorrido continuo de aire, agua o electricidad para funcionar.";
      this.show("result", `<button class="close" aria-label="Cerrar resultado">×</button><div class="result-beacon ${success ? "success" : ""}">${success ? "✓" : "↻"}</div><div class="eyebrow">${success ? "SISTEMA VERIFICADO" : "INTENTO INCOMPLETO"}</div><h2>${success ? "Buen trabajo" : "Puedes reintentarlo"}</h2><p>${esc(message)}</p><p class="science-note">${esc(lesson)}</p>${card ? `<details class="discovery-source"><summary>Ciencia y fuente</summary><p>${esc(card.body)}</p>${sourceLink(card.url, card.source)}</details>` : ""}<button id="back" class="machine-command"><span>Volver a explorar</span><small>Continúa con el objetivo marcado</small><b>↗</b></button>${!success ? '<button id="retry-machine" class="retry-machine">Reintentar esta consola</button>' : ''}`, false);
      this.closeButton(); this.button("back", () => this.close());
      if (!success) this.button("retry-machine", () => { this.screen = "game"; this.terminal(s); });
    }, { sample, tutorial, untimed: !!this.sim.campaign && this.sim.campaign.level !== 2, clockLabel: this.sim.campaign?.level === 2 ? () => this.sim.campaign!.missionOverdue ? "PLAZO AGOTADO · PIERDES SALUD" : `${Math.ceil(this.sim.campaign!.missionRemaining)} s · objetivo de la noche` : undefined, feedback: (good) => {
      const now = performance.now();
      if (now - lastFeedbackTone < 80) return;
      lastFeedbackTone = now; this.audio.tone(good ? "success" : "click");
    } });
  }
  private selectSolarRecord() {
    const records = this.science?.solarEvents;
    if (records?.length) {
      const r = records[this.sim.seed % records.length];
      this.sim.solarRecord = {
        id: r.id,
        date: r.date,
        url: r.url,
        type: r.type,
      };
    }
  }
  private restart() {
    this.learning.reset();
    this.puzzle?.destroy();
    this.puzzle = undefined;
    this.sim = new Simulation();
    if (this.options.campaign !== false) this.sim.startCampaign();
    this.endingNarrated = false;
    this.solarAlertCinematicShown = false;
    this.companion.reset();
    this.learned.clear();
    this.tutorial.cancel(); this.scene.tutorialMovement = false;
    this.tutorialDrawerStep = ""; this.coach.reset();
    this.zoneName = "";
    this.zoneUntil = 0;
    this.trackedId = undefined;
    this.lastEmergencyId = undefined;
    this.selectSolarRecord();
    this.scene.reset(this.sim);
    this.shownEnd = false;
    this.returnScreen = "game";
    this.close();
    if (this.tutorial.shouldStart) this.startTutorial();
  }
  private end() {
    this.shownEnd = true;
    this.tutorial.cancel(); this.scene.tutorialMovement = false;
    this.puzzle?.destroy();
    this.puzzle = undefined;
    if (this.sim.campaign && !this.endingNarrated) {
      this.endingNarrated = true;
      this.sim.campaign.checkpoint(this.sim);
      this.openCampaignCinematic(this.sim.campaign.outcome(this.sim), () => this.end());
      return;
    }
    const s = this.sim,
      won = s.status === "won";
    if (won)
      localStorage.setItem(
        "aurora-best",
        String(
          Math.max(Number(localStorage.getItem("aurora-best") || 0), s.score),
        ),
      );
    this.show(
      "end",
      `<div class="eyebrow">INFORME DE MISIÓN / ${won ? "OPERACIÓN COMPLETADA" : "OPERACIÓN FINALIZADA"}</div><h2>${won ? "Misión completada" : "Misión interrumpida"}</h2><p>${esc(s.reason)}</p><div class="end-stats"><div><b>${s.score}</b><small>PUNTOS</small></div><div><b>${Math.ceil(s.resources.health)}%</b><small>SALUD</small></div><div><b>${s.research}</b><small>ANÁLISIS</small></div><div><b>${s.repairs}</b><small>REPARACIONES</small></div></div><p>Cosechas: ${s.harvests} · Mejora solar: ${s.upgrades ? "sí" : "no"} · Informe: ${s.report === "received" ? "confirmado" : "sin confirmar"} · Exposición simulada: ${Math.round(s.resources.radiation)}/100.</p><p class="science-note">${s.resources.energy < 20 ? "Las baterías terminaron bajas: reduce cargas antes de la noche. " : ""}${s.research < 3 ? "Reserva energía y agua para tres análisis. " : ""}${s.resources.radiation > 10 ? "Activa el refugio antes del final del aviso solar. " : ""}El balance diurno determina la reserva disponible para el periodo nocturno.</p><div class="achievements">${s.achievements.map((a) => `<span>${esc(a)}</span>`).join("")}</div><details><summary>Bitácora de decisiones y consecuencias</summary><div class="log">${s.log.map((l) => `<p><time>${this.formatTime(l.time)}</time> ${esc(l.text)}</p>`).join("")}</div></details><button class="primary" id="restart">Nueva operación </button><button class="full secondary" id="export">Descargar informe JSON</button><button id="main-menu" class="full secondary">Volver al menú principal</button>`,
      true,
      true,
    );
    this.button("restart", () => this.restart());
    if (s.status === "partial") this.modal.querySelector("h2")!.textContent = "Éxito parcial";
    if (s.campaign) {
      const summary = document.createElement("section"); summary.className = "campaign-terminal";
      summary.innerHTML = `<h3>Evidencias y consecuencias</h3><p>${s.campaign.verifiedTrial ? "Ensayo aplicado: crecimiento comprobado después de la intervención." : "Ensayo aplicado: sin comprobación completa."}</p>${s.campaign.evidence.map((e) => `<article class="campaign-evidence"><h3>${esc(e.sample)}</h3><p>${esc(e.observation)}</p><p>${esc(e.decision || "Decisión pendiente")}</p>${sourceLink(e.source.url, e.source.label)}</article>`).join("")}`;
      this.modal.querySelector(".end-stats")!.after(summary);
    }
    this.button("main-menu", () => this.menu());
    this.button("export", () => {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              status: s.status,
              reason: s.reason,
              score: s.score,
              time: s.time,
              resources: s.resources,
              research: s.research,
              report: s.report,
              decisions: s.log,
              campaign: s.campaign ? { level: s.campaign.level, scenario: s.campaign.scenario, evidence: s.campaign.evidence, decisions: s.campaign.decisions, checkpoints: s.campaign.checkpoints } : undefined,
              model:
                "Simulación educativa; recursos y exposición sin unidades físicas",
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "aurora-informe.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  private renderMissions() {
    const objectives = getObjectives(this.sim),
      urgent = objectives.find((o) => o.urgent);
    if (urgent && urgent.id !== this.lastEmergencyId)
      this.trackedId = urgent.id;
    this.lastEmergencyId = urgent?.id;
    const active = this.sim.campaign ? objectives.find((o) => !o.done) : this.tutorial.active ? recommendObjective(objectives) :
      objectives.find((o) => o.id === this.trackedId && !o.done && !o.waiting) || recommendObjective(objectives);
    this.trackedId = active?.id;
    const markup = renderMissionTracker(objectives, active);
    if (markup !== this.missionMarkup) {
      const list = this.root.querySelector("#objectives")!;
      const expanded =
        list.querySelector<HTMLDetailsElement>(".support-quests")?.open;
      list.innerHTML = markup;
      if (expanded)
        list.querySelector<HTMLDetailsElement>(".support-quests")!.open = true;
      this.missionMarkup = markup;
    }

    this.writeHud("#current-mission-title", active?.title || "Misión completada");
    this.writeHud("#current-mission-destination",
      active?.stationId
        ? `Destino: ${active.room.toLowerCase()}`
        : "Mantén operativa la base");
    this.writeHud("#current-mission-progress", active?.progress || "");
    this.writeHud("#current-mission-next", active?.instruction || "Mantén las reservas y responde a las alertas.");
    const guideId = this.tutorial.active && this.tutorial.allowsMovement ? tutorialTarget(this.sim)?.id : active?.stationId;
    this.scene.setTrackedStation?.(guideId);
    const marker = this.root.querySelector("#map-target")!;
    const target = stations.find((s) => s.id === guideId);
    const edge = this.hudNode("#objective-direction") as HTMLElement;
    const view = this.scene.cameras.main.worldView;
    const direction = target && view ? objectiveDirection(target, view) : undefined;
    edge.hidden = !direction || !["game", "terminal", "puzzle", "result", "lesson"].includes(this.screen) || this.sim.status !== "playing";
    if (direction) {
      edge.style.left = `${direction.x.toFixed(1)}%`;
      edge.style.top = `${direction.y.toFixed(1)}%`;
      (edge.querySelector("span") as HTMLElement).style.transform = `rotate(${direction.angle.toFixed(0)}deg)`;
    }
    marker.setAttribute("visibility", target ? "visible" : "hidden");
    if (target) {
      marker.setAttribute("cx", String(target.x));
      marker.setAttribute("cy", String(target.y));
    }
  }
  private formatTime(t: number) {
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  }
  update() {
    if (this.screen === "lesson") return;
    if (this.options.lessons !== false && this.sim.campaign && ["game", "terminal", "result"].includes(this.screen)) {
      this.learning.observe(this.sim);
      if (this.openNextLesson()) return;
    }
    if (this.sim.status !== "playing" && !this.shownEnd) {
      this.end();
      return;
    }
    if (this.sim.campaign?.pending && this.screen === "game" && !this.tutorial.active) {
      this.openCampaignCinematic(this.sim.campaign.pending, () => {
        this.sim.campaign!.advance(this.sim); this.coach.reset(); this.trackedId = undefined; this.close(); this.lastRender = -1000; this.update();
      });
      return;
    }
    if (this.sim.campaign?.level === 2 && this.sim.campaign.solarStarted && !this.solarAlertCinematicShown && this.screen === "game" && this.sim.activeEvents.some((event) => event.system === "solar")) {
      this.solarAlertCinematicShown = true;
      this.openSolarAlertCinematic();
      return;
    }
    const now = performance.now();
    if (now - this.lastRender < 100) return;
    this.lastRender = now;
    if (this.screen === "game" && this.tutorial.observe(this.scene.player)) this.audio.tone("success");
    this.syncTutorial(); this.resources.update();
    const s = this.sim;
    for (const k of Object.keys(labels) as Resource[]) {
      const value = s.resources[k];
      this.writeHud(`#r-${k}`, `${Math.ceil(value)}<span>${k === "radiation" ? "/100" : "%"}</span>`, true);
      const bar = this.hudNode(`#bar-${k}`) as HTMLElement;
      const width = `${value.toFixed(1)}%`;
      if (bar.style.width !== width) bar.style.width = width;
      this.root
        .querySelector(`[data-resource="${k}"]`)!
        .classList.toggle("low", k === "radiation" ? value > 30 : value < 22);
      if (k === "health") this.hudNode('[data-resource="health"]').classList.toggle("under-attack",
        !!s.campaign?.nightMissions(s).length && s.time < s.nightAttackUntil);
    }
    this.writeHud("#sol", `SOL 0${s.sol} <span>/ 03</span>`, true);
    this.writeHud("#clock",
      `${s.daylight ? "DÍA" : "NOCHE"} · ${this.formatTime(s.time)}`);
    this.hudNode("#mission-pressure").toggleAttribute("hidden", s.campaign?.level !== 2);
    this.writeHud("#mission-pressure", s.campaign?.level === 2 ? `${s.campaign.missionOverdue ? "PLAZO AGOTADO · PIERDES SALUD" : `PLAZO: ${Math.ceil(s.campaign.missionRemaining)} / 20 s de juego`} · ${s.campaign.nightMissions(s).length} marcianitos · ${s.time < s.nightAttackUntil ? "TE ATACAN · ALÉJATE" : "EVITA EL CONTACTO"}` : "");
    (this.root.querySelector("#day-bar i") as HTMLElement).style.width =
      `${s.phase * 100}%`;
    this.renderMissions();
    const radiation = this.root.querySelector<HTMLElement>(
      '[data-resource="radiation"]',
    )!;
    radiation.hidden = !(
      s.resources.radiation > 0 ||
      s.activeEvents.some((e) => e.system === "solar")
    );
    const current = getObjectives(s).find((o) => o.id === this.trackedId);
    const message = this.screen === "game" && !this.tutorial.active && !this.companion.isOpen ? this.coach.update(s, current, this.scene.nearest?.id) : undefined;
    const processing = this.hudNode("#processing-readout") as HTMLElement;
    processing.hidden = !s.expedition.processing;
    if (s.expedition.processing) this.writeHud("#processing-readout", `◌ ${sampleNames[s.expedition.processing]} · ${s.resources.energy <= .5 ? "sin energía" : Math.ceil(s.expedition.remaining) + " s"} · guardado automático`);
    const aura = this.root.querySelector<HTMLElement>("#aura-message")!;
    if (message) this.writeHud("#aura-text", message.text);
    aura.hidden = !message;
    this.companion.update(this.screen === "game" && (!this.tutorial.active || this.tutorial.step.id === "welcome"), message, !this.tutorial.active);
    this.writeHud("#map-emergencies", s.activeEvents
      .map((e) => {
        const station = stations.find(
          (st) =>
            st.id ===
            (e.system === "solar"
              ? "shelter"
              : e.system === "comms"
                ? "comms"
                : e.system),
        );
        return station
          ? `<g><circle cx="${station.x}" cy="${station.y}" r="36" fill="#db9974" stroke="#1c303d" stroke-width="7"/><text x="${station.x}" y="${station.y + 15}" text-anchor="middle" fill="#162430" font-size="45" font-weight="bold">!</text></g>`
          : "";
      })
      .join(""), true);
    const p = this.scene.player;
    if (p) {
      this.hudAttribute("#map-player", "cx", String(Math.round(p.x)));
      this.hudAttribute("#map-player", "cy", String(Math.round(p.y)));
      const room =
        rooms.find(
          (r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h,
        )?.name || "PASILLO DE CONEXIÓN";
      this.writeHud("#room-name", room);
      if (room !== this.zoneName) {
        this.zoneName = room;
        this.zoneUntil = s.time + 3;
        this.root.querySelector("#zone-title")!.textContent = room;
      }
      this.root
        .querySelector("#zone-title")!
        .classList.toggle(
          "visible",
          this.screen === "game" && s.time < this.zoneUntil,
        );
    }
    this.writeHud("#interaction",
      this.screen === "game" && this.scene.nearest
        ? `<kbd>E</kbd><span>${esc(({ research: "Analizar muestra", greenhouse: s.crop >= 100 ? "Cosechar alimentos" : "Gestionar cultivo", shelter: "Activar refugio", control: "Revisar la base", comms: "Comunicar con Tierra", power: "Revisar baterías", oxygen: "Calibrar oxígeno", water: "Reciclar agua", upgrade: "Optimizar paneles" } as Record<string, string>)[this.scene.nearest.id] || this.scene.nearest.name)}</span>`
        : "", true);
    this.hudNode("#touch-interact").toggleAttribute("disabled",
      this.screen !== "game" || this.scene.blocked || !this.scene.nearest);
    for (const key of Object.keys(labels) as Resource[]) {
      this.writeHud(`#detail-${key}`, `${Math.ceil(s.resources[key])} / 100`);
      this.hudAttribute(`[data-resource="${key}"]`, "aria-label",
          `${labels[key]}: ${Math.ceil(s.resources[key])} de 100, simulado`,
        );
    }
    this.writeHud("#system-detail", `Repuestos: <b>${s.spareParts}</b> · Mejora solar: ${s.upgrades ? "instalada" : "sin instalar"}<br>Cultivo: ${s.crop < 0 ? "sin plantar" : Math.floor(s.crop) + " %"} · Informe: ${{ none: "sin enviar", pending: "en tránsito", received: "confirmado" }[s.report]}<br>Exposición y reservas: escala simulada, sin unidades físicas.`, true);
  }
  private openNextLesson() {
    if (this.options.lessons === false || this.screen === "lesson") return false;
    const lesson = this.learning.take(); if (!lesson) return false;
    this.puzzle?.destroy(); this.puzzle = undefined;
    this.show("lesson", "", true); this.modal.className = "mission-lesson";
    this.modal.setAttribute("aria-label", `${lesson.objective ? "Objetivo completado" : "Acción realizada"}: ${lesson.title}`);
    this.audio.tone("success");
    this.lessonView = new MissionLessonView(this.modal, lesson, () => {
      this.lessonView?.destroy(); this.lessonView = undefined;
      this.close(); this.lastRender = -1000; this.update();
    });
    return true;
  }
}
