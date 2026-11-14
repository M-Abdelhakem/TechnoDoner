// Shared bits: networking, techno audio, bear builder (now with elbows), the dance poses, regulars' outfits, club decor.
// The look is TechnoDoner's (m-abdelhakem, MIT); the game is the Regulars loop (see worker/original.js).
import * as THREE from 'three';

// ---------- net ----------
// (port: relative URLs, plus an optional ?room=XYZ that is passed on to the server; no room = one shared game)
const ROOM = new URLSearchParams(location.search).get('room');
const ROOM_Q = ROOM ? `?room=${encodeURIComponent(ROOM)}` : '';
// EventSource gives up for good when a reconnect gets an HTTP error (a Worker reload, a 5xx), so reopen it by hand;
// onOpen runs on every (re)connect. A badge shows the gap.
export function connect(onMsg, onOpen) {
  const badge = document.createElement('div');
  badge.id = 'netBadge'; badge.textContent = '📡 reconnecting…'; badge.hidden = true;
  document.body.appendChild(badge);
  let es = null;
  const open = () => {
    es = new EventSource('./events' + ROOM_Q);
    es.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } onMsg(m); };
    es.onopen = () => { badge.hidden = true; if (onOpen) onOpen(); };
    es.onerror = () => {
      badge.hidden = false;
      if (es.readyState === EventSource.CLOSED) { es.close(); setTimeout(open, 2000); }
    };
  };
  open();
  return { close: () => es && es.close() };
}
// Actions go out one after another (fix: parallel POSTs could overtake each other, e.g. a `serve` landing before the
// `add` pressed just before it). Pose updates skip the line: they are frequent and only the latest one matters.
let chain = Promise.resolve();
export function send(type, data = {}) {
  const post = () => fetch('./action' + ROOM_Q, { method: 'POST', body: JSON.stringify({ type, ...data }) }).catch(() => {});
  if (type === 'pose') return post();
  return (chain = chain.then(post));
}

// ---------- rules.json: regulars, their usuals, difficulty ----------
export const LEVEL_DEFAULTS = {
  chill: { label: 'Chill', emoji: '😌', patienceSeconds: 120, danceLen: 2, beatsPerPose: 2, strobeRate: 0.5, bpm: 112 },
  normal: { label: 'Normal', emoji: '🙂', patienceSeconds: 95, danceLen: 3, beatsPerPose: 2, strobeRate: 1, bpm: 122 },
  rave: { label: 'Rave', emoji: '🔥', patienceSeconds: 75, danceLen: 4, beatsPerPose: 1, strobeRate: 2, bpm: 132 },
};
let rulesCache = null;
// re-read when asked (the server re-reads it on every start, so the pages do too)
export async function loadRules(fresh = false) {
  if (rulesCache && !fresh) return rulesCache;
  try { rulesCache = await (await fetch('./rules.json', { cache: 'no-cache' })).json(); } catch { rulesCache = rulesCache || { orders: {}, regulars: [] }; }
  rulesCache.levels = Object.assign({}, LEVEL_DEFAULTS, rulesCache.levels || {});
  return rulesCache;
}
export const rulesNow = () => rulesCache;
export function levelInfo(id) {
  const levels = (rulesCache && rulesCache.levels) || LEVEL_DEFAULTS;
  return { ...LEVEL_DEFAULTS.normal, ...(levels[id] || levels.normal), id: levels[id] ? id : 'normal' };
}

// ---------- top bar (both pages) ----------
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
export function updateTopbar(state) {
  const $ = (id) => document.getElementById(id);
  const left = Math.max(0, Math.ceil(state.timeLeft));
  $('clock').textContent = state.clock;
  $('time').textContent = left;
  $('mmss').textContent = mmss(left);
  $('timeBox').classList.toggle('final', state.phase === 'playing' && left <= 60);
  $('score').textContent = state.score;
  $('served').textContent = state.served;
  const L = levelInfo(state.level);
  $('levelTag').textContent = `${L.emoji} ${L.label}`;
  $('levelTag').dataset.level = L.id;
  audio.setBpm(L.bpm);
  audio.setRound(state.phase === 'playing', state.timeLeft);
}
// patience stages for the customer cues: 0 calm, 1 ≤60 s, 2 ≤30 s, 3 ≤10 s
export const patienceStage = (p) => (p <= 10 ? 3 : p <= 30 ? 2 : p <= 60 ? 1 : 0);
export const STAGE_COLOR = ['#00e676', '#ffea00', '#ff7a30', '#ff1744'];

// ---------- mute (🔊/🔇 button + M key, remembered) ----------
const MUTE_KEY = 'technodoner-original-muted';
function readMuted() { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } }
export function setupMute(btn) {
  const show = () => { btn.textContent = audio.muted ? '🔇' : '🔊'; btn.title = (audio.muted ? 'Unmute' : 'Mute') + ' (M)'; };
  const toggle = () => {
    audio.setMuted(!audio.muted);
    try { localStorage.setItem(MUTE_KEY, audio.muted ? '1' : '0'); } catch {}
    show(); btn.blur();
  };
  btn.onclick = toggle;
  addEventListener('keydown', (e) => { if (!e.repeat && e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey) toggle(); });
  show();
}

// ---------- audio: synthesized techno that builds ----------
// Arrangement in bars since the round started: 0–7 kick + hats, 8–15 + bass, 16+ + claps, arp and stabs. Every 64 bars
// the last 16 are a breakdown (no kick or bass, filtered pads, a riser into the drop). In the round's last 60 s there
// is no breakdown, an open hat on the offbeat and a filter sweep on the arp. Tempo = the difficulty's bpm.
const ROOTS = [55, 55, 65.41, 49]; // A A C G, one per bar
const CHORDS = [[0, 3, 7, 12], [0, 3, 7, 12], [0, 4, 7, 12], [0, 4, 7, 12]];
const ARP = [0, 2, 1, 3, 2, 1, 0, 2, 3, 1, 2, 0, 1, 3, 2, 1];
export const audio = {
  ctx: null, start: 0, bpm: 122, master: null, muted: readMuted(), songStep: 0, playing: false, timeLeft: Infinity,
  init() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    // loud without clipping: master (1.0) -> compressor -> makeup gain (1.6) -> speakers; mute closes the makeup gain
    this.master = ctx.createGain(); this.master.gain.value = 1.0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6; comp.knee.value = 8; comp.attack.value = 0.003; comp.release.value = 0.12;
    this.out = ctx.createGain(); this.out.gain.value = this.muted ? 0 : 1.6;
    this.master.connect(comp).connect(this.out).connect(ctx.destination);
    // music goes through one lowpass (the breakdown closes it); sound effects go straight to master
    this.musicLP = ctx.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 18000; this.musicLP.Q.value = 0.8;
    this.music = ctx.createGain(); this.music.gain.value = 1;
    this.music.connect(this.musicLP).connect(this.master);
    const len = ctx.sampleRate * 1;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.start = ctx.currentTime + 0.1;
    this.nextStep = 0; this.songStep = 0;
    setInterval(() => this.schedule(), 25);
  },
  beat() { return this.ctx ? Math.max(0, (this.ctx.currentTime - this.start) * this.bpm / 60) : performance.now() / 1000 * this.bpm / 60; },
  // change tempo without a jump: keep the next 16th where it is
  setBpm(bpm) {
    if (!bpm || bpm === this.bpm) return;
    if (this.ctx) { const tNext = this.start + this.nextStep * (60 / this.bpm / 4); this.start = tNext - this.nextStep * (60 / bpm / 4); }
    this.bpm = bpm;
  },
  setRound(playing, timeLeft) { this.playing = playing; this.timeLeft = timeLeft; },
  restartSong() { if (this.ctx) this.songStep = Math.ceil(this.nextStep / 16) * 16; }, // intro again from the next bar
  setMuted(m) {
    this.muted = m;
    if (this.out) this.out.gain.setTargetAtTime(m ? 0 : 1.6, this.ctx.currentTime, 0.03);
  },
  schedule() {
    const ctx = this.ctx, step = 60 / this.bpm / 4;
    while (this.start + this.nextStep * step < ctx.currentTime + 0.12) {
      const t = this.start + this.nextStep * step, n = Math.max(0, this.nextStep - this.songStep), s = n % 16, bar = Math.floor(n / 16);
      const final = this.playing && this.timeLeft <= 60;
      const inBreak = !final && bar >= 48 && bar % 64 >= 48, breakBar = bar % 64 - 48; // 0..15
      const root = ROOTS[bar % 4], chord = CHORDS[bar % 4];
      if (s === 0) this.sectionFilter(t, inBreak ? breakBar : -1, step * 16);
      if (!inBreak) {
        if (s % 4 === 0) this.kick(t);
        if (s % 4 === 2) final ? this.hat(t, 0.16, 0.22) : this.hat(t, 0.18); // open hat in the final minute
        if (s % 2 === 1 && (bar >= 4 || final)) this.hat(t, final ? 0.08 : 0.05);
        if (bar >= 8 && (s % 4 === 2 || s === 15)) this.bass(t, root);
        if (bar >= 16) {
          if (s === 4 || s === 12) this.clap(t);
          if (s % 2 === 0) this.arp(t, root * 4 * Math.pow(2, chord[ARP[s]] / 12), final ? this.sweep(n) : 1400 + 600 * Math.sin(bar * 0.4));
          if (s === 3 || s === 11 && bar % 2) this.stab(t, root * 2, chord, 0.09);
        }
        if (final && n % 128 === 112) this.riser(t, step * 16, 0.12); // a whoosh every 8 bars in the final minute
      } else {
        if (s === 0) this.pad(t, root * 2, chord, step * 16);
        if (s % 4 === 2) this.hat(t, 0.04);
        if (breakBar >= 8 && s % 2 === 0) this.arp(t, root * 4 * Math.pow(2, chord[ARP[s]] / 12), 500 + breakBar * 220);
        if (breakBar === 12 && s === 0) this.riser(t, step * 64, 0.18);
        if (breakBar >= 14) { const roll = breakBar === 15 ? 1 : 2; if (s % roll === 0) this.clap(t, 0.08 + 0.12 * (s / 16)); }
      }
      this.nextStep++;
    }
  },
  // the arp cutoff in the final minute: a sweep up over 4 bars, again and again
  sweep(n) { const k = (n % 64) / 64; return 350 + 6500 * k * k; },
  sectionFilter(t, breakBar, barLen) {
    const f = this.musicLP.frequency;
    if (breakBar < 0) { f.setTargetAtTime(18000, t, 0.05); return; }
    const from = 500 + breakBar * 250, to = 500 + (breakBar + 1) * 250; // opens slowly through the breakdown
    f.setValueAtTime(from, t); f.linearRampToValueAtTime(to, t + barLen);
  },
  // punchier: a fast pitch drop, a click on top and a little drive
  kick(t) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(), sh = ctx.createWaveShaper();
    if (!this.kickCurve) { const n = 256, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * 2.2); } this.kickCurve = c; }
    sh.curve = this.kickCurve;
    o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.06); o.frequency.exponentialRampToValueAtTime(42, t + 0.3);
    g.gain.setValueAtTime(1.4, t); g.gain.setValueAtTime(1.4, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(sh).connect(g).connect(this.music); o.start(t); o.stop(t + 0.45);
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = this.noise; f.type = 'highpass'; f.frequency.value = 2500; ng.gain.setValueAtTime(0.35, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    n.connect(f).connect(ng).connect(this.music); n.start(t, Math.random() * 0.5); n.stop(t + 0.02);
  },
  hat(t, vol, decay = 0.05) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; f.type = 'highpass'; f.frequency.value = decay > 0.1 ? 7000 : 8000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    s.connect(f).connect(g).connect(this.music); s.start(t, Math.random() * 0.5); s.stop(t + decay + 0.01);
  },
  clap(t, vol = 0.25) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 1500;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    s.connect(f).connect(g).connect(this.music); s.start(t, Math.random() * 0.5); s.stop(t + 0.2);
  },
  // punchier: a filtered saw plus a sine sub an octave down
  bass(t, freq) {
    const o = this.ctx.createOscillator(), sub = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq; sub.type = 'sine'; sub.frequency.value = freq / 2;
    f.type = 'lowpass'; f.Q.value = 4; f.frequency.setValueAtTime(1300, t); f.frequency.exponentialRampToValueAtTime(140, t + 0.18);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(f).connect(g); sub.connect(g); g.connect(this.music);
    o.start(t); o.stop(t + 0.24); sub.start(t); sub.stop(t + 0.24);
  },
  arp(t, freq, cutoff) {
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 6;
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(f).connect(g).connect(this.music); o.start(t); o.stop(t + 0.14);
  },
  stab(t, root, chord, vol) {
    const f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.2);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    f.connect(g).connect(this.music);
    for (const st of chord.slice(0, 3)) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = root * Math.pow(2, st / 12); o.detune.value = (Math.random() - 0.5) * 14;
      o.connect(f); o.start(t); o.stop(t + 0.26);
    }
  },
  pad(t, root, chord, len) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + len * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    g.connect(this.music);
    for (const st of chord.slice(0, 3)) for (const dt of [-7, 7]) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = root * Math.pow(2, st / 12); o.detune.value = dt;
      o.connect(g); o.start(t); o.stop(t + len + 0.05);
    }
  },
  riser(t, len, vol) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; s.loop = true; f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(9000, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len * 0.95); g.gain.linearRampToValueAtTime(0, t + len);
    s.connect(f).connect(g).connect(this.music); s.start(t); s.stop(t + len + 0.02);
  },
  blip(ok) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(ok ? 660 : 220, t); o.frequency.setValueAtTime(ok ? 990 : 150, t + 0.1);
    g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.3);
  },
  // soft clock tick (cashier, at each patience threshold): one tick at 60 s, two at 30 s, three at 10 s
  tick(count = 1) {
    if (!this.ctx) return;
    for (let i = 0; i < count; i++) {
      const t = this.ctx.currentTime + i * 0.16, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = 1500;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.06);
    }
  },
  // dull knock on the counter (chef, when the customer is close to leaving)
  knock() {
    if (!this.ctx) return;
    for (const dt of [0, 0.11]) {
      const t = this.ctx.currentTime + dt, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.45, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), ng = this.ctx.createGain();
      s.buffer = this.noise; f.type = 'lowpass'; f.frequency.value = 350; ng.gain.setValueAtTime(0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      o.connect(g).connect(this.master); s.connect(f).connect(ng).connect(this.master);
      o.start(t); o.stop(t + 0.2); s.start(t, Math.random() * 0.5); s.stop(t + 0.08);
    }
  },
  // short pop when a döner changes paws
  pop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(840, t + 0.08);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.13);
  },
};

// ---------- materials / helpers ----------
export const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
export const glow = (color) => new THREE.MeshBasicMaterial({ color });

export function textSprite(text, { size = 64, color = '#fff', bg = 'rgba(0,0,0,0.6)', scale = 1, depthTest = false } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d');
  x.font = `bold ${size}px system-ui, sans-serif`;
  const w = Math.ceil(x.measureText(text).width) + size;
  c.width = w; c.height = size * 1.6;
  x.font = `bold ${size}px system-ui, sans-serif`;
  x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, c.width, c.height, size * 0.4); x.fill();
  x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest, transparent: true }));
  s.scale.set((c.width / c.height) * 0.3 * scale, 0.3 * scale, 1);
  if (!depthTest) s.renderOrder = 10;
  return s;
}


// ---------- bear ----------
// Bear faces +z. Arms hang down from shoulder pivots (armP on the +x side, armN on -x), each with an elbow
// (elbowP/elbowN) so the dance poses read: upper arm, elbow, forearm, paw.
export function makeBear({ fur = '#8b5a2b', shirt = null, apron = false, hat = null } = {}) {
  const g = new THREE.Group();
  const furM = mat(fur), lightM = mat(new THREE.Color(fur).lerp(new THREE.Color('#f3e2c7'), 0.55)), darkM = mat('#111');

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), shirt ? mat(shirt) : furM);
  body.scale.set(1, 1.15, 0.85); body.position.y = 0.75; g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 14), shirt ? mat(new THREE.Color(shirt).multiplyScalar(0.8)) : lightM);
  belly.scale.set(1, 1.2, 0.5); belly.position.set(0, 0.7, 0.33); g.add(belly);
  if (apron) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.05), mat('#f5f5f5'));
    a.position.set(0, 0.6, 0.47); a.rotation.x = -0.15; g.add(a);
  }

  const head = new THREE.Group(); head.position.y = 1.55; g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), furM); head.add(skull);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), furM); ear.position.set(s * 0.3, 0.32, 0); head.add(ear);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), lightM); inner.position.set(s * 0.3, 0.32, 0.07); head.add(inner);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), darkM); eye.position.set(s * 0.15, 0.08, 0.37); head.add(eye);
  }
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), lightM); snout.scale.set(1.1, 0.8, 0.9); snout.position.set(0, -0.08, 0.36); head.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), darkM); nose.position.set(0, -0.02, 0.5); head.add(nose);
  if (hat === 'chef') {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.4, 16), mat('#fff')); h.position.y = 0.5; head.add(h);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), mat('#fff')); p.position.y = 0.75; head.add(p);
  }
  if (hat === 'cap') {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.43, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e63946')); h.position.y = 0.05; head.add(h);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.3), mat('#e63946')); b.position.set(0, 0.08, 0.45); head.add(b);
  }

  const elbows = {};
  const mkArm = (side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.52, 1.1, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.2, 6, 12), shirt ? mat(shirt) : furM); upper.position.y = -0.17; pivot.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.36; pivot.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.18, 6, 12), furM); fore.position.y = -0.14; elbow.add(fore);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), lightM); paw.position.y = -0.33; elbow.add(paw);
    elbows[side] = elbow;
    g.add(pivot); return pivot;
  };
  const armP = mkArm(1), armN = mkArm(-1);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.25, 6, 12), furM); leg.position.set(s * 0.25, 0.18, 0.05); g.add(leg);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, body, head, armP, armN, elbowP: elbows[1], elbowN: elbows[-1], belly };
}

export function resetPose(b) {
  b.armP.rotation.set(0, 0, 0.15); b.armN.rotation.set(0, 0, -0.15);
  b.elbowP.rotation.set(0, 0, 0); b.elbowN.rotation.set(0, 0, 0);
  b.head.rotation.set(0, 0, 0); b.head.position.y = 1.55; b.body.position.y = 0.75;
  b.group.rotation.set(0, 0, 0);
}

// ---------- the regulars' looks: fur, shirt, a hat and one extra, so each is recognisable ----------
export function makeRegular(R) {
  const L = R.look || {};
  const b = makeBear({ fur: L.fur || '#8b5a2b', shirt: L.shirt || null });
  const hc = L.hatColor || '#e63946', H = (geo, color, x, y, z, parent = b.head) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); parent.add(m); return m; };
  switch (L.hat) {
    case 'beanie': { H(new THREE.SphereGeometry(0.445, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), hc, 0, 0.06, 0); const f = H(new THREE.TorusGeometry(0.43, 0.06, 8, 24), hc, 0, 0.1, 0); f.rotation.x = Math.PI / 2; H(new THREE.SphereGeometry(0.1, 10, 8), '#fff', 0, 0.5, 0); break; }
    case 'bucket': H(new THREE.CylinderGeometry(0.3, 0.36, 0.3, 18), hc, 0, 0.3, 0); H(new THREE.CylinderGeometry(0.58, 0.58, 0.03, 24), hc, 0, 0.18, 0); break;
    case 'bow': for (const s of [-1, 1]) { const w = H(new THREE.ConeGeometry(0.12, 0.22, 10), hc, 0.2 + s * 0.12, 0.42, 0.05); w.rotation.z = s * Math.PI / 2; } H(new THREE.SphereGeometry(0.06, 8, 6), hc, 0.2, 0.42, 0.05); break;
    case 'cap': { H(new THREE.SphereGeometry(0.43, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hc, 0, 0.05, 0); H(new THREE.BoxGeometry(0.4, 0.03, 0.3), hc, 0, 0.08, -0.45); break; } // backwards
    case 'headphones': { const band = H(new THREE.TorusGeometry(0.46, 0.035, 8, 24, Math.PI), hc, 0, 0.02, 0); band.rotation.z = 0; for (const s of [-1, 1]) { const cup = H(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 16), hc, s * 0.44, 0.0, 0); cup.rotation.z = Math.PI / 2; } break; }
    case 'mohawk': for (let i = 0; i < 6; i++) { const sp = H(new THREE.ConeGeometry(0.06, 0.28, 6), hc, 0, 0.44 + Math.sin((i / 5) * Math.PI) * 0.06, 0.25 - i * 0.11); sp.rotation.x = -0.4 + i * 0.16; } break;
    case 'furhat': { const f = H(new THREE.CylinderGeometry(0.47, 0.45, 0.24, 20), hc, 0, 0.3, 0); f.material.roughness = 1; for (const s of [-1, 1]) H(new THREE.SphereGeometry(0.16, 10, 8), hc, s * 0.42, 0.05, 0); break; }
    case 'flatcap': { const c = H(new THREE.SphereGeometry(0.45, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), hc, 0, 0.12, 0); c.scale.y = 0.6; H(new THREE.BoxGeometry(0.42, 0.03, 0.2), hc, 0, 0.2, 0.42); break; }
  }
  switch (L.extra) {
    case 'sunglasses': { for (const s of [-1, 1]) H(new THREE.BoxGeometry(0.2, 0.12, 0.04), '#000', s * 0.15, 0.08, 0.41).material.metalness = 1; H(new THREE.BoxGeometry(0.5, 0.03, 0.03), '#000', 0, 0.11, 0.41); break; }
    case 'glitter': {
      const pts = new THREE.BufferGeometry(), arr = [];
      for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, r = 0.15 + Math.random() * 0.2; arr.push(Math.cos(a) * r, -0.05 + Math.sin(a) * 0.12, 0.36 + Math.random() * 0.06); }
      pts.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      b.glitter = new THREE.Points(pts, new THREE.PointsMaterial({ color: '#ff9cf5', size: 0.05 })); b.head.add(b.glitter); break;
    }
    case 'pearls': for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; H(new THREE.SphereGeometry(0.045, 8, 6), '#fffaf0', Math.sin(a) * 0.32, 1.22, Math.cos(a) * 0.28, b.group); } break;
    case 'chain': { const c = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 24), new THREE.MeshStandardMaterial({ color: '#ffd700', metalness: 1, roughness: 0.25, emissive: '#7a5a00' })); c.rotation.x = Math.PI / 2 - 0.35; c.position.set(0, 1.12, 0.12); b.group.add(c); break; }
    case 'earring': { const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 20), new THREE.MeshStandardMaterial({ color: '#ffd700', emissive: '#ffb300', emissiveIntensity: 0.8, metalness: 1 })); h.position.set(0.36, 0.13, 0.08); b.head.add(h); break; }
    case 'moustache': for (const s of [-1, 1]) { const m = H(new THREE.CapsuleGeometry(0.035, 0.14, 4, 8), '#1a1008', s * 0.09, -0.1, 0.49); m.rotation.z = s * 1.2; } break;
  }
  const tag = textSprite(R.name, { size: 40, color: '#111', bg: 'rgba(255,255,255,0.92)', scale: 0.6, depthTest: true }); // the name badge on the chest
  tag.position.set(0, 0.95, 0.55); b.group.add(tag);
  b.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return b;
}

// ---------- the dance language (shared with TechnoDöner · Regulars, src/poses.ts) ----------
// A pose is 15 numbers in SCREEN space as the viewer sees a bear facing them (x right, y up, z toward the viewer):
// left upper arm dir, left forearm dir, right upper arm dir, right forearm dir ("left" = the arm on the viewer's left),
// head yaw, head roll, torso lean. For a fork bear facing the viewer that is its local space: the viewer's left arm is armN.
const nrm = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const P = (uL, fL, uR, fR, yaw = 0, roll = 0, lean = 0) => [...nrm(...uL), ...nrm(...fL), ...nrm(...uR), ...nrm(...fR), yaw, roll, lean];
export const POSES = {
  I: { name: 'Rest', v: P([-0.15, -1, 0.1], [0.05, -1, 0.35], [0.15, -1, 0.1], [-0.05, -1, 0.35]) },
  U: { name: 'Arms up', v: P([-0.35, 1, 0], [-0.1, 1, 0], [0.35, 1, 0], [0.1, 1, 0]) },
  L: { name: 'Point left', v: P([-1, 0.15, 0.1], [-1, 0.2, 0], [0.15, -1, 0.1], [-0.05, -1, 0.35], -0.35) },
  R: { name: 'Point right', v: P([-0.15, -1, 0.1], [0.05, -1, 0.35], [1, 0.15, 0.1], [1, 0.2, 0], 0.35) },
  C: { name: 'Clap', v: P([-0.45, -0.55, 0.7], [0.75, 0.15, 0.6], [0.45, -0.55, 0.7], [-0.75, 0.15, 0.6]) },
  H: { name: 'Hands on head', v: P([-0.85, 0.5, 0], [0.6, 0.75, 0], [0.85, 0.5, 0], [-0.6, 0.75, 0]) },
  N: { name: 'Lean', v: P([-1, 0.05, 0], [-1, 0, 0], [1, 0.05, 0], [1, 0, 0], 0, 0.25, 0.4) },
  W: { name: 'Hurry!', v: P([-0.55, -0.25, 0.8], [0.95, 0.3, 0.15], [0.55, -0.45, 0.7], [-0.55, 0.8, 0.25]) },
  X: { name: 'Arms crossed', v: P([-0.3, -0.75, 0.6], [0.95, 0.05, 0.3], [0.3, -0.75, 0.6], [-0.95, 0.1, 0.3]) },
  // customers only: checks the watch on its paw (impatient at 60 s)
  P: { name: 'Looks at paw', v: P([-0.35, -0.7, 0.6], [0.45, 0.75, 0.5], [0.15, -1, 0.1], [-0.05, -1, 0.35], -0.45, 0.1) },
};
/** keys 1-6 in order; 7 = Hurry! (W), 0 = rest (I) */
export const POSE_KEYS = ['U', 'L', 'R', 'C', 'H', 'N'];
/** the pose a routine shows at a beat: each pose held `bpp` beats, then one rest */
export function danceAt(dance, beats, bpp = 2) {
  const len = dance.length * bpp + bpp;
  const i = Math.floor((((beats % len) + len) % len) / bpp);
  return i < dance.length ? dance[i] : 'I';
}
/** a regular's routine at a difficulty: Chill the first two poses, Normal three, Rave four */
export const danceFor = (R, len) => (len >= 4 && R.d4 ? R.d4 : R.dance.slice(0, len));

const DOWN = new THREE.Vector3(0, -1, 0), V = new THREE.Vector3(), Q = new THREE.Quaternion(), QI = new THREE.Quaternion();
/** drive a fork bear's arms, head and lean from a pose vector; k = how far to move toward it this frame */
export function applyPose(b, v, k = 1) {
  const cur = (b.cur = b.cur || POSES.I.v.slice());
  for (let i = 0; i < 15; i++) cur[i] += ((v[i] ?? 0) - cur[i]) * k;
  for (const [arm, elbow, o] of [[b.armN, b.elbowN, 0], [b.armP, b.elbowP, 6]]) {
    arm.quaternion.setFromUnitVectors(DOWN, V.set(cur[o], cur[o + 1], cur[o + 2]).normalize());
    Q.setFromUnitVectors(DOWN, V.set(cur[o + 3], cur[o + 4], cur[o + 5]).normalize());
    elbow.quaternion.copy(QI.copy(arm.quaternion).invert().multiply(Q));
  }
  b.head.rotation.y = cur[12]; b.head.rotation.z = -cur[13];
  b.group.rotation.z = cur[14];
}
/** MediaPipe Pose world landmarks (33 points, metres) -> the 15 numbers, mirrored like a selfie (src/poses.ts) */
export function poseFromWorld(w) {
  const m = (p) => [-p.x, -p.y, -p.z];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const SL = m(w[11]), EL = m(w[13]), WL = m(w[15]), SR = m(w[12]), ER = m(w[14]), WR = m(w[16]);
  const nose = m(w[0]), earL = m(w[7]), earR = m(w[8]);
  const uL = nrm(...sub(EL, SL)), fL = nrm(...sub(WL, EL)), uR = nrm(...sub(ER, SR)), fR = nrm(...sub(WR, ER));
  const mid = [(earL[0] + earR[0]) / 2, (earL[1] + earR[1]) / 2];
  const ew = Math.hypot(earR[0] - earL[0], earR[1] - earL[1]) || 0.1;
  const yaw = Math.max(-0.8, Math.min(0.8, ((nose[0] - mid[0]) / ew) * 1.6));
  const roll = Math.max(-0.6, Math.min(0.6, Math.atan2(earR[1] - earL[1], earR[0] - earL[0])));
  const lean = Math.max(-0.6, Math.min(0.6, Math.atan2(SR[1] - SL[1], SR[0] - SL[0])));
  return [...uL, ...fL, ...uR, ...fR, yaw, roll, lean];
}
export const quant = (v) => v.map((x) => Math.round(x * 100) / 100);
/** a little stick figure of a pose, as an image URL (for the pose pad, the dance bubble and the chef's book) */
const iconCache = {};
export function poseIcon(key, color = '#fff') {
  const id = key + color; if (iconCache[id]) return iconCache[id];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), v = POSES[key].v;
  x.translate(32, 34); x.scale(1.5, 1.5); x.rotate(-v[14] * 0.9);
  x.strokeStyle = x.fillStyle = color; x.lineWidth = 3.2; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(0, -6); x.lineTo(0, 12); x.lineTo(-6, 20); x.moveTo(0, 12); x.lineTo(6, 20); x.stroke();
  x.beginPath(); x.arc(v[12] * 3, -12, 5.5, 0, 7); x.fill();
  for (const [sx, o] of [[-5, 0], [5, 6]]) { const ex = sx + v[o] * 9, ey = -4 - v[o + 1] * 9, wx = ex + v[o + 3] * 8, wy = ey - v[o + 4] * 8; x.beginPath(); x.moveTo(sx, -4); x.lineTo(ex, ey); x.lineTo(wx, wy); x.stroke(); }
  return (iconCache[id] = c.toDataURL());
}

// what the chef bear does (seen by the cashier) when the chef player signals
const S = Math.sin;
export const CHEF_SIGNALS = {
  ok: (t, b) => { b.armP.rotation.set(0, 0, 2.3); b.armN.rotation.set(0, 0, -2.3); b.head.rotation.x = 0.3 * S(t * 10); },
  confused: (t, b) => { b.armP.rotation.set(0, 0, 1.2 + 0.2 * S(t * 8)); b.armN.rotation.set(0, 0, -1.2 - 0.2 * S(t * 8)); b.head.rotation.z = 0.35; },
};

// ---------- ingredients ----------
export const INGREDIENTS = [
  { id: 'bread', label: 'Bread', emoji: '🥖', color: '#d9a35b' },
  { id: 'meat', label: 'Meat', emoji: '🍖', color: '#7a3e1d' },
  { id: 'lettuce', label: 'Lettuce', emoji: '🥬', color: '#4caf50' },
  { id: 'tomato', label: 'Tomato', emoji: '🍅', color: '#e53935' },
  { id: 'onion', label: 'Onion', emoji: '🧅', color: '#c9a0dc' },
];
// how much height each ingredient adds when stacked on the plate
export const ING_HEIGHT = { bread: 0.07, meat: 0.05, lettuce: 0.035, tomato: 0.03, onion: 0.035 };
export const ING_BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
export const ingLabel = (id) => (ING_BY_ID[id] ? `${ING_BY_ID[id].emoji} ${ING_BY_ID[id].label}` : id);

export function ingredientMesh(id) {
  const c = ING_BY_ID[id].color;
  let m;
  switch (id) {
    case 'bread': { // solid pita: squashed bun, lifted so it sits on top of the plate
      m = new THREE.Group();
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), mat(c)); bun.scale.set(1.2, 0.18, 0.85); bun.position.y = 0.03; m.add(bun);
      const crust = new THREE.Mesh(new THREE.SphereGeometry(0.202, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat('#b5793a')); crust.scale.set(1.2, 0.2, 0.85); crust.position.y = 0.032; m.add(crust);
      break; }
    case 'meat': { m = new THREE.Group(); for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.08), mat(c)); p.position.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.3); p.rotation.y = Math.random() * 3; m.add(p); } break; }
    case 'lettuce': { m = new THREE.Group(); for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), mat(c)); p.scale.y = 0.4; p.position.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.3); m.add(p); } break; }
    case 'tomato': { m = new THREE.Group(); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.025, 14), mat(c)); p.position.set(-0.15 + i * 0.15, 0, (Math.random() - 0.5) * 0.2); m.add(p); } break; }
    case 'onion': { m = new THREE.Group(); for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 14), mat(c)); p.rotation.x = Math.PI / 2; p.position.set((Math.random() - 0.5) * 0.35, 0, (Math.random() - 0.5) * 0.25); m.add(p); } break; }
  }
  return m;
}


// a döner as the chef stacks it: bread at the bottom, the rest in the order added (shared by plate, sill and paws)
export function stackDoner(group, items) {
  group.clear();
  const sorted = [...items.filter((i) => i === 'bread'), ...items.filter((i) => i !== 'bread')];
  let y = 0;
  sorted.forEach((id, i) => { if (!ING_BY_ID[id]) return; const m = ingredientMesh(id); m.position.y = y; m.rotation.y = i * 0.7; group.add(m); y += ING_HEIGHT[id]; });
  return group;
}
export function makePlateMesh() { return new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.04, 28), mat('#fafafa')); }
export function disposeTree(o) {
  o.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) [].concat(x.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
}


// ---------- club decor ----------
export function makeClub(scene, { floorZ = -8, crowdCount = 18 } = {}) {
  scene.background = new THREE.Color('#05010a');
  scene.fog = new THREE.FogExp2('#0a0214', 0.045);
  scene.add(new THREE.AmbientLight('#4a2a6a', 0.6));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat('#120a18', { roughness: 0.4, metalness: 0.3 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const lights = [];
  const colors = ['#ff00aa', '#00e5ff', '#7c4dff', '#ff3d00'];
  colors.forEach((c, i) => {
    const l = new THREE.PointLight(c, 30, 25, 1.5);
    l.position.set(-6 + i * 4, 4.5, floorZ); scene.add(l); lights.push(l);
  });

  const lasers = [];
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 30), new THREE.MeshBasicMaterial({ color: i % 2 ? '#00ff9c' : '#ff0066', transparent: true, opacity: 0.7 }));
    const pivot = new THREE.Group(); pivot.position.set(-5 + i * 2, 5.5, floorZ - 6); pivot.add(l); l.position.z = 15;
    scene.add(pivot); lasers.push(pivot);
  }

  // DJ booth
  const booth = new THREE.Mesh(new THREE.BoxGeometry(3, 1.1, 1), mat('#1a1a1a')); booth.position.set(0, 0.55, floorZ - 6); scene.add(booth);
  const boothGlow = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.08, 1.05), glow('#ff00aa')); boothGlow.position.set(0, 1.1, floorZ - 6); scene.add(boothGlow);
  const dj = makeBear({ fur: '#2b2b2b', shirt: '#111' }); dj.group.position.set(0, 0, floorZ - 6.8); scene.add(dj.group);

  const crowd = [];
  const furs = ['#8b5a2b', '#5c3b1e', '#c49a6c', '#3b2a1f', '#d9d2c5', '#222'];
  const shirts = ['#111', '#111', '#39ff14', '#fff', '#ff00aa', null];
  for (let i = 0; i < crowdCount; i++) {
    const b = makeBear({ fur: furs[i % furs.length], shirt: shirts[i % shirts.length] });
    b.group.position.set((Math.random() - 0.5) * 12, 0, floorZ + (Math.random() - 0.5) * 6);
    b.group.rotation.y = Math.PI + (Math.random() - 0.5);
    b.phase = Math.random() * 6; scene.add(b.group); crowd.push(b);
  }

  return {
    update(beat, time) {
      const pulse = Math.pow(1 - (beat % 1), 3);
      lights.forEach((l, i) => { l.intensity = 8 + 40 * pulse * (Math.floor(beat) % 4 === i ? 1 : 0.3); });
      lasers.forEach((p, i) => { p.rotation.y = Math.sin(time * 0.7 + i) * 0.8; p.rotation.x = 0.3 + Math.sin(time * 0.5 + i * 2) * 0.3; });
      boothGlow.material.color.setHSL((time * 0.1) % 1, 1, 0.5);
      crowd.forEach((b) => {
        const k = Math.abs(Math.sin((beat + b.phase) * Math.PI));
        b.group.position.y = k * 0.15;
        b.armP.rotation.z = 2.4 + Math.sin(beat * Math.PI + b.phase) * 0.4;
        b.armN.rotation.z = -2.4 - Math.sin(beat * Math.PI + b.phase) * 0.4;
        b.head.rotation.x = k * 0.3;
      });
      dj.head.rotation.x = Math.abs(Math.sin(beat * Math.PI)) * 0.4;
      dj.armP.rotation.set(-1.2, 0, Math.sin(time * 3) * 0.3);
    },
  };
}


export function makeRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.setSize(innerWidth, innerHeight);
  r.shadowMap.enabled = true;
  document.body.appendChild(r.domElement);
  return r;
}
export function fitCamera(renderer, camera) {
  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  });
}


// ---------- result feedback ----------
export function whyHtml(m) {
  return `<small><b>${m.name}'s usual: ${m.order}</b><br><b>✅ Should be:</b> ${m.expected.map(ingLabel).join(', ')}<br><b>❌ You made:</b> ${m.made.map(ingLabel).join(', ') || 'nothing'}<br><br><i>click here or press Esc to close</i></small>`;
}
// fix (from the port): a failed result used to cover the whole screen with a click-catching layer for 10 s. Now only
// the explanation card takes clicks (to close it); the game stays playable underneath.
export function showFlash(f, ok) {
  f.style.opacity = 1;
  f.style.pointerEvents = 'none';
  const hide = () => { f.style.opacity = 0; const c = f.querySelector('small'); if (c) c.style.pointerEvents = 'none'; };
  const card = f.querySelector('small');
  if (card) { card.style.pointerEvents = 'auto'; card.onclick = hide; }
  f.hide = hide;
  clearTimeout(f.t); f.t = setTimeout(hide, ok ? 1500 : 7000);
}
addEventListener('keydown', (e) => { const f = document.getElementById('flash'); if (e.key === 'Escape' && f && f.hide) f.hide(); });
