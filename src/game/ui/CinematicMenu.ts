/** Source-pixel coordinates measured against the supplied, unmodified illustration. */
export const MENU_ART = {
  width: 1672,
  height: 941,
  path: "assets/aurora-menu.png",
};
export const MENU_HOTSPOTS = [
  {
    id: "start",
    label: "Iniciar misión",
    x: 347,
    y: 320,
    width: 429,
    height: 61,
  },
  { id: "help", label: "Cómo jugar", x: 350, y: 395, width: 386, height: 49 },
  {
    id: "archive",
    label: "Ciencia y fuentes",
    x: 350,
    y: 455,
    width: 386,
    height: 49,
  },
] as const;
export function fitMenuArt(width: number, height: number) {
  const scale = Math.min(
    Math.max(0, width) / MENU_ART.width,
    Math.max(0, height) / MENU_ART.height,
  );
  const artWidth = MENU_ART.width * scale,
    artHeight = MENU_ART.height * scale;
  return {
    scale,
    left: (width - artWidth) / 2,
    top: (height - artHeight) / 2,
    width: artWidth,
    height: artHeight,
  };
}
export function menuHotspotRect(
  id: (typeof MENU_HOTSPOTS)[number]["id"],
  width: number,
  height: number,
) {
  const fit = fitMenuArt(width, height),
    zone = MENU_HOTSPOTS.find((z) => z.id === id)!;
  return {
    left: fit.left + zone.x * fit.scale,
    top: fit.top + zone.y * fit.scale,
    width: zone.width * fit.scale,
    height: zone.height * fit.scale,
  };
}
type Callbacks = Record<(typeof MENU_HOTSPOTS)[number]["id"], () => void>;
export class CinematicMenu {
  private observer?: ResizeObserver;
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private launching = false;
  private clicking = false;
  private clickTimer?: ReturnType<typeof setTimeout>;
  private stage: HTMLElement;
  private error: HTMLElement;
  private onResize = () => this.layout();
  constructor(
    private host: HTMLElement,
    callbacks: Callbacks,
  ) {
    const base = import.meta.env?.BASE_URL || "./";
    host.innerHTML = `<div class="menu-cinema"><div class="menu-stage"><img class="menu-illustration" src="${base}${MENU_ART.path}" width="${MENU_ART.width}" height="${MENU_ART.height}" alt="Base Aurora en la superficie de Marte, un astronauta y las opciones de misión" draggable="false" fetchpriority="high"><div class="menu-atmosphere" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i class="menu-dust" style="--x:${(i * 47 + 13) % 100}%;--y:${65 + ((i * 13) % 32)}%;--drift:${15 + (i % 5) * 8}px;--duration:${13 + (i % 7) * 2}s;--delay:-${i * 2.3}s;--size:${i % 3 === 0 ? 2 : 1}px"></i>`).join("")}${[
      [1265, 222],
      [1122, 367],
      [821, 431],
      [1506, 445],
      [617, 579],
    ]
      .map(
        ([x, y], i) =>
          `<i class="menu-beacon" style="left:${(x / MENU_ART.width) * 100}%;top:${(y / MENU_ART.height) * 100}%;--delay:-${i * 1.1}s"></i>`,
      )
      .join(
        "",
      )}</div><div class="menu-hitboxes">${MENU_HOTSPOTS.map((z) => `<button id="${z.id}" class="menu-hotspot menu-hotspot-${z.id}" aria-label="${z.label}" style="left:${(z.x / MENU_ART.width) * 100}%;top:${(z.y / MENU_ART.height) * 100}%;width:${(z.width / MENU_ART.width) * 100}%;height:${(z.height / MENU_ART.height) * 100}%"></button>`).join("")}</div></div><div class="menu-art-error" role="alert" hidden>No se pudo cargar la ilustración del menú. Recarga la página.</div><div class="menu-shutter" aria-hidden="true"></div></div>`;
    this.stage = host.querySelector(".menu-stage")!;
    this.error = host.querySelector(".menu-art-error")!;
    host.querySelector("img")!.addEventListener("error", () => {
      this.error.hidden = false;
    });
    host.querySelector("img")!.addEventListener("load", () => {
      this.error.hidden = true;
      this.layout();
    });
    for (const z of MENU_HOTSPOTS)
      host.querySelector<HTMLButtonElement>(`#${z.id}`)!.onclick = () => {
        if (this.launching || this.clicking || this.disposed) return;
        const button = host.querySelector<HTMLButtonElement>(`#${z.id}`)!;
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { callbacks[z.id](); return; }
        this.clicking = true; button.classList.add("menu-pressed");
        host.querySelectorAll<HTMLButtonElement>("button").forEach((node) => node.disabled = true);
        // Let the illustrated option visibly respond before changing screens.
        this.clickTimer = setTimeout(() => {
          this.clickTimer = undefined;
          if (this.disposed) return;
          this.clicking = false; button.classList.remove("menu-pressed");
          host.querySelectorAll<HTMLButtonElement>("button").forEach((node) => node.disabled = false);
          callbacks[z.id]();
        }, 240);
      };
    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => this.layout());
      this.observer.observe(host);
    }
    window.addEventListener("resize", this.onResize);
    this.layout();
  }
  private layout() {
    const rect = this.host.getBoundingClientRect();
    const fit = fitMenuArt(
      rect.width || window.innerWidth,
      rect.height || window.innerHeight,
    );
    Object.assign(this.stage.style, {
      left: `${fit.left}px`,
      top: `${fit.top}px`,
      width: `${fit.width}px`,
      height: `${fit.height}px`,
    });
  }
  transitionOut(done: () => void) {
    if (this.disposed || this.launching) return;
    this.launching = true;
    this.host
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((b) => (b.disabled = true));
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      done();
      return;
    }
    this.host.classList.add("menu-launching");
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (!this.disposed) done();
    }, 560);
  }
  destroy() {
    this.disposed = true;
    if (this.clickTimer !== undefined) clearTimeout(this.clickTimer);
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.observer?.disconnect();
    window.removeEventListener("resize", this.onResize);
  }
}
