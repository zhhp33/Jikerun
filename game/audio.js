// Tiny synthesized sounds keep the game self-contained and load immediately.
export class GameAudio {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.ready = null;
    this.epoch = 0;
    this.voices = new Set();
  }

  prepare() {
    if (!this.enabled) return Promise.resolve();
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return Promise.resolve();
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.23;
        this.master.connect(this.context.destination);
      }
      this.ready = this.context.state === 'suspended'
        ? this.context.resume().catch(() => {}) : Promise.resolve();
      return this.ready;
    } catch {
      return Promise.resolve();
    }
  }

  stop() {
    this.epoch++;
    for (const voice of this.voices) {
      try { voice.stop(); } catch { /* Already ended. */ }
    }
    this.voices.clear();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stop();
    else this.prepare();
  }

  note(frequency, duration = 0.12, delay = 0, type = 'sine', volume = 0.25, end = frequency) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.enabled) return;
    const time = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    this.voices.add(oscillator);
    oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(time);
    oscillator.stop(time + duration + 0.015);
  }

  play(name) {
    if (!this.enabled || !this.context) return;
    const epoch = this.epoch;
    const emit = () => {
      if (epoch !== this.epoch || !this.enabled) return;
      if (name === 'start') {
        [261.63, 329.63, 392, 523.25].forEach((f, i) => this.note(f, 0.18, i * 0.07, 'triangle', 0.3));
      } else if (name === 'jump') this.note(230, 0.18, 0, 'sine', 0.32, 680);
      else if (name === 'land') this.note(95, 0.075, 0, 'triangle', 0.17, 55);
      else if (name === 'cue') { this.note(784, 0.10, 0, 'sine', 0.25); this.note(1046, 0.16, 0.08, 'sine', 0.22); }
      else if (name === 'pickup') {
        this.note(659, 0.13, 0, 'sine', 0.25);
        this.note(988, 0.23, 0.085, 'sine', 0.22);
      } else if (name === 'shoot') this.note(160, 0.14, 0, 'triangle', 0.35, 500);
      else if (name === 'cat') {
        this.note(420, 0.26, 0, 'sine', 0.3, 105);
        this.note(155, 0.08, 0.23, 'triangle', 0.22, 80);
      } else if (name === 'break') {
        this.note(120, 0.15, 0, 'sawtooth', 0.13, 38);
        this.note(720, 0.07, 0.015, 'triangle', 0.12, 290);
      } else if (name === 'coin') this.note(1174, 0.08, 0, 'sine', 0.10, 1568);
      else if (name === 'hit') {
        this.note(170, 0.35, 0, 'triangle', 0.40, 40);
        this.note(70, 0.2, 0.14, 'sawtooth', 0.12, 30);
      } else if (name === 'gameover') {
        [392, 349, 261].forEach((f, i) => this.note(f, 0.22, i * 0.16, 'triangle', 0.22));
      }
    };
    if (this.context.state === 'running') emit();
    else this.ready?.then(emit);
  }
}
