type SoundId =
  | "advertencia" | "alarma" | "ambiente_estacion" | "chispa" | "click"
  | "dia" | "exito" | "fallo" | "noche" | "paso" | "puerta"
  | "recoleccion" | "reparacion" | "transmision";
type ToneId = "click" | "step" | "success" | "alert" | "failure";
export type MusicTrack = "sol1" | "sol2" | "sol3";
const musicFiles: Record<MusicTrack, string> = {
  sol1: "Sol-1.mp3",
  sol2: "sol2.mp3",
  sol3: "Sol3.mp3",
};
const files: SoundId[] = ["advertencia", "alarma", "ambiente_estacion", "chispa", "click", "dia", "exito", "fallo", "noche", "paso", "puerta", "recoleccion", "reparacion", "transmision"];
const toneFile: Record<ToneId, SoundId> = { click: "click", step: "paso", success: "exito", alert: "advertencia", failure: "fallo" };

export class StationAudio {
  context?: AudioContext;
  muted = localStorage.getItem("aurora-muted") === "true";
  private master?: GainNode;
  private menuConfirm: HTMLAudioElement;
  private buffers = new Map<SoundId, AudioBuffer>();
  private loading?: Promise<void>;
  private ambience?: AudioBufferSourceNode;
  private ambienceGain?: GainNode;
  private musicTrack?: MusicTrack;
  private musicSource?: AudioBufferSourceNode;
  private musicGain?: GainNode;
  private musicBuffer?: AudioBuffer;
  private musicRequest = 0;
  private musicLoadingRequest = -1;
  private musicSilent = false;
  private musicVolume = 0.2;

  constructor() {
    const base = import.meta.env?.BASE_URL || "./";
    this.menuConfirm = new Audio(`${base}assets/audio/menu_ok.wav`);
    this.menuConfirm.preload = "auto";
    this.menuConfirm.volume = 0.72;
    this.menuConfirm.muted = this.muted;
    this.menuConfirm.load();
  }

  unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.context.destination);
      this.loading = this.loadBuffers();
    }
    void this.context.resume();
    this.resumeMusic();
  }

  setMusic(track: MusicTrack | undefined, silent = false) {
    this.musicSilent = silent;
    if (this.musicTrack !== track) {
      this.musicTrack = track;
      this.musicRequest++;
      this.musicLoadingRequest = -1;
      this.stopMusic();
    }
    this.loadSelectedMusic();
    this.applyMusicGain();
  }

  private loadSelectedMusic() {
    const track = this.musicTrack;
    const context = this.context;
    if (!track || !context || !this.master || this.musicSource || this.musicLoadingRequest === this.musicRequest) return;
    const request = this.musicRequest;
    this.musicLoadingRequest = request;
    const base = import.meta.env?.BASE_URL || "./";
    void fetch(`${base}assets/music/${musicFiles[track]}`)
      .then((response) => {
        if (!response.ok) throw new Error(`No se pudo cargar ${musicFiles[track]}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        if (request !== this.musicRequest || track !== this.musicTrack || !this.master) return;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0;
        source.connect(gain).connect(this.master);
        this.musicBuffer = buffer;
        this.musicSource = source;
        this.musicGain = gain;
        source.start();
        this.applyMusicGain();
      })
      .catch(() => {})
      .finally(() => {
        if (this.musicLoadingRequest === request) this.musicLoadingRequest = -1;
      });
  }

  private applyMusicGain() {
    if (!this.musicGain || !this.context) return;
    const level = this.muted || this.musicSilent ? 0 : this.musicVolume;
    const param = this.musicGain.gain;
    param.cancelScheduledValues(this.context.currentTime);
    param.setTargetAtTime(level, this.context.currentTime, 0.45);
  }

  private stopMusic() {
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch { /* The source may already have ended. */ }
      this.musicSource.disconnect();
    }
    this.musicGain?.disconnect();
    this.musicSource = undefined;
    this.musicGain = undefined;
    this.musicBuffer = undefined;
  }

  private resumeMusic() {
    this.loadSelectedMusic();
    this.applyMusicGain();
  }

  private async loadBuffers() {
    const context = this.context;
    if (!context) return;
    const base = import.meta.env?.BASE_URL || "./";
    await Promise.all(files.map(async (id) => {
      try {
        const response = await fetch(`${base}assets/audio/${id}.wav`);
        if (!response.ok) return;
        this.buffers.set(id, await context.decodeAudioData(await response.arrayBuffer()));
      } catch { /* Procedural fallback remains available when an asset cannot load. */ }
    }));
    this.startAmbience();
  }

  private startAmbience() {
    const context = this.context, buffer = this.buffers.get("ambiente_estacion");
    if (!context || !buffer || !this.master || this.ambience) return;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer; source.loop = true; gain.gain.value = this.muted ? 0 : 0.16;
    source.connect(gain).connect(this.master); source.start();
    this.ambience = source; this.ambienceGain = gain;
  }

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem("aurora-muted", String(this.muted));
    this.menuConfirm.muted = this.muted;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.context.currentTime, 0.04);
    this.applyMusicGain();
  }

  /** Persona's confirm click is reserved for buttons on the title menu. */
  playMenuConfirm() {
    if (this.muted) return;
    try { this.menuConfirm.currentTime = 0; } catch { /* Metadata may still be loading. */ }
    void this.menuConfirm.play().catch(() => {});
  }

  play(id: SoundId) {
    if (this.muted || !this.context || !this.master) return;
    const buffer = this.buffers.get(id);
    if (!buffer) { if (id === "click" || id === "paso" || id === "exito" || id === "advertencia" || id === "fallo") this.tone(({ click: "click", paso: "step", exito: "success", advertencia: "alert", fallo: "failure" } as const)[id]); return; }
    const source = this.context.createBufferSource();
    source.buffer = buffer; source.connect(this.master);
    source.onended = () => source.disconnect();
    source.start();
  }

  pageFlip() {
    if (this.muted || !this.context || !this.master) return;
    const c = this.context, length = Math.floor(c.sampleRate * .24), buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / length);
    const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = buffer; filter.type = "bandpass"; filter.frequency.value = 1700; filter.Q.value = .6;
    gain.gain.value = .025; source.connect(filter).connect(gain).connect(this.master);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start();
  }

  tone(type: ToneId = "click") {
    const id = toneFile[type];
    if (this.buffers.has(id)) { this.play(id); return; }
    if (this.muted || !this.context || !this.master) return;
    const c = this.context, o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime({ click: 450, step: 115, success: 680, alert: 330, failure: 220 }[type], c.currentTime);
    o.frequency.exponentialRampToValueAtTime(type === "success" ? 1000 : 180, c.currentTime + .13);
    g.gain.setValueAtTime(type === "step" ? .015 : .055, c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .17);
    o.connect(g).connect(this.master); o.start(); o.stop(c.currentTime + .18);
  }

  /** Release the audio context when the page is hidden. */
  suspend() {
    if (this.context) void this.context.suspend();
    this.menuConfirm.pause();
  }
}
