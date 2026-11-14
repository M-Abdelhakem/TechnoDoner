// Berlin Bears — synthesized music + SFX (WebAudio, no samples)
(function () {
  const BB = (window.BB = window.BB || {});
  let ctx = null, master, music, sfxG, noise, timer = null, muff = null;
  let style = null, bpm = 120, step = 0, nextT = 0, startT = 0, muted = false;
  try { muted = localStorage.getItem('bb-muted') === '1'; } catch (e) {}

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = 0.42;
    muff = ctx.createBiquadFilter(); muff.type = 'lowpass'; muff.frequency.value = 20000; muff.Q.value = 0.7;
    music.connect(muff); muff.connect(master);
    sfxG = ctx.createGain(); sfxG.gain.value = 0.7; sfxG.connect(master);
    const len = ctx.sampleRate;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function env(g, t, a, peak, dcy, sus) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus || 0.0001), t + a + dcy);
  }
  function osc(type, f, t, dur, vol, dest, opts) {
    opts = opts || {};
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + (opts.slideT || dur));
    if (opts.detune) o.detune.value = opts.detune;
    let node = o;
    if (opts.lp) {
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(opts.lp, t);
      if (opts.lpEnd) fl.frequency.exponentialRampToValueAtTime(opts.lpEnd, t + dur);
      fl.Q.value = opts.q || 1; o.connect(fl); node = fl;
    }
    node.connect(g); g.connect(dest || music);
    env(g, t, opts.a || 0.005, vol, dur);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function nz(t, dur, vol, hp, dest, bp) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = bp ? 'bandpass' : 'highpass'; f.frequency.value = hp; if (bp) f.Q.value = 1.2;
    const g = ctx.createGain();
    s.connect(f); f.connect(g); g.connect(dest || music);
    env(g, t, 0.002, vol, dur);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  const kick = (t, v) => osc('sine', 150, t, 0.32, v || 0.9, music, { slide: 42, slideT: 0.18 });
  const hat = (t, v, open) => nz(t, open ? 0.16 : 0.04, v || 0.18, 7000);
  const snare = (t, v) => { nz(t, 0.16, v || 0.35, 1800, music, true); osc('triangle', 190, t, 0.08, 0.2); };
  const clap = t => { [0, 0.012, 0.024].forEach(o => nz(t + o, 0.12, 0.22, 1400, music, true)); };

  // Phrygian dominant on D (a nod to Anatolian saz lines)
  const PD = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16];
  const SAZ = [7, 8, 7, 5, 4, -1, 4, 5, 7, -1, 8, 10, 8, 7, 5, 4, 1, 0, 1, 4, -1, 5, 4, 1, 0, -1, -1, 4, 5, 4, 1, 0];

  const STYLES = {
    kotti: {
      bpm: 94,
      step(t, s, sd) {
        const i = s % 16, bar = Math.floor(s / 16) % 4;
        if (i === 0 || i === 7 || i === 10) kick(t, 0.8);
        if (i === 4 || i === 12) snare(t, 0.3);
        if (i % 2 === 0) hat(t + (i % 4 === 2 ? sd * 0.18 : 0), 0.08);
        const root = [50, 50, 48, 49][bar];
        if (i === 0 || i === 6 || i === 10) osc('triangle', mtof(root - 12), t, sd * 2.5, 0.32, music, { lp: 600 });
        const n = SAZ[(s % 32)];
        if (n >= 0 && (s % 2 === 0 || Math.random() < 0.15)) osc('sawtooth', mtof(62 + n), t, sd * 1.4, 0.07, music, { lp: 2600, lpEnd: 500, q: 4 });
      },
    },
    bunker: {
      bpm: 130,
      step(t, s, sd) {
        const i = s % 16, bar = Math.floor(s / 16);
        if (i % 4 === 0) kick(t, 1.0);
        if (i === 4 || i === 12) clap(t);
        if (i % 4 === 2) hat(t, 0.16, true); else hat(t, 0.05);
        if (i % 4 !== 0) osc('sawtooth', mtof(33), t, sd * 0.8, 0.22, music, { lp: 260 + 140 * Math.sin(s * 0.1), q: 2 });
        const acid = [45, 45, 57, 45, 48, 45, 52, 55][(s + bar) % 8];
        if (i % 2 === 1 && bar % 4 > 0) osc('sawtooth', mtof(acid), t, sd * 0.9, 0.06, music, { lp: 500 + 1800 * (0.5 + 0.5 * Math.sin(s * 0.05)), lpEnd: 300, q: 9 });
        if (i === 0 && bar % 8 === 7) nz(t, sd * 16, 0.08, 3000);
      },
    },
    u8: {
      bpm: 84,
      step(t, s, sd) {
        const i = s % 16, bar = Math.floor(s / 16) % 4;
        if (i === 0 || i === 9) kick(t, 0.7);
        if (i === 8) snare(t, 0.25);
        if (i % 2 === 0) hat(t, 0.05);
        if (i === 0) {
          const ch = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]][bar];
          ch.forEach(m => osc('triangle', mtof(m), t, sd * 14, 0.05, music, { a: 0.05 }));
          osc('sine', mtof(ch[0] - 24), t, sd * 10, 0.3, music);
        }
        if (s % 4 === 0) nz(t, sd * 4, 0.035, 120, music, true); // track rumble
      },
    },
    title: {
      bpm: 112,
      step(t, s, sd) {
        const i = s % 16;
        if (i % 4 === 0) kick(t, 0.6);
        if (i % 4 === 2) hat(t, 0.1, true);
        if (i === 0 || i === 8) osc('sawtooth', mtof(38), t, sd * 6, 0.12, music, { lp: 400, q: 3 });
        const n = SAZ[(s * 3) % 32];
        if (i % 4 === 3 && n >= 0) osc('triangle', mtof(74 + n), t, sd * 2, 0.06);
      },
    },
  };

  function tick() {
    if (!ctx || !style) return;
    const sd = 60 / bpm / 4;
    while (nextT < ctx.currentTime + 0.12) {
      try { STYLES[style].step(nextT, step, sd); } catch (e) {}
      nextT += sd; step++;
    }
  }

  const SFX = {
    grab() { osc('square', 520, now(), 0.06, 0.08, sfxG, { slide: 780 }); },
    place() { osc('triangle', 220, now(), 0.08, 0.2, sfxG, { slide: 140 }); },
    chop() { nz(now(), 0.03, 0.3, 2500, sfxG); osc('square', 900, now(), 0.02, 0.04, sfxG); },
    shave() { nz(now(), 0.05, 0.15, 4000, sfxG); },
    sauce() { nz(now(), 0.18, 0.18, 800, sfxG, true); },
    serve() { const t = now(); osc('sine', 1318, t, 0.25, 0.25, sfxG); osc('sine', 1760, t + 0.08, 0.4, 0.22, sfxG); },
    wrong() { osc('sawtooth', 150, now(), 0.3, 0.2, sfxG, { lp: 900, slide: 90 }); },
    expire() { osc('square', 300, now(), 0.4, 0.12, sfxG, { slide: 120, lp: 1500 }); },
    trash() { nz(now(), 0.25, 0.25, 400, sfxG, true); },
    step(d) { const f = { U: 660, R: 740, D: 494, L: 587 }[d] || 600; osc('triangle', f, now(), 0.12, 0.2, sfxG, { slide: f * 1.5 }); },
    miss() { osc('sawtooth', 200, now(), 0.2, 0.14, sfxG, { slide: 100, lp: 1200 }); },
    decoded() { const t = now(); [0, 4, 7, 12].forEach((n, i) => osc('triangle', mtof(74 + n), t + i * 0.06, 0.2, 0.18, sfxG)); },
    sign() { osc('sine', 880, now(), 0.1, 0.15, sfxG, { slide: 1320 }); },
    order() { const t = now(); osc('sine', 988, t, 0.12, 0.15, sfxG); osc('sine', 1319, t + 0.1, 0.18, 0.15, sfxG); },
    doors() { const t = now(); osc('sine', 1046, t, 0.3, 0.18, sfxG); osc('sine', 880, t + 0.3, 0.3, 0.18, sfxG); osc('sine', 698, t + 0.6, 0.45, 0.18, sfxG); },
    brake() { nz(now(), 0.9, 0.12, 2400, sfxG, true); osc('sawtooth', 1800, now(), 0.8, 0.03, sfxG, { slide: 1400 }); },
    start() { const t = now(); [0, 7, 12].forEach((n, i) => osc('square', mtof(62 + n), t + i * 0.1, 0.15, 0.08, sfxG, { lp: 3000 })); },
    end() { const t = now(); [12, 7, 4, 0].forEach((n, i) => osc('triangle', mtof(62 + n), t + i * 0.14, 0.3, 0.16, sfxG)); },
    star() { osc('sine', 1568, now(), 0.3, 0.2, sfxG, { slide: 2093 }); },
    join() { const t = now(); osc('sine', 660, t, 0.15, 0.2, sfxG); osc('sine', 990, t + 0.12, 0.2, 0.2, sfxG); },
  };
  function now() { return ctx.currentTime + 0.005; }

  BB.Audio = {
    init,
    play(name) {
      if (!ctx) return;
      if (style === name) return;
      style = name; bpm = STYLES[name] ? STYLES[name].bpm : 120;
      step = 0; nextT = ctx.currentTime + 0.06; startT = nextT;
      if (!timer) timer = setInterval(tick, 25);
    },
    stop() { style = null; },
    muffle(on) { if (!muff) return; muff.frequency.setTargetAtTime(on ? 380 : 20000, ctx.currentTime, 0.12); },
    sfx(name, arg) { if (!ctx || !SFX[name]) return; try { SFX[name](arg); } catch (e) {} },
    beatPhase() {
      if (!ctx || !style) return (performance.now() / 1000 * 2.13) % 1;
      const b = (ctx.currentTime - startT) * bpm / 60;
      return ((b % 1) + 1) % 1;
    },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('bb-muted', muted ? '1' : '0'); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 0.8;
      return muted;
    },
  };
})();
