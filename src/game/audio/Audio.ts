export class StationAudio {
  context?: AudioContext;
  muted = localStorage.getItem("aurora-muted") === "true";
  private hum?: OscillatorNode;
  private volume?: GainNode;
  unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.hum = this.context.createOscillator();
      this.volume = this.context.createGain();
      this.hum.frequency.value = 62;
      this.volume.gain.value = this.muted ? 0 : 0.012;
      this.hum.connect(this.volume).connect(this.context.destination);
      this.hum.start();
    }
    void this.context.resume();
  }
  toggle() {
    this.muted = !this.muted;
    localStorage.setItem("aurora-muted", String(this.muted));
    if (this.volume) this.volume.gain.value = this.muted ? 0 : 0.012;
  }
  pageFlip() {
    if (this.muted || !this.context) return;
    const c = this.context, length = Math.floor(c.sampleRate * .24), buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / length);
    const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = buffer; filter.type = "bandpass"; filter.frequency.value = 1700; filter.Q.value = .6;
    gain.gain.value = .025; source.connect(filter).connect(gain).connect(c.destination);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start();
  }
  tone(type: "click" | "step" | "success" | "alert" = "click") {
    if (this.muted || !this.context) return;
    const c = this.context,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(
      { click: 450, step: 115, success: 680, alert: 330 }[type],
      c.currentTime,
    );
    o.frequency.exponentialRampToValueAtTime(
      type === "success" ? 1000 : 180,
      c.currentTime + 0.13,
    );
    g.gain.setValueAtTime(type === "step" ? 0.015 : 0.055, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.17);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.18);
  }
}
