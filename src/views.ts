// @ts-nocheck
// The two seats. Each is a first-person three.js scene rendered at 480x270 and scaled up pixel-crisp, with a 2D canvas
// on top for the UI (960x540 logical). The CASHIER owns the game state (clock, regulars, score): it sees each regular
// dance at the street window, copies the dance with its body (camera) or buttons, and hands over what the chef cooks.
// The CHEF never sees a customer: it watches the cashier bear in the hatch, looks the dance up in its book of
// regulars, cooks and passes the döner through. Bots (bots.ts) can sit in either seat.
import * as THREE from 'three';
import { LI, lam, basic, M, GEO, getTex, makeItem, makeBear, makeCustomer, makeFigure, makePoliceCar, makePlacard, setPlacard, applyPose } from './kit3d';
import { rr, circ, bar, paw, drawItem, drawSignIcon, drawPoseIcon, drawFace, NAMES, ORD } from './draw2d';
import { POSES, POSE_KEYS, REGULARS, RECIPES, danceAt, quant, BEATS_PER_POSE } from './poses';
import { sfx, beat, siren, BPM } from './audio';
import { startCamera } from './camera';

export const VW = 960, VH = 540;
const LOW_W = 480, LOW_H = 270, LOWK = LOW_W / VW;

export class View {
  constructor(stage) {
    this.headless = stage.id === 'botstage';
    Object.assign(this, { mx: -99, my: -99, hits: [], hover: null, holdId: null, pops: [], sawSign: 0, pSign: null, pSignT: 0, mySign: null, mySignT: 0, signId: 0, picks: [], pickMap: {}, lit: null });
    this.vp = this.viewport();
    if (this.headless) return;
    const wrap = (this.wrap = document.createElement('div')); wrap.className = 'view'; stage.appendChild(wrap);
    this.renderer = new THREE.WebGLRenderer({ antialias: false }); this.renderer.setPixelRatio(1); this.renderer.setSize(LOW_W, LOW_H, false); this.renderer.domElement.className = 'gl'; wrap.appendChild(this.renderer.domElement);
    this.cv = document.createElement('canvas'); this.cv.className = 'ui'; wrap.appendChild(this.cv); this.c = this.cv.getContext('2d');
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(52, this.vp.w / VH, 0.05, 60); this.scene.add(this.camera); this.ray = new THREE.Raycaster();
    const pos = (e) => { const r = this.cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * VW, ((e.clientY - r.top) / r.height) * VH]; };
    this.cv.addEventListener('pointermove', (e) => { [this.mx, this.my] = pos(e); });
    this.cv.addEventListener('pointerleave', () => { this.mx = this.my = -99; this.holdId = null; });
    this.cv.addEventListener('pointerdown', (e) => { [this.mx, this.my] = pos(e); this.cv.setPointerCapture(e.pointerId); const h = this.hitAt(this.mx, this.my); if (!h) return; if (h.hold) this.holdId = h.id; else this.click(h.id); });
    addEventListener('pointerup', () => { this.holdId = null; });
    this.build(); this.resize();
  }
  viewport() { return { x: 0, w: VW }; }
  destroy() { if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss?.(); } }
  resize() { if (this.headless) return; const d = Math.min(2, devicePixelRatio || 1); const r = this.cv.getBoundingClientRect(); if (r.width < 10) return; this.cv.width = Math.round(r.width * d); this.cv.height = Math.round(r.height * d); }
  pickable(id, obj) { obj.traverse((o) => { o.userData.pid = id; }); this.picks.push(obj); this.pickMap[id] = this.pickMap[id] || obj; return obj; }
  hitAt(x, y) {
    for (let i = this.hits.length - 1; i >= 0; i--) { const h = this.hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; }
    if (this.headless || x < this.vp.x || y < 0 || y > 470) return null;
    this.scene.updateMatrixWorld(); this.ray.setFromCamera({ x: ((x - this.vp.x) / this.vp.w) * 2 - 1, y: -(y / VH) * 2 + 1 }, this.camera);
    const hit = this.ray.intersectObjects(this.picks, true)[0]; if (!hit) return null;
    let o = hit.object; while (o && o.userData.pid === undefined) o = o.parent; if (!o) return null;
    return { id: o.userData.pid, hold: this.isHold(o.userData.pid) };
  }
  isHold(id) { return false; }
  relevant(id) { return true; }
  hit(id, x, y, w, h, hold?) { this.hits.push({ id, x, y, w, h, hold }); }
  proj(x, y, z) { const v = new THREE.Vector3(x, y, z).project(this.camera); return [this.vp.x + ((v.x + 1) / 2) * this.vp.w, ((1 - v.y) / 2) * VH]; }
  highlight() {
    const id = this.hover && this.pickMap[this.hover] && this.relevant(this.hover) ? this.hover : null; if (id === this.lit) return;
    const set = (oid, on) => { for (const o of this.picks) if (o.userData.pid === oid) o.traverse((m) => { if (m.material && m.material.emissive) m.material.emissive.setHex(on ? 0x6a5400 : 0); }); };
    if (this.lit) set(this.lit, false); if (id) set(id, true); this.lit = id;
  }
  pop(x, y, txt, col) { this.pops.push({ x, y, txt, col, t: 0 }); }
  sign(k) { this.signId++; this.mySign = k; this.mySignT = 1.6; sfx('sign'); }
  readPartnerSign(P) { if (P && P.sg && P.sg[0] !== this.sawSign) { this.sawSign = P.sg[0]; if (P.sg[1]) { this.pSign = P.sg[1]; this.pSignT = 2.2; sfx('seen'); } } }
  render3d() {
    const r = this.renderer; r.setScissorTest(true);
    r.setViewport(0, 0, LOW_W, LOW_H); r.setScissor(0, 0, LOW_W, LOW_H); r.setClearColor(0x120a18); r.clear();
    const x = Math.round(this.vp.x * LOWK), w = Math.round(this.vp.w * LOWK);
    r.setViewport(x, 0, w, LOW_H); r.setScissor(x, 0, w, LOW_H); r.render(this.scene, this.camera);
    this.extra3d?.(); r.setScissorTest(false);
  }
  begin() { const c = this.c; c.setTransform(this.cv.width / VW, 0, 0, this.cv.height / VH, 0, 0); c.clearRect(0, 0, VW, VH); this.hover = (this.hitAt(this.mx, this.my) || {}).id || null; this.hits = []; this.highlight(); }
  finish(dt) {
    const c = this.c;
    this.pops.forEach((p) => { p.t += dt; c.globalAlpha = Math.max(0, 1 - p.t / 1.4); c.fillStyle = p.col; c.font = '26px Bungee, sans-serif'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = '#000a'; c.strokeText(p.txt, p.x, p.y - p.t * 40); c.fillText(p.txt, p.x, p.y - p.t * 40); c.globalAlpha = 1; });
    this.pops = this.pops.filter((p) => p.t < 1.4);
    if (this.mx > -50) paw(c, this.mx + 6, this.my + 10, 12, this.kind ? '#efe6d2' : '#8b5a33', -0.4);
  }
  label(x, y, z, txt, col = '#fff', size = 11) { const [sx, sy] = this.proj(x, y, z); const c = this.c; c.font = size + 'px Bungee, sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = '#000c'; c.strokeText(txt, sx, sy); c.fillStyle = col; c.fillText(txt, sx, sy); }
  button(id, x, y, w, h, on = false) { const c = this.c; this.hit(id, x, y, w, h); c.fillStyle = on ? '#6a4a1a' : this.hover === id ? '#4a3660' : '#2b1f38'; rr(c, x, y, w, h, 12); c.fill(); c.strokeStyle = on ? '#ffcf5a' : '#ffffff22'; c.lineWidth = 2; c.stroke(); }
  hud(t, sc, x = VW - 16, y = 34) { const c = this.c; c.textAlign = 'right'; c.font = '30px Bungee, sans-serif'; c.lineWidth = 5; c.strokeStyle = '#000c'; const s = Math.max(0, Math.ceil(t)); const ts = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; c.strokeText(ts, x, y); c.fillStyle = '#ffcf5a'; c.fillText(ts, x, y); c.font = '22px Bungee, sans-serif'; c.strokeText(`€${sc}`, x, y + 28); c.fillStyle = '#fff'; c.fillText(`€${sc}`, x, y + 28); }
  holder(x, y, z, s) { const h = new THREE.Group(); h.position.set(x, y, z); h.scale.setScalar(s); h.userData.code = null; this.scene.add(h); return h; }
  setItem(holder, code) { if (holder.userData.code === code) return; holder.userData.code = code; while (holder.children.length) holder.remove(holder.children[0]); if (code) holder.add(makeItem(code)); }
}

// ======================= CASHIER (Bärbel, the newbie at the window) =======================
const ACTIVE = [0, 1.42, -0.8], QPOS = [[-1.05, 1.32, -1.9], [0.95, 1.3, -2.7]];
export class Cashier extends View {
  constructor(stage, ep) {
    super(stage); this.kind = 1; this.ep = ep;
    Object.assign(this, { ph: 'wait', t: 180, sc: 0, sv: 0, lost: 0, queue: [], held: null, took: 0, rid: 0, clock: 0, cid: 0, spawnT: 2, lastSend: 0, poseKey: 'I', cam: null, camMsg: '', recent: [], policeT: 25, police: -1 });
    this.sent = POSES.I.v.slice(); this.models = new Map();
  }
  build() {
    const s = this.scene, cam = this.camera; s.background = new THREE.Color(0x0a0812); s.fog = new THREE.Fog(0x0d0a16, 4, 17);
    cam.position.set(0, 1.76, 2.15); cam.lookAt(0, 1.42, -1);
    s.add(new THREE.HemisphereLight(0xb8c0ff, 0x201018, 0.55 * LI)); const d = new THREE.DirectionalLight(0xfff0dd, 0.5 * LI); d.position.set(0.5, 3, 3); s.add(d);
    const lamp = new THREE.PointLight(0xffb060, 2.2 * LI, 9, 0); lamp.position.set(-2.6, 3.1, -2.4); s.add(lamp);
    const g = M(new THREE.PlaneGeometry(40, 40), lam(0xffffff, { map: getTex('asphalt') }), 0, 0, -8); g.rotation.x = -Math.PI / 2; s.add(g);
    s.add(M(GEO.box(14, 0.12, 2), lam(0x4a4652), 0, 0.06, -1.6));
    // the club across the street
    s.add(M(GEO.box(16, 7, 1), lam(0xffffff, { map: getTex('concrete') }), 0, 3.5, -8.5));
    s.add(M(GEO.box(1.5, 2.3, 0.1), basic(0x2a0606), 1.6, 1.15, -7.95));
    this.clubSign = M(new THREE.PlaneGeometry(2.4, 0.6), basic(0xffffff, { map: getTex('sign:club'), transparent: true, blending: THREE.AdditiveBlending, fog: false }), 1.6, 2.75, -7.9); s.add(this.clubSign);
    this.door = new THREE.PointLight(0xff3060, 2 * LI, 6, 0); this.door.position.set(1.6, 1.6, -7.2); s.add(this.door);
    this.clubbers = []; for (let i = 0; i < 11; i++) { const f = makeFigure(new THREE.Color().setHSL(0.72 + Math.random() * 0.2, 0.45, 0.2 + Math.random() * 0.12)); f.position.set(-5.5 + i * 0.6, 0, -7.2 + (i % 2) * 0.3); f.userData.ph = Math.random() * 6; s.add(f); this.clubbers.push(f); }
    s.add(M(GEO.cyl(0.05, 0.06, 3.2, 6), lam(0x333338), -2.6, 1.6, -2.4)); s.add(M(GEO.sph(0.16, 6), basic(0xffd890), -2.6, 3.2, -2.4));
    this.car = makePoliceCar(); this.car.position.set(-20, 0, -4.4); s.add(this.car);
    // the kiosk window
    const wall = lam(0x2a1a2e), z = -0.32;
    s.add(M(GEO.box(4.4, 0.9, 0.12), wall, 0, 2.75, z)); s.add(M(GEO.box(0.6, 3.2, 0.12), wall, -2.0, 1.6, z));
    s.add(M(GEO.box(0.8, 1.12, 0.12), wall, 1.55, 0.56, z)); s.add(M(GEO.box(0.8, 1.05, 0.12), wall, 1.55, 2.2, z)); s.add(M(GEO.box(0.08, 0.6, 0.12), wall, 1.19, 1.4, z)); s.add(M(GEO.box(0.08, 0.6, 0.12), wall, 1.91, 1.4, z));
    this.neon = M(new THREE.PlaneGeometry(1.4, 0.35), basic(0xffffff, { map: getTex('sign:doner'), transparent: true, blending: THREE.AdditiveBlending, fog: false }), -0.3, 2.62, z + 0.07); s.add(this.neon);
    // the kitchen nook behind the hatch, with Bruno
    s.add(M(new THREE.PlaneGeometry(1, 1.4), lam(0xffffff, { map: getTex('tiles') }), 1.55, 1.4, -1.25)); const kl = new THREE.PointLight(0xffd9a0, 1.2 * LI, 2.5, 0); kl.position.set(1.55, 1.9, -0.7); s.add(kl);
    this.bru = makeBear(0); this.bru.scale.setScalar(0.52); this.bru.position.set(1.55, 0.84, -0.9); s.add(this.bru);
    this.bruPlac = makePlacard(); this.bruPlac.scale.setScalar(0.75); this.bruPlac.position.set(1.3, 1.55, -0.85); this.bruPlac.visible = false; s.add(this.bruPlac);
    s.add(M(GEO.box(4.2, 1.0, 0.85), lam(0x7d8796, { map: getTex('steel') }), 0, 0.5, 0.2)); s.add(M(GEO.box(4.22, 0.05, 0.87), lam(0x6f7886), 0, 1.005, 0.2));
    const tray = M(GEO.box(0.6, 0.035, 0.38), lam(0xd6dbe2), 1.55, 1.03, 0.05); s.add(tray); this.pickable('tray', tray); this.trayItem = this.holder(1.55, 1.05, 0.05, 1.7); this.pickable('tray', this.trayItem);
    const hb = M(GEO.box(0.9, 1.3, 0.5), basic(0, { visible: false }), ACTIVE[0], ACTIVE[1] - 0.2, ACTIVE[2]); s.add(hb); this.pickable('cu', hb);
    // what you hold sits in your paw
    const hand = new THREE.Group(); hand.position.set(0.34, -0.3, -0.75); cam.add(hand); hand.add(M(GEO.sph(0.09, 7), lam(0xefe6d2), 0, -0.02, 0));
    this.handItem = new THREE.Group(); this.handItem.position.set(-0.02, 0.04, 0); this.handItem.scale.setScalar(1.3); this.handItem.userData.code = null; hand.add(this.handItem);
    // self view: the bear Bruno sees in his hatch, driven by your pose
    this.self = new THREE.Scene(); this.self.background = new THREE.Color(0x1d1030); this.self.add(new THREE.HemisphereLight(0xffffff, 0x302040, 0.9 * LI));
    const sl = new THREE.DirectionalLight(0xffe0ff, 0.6 * LI); sl.position.set(1, 2, 3); this.self.add(sl);
    this.me = makeBear(1); this.self.add(this.me); this.selfCam = new THREE.PerspectiveCamera(40, 200 / 150, 0.1, 20); this.selfCam.position.set(0, 0.95, 2.6); this.selfCam.lookAt(0, 0.8, 0);
  }
  extra3d() { const r = this.renderer; const x = Math.round(8 * LOWK), w = Math.round(200 * LOWK), h = Math.round(150 * LOWK), y = Math.round((VH - 462) * LOWK); r.setViewport(x, y, w, h); r.setScissor(x, y, w, h); r.render(this.self, this.selfCam); }
  relevant(id) { if (id === 'tray') return !!this.tray && !this.held; if (id === 'cu') return !!(this.held && this.queue[0]); return true; }
  start() { this.rid++; Object.assign(this, { ph: 'play', t: 180, sc: 0, sv: 0, lost: 0, queue: [], held: null, spawnT: 1, cid: 0, pops: [] }); }
  spawn() {
    if (this.queue.length >= 3) return;
    let r; do { r = Math.floor(Math.random() * REGULARS.length); } while (this.recent.includes(r) || this.queue.some((q) => q.reg === r));
    this.recent = [r, ...this.recent].slice(0, 3);
    this.queue.push({ id: ++this.cid, reg: r, pat: 95, max: 95, flash: 0 }); sfx('newc');
  }
  setPose(k, quiet = false) { if (this.poseKey !== k && !quiet) sfx('pose'); this.poseKey = k; }
  async toggleCamera() {
    if (this.cam) { this.cam.stop(); this.cam.video.remove(); this.cam = null; this.camMsg = ''; return; }
    try {
      this.cam = await startCamera((s) => { this.camMsg = s; });
      const v = this.cam.video; v.className = 'camthumb'; this.wrap?.appendChild(v);
    } catch (e) { this.cam = null; this.camMsg = (e && e.name === 'NotAllowedError') ? 'Camera blocked. Use keys 1–6 instead.' : 'No camera here. Use keys 1–6 instead.'; }
  }
  click(id) {
    if (id.startsWith('pz')) { this.setPose(id.slice(2)); return; }
    if (id === 'cam') { this.toggleCamera(); return; }
    if (this.ph !== 'play') return;
    if (id === 'tray' && !this.held && this.tray) { this.held = this.tray[1]; this.took = this.tray[0]; sfx('pick'); return; }
    if (id === 'cu' && this.held) this.serve();
  }
  serve() {
    const cu = this.queue[0]; if (!cu || !this.held) return; const want = RECIPES[REGULARS[cu.reg].rec][1]; const [x, y] = this.at(ACTIVE[0], ACTIVE[1] + 0.3, ACTIVE[2]);
    if (this.held.slice(1) === want) { const tip = Math.round((4 * cu.pat) / cu.max); this.sc += 8 + tip; this.sv++; this.queue.shift(); this.held = null; this.pop(x, y, `+€${8 + tip}`, '#7dff9a'); sfx('serve'); this.spawnT = Math.min(this.spawnT, 2.5); }
    else { this.sc -= 3; this.held = null; cu.flash = 0.6; this.pop(x, y, 'Falsch! −€3', '#ff6060'); sfx('bad'); }
  }
  at(x, y, z) { return this.headless ? [480, 200] : this.proj(x, y, z); }
  update(dt) {
    const P = this.ep.partner(); this.clock += dt; this.readPartnerSign(P); this.pSignT -= dt; this.mySignT -= dt;
    this.tray = P && P.pass && P.pass[0] > this.took ? P.pass : null;
    if (this.ph === 'play') {
      this.t -= dt; if (this.t <= 0) { this.t = 0; this.ph = 'end'; sfx('bell'); }
      this.spawnT -= dt; if (this.spawnT <= 0) { this.spawn(); this.spawnT = 16 + Math.random() * 6; }
      this.queue.forEach((cu, i) => { cu.pat -= dt * (i === 0 ? 1 : 0.35); cu.flash = Math.max(0, cu.flash - dt); });
      const gone = this.queue.findIndex((cu) => cu.pat <= 0);
      if (gone >= 0) { this.queue.splice(gone, 1); this.sc -= 5; this.lost++; const [x, y] = this.at(0, 1.8, -0.8); this.pop(x, y, '−€5', '#ff6060'); sfx('bad'); }
    }
    const target = (this.cam && this.cam.latest()) || POSES[this.poseKey].v;
    const k = Math.min(1, dt * 14); for (let i = 0; i < 15; i++) this.sent[i] += (target[i] - this.sent[i]) * k;
    this.policeT -= dt; if (this.policeT <= 0) { this.policeT = 35 + Math.random() * 25; this.police = 0; if (!this.headless) siren(4); }
    if (this.police >= 0) { this.police += dt; if (this.police > 6) this.police = -1; }
    const now = performance.now();
    if (now - this.lastSend > 50) { this.lastSend = now; this.ep.set({ bb: 1, role: 'cashier', ph: this.ph, t: Math.round(this.t * 10) / 10, sc: this.sc, sv: this.sv, lost: this.lost, rid: this.rid, took: this.took, pose: quant(this.sent), sg: [this.signId, this.mySign || ''] }); }
  }
  render(dt) {
    const T = this.clock, b = beat(), pulse = 1 - b.ph, beats = b.n;
    this.door.intensity = (0.6 + 2.2 * pulse) * LI; this.clubSign.material.opacity = 0.7 + 0.3 * pulse; this.neon.material.opacity = 0.8 + 0.2 * pulse;
    this.clubbers.forEach((f) => { f.position.y = Math.abs(Math.sin((T * Math.PI * BPM) / 60 + f.userData.ph)) * 0.1; });
    if (this.police >= 0) { this.car.position.x = -14 + this.police * 5; const on = Math.floor(T * 8) % 2; this.car.userData.light.intensity = on ? 3 * LI : 0; this.car.userData.bl.material.color.setHex(on ? 0x5080ff : 0x10204a); } else this.car.position.x = -30;
    // regulars
    const ids = new Set(this.queue.map((q) => q.id));
    for (const [id, m] of this.models) if (!ids.has(id)) { this.scene.remove(m); this.models.delete(id); }
    this.queue.forEach((cu, i) => {
      let m = this.models.get(cu.id);
      if (!m) { m = makeCustomer(REGULARS[cu.reg].seed); m.position.set(-4, 1.3, -2.4); this.scene.add(m); this.models.set(cu.id, m); }
      const p = i === 0 ? ACTIVE : QPOS[i - 1]; m.position.x += (p[0] - m.position.x) * Math.min(1, dt * 3); m.position.z += (p[2] - m.position.z) * Math.min(1, dt * 3);
      const pose = i === 0 && Math.hypot(m.position.x - p[0], m.position.z - p[2]) < 0.2 ? danceAt(REGULARS[cu.reg].dance, beats) : 'I';
      applyPose(m.userData.rig, POSES[pose].v, Math.min(1, dt * 12));
      m.position.y = p[1] + Math.abs(Math.sin((T * Math.PI * BPM) / 60 + i)) * 0.03; m.rotation.y = i === 0 ? 0 : Math.sin(T * 0.6 + i) * 0.3;
      m.userData.mats.forEach((mt) => mt.emissive.setRGB(cu.flash, 0, 0));
    });
    if (this.lit === 'cu' && this.queue[0]) this.models.get(this.queue[0].id)?.userData.mats.forEach((mt) => mt.emissive.setHex(0x6a5400));
    this.setItem(this.trayItem, this.tray ? this.tray[1] : null);
    if (this.handItem.userData.code !== this.held) { this.handItem.userData.code = this.held; while (this.handItem.children.length) this.handItem.remove(this.handItem.children[0]); if (this.held) this.handItem.add(makeItem(this.held)); }
    this.bru.userData.rig.head.rotation.y = Math.sin(T * 0.8) * 0.2; this.bruPlac.visible = this.pSignT > 0; if (this.pSignT > 0) setPlacard(this.bruPlac, this.pSign);
    applyPose(this.me.userData.rig, this.sent, 1);
    this.render3d();
    // ---- UI ----
    const c = this.c; this.begin();
    const cu = this.queue[0];
    if (cu) {
      const R = REGULARS[cu.reg]; const [x, y0] = this.at(ACTIVE[0], ACTIVE[1] + 0.62, ACTIVE[2]); const y = y0 - 70, bw = 190, bx = x - bw / 2;
      c.fillStyle = '#fff'; rr(c, bx, y, bw, 70, 14); c.fill(); c.beginPath(); c.moveTo(x - 10, y + 70); c.lineTo(x + 2, y + 84); c.lineTo(x + 12, y + 70); c.fill();
      c.fillStyle = '#2a1a14'; c.font = '13px Bungee, sans-serif'; c.textAlign = 'center'; c.fillText(R.name, x, y + 17);
      const len = (R.dance.length + 1) * BEATS_PER_POSE, si = Math.floor((((beats % len) + len) % len) / BEATS_PER_POSE);
      [...R.dance].forEach((k, j) => { const px = bx + 40 + j * 55, on = si === j; if (on) { c.fillStyle = '#ffe14a'; rr(c, px - 22, y + 22, 44, 44, 8); c.fill(); } drawPoseIcon(c, k, px, y + 44, 0.85, '#2a1a14'); });
      const f = cu.pat / cu.max; bar(c, bx + 8, y - 12, bw - 16, 7, f, f > 0.5 ? '#3fbf5f' : f > 0.25 ? '#f0b030' : '#e04040');
    }
    if (this.queue.length > 1) this.label(0, 2.25, -2.4, `${this.queue.length - 1} waiting`, '#bba9c8', 10);
    if (this.tray) this.label(1.55, 1.32, 0.05, 'DÖNER!', '#7dff9a', 13);
    if (this.held && cu) this.label(ACTIVE[0], 0.98, ACTIVE[2] + 0.5, 'TAP THE REGULAR TO SERVE', '#7dff9a', 11);
    this.hud(this.t, this.sc, VW - 16, 40);
    // self view frame
    c.strokeStyle = '#ffcf5a'; c.lineWidth = 3; rr(c, 8, 312, 200, 150, 8); c.stroke(); c.fillStyle = '#000b'; rr(c, 8, 292, 200, 22, 6); c.fill(); c.fillStyle = '#ffcf5a'; c.font = '10px Bungee, sans-serif'; c.textAlign = 'center'; c.fillText('WHAT BRUNO SEES', 108, 307);
    if (this.camMsg) { c.fillStyle = '#000c'; rr(c, 220, 400, 520, 30, 8); c.fill(); c.fillStyle = '#fff'; c.font = '13px Archivo, sans-serif'; c.fillText(this.camMsg, 480, 420); }
    c.fillStyle = '#120a18'; c.fillRect(0, 470, VW, 70);
    POSE_KEYS.forEach((k, i) => { const x = 12 + i * 70; this.button('pz' + k, x, 476, 64, 58, !this.cam && this.poseKey === k); drawPoseIcon(c, k, x + 32, 498, 0.8); c.fillStyle = '#bba9c8'; c.font = '10px Archivo, sans-serif'; c.textAlign = 'center'; c.fillText(`${i + 1} ${POSES[k].name}`, x + 32, 530); });
    this.button('pzI', 12 + 6 * 70, 476, 64, 58, !this.cam && this.poseKey === 'I'); drawPoseIcon(c, 'I', 12 + 6 * 70 + 32, 498, 0.8); c.fillStyle = '#bba9c8'; c.font = '10px Archivo, sans-serif'; c.fillText('0 Rest', 12 + 6 * 70 + 32, 530);
    this.button('cam', 520, 476, 150, 58, !!this.cam); c.fillStyle = '#fff'; c.font = '13px Bungee, sans-serif'; c.fillText(this.cam ? 'CAMERA ON' : 'USE CAMERA', 595, 503); c.fillStyle = '#bba9c8'; c.font = '10px Archivo, sans-serif'; c.fillText(this.cam ? 'dance with your arms' : 'copy with your body', 595, 520);
    c.textAlign = 'left'; c.fillStyle = '#bba9c8'; c.font = '12px Archivo, sans-serif'; c.fillText('Copy the regular\'s dance.', 690, 496); c.fillText('Bruno reads it and cooks.', 690, 514);
    if (this.ph === 'play' && this.sv === 0 && this.t > 165) { c.textAlign = 'center'; c.fillStyle = '#000c'; rr(c, 230, 220, 500, 64, 12); c.fill(); c.fillStyle = '#fff'; c.font = '15px Archivo, sans-serif'; c.fillText('You can\'t hear a thing. Copy each regular\'s dance (camera or 1–6).', 480, 245); c.fillText('Bruno knows what they always order. Serve what he passes you.', 480, 268); }
    this.finish(dt);
  }
}

// ======================= CHEF (Bruno, the OG with the book) =======================
const HX = 0.15;
export class Chef extends View {
  viewport() { return { x: 250, w: 710 }; }
  constructor(stage, ep) { super(stage); this.kind = 0; this.ep = ep; Object.assign(this, { plate: null, board: null, boardP: 0, shave: 0, pass: null, passId: 0, rid: -1, clock: 0, lastSend: 0, flashT: 0 }); }
  build() {
    const s = this.scene, cam = this.camera; s.background = new THREE.Color(0x0b1416); s.fog = new THREE.Fog(0x0b1416, 4, 12);
    cam.fov = 56; cam.updateProjectionMatrix(); cam.position.set(HX, 1.85, 1.9); cam.lookAt(HX, 1.22, -0.8);
    s.add(new THREE.HemisphereLight(0xfff0d8, 0x332018, 0.7 * LI)); const kl = new THREE.PointLight(0xffe0b0, 1.1 * LI, 6, 0); kl.position.set(0, 2.5, 0.6); s.add(kl);
    // back wall with the hatch (x -0.4..0.7, y 1.2..2.15)
    const tm = lam(0xffffff, { map: getTex('tiles') }), z = -1.0;
    s.add(M(GEO.box(2.6, 3.2, 0.1), tm, -1.7, 1.6, z)); s.add(M(GEO.box(2.6, 3.2, 0.1), tm, 2.0, 1.6, z)); s.add(M(GEO.box(1.1, 1.2, 0.1), tm, HX, 0.6, z)); s.add(M(GEO.box(1.1, 1.05, 0.1), tm, HX, 2.68, z));
    // the street side: Bärbel at the window, lit by the club and the odd police car
    s.add(M(GEO.box(3, 3, 0.1), lam(0x1a0c2a), HX, 1.5, -2.9));
    this.cl = new THREE.PointLight(0xff4fa8, 1.4 * LI, 3.5, 0); this.cl.position.set(HX - 0.4, 2.2, -1.4); s.add(this.cl);
    this.blue = new THREE.PointLight(0x3a6aff, 0, 4, 0); this.blue.position.set(HX + 0.6, 2.0, -2.2); s.add(this.blue);
    const front = new THREE.DirectionalLight(0xffffff, 0.55 * LI); front.position.set(HX, 2, 1); front.target.position.set(HX, 1.3, -1.8); s.add(front, front.target);
    this.baer = makeBear(1); this.baer.scale.setScalar(0.74); this.baer.position.set(HX, 0.82, -1.8); s.add(this.baer);
    this.dark = M(new THREE.PlaneGeometry(1.1, 0.95), basic(0x05000a, { transparent: true, opacity: 0, fog: false }), HX, 1.675, -1.06); s.add(this.dark);
    // counter
    s.add(M(GEO.box(4.4, 0.95, 1.15), lam(0xffffff, { map: getTex('wood') }), 0, 0.475, -0.4)); s.add(M(GEO.box(4.42, 0.04, 1.17), lam(0xd8a06a), 0, 0.96, -0.4));
    const sp = new THREE.Group(); sp.position.set(1.35, 0, -0.62); sp.add(M(GEO.cyl(0.016, 0.016, 1.3, 5), lam(0xcccccc), 0, 1.55, 0)); this.meat = M(GEO.cyl(0.24, 0.14, 0.75, 8), lam(0x8a4b2a), 0, 1.42, 0); sp.add(this.meat);
    for (let k = 0; k < 3; k++) this.meat.add(M(GEO.cyl(0.242 - k * 0.04, 0.22 - k * 0.04, 0.04, 8), lam(0xb86a3c), 0, 0.3 - k * 0.25, 0));
    s.add(sp); this.pickable('spit', sp); this.heat = M(GEO.box(0.5, 0.8, 0.05), basic(0xff6a1a), 1.35, 1.42, -0.93); s.add(this.heat);
    const br = new THREE.Group(); br.position.set(-1.3, 0.98, -0.5); br.add(M(GEO.box(0.46, 0.12, 0.32), lam(0x9a6638), 0, 0.06, 0)); for (let k = 0; k < 3; k++) { const p = makeItem('D'); p.scale.setScalar(1.3); p.position.set(-0.12 + k * 0.12, 0.1 + k * 0.015, 0); br.add(p); } s.add(br); this.pickable('bread', br);
    [['L', -0.88], ['T', -0.58], ['O', -0.28]].forEach(([k, x]) => { const g = new THREE.Group(); g.position.set(x, 0.98, -0.62); g.add(M(GEO.box(0.27, 0.1, 0.24), lam(0xdde1e6), 0, 0.05, 0)); [-0.06, 0.06].forEach((dx) => { const it = makeItem(k); it.scale.setScalar(1.05); it.position.set(dx, 0.06, 0); g.add(it); }); s.add(g); this.pickable(k, g); });
    [['g', 0.62], ['h', 0.82]].forEach(([k, x]) => { const it = makeItem(k); it.scale.setScalar(1.6); it.position.set(x, 0.98, -0.6); s.add(it); this.pickable(k, it); });
    const bd = M(GEO.box(0.62, 0.035, 0.34), lam(0xe2b07a), -0.5, 0.995, -0.08); s.add(bd); this.boardItem = this.holder(-0.5, 1.015, -0.08, 1.9); this.pickable('board', bd); this.pickable('board', this.boardItem);
    const pl = M(GEO.cyl(0.21, 0.19, 0.03, 12), lam(0xf4f1ea), 0.42, 0.995, -0.06); s.add(pl); this.plateItem = this.holder(0.42, 1.012, -0.06, 2.0); this.pickable('plate', pl); this.pickable('plate', this.plateItem);
    const tr = new THREE.Group(); tr.position.set(1.5, 0.98, 0.08); tr.add(M(GEO.cyl(0.15, 0.13, 0.34, 8), lam(0x2b2b2b), 0, 0.17, 0)); tr.add(M(GEO.cyl(0.155, 0.155, 0.03, 8), lam(0x555555), 0, 0.34, 0)); s.add(tr); this.pickable('trash', tr);
    const sh = M(GEO.box(1.15, 0.04, 0.3), lam(0xd6dbe2), HX, 1.2, -0.88); s.add(sh); this.passItem = this.holder(HX, 1.22, -0.88, 1.6); this.pickable('hatch', sh); this.pickable('hatch', this.passItem);
    const my = makePlacard(); my.position.set(-0.22, -0.16, -0.85); my.scale.setScalar(0.3); my.visible = false; cam.add(my); this.myPlac = my;
  }
  isHold(id) { return id === 'spit' || (id === 'board' && !!this.board && this.board === this.board.toUpperCase()); }
  relevant(id) { if (id === 'board') return !!this.board; if (id === 'plate' || id === 'hatch') return !!this.plate && !this.pass; if (id === 'trash') return !!(this.plate || this.board); if (id === 'g' || id === 'h') return !!this.plate; return true; }
  reset() { Object.assign(this, { plate: null, board: null, boardP: 0, shave: 0, pass: null, pops: [] }); }
  scr(x, y, z) { return this.headless ? [480, 300] : this.proj(x, y, z); }
  addToPlate(ch) { const k = this.plate.slice(1) + ch; this.plate = 'D' + ORD.split('').filter((q) => k.includes(q)).join(''); }
  click(id) {
    if (id.startsWith('sg')) { this.sign(id.slice(2)); return; }
    const P = this.P; if (!P || P.ph !== 'play') return;
    if (id === 'bread') { if (!this.plate) { this.plate = 'D'; sfx('place'); } else { const [x, y] = this.scr(0.42, 1.2, -0.06); this.pop(x, y, 'Plate full', '#ffcf5a'); } return; }
    if ('LTO'.includes(id) && id.length === 1) { this.board = id; this.boardP = 0; sfx('pick'); return; }
    if (id === 'g' || id === 'h') { const [x, y] = this.scr(0.42, 1.2, -0.06); if (!this.plate) { this.pop(x, y, 'Bread first!', '#ffcf5a'); return; } if (!this.plate.includes(id)) { this.addToPlate(id); sfx('pick'); } return; }
    if (id === 'board' && this.board && this.board === this.board.toLowerCase()) {
      const [x, y] = this.scr(-0.5, 1.2, -0.08); if (!this.plate) { this.pop(x, y, 'Bread first!', '#ffcf5a'); return; } if (this.plate.includes(this.board)) { this.pop(x, y, 'Already in', '#ffcf5a'); return; }
      this.addToPlate(this.board); this.board = null; sfx('place'); return;
    }
    if (id === 'plate' || id === 'hatch') { if (!this.plate) return; if (this.pass) { const [x, y] = this.scr(HX, 1.5, -0.88); this.pop(x, y, 'Hatch busy', '#ffcf5a'); return; } this.passId++; this.pass = [this.passId, this.plate]; this.plate = null; sfx('serve'); return; }
    if (id === 'trash') { if (this.plate) { this.plate = null; sfx('place'); } else if (this.board) { this.board = null; sfx('place'); } }
  }
  update(dt) {
    const P = (this.P = this.ep.partner()); this.clock += dt; this.readPartnerSign(P); this.pSignT -= dt; this.mySignT -= dt;
    if (P && P.rid !== this.rid) { this.rid = P.rid; this.reset(); }
    if (this.pass && P && P.took >= this.pass[0]) this.pass = null;
    const play = P && P.ph === 'play';
    if (play && this.holdId === 'spit') {
      if (!this.plate) { if (this.shave === 0) { const [x, y] = this.scr(1.35, 2.0, -0.62); this.pop(x, y, 'Bread first!', '#ffcf5a'); } this.shave = 0.001; }
      else if (!this.plate.includes('m')) { this.shave += dt / 1.1; if (Math.random() < dt * 9) sfx('chop'); if (this.shave >= 1) { this.shave = 0; this.addToPlate('m'); sfx('pick'); } }
    } else this.shave = 0;
    if (play && this.holdId === 'board' && this.board && this.board === this.board.toUpperCase()) { this.boardP += dt / 0.9; if (Math.random() < dt * 9) sfx('chop'); if (this.boardP >= 1) { this.board = this.board.toLowerCase(); this.boardP = 0; sfx('pick'); } }
    const now = performance.now();
    if (now - this.lastSend > 50) { this.lastSend = now; this.ep.set({ bb: 1, role: 'chef', pass: this.pass, sg: [this.signId, this.mySign || ''] }); }
  }
  render(dt) {
    const P = this.P, b = beat(), T = this.clock;
    this.meat.rotation.y = T * 1.4; this.heat.material.color.setHSL(0.06, 1, 0.45 + 0.08 * Math.sin(T * 5));
    this.cl.intensity = (0.5 + 1.8 * (1 - b.ph)) * LI; this.dark.material.opacity = 0.38 * (1 - Math.pow(1 - b.ph, 3));
    this.flashT -= dt; if (this.flashT < -40 - Math.random() * 30) this.flashT = 5; this.blue.intensity = this.flashT > 0 && Math.floor(T * 8) % 2 ? 2.5 * LI : 0;
    applyPose(this.baer.userData.rig, P && P.pose ? P.pose : POSES.I.v, Math.min(1, dt * 10));
    this.setItem(this.boardItem, this.board); this.boardItem.position.y = 1.015 + (this.holdId === 'board' && this.isHold('board') ? Math.abs(Math.sin(T * 30)) * 0.02 : 0);
    this.setItem(this.plateItem, this.plate); this.setItem(this.passItem, this.pass ? this.pass[1] : null);
    this.myPlac.visible = this.mySignT > 0; if (this.mySignT > 0) setPlacard(this.myPlac, this.mySign);
    this.render3d();
    // ---- UI ----
    const c = this.c; this.begin();
    this.label(1.35, 0.98, -0.35, 'HOLD TO SHAVE', '#ffcf5a', 10);
    if (this.shave > 0) { const [x, y] = this.proj(1.35, 2.0, -0.62); bar(c, x - 50, y, 100, 9, this.shave, '#7dff9a'); }
    if (this.board) { const [x, y] = this.proj(-0.5, 1.25, -0.08); if (this.boardP > 0) bar(c, x - 50, y - 14, 100, 8, this.boardP, '#7dff9a'); this.label(-0.5, 0.86, 0.1, this.board === this.board.toUpperCase() ? 'HOLD TO CHOP' : 'TAP: ONTO BREAD', '#fff', 10); }
    if (this.plate && !this.pass) this.label(0.42, 0.86, 0.12, 'TAP: PASS TO BÄRBEL', '#7dff9a', 10);
    if (this.pass) this.label(HX, 1.42, -0.88, 'waiting for Bärbel', '#fff', 10);
    this.label(HX, 2.3, -1.0, 'BÄRBEL', '#ffb238', 12);
    // the book
    c.fillStyle = '#efe2c4'; c.fillRect(0, 0, 250, 470); c.fillStyle = '#d9c9a6'; c.fillRect(244, 0, 6, 470);
    c.fillStyle = '#5a2a14'; c.font = '15px Bungee, sans-serif'; c.textAlign = 'left'; c.fillText('STAMMKUNDEN', 14, 26); c.font = '10px Archivo, sans-serif'; c.fillStyle = '#7a5a40'; c.fillText('Bruno\'s book · dance → their usual', 14, 40);
    REGULARS.forEach((R, i) => {
      const y = 50 + i * 52; c.fillStyle = i % 2 ? '#e8d8b6' : '#f3e9d2'; c.fillRect(6, y, 236, 50);
      drawFace(c, R.seed, 24, y + 27, 12); c.fillStyle = '#3a2010'; c.font = '11px Bungee, sans-serif'; c.textAlign = 'left'; c.fillText(R.name, 42, y + 14);
      [...R.dance].forEach((k, j) => drawPoseIcon(c, k, 54 + j * 26, y + 31, 0.62, '#3a2010'));
      const rc = RECIPES[R.rec]; c.fillStyle = '#7a5a40'; c.font = '9px Archivo, sans-serif'; c.fillText(rc[0], 132, y + 14);
      [...rc[1]].forEach((ch, j) => drawItem(c, 'lto'.includes(ch) ? ch.toUpperCase() : ch, 140 + j * 17, y + 34, 0.42));
    });
    c.fillStyle = '#120a18'; c.fillRect(0, 470, VW, 70);
    ['+', '-', '?', 'w'].forEach((k, i) => { const x = 330 + i * 72; this.button('sg' + k, x, 476, 64, 58); drawSignIcon(c, k, x + 32, 501, 0.8); c.fillStyle = '#bba9c8'; c.font = '10px Archivo, sans-serif'; c.textAlign = 'center'; c.fillText(`${i + 1} ${NAMES[k]}`, x + 32, 528); });
    this.hud(P ? P.t : 0, P ? P.sc : 0, VW - 16, 500);
    c.textAlign = 'left'; c.fillStyle = '#bba9c8'; c.font = '12px Archivo, sans-serif'; c.fillText('You can\'t see the customers.', 14, 496); c.fillText('Read Bärbel\'s dance in the hatch.', 14, 514);
    if (!P || P.ph !== 'play') { c.fillStyle = '#000a'; c.fillRect(250, 0, 710, 470); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '22px Bungee, sans-serif'; c.fillText(!P ? 'Waiting for Bärbel…' : P.ph === 'end' ? 'Feierabend!' : 'Bärbel opens the window', 605, 240); }
    this.finish(dt);
  }
}
