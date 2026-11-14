// @ts-nocheck
// WebAudio only, no files: the club's kick heard through a wall (low-passed), street hiss, the odd police siren, and
// the kitchen's sound effects. Starts on the first click (browsers keep audio locked until then).
export const BPM = 120;
let ac: AudioContext | null = null, master, muffle, noiseBuf, nextT = 0, step = 0, musicOn = false, t0 = 0;

export function initAudio() {
  if (ac) { ac.resume(); return; }
  try {
    ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    muffle = ac.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 420; muffle.Q.value = 0.8; muffle.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    t0 = ac.currentTime;
    setInterval(sched, 25);
  } catch { ac = null; }
}
function env(g, t, a, v, d) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); }
function osc(type, f, t, d, v, f2?, out?) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); env(g, t, 0.005, v, d); o.connect(g); g.connect(out || master); o.start(t); o.stop(t + d + 0.05); }
function noise(t, d, v, hp, out?) { const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp; env(g, t, 0.002, v, d); s.connect(f); f.connect(g); g.connect(out || master); s.start(t); s.stop(t + d + 0.05); }
function sched() {
  if (!ac || !musicOn) return;
  const spb = 60 / BPM / 4;
  while (nextT < ac.currentTime + 0.12) {
    const s = step % 16, t = nextT, bar = Math.floor(step / 16) % 4;
    if (s % 4 === 0) osc('sine', 120, t, 0.32, 1.2, 38, muffle);
    if (s % 2 === 1) osc('sawtooth', bar === 3 ? 49 : 55, t, 0.13, 0.35, 0, muffle);
    if (s === 4 || s === 12) noise(t, 0.12, 0.2, 900, muffle);
    if (s % 4 === 2) noise(t, 0.05, 0.015, 7000);
    nextT += spb; step++;
  }
}
export function startMusic() { initAudio(); if (ac) { nextT = ac.currentTime + 0.05; musicOn = true; } }
export function stopMusic() { musicOn = false; }
/** 0..1 phase within the current beat, and the beat count, on the music clock when it runs */
export function beat() { const s = ac ? ac.currentTime - t0 : performance.now() / 1000; const b = s * BPM / 60; return { ph: b % 1, n: Math.floor(b) }; }
export function siren(sec = 3) {
  if (!ac) return; const t = ac.currentTime;
  for (let i = 0; i < sec * 1.6; i++) { const tt = t + i * 0.62; osc('triangle', i % 2 ? 585 : 440, tt, 0.6, 0.05); osc('square', i % 2 ? 585 : 440, tt, 0.6, 0.012); }
}
export function sfx(n: string) {
  if (!ac) return; const t = ac.currentTime;
  ({
    pick: () => osc('square', 660, t, 0.06, 0.08, 880), place: () => osc('triangle', 220, t, 0.08, 0.15, 140), chop: () => noise(t, 0.04, 0.12, 3000),
    serve: () => { osc('sine', 988, t, 0.15, 0.2); osc('sine', 1319, t + 0.08, 0.3, 0.2); }, bad: () => osc('sawtooth', 140, t, 0.3, 0.15, 90),
    pose: () => osc('sine', 330, t, 0.08, 0.06, 500), sign: () => osc('sine', 300, t, 0.12, 0.18, 600), seen: () => osc('triangle', 880, t, 0.1, 0.12, 660),
    bell: () => { osc('sine', 1568, t, 0.4, 0.15); osc('sine', 2093, t + 0.05, 0.4, 0.1); }, newc: () => osc('sine', 740, t, 0.12, 0.12, 990),
    decode: () => [523, 659, 784].forEach((f, i) => osc('square', f, t + i * 0.07, 0.1, 0.07)),
  }[n] || (() => {}))();
}
