// Tiny synthesized sounds keep the game self-contained and load immediately.
export class GameAudio {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.ready = null;
    this.epoch = 0;
    this.voices = new Set();
    this.music = null;
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
    if (!enabled) { this.stop(); this.stopMusic(); }
    else this.prepare();
  }

  // Background loop: 112 BPM, C – G – Am – F, scheduled a little ahead so timer jitter never shows.
  startMusic() {
    if (!this.enabled || !this.context || this.music) return;
    const ctx = this.context;
    const bus = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2600;
    bus.connect(filter);
    filter.connect(this.master);
    const music = this.music = { bus, filter, step: 0, next: 0, timer: 0 };
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      this.noise.getChannelData(0).forEach((_, i, data) => { data[i] = Math.random() * 2 - 1; });
    }
    const begin = () => {
      if (this.music !== music) return;
      music.next = ctx.currentTime + 0.05;
      bus.gain.setValueAtTime(0.0001, music.next);
      bus.gain.exponentialRampToValueAtTime(1.6, music.next + 0.8);
      const schedule = () => {
        while (music.next < ctx.currentTime + 0.3) this.musicStep(music);
      };
      schedule();
      music.timer = setInterval(schedule, 50);
    };
    if (ctx.state === 'running') begin();
    else this.ready?.then(begin);
  }

  stopMusic() {
    const music = this.music;
    if (!music) return;
    this.music = null;
    clearInterval(music.timer);
    const now = this.context.currentTime;
    music.bus.gain.cancelScheduledValues(now);
    music.bus.gain.setTargetAtTime(0.0001, now, 0.08);
    setTimeout(() => { music.bus.disconnect(); music.filter.disconnect(); }, 600);
  }

  musicStep(music) {
    const ctx = this.context;
    const beat = 60 / 112;
    const t = music.next;
    const i = music.step % 8;
    const midi = (n) => 440 * 2 ** ((n - 69) / 12);
    const [root, ...notes] = [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]][Math.floor(music.step / 8) % 4];
    const tone = (frequency, duration, type, volume, attack = 0.01) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      oscillator.connect(gain);
      gain.connect(music.bus);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(t);
      oscillator.stop(t + duration + 0.02);
    };
    if (i === 0) for (const n of notes) tone(midi(n), beat * 3.9, 'triangle', 0.035, 0.25);
    tone(midi(root + (i % 2 ? 12 : 0)), beat * 0.45, 'triangle', 0.11);
    tone(midi([...notes, notes[1] + 12][i % 4] + 12), beat * 0.4, 'square', 0.012);
    const hat = ctx.createBufferSource();
    const highpass = ctx.createBiquadFilter();
    const hatGain = ctx.createGain();
    hat.buffer = this.noise;
    highpass.type = 'highpass';
    highpass.frequency.value = 7000;
    hatGain.gain.setValueAtTime(0.05, t + beat / 4);
    hatGain.gain.exponentialRampToValueAtTime(0.0001, t + beat / 4 + 0.05);
    hat.connect(highpass);
    highpass.connect(hatGain);
    hatGain.connect(music.bus);
    hat.onended = () => { hat.disconnect(); highpass.disconnect(); hatGain.disconnect(); };
    hat.start(t + beat / 4);
    hat.stop(t + beat / 4 + 0.06);
    if (i % 2 === 0) {
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.frequency.setValueAtTime(130, t);
      kick.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      kickGain.gain.setValueAtTime(0.32, t);
      kickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      kick.connect(kickGain);
      kickGain.connect(music.bus);
      kick.onended = () => { kick.disconnect(); kickGain.disconnect(); };
      kick.start(t);
      kick.stop(t + 0.22);
    }
    music.step += 1;
    music.next += beat / 2;
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
