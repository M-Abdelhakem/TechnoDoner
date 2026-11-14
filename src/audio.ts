// @ts-nocheck
// WebAudio only, no files. A techno track that builds (intro → groove → breakdown → peak, 64 bars round), heard
// through the wall in TechnoDöner · Regulars (low-passed) or open in TechnoDöner, at the difficulty's BPM, pushed to its peak in
// the shift's last minute. Plus the street (sirens), the kitchen's sound effects, and a mute that is remembered.
export let BPM = 120;
const VOL = 1.0;
let ac: AudioContext | null = null, master, bus, filter, noiseBuf, nextT = 0, step = 0, musicOn = false, t0 = 0, intensity = 0, muted = false;
try { muted = localStorage.getItem('bb-muted') === '1'; } catch {}

export function initAudio() {
  if (ac) { ac.resume(); return; }
  try {
    ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    // loud, but glued by a compressor so the kick never clips
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.12;
    const out = ac.createGain(); out.gain.value = 1.6; comp.connect(out); out.connect(ac.destination);
    master = ac.createGain(); master.gain.value = muted ? 0 : VOL; master.connect(comp);
    filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 20000; filter.Q.value = 0.7; filter.connect(master);
    bus = ac.createGain(); bus.gain.value = 1; bus.connect(filter);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    t0 = ac.currentTime; setInterval(sched, 25);
  } catch { ac = null; }
}
function env(g, t, a, v, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); }
function osc(type, f, t, d, v, f2?, out?) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); env(g, t, 0.004, v, d); o.connect(g); g.connect(out || master); o.start(t); o.stop(t + d + 0.05); }
function noise(t, d, v, type, freq, out?) { const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; env(g, t, 0.002, v, d); s.connect(f); f.connect(g); g.connect(out || master); s.start(t); s.stop(t + d + 0.05); }
function synth(type, f, t, d, v, cut, cutEnd, out = bus) {
  const o = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
  o.type = o2.type = type; o.frequency.value = f; o2.frequency.value = f * 1.006; lp.type = 'lowpass'; lp.Q.value = 6;
  lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(cutEnd, t + d); env(g, t, 0.005, v, d);
  o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out); o.start(t); o2.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
}
const ROOTS = [55, 43.65, 65.41, 49]; // A1 F1 C2 G1, four bars each
const CHORD = [1, 1.19, 1.5]; // minor triad
const ARP = [0, 2, 1, 2, 0, 1, 2, 1];
function sched() {
  if (!ac || !musicOn) return;
  const spb = 60 / BPM / 4;
  while (nextT < ac.currentTime + 0.12) {
    const s = step % 16, t = nextT, bar = Math.floor(step / 16), sec = bar % 64, root = ROOTS[Math.floor(bar / 4) % 4];
    const peak = intensity > 0 || sec >= 48, intro = sec < 8 && !peak, brk = sec >= 32 && sec < 48 && !peak;
    if (!brk || sec >= 46) { if (s % 4 === 0) { osc('sine', 150, t, 0.34, 1.4, 40, bus); noise(t, 0.012, 0.25, 'highpass', 3000, bus); } }
    if (s % 4 === 2) noise(t, peak ? 0.12 : 0.04, peak ? 0.12 : 0.08, 'highpass', 8000, bus);
    if (s % 2 === 1) noise(t, 0.025, 0.035, 'highpass', 9500, bus);
    if (!intro && !brk && (s === 4 || s === 12)) noise(t, 0.14, 0.22, 'bandpass', 1500, bus);
    if (!intro && !brk && s % 4 !== 0) synth('sawtooth', root * (s % 4 === 3 ? 2 : 1), t, 0.13, 0.26, 1100, 110);
    if (!intro && !brk && (s === 6 || s === 14) && bar % 2 === 1) CHORD.forEach((k) => synth('sawtooth', root * 4 * k, t, 0.16, 0.035, 2600, 500));
    if (brk || peak) { const n = ARP[s % 8]; synth('square', root * 8 * CHORD[n], t, 0.09, brk ? 0.025 : 0.03, brk ? 600 + (sec - 32) * 180 : 3000, 400); }
    if (brk && s === 0 && bar % 2 === 0) CHORD.forEach((k) => synth('sawtooth', root * 2 * k, t, spb * 30, 0.025, 700, 300));
    if (sec === 47 && s >= 8) noise(t, 0.05, 0.03 + (s - 8) * 0.012, 'highpass', 2000 + s * 300, bus);
    if (intensity > 0 && s % 4 === 2) noise(t, 0.2, 0.06, 'highpass', 6000, bus);
    nextT += spb; step++;
  }
}
/** muffled: heard through the kebab shop wall; bpm from the difficulty */
export function startMusic(opts: { bpm?: number; muffled?: boolean } = {}) {
  initAudio(); if (!ac) return;
  BPM = opts.bpm || 120; filter.frequency.setValueAtTime(opts.muffled === false ? 20000 : 2600, ac.currentTime);
  nextT = ac.currentTime + 0.05; step = 0; t0 = nextT; musicOn = true; intensity = 0;
}
export function stopMusic() { musicOn = false; }
/** 0 normal, 1 = the shift's last minute: always the peak section, extra open hats */
export function setIntensity(v: number) { intensity = v; }
export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; try { localStorage.setItem('bb-muted', muted ? '1' : '0'); } catch {} if (master) master.gain.setTargetAtTime(muted ? 0 : VOL, ac.currentTime, 0.05); return muted; }
/** phase within the current beat (0..1) and the beat count, on the music clock when it runs */
export function beat() { const s = ac ? ac.currentTime - t0 : performance.now() / 1000; const b = Math.max(0, s) * BPM / 60; return { ph: b % 1, n: Math.floor(b) }; }
export function siren(sec = 3) {
  if (!ac) return; const t = ac.currentTime;
  for (let i = 0; i < sec * 1.6; i++) { const tt = t + i * 0.62; osc('triangle', i % 2 ? 585 : 440, tt, 0.6, 0.05); osc('square', i % 2 ? 585 : 440, tt, 0.6, 0.012); }
}
export function sfx(n: string) {
  if (!ac) return; const t = ac.currentTime;
  ({
    pick: () => osc('square', 660, t, 0.06, 0.08, 880), place: () => osc('triangle', 220, t, 0.08, 0.15, 140), chop: () => noise(t, 0.04, 0.12, 'highpass', 3000),
    serve: () => { osc('sine', 988, t, 0.15, 0.2); osc('sine', 1319, t + 0.08, 0.3, 0.2); }, bad: () => osc('sawtooth', 140, t, 0.3, 0.15, 90),
    pose: () => osc('sine', 330, t, 0.08, 0.06, 500), sign: () => osc('sine', 300, t, 0.12, 0.18, 600), seen: () => osc('triangle', 880, t, 0.1, 0.12, 660),
    bell: () => { osc('sine', 1568, t, 0.4, 0.15); osc('sine', 2093, t + 0.05, 0.4, 0.1); }, newc: () => osc('sine', 740, t, 0.12, 0.12, 990),
    decode: () => [523, 659, 784].forEach((f, i) => osc('square', f, t + i * 0.07, 0.1, 0.07)),
    tick: () => { osc('square', 1800, t, 0.03, 0.06); osc('square', 1800, t + 0.12, 0.03, 0.05); },
    knock: () => { osc('sine', 90, t, 0.12, 0.5, 60); noise(t, 0.06, 0.15, 'lowpass', 400); osc('sine', 85, t + 0.16, 0.12, 0.45, 55); },
    take: () => osc('triangle', 520, t, 0.1, 0.12, 780),
  }[n] || (() => {}))();
}
