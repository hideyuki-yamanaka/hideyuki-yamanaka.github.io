/* audio.js — 効果音（ファイルは使わず、その場で音を作る）
   ぷにっ・ぷるるん・ぽよん（着地）・しゅぱっ（切る）・ぽん（ふやす）・ゆらす */

export class Sound {
  constructor() {
    this.ac = null; this.out = null; this.nb = null;
    this.on = true; this.vol = 1; this.last = {};
  }

  /** 最初に画面を触った時に音を使えるようにする（ブラウザの決まり） */
  unlock() {
    if (!this.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ac = new AC();
      this.out = this.ac.createGain();
      this.out.gain.value = 0.5 * this.vol;
      this.out.connect(this.ac.destination);
      const len = this.ac.sampleRate;
      this.nb = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.nb.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ac.state === 'suspended') this.ac.resume();
  }

  set(on, vol) {
    this.on = on; this.vol = vol;
    if (this.out) this.out.gain.value = 0.5 * vol;
  }

  ok(name, gap) {
    if (!this.on || !this.ac || this.ac.state !== 'running') return false;
    const t = performance.now();
    if (t - (this.last[name] || 0) < gap) return false;
    this.last[name] = t;
    return true;
  }

  osc(type, f0, f1, t, dur, peak) {
    const ac = this.ac, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur * 0.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t); o.stop(t + dur + 0.02);
    return o;
  }

  noise(t, dur, peak, type, f0, f1, q) {
    const ac = this.ac, src = ac.createBufferSource(), bq = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = this.nb;
    bq.type = type; bq.Q.value = q;
    bq.frequency.setValueAtTime(f0, t);
    bq.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bq).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** ぷにっ（小さいほど高い音） */
  poke(size, s = 1) {
    if (!this.ok('poke', 30)) return;
    const t = this.ac.currentTime, k = Math.sqrt(80 / Math.max(16, size)), f = 330 * k;
    this.osc('sine', f * 1.5, f * 0.62, t, 0.2, 0.32 * s);
    this.osc('triangle', f * 2.2, f * 1.1, t, 0.09, 0.05 * s);
    this.noise(t, 0.05, 0.05 * s, 'lowpass', 900, 300, 0.7);
  }

  /** ぷるるん（長く押して離した時） */
  wobble(size, s = 1) {
    if (!this.ok('wobble', 60)) return;
    const ac = this.ac, t = ac.currentTime, k = Math.sqrt(80 / Math.max(16, size));
    const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(270 * k, t);
    o.frequency.exponentialRampToValueAtTime(150 * k, t + 0.45);
    lfo.frequency.value = 13;
    lg.gain.value = 40 * k;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3 * s, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(this.out);
    o.start(t); lfo.start(t); o.stop(t + 0.52); lfo.stop(t + 0.52);
  }

  /** ぽよん（落ちて着地） */
  land(size, s = 1) {
    if (!this.ok('land', 45)) return;
    const t = this.ac.currentTime, k = Math.sqrt(80 / Math.max(16, size));
    this.osc('sine', 210 * k, 95 * k, t, 0.2, 0.34 * s);
    this.noise(t, 0.07, 0.08 * s, 'lowpass', 700, 200, 0.8);
  }

  /** しゅぱっ（切る） */
  cut() {
    if (!this.ok('cut', 25)) return;
    const t = this.ac.currentTime;
    this.noise(t, 0.13, 0.22, 'bandpass', 6000, 1800, 1.1);
    this.noise(t + 0.03, 0.08, 0.12, 'lowpass', 1600, 400, 0.9);
    this.osc('sine', 1900, 1300, t, 0.05, 0.03);
  }

  /** ぽん（ふやす） */
  pop() {
    if (!this.ok('pop', 40)) return;
    const t = this.ac.currentTime;
    this.osc('sine', 620, 980, t, 0.09, 0.2);
  }

  /** ゆらす */
  shake() {
    if (!this.ok('shake', 200)) return;
    const t = this.ac.currentTime;
    for (let i = 0; i < 3; i++) this.osc('sine', 180 - i * 20, 110 - i * 10, t + i * 0.07, 0.16, 0.2);
  }
}
