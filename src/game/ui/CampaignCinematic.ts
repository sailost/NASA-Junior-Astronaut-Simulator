export interface CampaignCinematicOptions {
  source: string;
  title: string;
  onComplete: (watched: boolean) => void;
}

export const campaignVideos = {
  intro: "intro.mp4",
  sol2: "sol1_night.mp4",
  sol3: "sol3_start.mp4",
  solarAlert: "solar_alert.mp4",
  victory: "ending_success.mp4",
  partial: "ending_partial.mp4",
  defeat: "ending_failure.mp4",
} as const;

/** Full-screen, auto-advancing story video; Escape is the only skip control. */
export class CampaignCinematic {
  private video: HTMLVideoElement;
  private hint: HTMLElement;
  private disposed = false;
  private completed = false;
  private watched = false;
  private waitingForPlaybackGesture = false;
  private onEnded = () => {
    this.watched = true;
    this.finish(true);
  };
  private onError = () => {
    this.hint.textContent = "Video no disponible · Continuando";
    this.finish(false);
  };
  private onKey = (event: KeyboardEvent) => {
    if (this.waitingForPlaybackGesture && (event.code === "Enter" || event.code === "Space")) {
      event.preventDefault();
      event.stopPropagation();
      void this.resumePlayback();
      return;
    }
    if (event.code !== "Escape" || event.repeat || this.disposed) return;
    event.preventDefault();
    event.stopPropagation();
    this.finish(false);
  };
  private onTouchSkip = (event: PointerEvent) => {
    if (event.pointerType !== "touch" && !(typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches)) return;
    event.preventDefault();
    if (this.waitingForPlaybackGesture) {
      void this.resumePlayback();
      return;
    }
    this.finish(false);
  };

  constructor(private host: HTMLElement, private options: CampaignCinematicOptions) {
    const base = import.meta.env?.BASE_URL || "./";
    host.innerHTML = `<section class="campaign-cinema" aria-label="${options.title}">
      <div class="campaign-cinema-screen"><video class="campaign-cinema-video" autoplay playsinline preload="auto" aria-label="${options.title}" tabindex="0"></video></div>
      <p class="campaign-cinema-hint" role="status" aria-live="polite">${typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches ? "TOCA PARA OMITIR" : "ESC · Omitir"}</p>
    </section>`;
    this.video = host.querySelector("video")!;
    this.hint = host.querySelector(".campaign-cinema-hint")!;
    this.video.src = `${base}assets/cinematics/${options.source}`;
    this.video.addEventListener("ended", this.onEnded);
    this.video.addEventListener("error", this.onError);
    host.querySelector(".campaign-cinema-screen")!.addEventListener("pointerdown", this.onTouchSkip);
    document.addEventListener("keydown", this.onKey, true);
    void this.startPlayback();
  }

  private async startPlayback() {
    try {
      await this.video.play();
    } catch {
      // Keep dialogue audible; if autoplay is blocked, wait for the user's gesture.
      this.waitingForPlaybackGesture = true;
      this.updatePlaybackHint();
    }
  }

  private async resumePlayback() {
    this.waitingForPlaybackGesture = false;
    try {
      await this.video.play();
      this.hint.textContent = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches
        ? "TOCA PARA OMITIR · ESC"
        : "ESC · Omitir";
    } catch {
      this.waitingForPlaybackGesture = true;
      this.updatePlaybackHint();
    }
  }

  private updatePlaybackHint() {
    const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    this.hint.textContent = touch ? "TOCA PARA INICIAR · ESC PARA OMITIR" : "ENTER · Reproducir · ESC · Omitir";
  }

  private finish(watched: boolean) {
    if (this.disposed || this.completed) return;
    this.completed = true;
    this.options.onComplete(watched);
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.video.pause();
    this.video.removeEventListener("ended", this.onEnded);
    this.video.removeEventListener("error", this.onError);
    this.host.querySelector(".campaign-cinema-screen")?.removeEventListener("pointerdown", this.onTouchSkip);
    document.removeEventListener("keydown", this.onKey, true);
    this.video.removeAttribute("src");
    this.video.load();
    this.host.replaceChildren();
  }
}
