// Shared bits: networking, techno audio, bear builder, gestures, club decor.
import * as THREE from 'three';

// ---------- net ----------
export function connect(onMsg) {
  const es = new EventSource('/events');
  es.onmessage = (e) => onMsg(JSON.parse(e.data));
  return es;
}
export function send(type, data = {}) {
  fetch('/action', { method: 'POST', body: JSON.stringify({ type, ...data }) });
}

// ---------- audio: synthesized 128bpm techno ----------
export const audio = {
  ctx: null, start: 0, bpm: 128, master: null,
  init() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 0.2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.start = ctx.currentTime + 0.1;
    this.nextStep = 0;
    setInterval(() => this.schedule(), 25);
  },
  beat() { return this.ctx ? Math.max(0, (this.ctx.currentTime - this.start) * this.bpm / 60) : performance.now() / 1000 * 128 / 60; },
  schedule() {
    const ctx = this.ctx, step = 60 / this.bpm / 4;
    while (this.start + this.nextStep * step < ctx.currentTime + 0.12) {
      const t = this.start + this.nextStep * step, s = this.nextStep % 16;
      if (s % 4 === 0) this.kick(t);
      if (s % 4 === 2) this.hat(t, 0.18);
      if (s % 2 === 1) this.hat(t, 0.05);
      if (s % 4 === 2 || s === 15) this.bass(t, [55, 55, 65.4, 49][Math.floor(this.nextStep / 16) % 4]);
      if (s === 4 || s === 12) this.clap(t);
      this.nextStep++;
    }
  },
  kick(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.4);
  },
  hat(t, vol) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; f.type = 'highpass'; f.frequency.value = 8000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 0.06);
  },
  clap(t) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 1500;
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 0.2);
  },
  bass(t, freq) {
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(120, t + 0.18);
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + 0.22);
  },
  blip(ok) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(ok ? 660 : 220, t); o.frequency.setValueAtTime(ok ? 990 : 150, t + 0.1);
    g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.3);
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
// Bear faces +z. Arms hang down from shoulder pivots; armP on +x side, armN on -x side.
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

  const mkArm = (side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.52, 1.1, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.45, 6, 12), furM); arm.position.y = -0.32; pivot.add(arm);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), lightM); paw.position.y = -0.62; pivot.add(paw);
    g.add(pivot); return pivot;
  };
  const armP = mkArm(1), armN = mkArm(-1);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.25, 6, 12), furM); leg.position.set(s * 0.25, 0.18, 0.05); g.add(leg);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, body, head, armP, armN, belly };
}

export function resetPose(b) {
  b.armP.rotation.set(0, 0, 0.15); b.armN.rotation.set(0, 0, -0.15);
  b.head.rotation.set(0, 0, 0); b.head.position.y = 1.55; b.body.position.y = 0.75;
  b.group.rotation.y = 0;
}

// ---------- gestures ----------
// anim(t, bear, k): t = seconds since start, k = 2π * freq helper
const S = Math.sin;
export const GESTURES = [
  { id: 'bread', key: 'Q', emoji: '🥖', label: 'Bread', hint: 'claps hands like a sandwich', anim: (t, b) => {
    b.armP.rotation.set(-1.4, 0, -0.35 + 0.35 * Math.abs(S(t * 9))); b.armN.rotation.set(-1.4, 0, 0.35 - 0.35 * Math.abs(S(t * 9))); } },
  { id: 'meat', key: 'W', emoji: '🍖', label: 'Meat', hint: 'spins around like the meat spit', anim: (t, b) => {
    b.armP.rotation.set(0, 0, 1.5); b.armN.rotation.set(0, 0, -1.5); b.group.rotation.y = t * 7; } },
  { id: 'lettuce', key: 'E', emoji: '🥬', label: 'Lettuce', hint: 'hands up, waving like leaves', anim: (t, b) => {
    b.armP.rotation.set(0, 0, 2.6 + 0.35 * S(t * 12)); b.armN.rotation.set(0, 0, -2.6 + 0.35 * S(t * 12 + 1)); } },
  { id: 'tomato', key: 'R', emoji: '🍅', label: 'Tomato', hint: 'big round circle over head, bouncing', anim: (t, b) => {
    b.armP.rotation.set(0, 0, 2.75); b.armN.rotation.set(0, 0, -2.75); b.body.position.y = 0.75 + 0.08 * Math.abs(S(t * 8)); } },
  { id: 'onion', key: 'T', emoji: '🧅', label: 'Onion', hint: 'rubs eyes, crying', anim: (t, b) => {
    b.armP.rotation.set(-2.5, 0, -0.55 + 0.15 * S(t * 14)); b.armN.rotation.set(-2.5, 0, 0.55 - 0.15 * S(t * 14)); b.head.rotation.x = 0.25; } },
  { id: 'serve', key: 'A', emoji: '🛎️', label: 'Serve!', hint: 'points sideways again and again', control: true, anim: (t, b) => {
    b.armP.rotation.set(0, 0, 1.4 + 0.25 * S(t * 12)); b.armN.rotation.set(0, 0, -0.15); b.head.rotation.y = 0.6; } },
  { id: 'trash', key: 'S', emoji: '🗑️', label: 'Start over', hint: 'throws both arms down', control: true, anim: (t, b) => {
    const k = (t * 3) % 1; b.armP.rotation.set(-2.6 + 2.3 * k, 0, 0); b.armN.rotation.set(-2.6 + 2.3 * k, 0, 0); } },
];
// what the chef bear does (seen by the cashier) when the chef player signals
export const CHEF_SIGNALS = {
  ok: (t, b) => { b.armP.rotation.set(0, 0, 2.3); b.armN.rotation.set(0, 0, -2.3); b.head.rotation.x = 0.3 * S(t * 10); },
  confused: (t, b) => { b.armP.rotation.set(0, 0, 1.2 + 0.2 * S(t * 8)); b.armN.rotation.set(0, 0, -1.2 - 0.2 * S(t * 8)); b.head.rotation.z = 0.35; },
};
export const GESTURE_BY_ID = Object.fromEntries(GESTURES.map((g) => [g.id, g]));
export const GESTURE_SECONDS = 1.8;

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
  const rules = m.applied && m.applied.length ? m.applied.map((r) => `• ${r}`).join('<br>') : '• no rules matched (just the base)';
  return `<small><b>Rules that applied:</b><br>${rules}<br><br><b>✅ Should be:</b> ${m.expected.map(ingLabel).join(', ')}<br><b>❌ You made:</b> ${m.made.map(ingLabel).join(', ') || 'nothing'}<br><br><i>click anywhere to close</i></small>`;
}
export function showFlash(f, ok) {
  f.style.opacity = 1;
  f.style.pointerEvents = ok ? 'none' : 'auto';
  const hide = () => { f.style.opacity = 0; f.style.pointerEvents = 'none'; };
  f.onclick = hide;
  clearTimeout(f.t); f.t = setTimeout(hide, ok ? 1500 : 10000);
}
