// @ts-nocheck
// The soundtrack, rendered offline (OfflineAudioContext), in the game's style (src/audio.ts): synthesized techno in
// A minor at 128 BPM. Kick, rolling offbeat bass, claps, hats, a chord stab, plus builds, impacts and the game's
// sound effects, all placed on the same beat grid as the video cuts.
//   cue = { beats, sections: [[fromBeat, kind]], sfx: [[beat, name, arg?]] }
//   kinds: 'drop' (everything), 'groove' (no stab), 'break' (no kick, low-passed, pad), 'build' (riser + snare roll),
//          'gap' (silence before a drop), 'tail' (final chord ringing out)
import { SPB, mulberry32 } from './util';

const SR = 48000;
// Am - F - C - G, two bars each: bass roots and stab voicings
const PROG = [
  { root: 55.0, stab: [220.0, 261.63, 329.63] },
  { root: 43.65, stab: [174.61, 220.0, 261.63] },
  { root: 65.41, stab: [196.0, 261.63, 329.63] },
  { root: 49.0, stab: [196.0, 246.94, 293.66] },
];

export async function renderMusic(cue) {
  const dur = cue.beats * SPB;
  const ac = new OfflineAudioContext(2, Math.ceil(dur * SR), SR);
  const rand = mulberry32(99);
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.12;
  const master = ac.createGain(); master.gain.value = 0.75; master.connect(comp); comp.connect(ac.destination);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = 0.9; lp.connect(master);
  const drums = ac.createGain(); drums.connect(lp);
  const duck = ac.createGain(); duck.connect(lp); // bass + synths, ducked by the kick
  const fx = ac.createGain(); fx.gain.value = 0.9; fx.connect(master); // sound effects skip the music filter
  // reverb and a dotted-eighth delay
  const ir = ac.createBuffer(2, SR * 2.2, SR);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
  const rev = ac.createConvolver(); rev.buffer = ir; const revOut = ac.createGain(); revOut.gain.value = 0.32; rev.connect(revOut); revOut.connect(lp);
  const dly = ac.createDelay(2); dly.delayTime.value = SPB * 0.75; const fb = ac.createGain(); fb.gain.value = 0.33; const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
  dly.connect(dlp); dlp.connect(fb); fb.connect(dly); const dOut = ac.createGain(); dOut.gain.value = 0.35; dlp.connect(dOut); dOut.connect(duck);
  const noiseBuf = ac.createBuffer(1, SR, SR); { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; }

  const env = (g, t, a, v, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); };
  const pan = (out, p) => { if (!p) return out; const s = ac.createStereoPanner(); s.pan.value = p; s.connect(out); return s; };
  function osc(type, f, t, d, v, f2, out = fx, p = 0) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    env(g, t, 0.004, v, d); o.connect(g); g.connect(pan(out, p)); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(t, d, v, type, freq, out = drums, q = 1, p = 0, send = 0, f2 = 0) {
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.setValueAtTime(freq, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + d); f.Q.value = q;
    env(g, t, 0.002, v, d); s.connect(f); f.connect(g); g.connect(pan(out, p)); if (send) { const sg = ac.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(rev); }
    s.start(t, rand() * 0.5); s.stop(t + d + 0.05);
  }
  function synth(type, f, t, d, v, cut, cutEnd, out = duck, p = 0, q = 6, send = 0, delaySend = 0, a = 0.005) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), f1 = ac.createBiquadFilter(), g = ac.createGain();
    o.type = o2.type = type; o.frequency.value = f; o2.frequency.value = f * 1.007; f1.type = 'lowpass'; f1.Q.value = q;
    f1.frequency.setValueAtTime(cut, t); f1.frequency.exponentialRampToValueAtTime(cutEnd, t + d); env(g, t, a, v, d);
    o.connect(f1); o2.connect(f1); f1.connect(g); g.connect(pan(out, p));
    if (send) { const sg = ac.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(rev); }
    if (delaySend) { const sg = ac.createGain(); sg.gain.value = delaySend; g.connect(sg); sg.connect(dly); }
    o.start(t); o2.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
  }
  const kick = (t, v = 1) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.09); o.frequency.exponentialRampToValueAtTime(42, t + 0.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 1.15, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42); o.connect(g); g.connect(drums); o.start(t); o.stop(t + 0.5);
    noise(t, 0.012, 0.25 * v, 'highpass', 3500);
    duck.gain.setValueAtTime(0.32, t); duck.gain.linearRampToValueAtTime(1, t + 0.2);
  };
  const clap = (t, v = 0.32) => { for (let k = 0; k < 3; k++) noise(t + k * 0.011, 0.012, v, 'bandpass', 1300, drums, 1.2); noise(t + 0.033, 0.2, v * 0.9, 'bandpass', 1500, drums, 1, 0, 0.45); };
  const crash = (t, v = 0.3) => { noise(t, 1.8, v, 'highpass', 5000, drums, 0.7, 0, 0.5); noise(t, 0.5, v * 0.5, 'bandpass', 2500, drums, 0.6, 0.2); };
  const boom = (t, v = 1) => { osc('sine', 75, t, 1.3, v, 28, drums); noise(t, 0.3, 0.3, 'lowpass', 300, drums); };

  const sec = (b) => { let k = 'drop', from = 0, to = cue.beats; cue.sections.forEach(([f, kind], i) => { if (b >= f) { k = kind; from = f; to = cue.sections[i + 1] ? cue.sections[i + 1][0] : cue.beats; } }); return { k, from, to }; };
  // master filter per section
  cue.sections.forEach(([f, kind], i) => {
    const t = f * SPB, to = (cue.sections[i + 1] ? cue.sections[i + 1][0] : cue.beats) * SPB;
    if (kind === 'break') { lp.frequency.setValueAtTime(650, t); }
    else if (kind === 'build') { lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(16000, to - 0.02); }
    else lp.frequency.setValueAtTime(20000, t);
    if (kind === 'drop' && f > 0 && cue.sections[i - 1] && ['build', 'gap', 'break'].includes(cue.sections[i - 1][1])) { crash(t); boom(t, 0.9); }
    if (kind === 'drop' && f === 0) { crash(t, 0.35); boom(t, 1); }
    if (kind === 'tail') { crash(t, 0.3); boom(t, 0.8); const ch = PROG[0]; ch.stab.forEach((fq, j) => synth('sawtooth', fq, t, 2.6, 0.06, 3000, 300, lp, (j - 1) * 0.4, 3, 0.6, 0.3)); synth('sawtooth', 55, t, 1.6, 0.22, 900, 80, lp, 0, 4); }
  });

  const steps = Math.floor(cue.beats * 4);
  for (let st = 0; st < steps; st++) {
    const b = st / 4, t = b * SPB, s = st % 16, bar = Math.floor(st / 16), ch = PROG[Math.floor(bar / 2) % 4];
    const { k, from, to } = sec(b);
    if (k === 'gap' || k === 'tail') continue;
    const full = k === 'drop', groove = k === 'groove', brk = k === 'break', build = k === 'build';
    if ((full || groove) && s % 4 === 0) kick(t);
    if (build && s % 4 === 0 && b < to - 1) kick(t, 0.7);
    if (brk && s % 8 === 0) kick(t, 0.45);
    // hats
    if (!brk && s % 4 === 2) noise(t, full ? 0.1 : 0.06, full ? 0.11 : 0.08, 'highpass', 7500, drums, 1, 0.15);
    if (s % 2 === 1) noise(t, 0.022, brk ? 0.02 : 0.04, 'highpass', 9500, drums, 1, -0.2);
    if ((full || groove) && (s === 4 || s === 12)) clap(t);
    if (full && s === 15 && bar % 4 === 3) clap(t, 0.18);
    // rolling offbeat bass
    if (full || groove || build) {
      if (s % 4 === 2) { synth('sawtooth', ch.root, t, 0.2, 0.3, 1500, 130, duck, 0, 7); osc('sine', ch.root, t, 0.18, 0.28, 0, duck); }
      else if (s % 4 === 3) synth('sawtooth', ch.root * 2, t, 0.08, 0.11, 1100, 200, duck, 0, 6);
      else if (s % 4 === 1) synth('sawtooth', ch.root, t, 0.08, 0.1, 900, 150, duck, 0, 6);
    }
    // the stab
    if (full && (s === 6 || s === 14 || (bar % 2 === 1 && s === 11))) ch.stab.forEach((f, j) => synth('sawtooth', f, t, 0.22, 0.045, 3800, 500, duck, (j - 1) * 0.45, 5, 0.35, 0.5));
    // arp sparkle in the drop
    if (full && s % 2 === 0) { const n = [0, 2, 1, 2, 0, 1, 2, 1][(s / 2) % 8]; synth('square', ch.stab[n] * 2, t, 0.08, 0.016, 3200, 600, duck, n === 1 ? 0.3 : -0.3, 3, 0.2, 0.25); }
    // break: pad and muffled bass
    if (brk && s === 0 && bar % 1 === 0) { ch.stab.forEach((f, j) => synth('sawtooth', f / 2, t, SPB * 4, 0.05, 900, 400, duck, (j - 1) * 0.5, 2, 0.5, 0, 0.3)); synth('sawtooth', ch.root, t, SPB * 3.5, 0.12, 400, 120, duck, 0, 3); }
    // build: snare roll that speeds up + riser
    if (build) {
      const k2 = (b - from) / (to - from), div = k2 < 0.5 ? 2 : 4; // 8ths, then 16ths
      if (st % (4 / div) === 0) noise(t, 0.08, 0.06 + 0.22 * k2, 'bandpass', 1800 + 1500 * k2, drums, 1, 0, 0.3);
      if (st % 4 === 0 && k2 > 0.75) noise(t + SPB / 8, 0.05, 0.25, 'bandpass', 3000, drums, 1, 0, 0.2);
    }
  }
  // risers across each build
  cue.sections.forEach(([f, kind], i) => {
    if (kind !== 'build') return; const t = f * SPB, d = ((cue.sections[i + 1] ? cue.sections[i + 1][0] : cue.beats) - f) * SPB;
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; s.loop = true; fl.type = 'bandpass'; fl.Q.value = 1.5;
    fl.frequency.setValueAtTime(400, t); fl.frequency.exponentialRampToValueAtTime(9000, t + d); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.28, t + d - 0.02); g.gain.linearRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + d);
    const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + d); og.gain.setValueAtTime(0.001, t); og.gain.exponentialRampToValueAtTime(0.05, t + d - 0.02); og.gain.linearRampToValueAtTime(0.0001, t + d); o.connect(og); og.connect(master); o.start(t); o.stop(t + d);
  });

  // ---- sound effects (the game's, a bit bigger) ----
  const SFX = {
    knock: (t) => { osc('sine', 95, t, 0.16, 0.9, 55, fx); noise(t, 0.08, 0.4, 'lowpass', 500, fx); noise(t, 0.03, 0.25, 'bandpass', 1800, fx); },
    ching: (t) => { [2093, 2637, 3136].forEach((f, i) => osc('sine', f, t + i * 0.03, 0.5, 0.12, 0, fx)); noise(t, 0.05, 0.12, 'highpass', 6000, fx); osc('triangle', 1046, t + 0.12, 0.6, 0.1, 0, fx); },
    perfect: (t) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { osc('square', f, t + i * 0.06, 0.14, 0.05, 0, fx); osc('sine', f, t + i * 0.06, 0.3, 0.1, 0, fx); }),
    whoosh: (t) => noise(t - 0.18, 0.32, 0.16, 'bandpass', 500, fx, 2, 0, 0, 5000),
    pop: (t) => osc('sine', 620, t, 0.07, 0.22, 1300, fx),
    place: (t) => { osc('triangle', 260, t, 0.1, 0.3, 140, fx); noise(t, 0.03, 0.15, 'lowpass', 900, fx); },
    tick: (t) => { osc('square', 1760, t, 0.05, 0.08, 0, fx); osc('sine', 880, t, 0.25, 0.25, 0, fx); },
    chop: (t) => { noise(t, 0.04, 0.3, 'highpass', 2500, fx); osc('triangle', 600, t, 0.03, 0.08, 300, fx); },
    sizzle: (t, d = 0.6) => noise(t, d, 0.1, 'highpass', 5000, fx, 0.5),
    squirt: (t) => noise(t, 0.25, 0.25, 'lowpass', 1800, fx, 4, 0, 0, 300),
    bad: (t) => { osc('sawtooth', 180, t, 0.45, 0.13, 85, fx); osc('square', 120, t, 0.45, 0.06, 70, fx); },
    sign: (t) => osc('sine', 300, t, 0.14, 0.22, 640, fx),
    seen: (t) => osc('triangle', 880, t, 0.12, 0.16, 660, fx),
    stamp: (t) => { osc('sine', 120, t, 0.2, 0.6, 50, fx); noise(t, 0.12, 0.3, 'lowpass', 1200, fx); },
    scratch: (t) => { const o = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); o.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.25); env(g, t, 0.01, 0.3, 0.3); o.connect(f); f.connect(g); g.connect(fx); o.start(t); o.stop(t + 0.35); },
    what: (t) => { osc('square', 330, t, 0.12, 0.06, 520, fx); osc('square', 520, t + 0.13, 0.18, 0.06, 300, fx); },
  };
  for (const [b, name, arg] of cue.sfx) SFX[name]?.(b * SPB, arg);

  // fade the very end
  master.gain.setValueAtTime(0.75, Math.max(0, dur - 0.5)); master.gain.linearRampToValueAtTime(0.0001, dur);
  return await ac.startRendering();
}

/** 16-bit PCM WAV, base64, for the renderer to hand to ffmpeg */
export function wavBase64(buf) {
  const n = buf.length, chs = buf.numberOfChannels, bytes = 44 + n * chs * 2, ab = new ArrayBuffer(bytes), v = new DataView(ab);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, bytes - 8, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, chs, true);
  v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * chs * 2, true); v.setUint16(32, chs * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * chs * 2, true);
  const data = [...Array(chs)].map((_, c) => buf.getChannelData(c)); let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < chs; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  const u8 = new Uint8Array(ab); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(bin);
}
