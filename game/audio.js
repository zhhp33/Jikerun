// Tiny synthesized sounds keep the game self-contained and load immediately.
// Background song: 32 bars at 112 BPM (~69 s) in four sections, then it loops.
const _ = null;
const BEAT = 60 / 112;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// [bass root, pad notes]
const C = [48, [60, 64, 67]], G = [43, [59, 62, 67]], Am = [45, [60, 64, 69]], F = [41, [60, 65, 69]], Em = [40, [59, 64, 67]], Dm = [38, [62, 65, 69]];

// Each bar: chord + 8 melody eighths (midi, '-' holds the previous note, _ rests).
const SECTIONS = [
  { name: 'intro', kick: 'none', bars: [[C], [G], [Am], [F], [C], [G], [Am], [F]] },
  { name: 'verse', kick: 'four', bars: [
    [Am, [76, '-', 74, 72, '-', 69, 72, '-']], [F, [72, '-', 69, _, 65, _, 67, 69]],
    [C, [67, '-', 72, _, 76, '-', 74, 72]], [G, [74, '-', '-', '-', 71, _, 67, _]],
    [Am, [76, '-', 79, 76, '-', 74, 72, '-']], [F, [72, '-', 74, _, 76, _, 77, '-']],
    [C, [79, '-', 76, _, 72, _, 74, 76]], [G, [74, '-', '-', '-', '-', '-', _, _]],
  ] },
  { name: 'bridge', kick: 'half', bars: [
    [F, [69, _, 72, _, 77, '-', 76, 74]], [G, [74, '-', 71, _, 67, '-', '-', _]],
    [Em, [71, _, 67, _, 64, _, 67, 71]], [Am, [72, '-', '-', '-', 76, '-', '-', _]],
    [Dm, [74, _, 77, _, 81, '-', 79, 77]], [G, [79, '-', 74, _, 71, '-', 74, _]],
    [C, [76, '-', '-', '-', 72, '-', '-', '-']], [G, [_, _, _, _, 74, 76, 77, 79]],
  ] },
  { name: 'chorus', kick: 'four', bars: [
    [C, [84, '-', 79, _, 76, '-', 79, _]], [G, [83, '-', 79, _, 74, '-', 71, _]],
    [Am, [81, '-', 76, _, 72, '-', 76, 79]], [F, [77, '-', 76, 74, 72, '-', '-', _]],
    [C, [84, '-', 79, _, 76, '-', 79, 81]], [G, [83, '-', 86, '-', 83, _, 79, _]],
    [Am, [81, '-', 79, 76, 77, '-', 74, _]], [F, [72, '-', '-', '-', _, _, _, _]],
  ] },
];
const SONG = SECTIONS.flatMap((section) => section.bars.map(([chord, melody]) => ({ section, chord, melody })));

export class GameAudio {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.ready = null;
    this.epoch = 0;
    this.voices = new Set();
    this.music = null;
    this.songStep = 0;
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

  // Notes are scheduled a little ahead so timer jitter never shows.
  startMusic() {
    if (!this.enabled || !this.context || this.music) return;
    const ctx = this.context;
    const bus = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3200;
    bus.connect(filter);
    filter.connect(this.master);
    // One shared delay gives the lead a little room without a reverb impulse.
    const echo = ctx.createDelay(1);
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    echo.delayTime.value = BEAT * 0.75;
    feedback.gain.value = 0.32;
    wet.gain.value = 0.35;
    echo.connect(feedback);
    feedback.connect(echo);
    echo.connect(wet);
    wet.connect(bus);
    const music = this.music = { bus, filter, echo, feedback, wet, step: this.songStep, next: 0, timer: 0 };
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
    // Resume from the start of the bar that was playing, so the chord lands cleanly.
    this.songStep = Math.floor(music.step / 8) * 8 % (SONG.length * 8);
    const now = this.context.currentTime;
    music.bus.gain.cancelScheduledValues(now);
    music.bus.gain.setTargetAtTime(0.0001, now, 0.08);
    setTimeout(() => { for (const node of [music.bus, music.filter, music.echo, music.feedback, music.wet]) node.disconnect(); }, 600);
  }

  musicStep(music) {
    const ctx = this.context;
    const t = music.next;
    const step = music.step;
    const bar = Math.floor(step / 8) % SONG.length;
    const { section, chord: [root, pad], melody } = SONG[bar];
    const i = step % 8;
    const tone = (frequency, duration, type, volume, attack = 0.01, dest = music.bus) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      oscillator.connect(gain);
      gain.connect(dest);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(t);
      oscillator.stop(t + duration + 0.02);
    };
    const noiseHit = (at, frequency, volume, length, type = 'highpass') => {
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = this.noise;
      filter.type = type;
      filter.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(music.bus);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      source.start(at, Math.random() * 0.5);
      source.stop(at + length + 0.02);
    };
    const kick = () => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.setValueAtTime(130, t);
      oscillator.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      gain.gain.setValueAtTime(0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      oscillator.connect(gain);
      gain.connect(music.bus);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(t);
      oscillator.stop(t + 0.22);
    };
    const intro = section.name === 'intro';
    const bridge = section.name === 'bridge';
    const chorus = section.name === 'chorus';

    // Pad: one soft chord per bar, brighter in the chorus.
    if (i === 0) for (const n of pad) tone(midi(n), BEAT * 3.9, 'triangle', chorus ? 0.04 : 0.032, 0.3);
    if (i === 0 && chorus) tone(midi(pad[2] + 12), BEAT * 3.9, 'sine', 0.018, 0.3);
    // Bass: octave bounce; the bridge lays back to quarter notes.
    if (!bridge || i % 2 === 0) tone(midi(root + (i % 2 ? 12 : 0)), BEAT * (bridge ? 0.9 : 0.45), 'triangle', intro && bar < 4 ? 0.07 : 0.11);
    // Arpeggio pluck, an octave up in the bridge for lift.
    const arp = [...pad, pad[1] + 12];
    if (!intro || bar >= 2) tone(midi(arp[(i * 3) % 4] + (bridge ? 24 : 12)), BEAT * 0.38, 'square', bridge ? 0.008 : 0.011);
    // Lead melody with echo.
    const note = melody?.[i];
    if (typeof note === 'number') {
      let hold = 1;
      while (melody[i + hold] === '-') hold++;
      const length = BEAT * 0.5 * hold * 0.92;
      tone(midi(note), length, 'triangle', 0.075, 0.02);
      tone(midi(note), length, 'sine', 0.035, 0.02, music.echo);
      tone(midi(note + 12), length * 0.7, 'sine', 0.012, 0.02);
    }
    // Drums, with a little fill into each new section.
    if (!(intro && bar < 4)) noiseHit(t + BEAT / 4, 7000, chorus ? 0.06 : 0.045, 0.05);
    if (section.kick === 'four' && i % 2 === 0) kick();
    if (section.kick === 'half' && i % 4 === 0) kick();
    if (intro && bar >= 4 && i % 4 === 0) kick();
    if (section.kick === 'four' && (i === 2 || i === 6)) noiseHit(t, 1800, 0.07, 0.12, 'bandpass');
    if (bar % 8 === 7 && i >= 6) { noiseHit(t, 2200, 0.06, 0.08, 'bandpass'); noiseHit(t + BEAT / 4, 2200, 0.07, 0.08, 'bandpass'); }
    music.step += 1;
    music.next += BEAT / 2;
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
