// @ts-nocheck
// TechnoDöner: the two seats of the combined version. Rules after TechnoDoner by m-abdelhakem (MIT), on Berlin Bears'
// engine (PS2 look, relayed body poses, Worker rooms).
// CASHIER (Bärbel) owns the game: sees the customer and the rule book, must TURN to the kitchen window to sign, and
// can't see the customer or the book while turned. Each portion is one pose (camera, or keys/buttons that play it).
// CHEF (Bruno) turns between the window (watch Bärbel) and the table (cook); he serves, and Bärbel's device scores it.
import * as THREE from 'three';
import { View, VW, VH } from '../views';
import { LI, lam, basic, M, GEO, getTex, makeItem, makeBear, makeCustomer, makeFigure, makePlacard, setPlacard, applyPose } from '../kit3d';
import { rr, bar, drawItem, drawPoseIcon, drawSignIcon } from '../draw2d';
import { POSES, quant } from '../poses';
import { sfx, beat, BPM } from '../audio';
import { startCamera } from '../camera';
import { ING, ING_NAME, BASE, RULES, rollTraits, expected, sameMultiset, ordered, SIGNS, SIGN_SECONDS, REST_SECONDS, ROUND_SECONDS, PATIENCE } from './rules';

const LOW = 0.5;
const look = (cam, yaw, pitch) => { const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); cam.lookAt(cam.position.clone().add(d)); };
function clubDecor(s, z0, n = 14) {
  const floor = M(new THREE.PlaneGeometry(40, 40), lam(0xffffff, { map: getTex('clubfloor') }), 0, 0, z0); floor.rotation.x = -Math.PI / 2; s.add(floor);
  s.add(M(GEO.box(30, 8, 0.2), lam(0x14081e), 0, 4, z0 - 7));
  const lights = [0xff00aa, 0x00e5ff, 0x7c4dff, 0xff3d00].map((c, i) => { const l = new THREE.PointLight(c, 2 * LI, 14, 0); l.position.set(-6 + i * 4, 4.2, z0); s.add(l); return l; });
  const lasers = [0x00ff9c, 0xff0066, 0x00ff9c, 0xff0066].map((c, i) => { const p = new THREE.Group(); p.position.set(-4 + i * 2.6, 5, z0 - 6); p.add(M(GEO.box(0.03, 0.03, 16), basic(c, { transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, fog: false }), 0, 0, 8)); s.add(p); return p; });
  const booth = M(GEO.box(3, 1.1, 1), lam(0x1a1a1a), 0, 0.55, z0 - 5); s.add(booth); const glow = M(GEO.box(3.05, 0.08, 1.05), basic(0xff00aa), 0, 1.1, z0 - 5); s.add(glow);
  const crowd = []; for (let i = 0; i < n; i++) { const f = makeFigure(new THREE.Color().setHSL(0.72 + Math.random() * 0.22, 0.5, 0.18 + Math.random() * 0.14)); f.position.set((Math.random() - 0.5) * 11, 0, z0 + (Math.random() - 0.5) * 5); f.userData.ph = Math.random() * 6; s.add(f); crowd.push(f); }
  return (b, T) => {
    const pulse = Math.pow(1 - b.ph, 3);
    lights.forEach((l, i) => { l.intensity = (0.4 + 2.6 * pulse * (b.n % 4 === i ? 1 : 0.3)) * LI; });
    lasers.forEach((p, i) => { p.rotation.y = Math.sin(T * 0.7 + i) * 0.8; p.rotation.x = 0.3 + Math.sin(T * 0.5 + i * 2) * 0.3; });
    glow.material.color.setHSL((T * 0.1) % 1, 1, 0.5);
    crowd.forEach((f) => { f.position.y = Math.abs(Math.sin((T * Math.PI * BPM) / 60 + f.userData.ph)) * 0.14; });
  };
}
function windowWall(s, z, col = 0x2a1a2a) {
  const m = lam(col);
  s.add(M(GEO.box(3, 3.6, 0.15), m, -2.6, 1.8, z)); s.add(M(GEO.box(3, 3.6, 0.15), m, 2.6, 1.8, z));
  s.add(M(GEO.box(2.2, 1.05, 0.15), m, 0, 0.525, z)); s.add(M(GEO.box(2.2, 1.25, 0.15), m, 0, 2.975, z));
  s.add(M(GEO.box(2.4, 0.07, 0.45), lam(0x9aa3b0), 0, 1.05, z));
  const ring = M(new THREE.TorusGeometry(1, 0.025, 4, 28), basic(0xff00aa, { fog: false })); ring.scale.set(1.2, 0.72, 1); ring.position.set(0, 1.7, z + Math.sign(-z || 1) * 0.1); s.add(ring);
  return ring;
}
function traitCustomer(c) {
  const t = c.traits; const shirt = t.neon ? 0x39ff14 : [0x151515, 0xf2f2f2, 0x3b2a7a][c.seed % 3];
  const g = makeCustomer(c.seed, { noAcc: true, shirt }); const head = g.userData.rig.head;
  if (t.sunglasses) head.add(M(GEO.box(0.46, 0.1, 0.05), lam(0x050505), 0, 0.07, 0.29));
  if (t.bucketHat) { head.add(M(GEO.cyl(0.26, 0.31, 0.24, 10), lam(0xe0c341), 0, 0.3, 0)); head.add(M(GEO.cyl(0.5, 0.5, 0.03, 12), lam(0xe0c341), 0, 0.19, 0)); }
  if (t.glitter) { const a = []; for (let i = 0; i < 46; i++) { const an = Math.random() * Math.PI * 2, r = 0.08 + Math.random() * 0.17; a.push(Math.cos(an) * r, -0.04 + Math.sin(an) * 0.1, 0.27 + Math.random() * 0.04); } const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); g.userData.glitter = new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xff9cf5, size: 3, sizeAttenuation: false })); head.add(g.userData.glitter); }
  if (t.wristband) { const w = M(new THREE.TorusGeometry(0.085, 0.032, 5, 10), basic(0xff1744), 0, -0.2, 0); w.rotation.x = Math.PI / 2; g.userData.rig.R.el.add(w); }
  if (t.neon) g.userData.shirtMat.emissive = new THREE.Color(0x1a7a0a);
  return g;
}
function resultPanel(v, r) {
  // r = [seq, ok, delta, reason, expected, made, appliedIdx]
  const c = v.c, ok = r[1], h = ok ? 90 : 230, y = 120;
  v.hit('flash', 230, y, 500, h); c.fillStyle = ok ? 'rgba(0,140,70,.92)' : 'rgba(150,20,40,.95)'; rr(c, 230, y, 500, h, 16); c.fill();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '28px Bungee, sans-serif'; c.fillText(`${ok ? 'PERFECT' : r[3]}  ${r[2] > 0 ? '+' : ''}${r[2]}`, 480, y + 44);
  if (ok) return;
  c.textAlign = 'left'; c.font = '13px Archivo, sans-serif'; let yy = y + 76;
  c.fillText('Rules that applied:', 250, yy); yy += 18;
  (r[6].length ? r[6].map((i) => RULES[i].text) : ['none (just the base)']).forEach((t) => { c.fillText('• ' + t, 262, yy); yy += 17; });
  yy += 6; c.fillText('Should be:', 250, yy); [...r[4]].forEach((k, i) => drawItem(c, k === 'D' ? 'D' : k, 340 + i * 30, yy - 4, 0.55));
  yy += 30; c.fillText('Was made:', 250, yy); [...r[5]].forEach((k, i) => drawItem(c, k, 340 + i * 30, yy - 4, 0.55)); if (!r[5]) c.fillText('nothing', 340, yy);
  c.font = '11px Archivo, sans-serif'; c.fillText('click to close', 640, y + h - 12);
}
function topBar(v, clock, t, sc, sv, pat) {
  const c = v.c; c.fillStyle = '#000b'; rr(c, 300, 8, 360, 34, 10); c.fill();
  c.fillStyle = '#fff'; c.font = '15px Bungee, sans-serif'; c.textAlign = 'center';
  c.fillText(`${clock}   ⏳${Math.max(0, Math.ceil(t))}s   ★${sc}   🥙${sv}`, 480, 31);
  if (pat != null) bar(c, 300, 46, 360, 8, pat, pat > 0.5 ? '#3fbf5f' : pat > 0.25 ? '#f0b030' : '#e04040');
}

// =================================== CASHIER ===================================
export class MixCashier extends View {
  constructor(stage, ep) {
    super(stage); this.kind = 1; this.ep = ep;
    Object.assign(this, { ph: 'wait', t: ROUND_SECONDS, sc: 0, sv: 0, fl: 0, rid: 0, clock: 0, cust: null, cid: 0, face: 0, yaw: 0, q: [], cur: null, cam: null, camMsg: '', lastSrv: 0, res: null, resSeq: 0, resT: 0, sbSeq: 0, sbDur: 0, strobeT: 9, strobeUntil: 0, lastSend: 0, model: null, enter: 0 });
    this.sent = POSES.I.v.slice();
  }
  build() {
    const s = this.scene, cam = this.camera; s.background = new THREE.Color(0x05010a); s.fog = new THREE.Fog(0x0a0214, 3, 18);
    cam.position.set(0, 1.7, 0.55); look(cam, 0, -0.12);
    s.add(new THREE.HemisphereLight(0x9a8ac8, 0x1a0a20, 0.5 * LI)); const sp = new THREE.DirectionalLight(0xfff1d6, 0.7 * LI); sp.position.set(0, 4, 2); s.add(sp);
    this.club = clubDecor(s, -8, 16);
    s.add(M(GEO.box(3.8, 1.0, 0.6), lam(0x2a1a10), 0, 0.5, -0.35)); s.add(M(GEO.box(3.9, 0.06, 0.66), lam(0x8a929e), 0, 1.02, -0.35)); s.add(M(GEO.box(3.8, 0.04, 0.04), basic(0x00e5ff), 0, 0.9, -0.03));
    // the kitchen behind (+z)
    this.ring = windowWall(s, 2.2);
    const kw = M(new THREE.PlaneGeometry(6, 3.6), lam(0xffffff, { map: getTex('tiles') }), 0, 1.8, 5.2); kw.rotation.y = Math.PI; s.add(kw);
    const kl = new THREE.PointLight(0xfff1d6, 1.6 * LI, 6, 0); kl.position.set(0, 2.8, 3.8); s.add(kl);
    s.add(M(GEO.box(3, 0.95, 0.8), lam(0x9aa3b0), 0, 0.475, 4.6));
    this.chef = makeBear(0); this.chef.position.set(0, 0.25, 4.2); s.add(this.chef); this.chefPlac = this.chef.userData.plac;
    // self view
    this.self = new THREE.Scene(); this.self.background = new THREE.Color(0x1d1030); this.self.add(new THREE.HemisphereLight(0xffffff, 0x302040, 0.9 * LI));
    const sl = new THREE.DirectionalLight(0xffe0ff, 0.6 * LI); sl.position.set(1, 2, 3); this.self.add(sl);
    this.me = makeBear(1); this.self.add(this.me); this.selfCam = new THREE.PerspectiveCamera(40, 200 / 150, 0.1, 20); this.selfCam.position.set(0, 0.95, 2.6); this.selfCam.lookAt(0, 0.8, 0);
  }
  extra3d() { if (this.face !== 1) return; const r = this.renderer; const x = 4, w = 100, h = 75, y = Math.round((VH - 452) * LOW); r.setViewport(x, y, w, h); r.setScissor(x, y, w, h); r.render(this.self, this.selfCam); }
  start() { this.rid++; Object.assign(this, { ph: 'play', t: ROUND_SECONDS, sc: 0, sv: 0, fl: 0, q: [], cur: null, res: null, resT: 0, strobeT: 8, pops: [] }); this.newCustomer(); }
  newCustomer() { const traits = rollTraits(); const e = expected(traits); this.cust = { id: ++this.cid, seed: Math.floor(Math.random() * 997), traits, exp: e.list, applied: e.applied, pat: PATIENCE, max: PATIENCE }; this.enter = 0; this.q = []; this.cur = null; }
  finish(ok, reason, made) {
    const cu = this.cust; const delta = ok ? 100 + Math.round((cu.pat / cu.max) * 50) : -50;
    this.sc += delta; if (ok) this.sv++; else this.fl++;
    this.res = [++this.resSeq, ok, delta, reason, ordered(cu.exp).join(''), made, cu.applied]; this.resT = ok ? 2 : 9; sfx(ok ? 'serve' : 'bad');
    this.newCustomer();
  }
  turn() { this.face = 1 - this.face; sfx('pose'); }
  sign(id) { if (this.face !== 1 || this.yaw < Math.PI * 0.8) { this.pop(480, 420, 'Turn to the kitchen first', '#ffcf5a'); return; } if (this.q.length < 14) this.q.push(id); sfx('sign'); }
  async toggleCamera() {
    if (this.cam) { this.cam.stop(); this.cam.video.remove(); this.cam = null; this.camMsg = ''; return; }
    try { this.cam = await startCamera((m) => { this.camMsg = m; }); const v = this.cam.video; v.className = 'camthumb'; this.wrap?.appendChild(v); }
    catch (e) { this.cam = null; this.camMsg = e && e.name === 'NotAllowedError' ? 'Camera blocked. Use the buttons (Q W E R T, A, S).' : 'No camera here. Use the buttons (Q W E R T, A, S).'; }
  }
  click(id) {
    if (id === 'flash') { this.resT = 0; return; }
    if (id === 'turn') { this.turn(); return; }
    if (id === 'cam') { this.toggleCamera(); return; }
    if (id.startsWith('sg:')) this.sign(id.slice(3));
  }
  update(dt) {
    const P = (this.P = this.ep.partner()); this.clock += dt; this.readPartnerSign(P); this.pSignT -= dt; this.resT -= dt;
    if (this.ph === 'play') {
      this.t -= dt; this.enter += dt;
      if (this.cust) { this.cust.pat -= dt; if (this.cust.pat <= 0) this.finish(false, 'Got bored, back to dancing', ''); }
      this.strobeT -= dt; if (this.strobeT <= 0) { this.sbSeq++; this.sbDur = 2 + Math.random() * 2.5; this.strobeUntil = this.clock + this.sbDur; this.strobeT = 7 + Math.random() * 9; }
      if (P && P.srv && P.srv[0] > this.lastSrv) { this.lastSrv = P.srv[0]; const made = P.srv[1] || ''; const ok = !!this.cust && sameMultiset([...made], this.cust.exp); this.finish(ok, ok ? 'Perfect!' : 'Wrong döner', made); }
      if (this.t <= 0) { this.t = 0; this.ph = 'end'; this.cust = null; sfx('bell'); }
    } else if (P && P.srv) this.lastSrv = Math.max(this.lastSrv, P.srv[0]);
    if (this.cur) { this.cur.t += dt; if (this.cur.t > SIGN_SECONDS + REST_SECONDS) this.cur = null; }
    if (!this.cur && this.q.length) this.cur = { id: this.q.shift(), t: 0 };
    const sg = this.cur && this.cur.t < SIGN_SECONDS ? SIGNS.find((s) => s.id === this.cur.id) : null;
    const target = sg ? POSES[sg.pose].v : (this.cam && this.cam.latest()) || POSES.I.v;
    const k = Math.min(1, dt * 14); for (let i = 0; i < 15; i++) this.sent[i] += (target[i] - this.sent[i]) * k;
    this.yaw += (this.face * Math.PI - this.yaw) * Math.min(1, dt * 9);
    const now = performance.now();
    if (now - this.lastSend > 50) {
      this.lastSend = now; const hr = 2 + (1 - this.t / ROUND_SECONDS) * 4, h = Math.floor(hr), mi = Math.floor((hr - h) * 60);
      this.clockTxt = `0${h}:${String(mi).padStart(2, '0')}`;
      this.ep.set({ bb: 2, role: 'cashier', ph: this.ph, t: Math.round(this.t * 10) / 10, sc: this.sc, sv: this.sv, fl: this.fl, rid: this.rid, clock: this.clockTxt, face: this.yaw > Math.PI * 0.8 ? 1 : 0, pose: quant(this.sent), sb: [this.sbSeq, Math.round(this.sbDur * 10) / 10], res: this.res, pat: this.cust ? Math.round((this.cust.pat / this.cust.max) * 100) / 100 : null, cid: this.cust?.id ?? 0 });
    }
  }
  render(dt) {
    const T = this.clock, b = beat(), P = this.P, kitchen = this.yaw > Math.PI * 0.8;
    this.club(b, T); this.ring.material.color.setHSL((T * 0.15) % 1, 1, 0.55);
    look(this.camera, this.yaw, -0.12 + 0.07 * (this.yaw / Math.PI));
    // the customer
    if (this.cust && (!this.model || this.model.userData.cid !== this.cust.id)) { if (this.model) this.scene.remove(this.model); this.model = traitCustomer(this.cust); this.model.userData.cid = this.cust.id; this.scene.add(this.model); }
    if (!this.cust && this.model) { this.scene.remove(this.model); this.model = null; }
    if (this.model) {
      const m = this.model, k = Math.min(1, this.enter / 0.8), tr = this.cust.traits; m.position.set(-6 + 6 * (1 - Math.pow(1 - k, 3)), 1.42 + Math.abs(Math.sin(b.ph * Math.PI)) * 0.04, -1.25);
      const pump = b.ph < 0.5; const v = POSES.I.v.slice(); if (pump) { v.splice(6, 6, 0.3, 0.95, 0.05, 0.1, 1, 0); } else { v.splice(6, 6, 0.6, 0.55, 0.2, 0.15, 1, 0.1); }
      applyPose(m.userData.rig, v, Math.min(1, dt * 12));
      m.rotation.z = tr.drunk ? Math.sin(T * 1.6) * 0.18 : 0; if (tr.drunk) m.position.x += Math.sin(T * 0.8) * 0.3;
      if (m.userData.glitter) m.userData.glitter.material.color.setHSL((T * 2) % 1, 1, 0.75);
    }
    // the chef: at the window when he watches, back turned at the table otherwise
    const watch = !!(P && P.watch); const cz = watch ? 2.75 : 4.2; this.chef.position.z += (cz - this.chef.position.z) * Math.min(1, dt * 6);
    const cy = watch ? Math.PI : 0; this.chef.rotation.y += (cy - this.chef.rotation.y) * Math.min(1, dt * 8);
    this.chefPlac.visible = this.pSignT > 0; if (this.pSignT > 0) setPlacard(this.chefPlac, this.pSign);
    applyPose(this.me.userData.rig, this.sent, 1);
    const strobing = this.clock < this.strobeUntil; this.scene.background.setHex(strobing && Math.floor(T * 5) % 2 ? 0x4a3a5a : 0x05010a);
    this.render3d();
    // ---- UI ----
    const c = this.c; this.begin();
    topBar(this, this.clockTxt || '02:00', this.t, this.sc, this.sv, this.cust ? this.cust.pat / this.cust.max : null);
    if (!kitchen) {
      // the rule book (only while facing the customer)
      c.fillStyle = '#f4ead5'; rr(c, 690, 64, 258, 396, 10); c.fill(); c.fillStyle = '#222'; c.textAlign = 'left'; c.font = '15px Bungee, sans-serif'; c.fillText('RULE BOOK', 704, 88);
      c.font = '11px Archivo, sans-serif'; c.fillStyle = '#555'; c.fillText('Start with the base. Apply EVERY rule that matches.', 704, 106);
      c.fillStyle = '#222'; rr(c, 700, 114, 238, 40, 8); c.fill(); BASE.forEach((k, i) => drawItem(c, k, 722 + i * 38, 134, 0.6)); c.fillStyle = '#fff'; c.font = '10px Bungee, sans-serif'; c.fillText('BASE', 880, 138);
      RULES.forEach((r, i) => { const y = 164 + i * 46; c.fillStyle = '#fff'; rr(c, 700, y, 238, 40, 6); c.fill(); c.fillStyle = '#ff00aa'; c.fillRect(700, y, 5, 40); c.fillStyle = '#222'; c.font = '12px Archivo, sans-serif'; c.font = '800 12px Archivo, sans-serif'; c.fillText(r.text, 712, y + 25); });
      this.button('turn', 330, 476, 300, 56); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '15px Bungee, sans-serif'; c.fillText('TURN TO THE KITCHEN · SPACE', 480, 510);
      c.textAlign = 'left'; c.fillStyle = '#bba9c8'; c.font = '12px Archivo, sans-serif'; c.fillText('Look: sunglasses? glitter? bucket hat?', 14, 494); c.fillText('red wristband? swaying? neon outfit?', 14, 512);
    } else {
      const watchTxt = watch ? 'Bruno is watching you' : 'Bruno is at the table'; c.font = '16px Bungee, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#000b'; rr(c, 330, 62, 300, 30, 8); c.fill(); c.fillStyle = watch ? '#69f0ae' : '#ff8a80'; c.fillText(watchTxt, 480, 83);
      const cur = this.cur && this.cur.t < SIGN_SECONDS ? SIGNS.find((s) => s.id === this.cur.id) : null;
      if (cur || this.q.length) { c.fillStyle = '#000b'; rr(c, 300, 392, 360, 30, 8); c.fill(); c.fillStyle = '#fff'; c.font = '13px Archivo, sans-serif'; c.fillText(`${cur ? 'Signing: ' + cur.label : ''}${this.q.length ? '   next: ' + this.q.map((q) => SIGNS.find((s) => s.id === q).label).join(', ') : ''}`, 480, 412); }
      c.strokeStyle = '#ffcf5a'; c.lineWidth = 3; rr(c, 8, 302, 200, 150, 8); c.stroke(); c.fillStyle = '#000b'; rr(c, 8, 282, 200, 22, 6); c.fill(); c.fillStyle = '#ffcf5a'; c.font = '10px Bungee, sans-serif'; c.fillText('WHAT BRUNO SEES', 108, 297);
      SIGNS.forEach((sg, i) => { const x = 8 + i * 84; this.button('sg:' + sg.id, x, 470, 80, 64, cur && cur.id === sg.id); drawPoseIcon(c, sg.pose, x + 18, 494, 0.72); if (sg.id.length === 1) drawItem(c, sg.id, x + 56, 490, 0.55); else drawSignIcon(c, sg.id === 'serve' ? '+' : '-', x + 56, 490, 0.6); c.fillStyle = '#fff'; c.font = '10px Archivo, sans-serif'; c.textAlign = 'center'; c.fillText(`${sg.key} ${sg.label}`, x + 40, 526); });
      this.button('cam', 600, 470, 130, 64, !!this.cam); c.fillStyle = '#fff'; c.font = '12px Bungee, sans-serif'; c.fillText(this.cam ? 'CAMERA ON' : 'USE CAMERA', 665, 500); c.fillStyle = '#bba9c8'; c.font = '10px Archivo, sans-serif'; c.fillText('sign with your body', 665, 516);
      this.button('turn', 742, 470, 210, 64); c.fillStyle = '#fff'; c.font = '13px Bungee, sans-serif'; c.fillText('TURN TO CUSTOMER', 847, 500); c.fillStyle = '#bba9c8'; c.font = '10px Archivo, sans-serif'; c.fillText('Space', 847, 516);
      if (this.camMsg) { c.fillStyle = '#000c'; rr(c, 240, 352, 480, 30, 8); c.fill(); c.fillStyle = '#fff'; c.font = '13px Archivo, sans-serif'; c.fillText(this.camMsg, 480, 372); }
    }
    if (this.ph === 'play' && this.sv + this.fl === 0 && this.t > ROUND_SECONDS - 14 && !kitchen) { c.textAlign = 'center'; c.fillStyle = '#000c'; rr(c, 120, 330, 560, 64, 12); c.fill(); c.fillStyle = '#fff'; c.font = '14px Archivo, sans-serif'; c.fillText('Check the customer against the rule book and memorise the döner.', 400, 355); c.fillText('Then turn around and sign one pose per portion, then Serve!', 400, 377); }
    if (this.res && this.resT > 0) resultPanel(this, this.res);
    this.finish(dt);
  }
}

// =================================== CHEF ===================================
const BINX = { D: 1.4, m: 0.7, l: 0, t: -0.7, o: -1.4 };
export class MixChef extends View {
  constructor(stage, ep) { super(stage); this.kind = 0; this.ep = ep; Object.assign(this, { watch: false, yaw: Math.PI, plate: [], srvSeq: 0, srv: null, clock: 0, lastSend: 0, rid: -1, shave: 0, sbSeen: 0, strobeUntil: 0, resSeen: 0, res: null, resT: 0, plateKey: '' }); }
  build() {
    const s = this.scene, cam = this.camera; s.background = new THREE.Color(0x05010a); s.fog = new THREE.Fog(0x0a0214, 4, 18);
    cam.fov = 60; cam.updateProjectionMatrix(); cam.position.set(0, 1.75, 0);
    s.add(new THREE.HemisphereLight(0xfff0d8, 0x2a1830, 0.6 * LI)); const kl = new THREE.PointLight(0xfff1d6, 1.8 * LI, 7, 0); kl.position.set(0, 3.1, 1); s.add(kl);
    const f = M(new THREE.PlaneGeometry(6, 5), lam(0x555048), 0, 0.01, 0.5); f.rotation.x = -Math.PI / 2; s.add(f);
    const tm = lam(0xffffff, { map: getTex('tiles') }); [-1, 1].forEach((q) => s.add(M(GEO.box(0.15, 3.6, 4.6), tm, q * 3, 1.8, 0.4)));
    s.add(M(GEO.box(6, 3.6, 0.15), tm, 0, 1.8, 2.7)); s.add(M(GEO.box(6, 0.1, 4.6), lam(0x222222), 0, 3.6, 0.4));
    // window to the club (-z) and Bärbel outside it
    this.ring = windowWall(s, -1.8, 0x3a2a2a);
    this.club = clubDecor(s, -9, 12);
    this.baer = makeBear(1); this.baer.scale.setScalar(0.95); this.baer.position.set(0, 0.72, -2.8); s.add(this.baer);
    s.add(M(GEO.box(1.2, 0.72, 0.8), lam(0x2a1a10), 0, 0.36, -2.8)); // the step she stands on
    const cl = new THREE.PointLight(0xffd0f0, 0.8 * LI, 2.4, 0); cl.position.set(0, 2.2, -2.2); s.add(cl);
    this.strobe = M(new THREE.PlaneGeometry(2.2, 1.3), basic(0xffffff, { transparent: true, opacity: 0, fog: false }), 0, 1.7, -1.88); s.add(this.strobe);
    // the prep table (+z)
    s.add(M(GEO.box(4, 0.08, 1.2), lam(0xaab0b8), 0, 1.0, 1.7)); s.add(M(GEO.box(4, 0.96, 1.2), lam(0x666a70), 0, 0.48, 1.7));
    for (const k of ['D', 'l', 't', 'o']) { const g = new THREE.Group(); g.position.set(BINX[k], 1.04, 2.0); g.add(M(GEO.box(0.42, 0.1, 0.36), lam(0x333333), 0, 0.05, 0)); [-0.08, 0.08].forEach((dx) => { const it = makeItem(k === 'D' ? 'D' : k.toUpperCase()); it.scale.setScalar(1.2); it.position.set(dx, 0.1, 0); g.add(it); }); s.add(g); this.pickable(k, g); }
    const sp = new THREE.Group(); sp.position.set(BINX.m, 1.04, 2.1); sp.add(M(GEO.cyl(0.016, 0.016, 1.0, 5), lam(0xcccccc), 0, 0.5, 0)); this.meat = M(GEO.cyl(0.22, 0.14, 0.7, 8), lam(0x8a4a22), 0, 0.42, 0); sp.add(this.meat); sp.add(M(GEO.box(0.05, 0.7, 0.3), basic(0xff5722), 0.32, 0.42, 0)); s.add(sp); this.pickable('m', sp);
    s.add(M(GEO.cyl(0.42, 0.38, 0.04, 16), lam(0xfafafa), 0, 1.06, 1.35)); this.stack = new THREE.Group(); this.stack.position.set(0, 1.09, 1.35); s.add(this.stack);
    const my = makePlacard(); my.position.set(-0.24, -0.16, -0.85); my.scale.setScalar(0.3); my.visible = false; cam.add(my); this.myPlac = my;
  }
  isHold(id) { return id === 'm'; }
  relevant(id) { return !this.watch; }
  turn() { this.watch = !this.watch; sfx('pose'); }
  add(k) { if (this.watch || this.P?.ph !== 'play') return; if (this.plate.length >= 12) return; this.plate.push(k); sfx('place'); }
  serve() { if (this.P?.ph !== 'play') return; this.srv = [++this.srvSeq, ordered(this.plate).join('')]; this.plate = []; sfx('serve'); }
  trash() { this.plate = []; sfx('place'); }
  click(id) {
    if (id === 'flash') { this.resT = 0; return; }
    if (id === 'turn') return this.turn(); if (id === 'serve') return this.serve(); if (id === 'trash') return this.trash();
    if (id === 'ok') return this.sign('+'); if (id === 'confused') return this.sign('?');
    if (ING.includes(id) && id !== 'm') this.add(id);
  }
  update(dt) {
    const P = (this.P = this.ep.partner()); this.clock += dt; this.readPartnerSign(P); this.mySignT -= dt; this.resT -= dt;
    if (P && P.rid !== this.rid) { this.rid = P.rid; this.plate = []; this.res = null; this.resSeen = P.res ? P.res[0] : 0; }
    if (P && P.sb && P.sb[0] !== this.sbSeen) { if (this.sbSeen) this.strobeUntil = this.clock + P.sb[1]; this.sbSeen = P.sb[0]; }
    if (P && P.res && P.res[0] !== this.resSeen) { this.resSeen = P.res[0]; this.res = P.res; this.resT = P.res[1] ? 2 : 9; sfx(P.res[1] ? 'serve' : 'bad'); }
    if (this.holdId === 'm' && !this.watch && P?.ph === 'play') { this.shave += dt / 0.7; if (Math.random() < dt * 9) sfx('chop'); if (this.shave >= 1) { this.shave = 0; this.add('m'); } } else this.shave = 0;
    this.yaw += ((this.watch ? 0 : Math.PI) - this.yaw) * Math.min(1, dt * 9);
    const now = performance.now();
    if (now - this.lastSend > 50) { this.lastSend = now; this.ep.set({ bb: 2, role: 'chef', watch: this.yaw < Math.PI * 0.2, srv: this.srv, sg: [this.signId, this.mySign || ''] }); }
  }
  render(dt) {
    const T = this.clock, b = beat(), P = this.P, k = this.yaw / Math.PI, atTable = k > 0.8, atWin = k < 0.2;
    this.club(b, T); this.ring.material.color.setHSL((T * 0.15) % 1, 1, 0.55); this.meat.rotation.y = T * 1.2;
    this.camera.position.z = 0.4 * k; this.camera.position.y = 1.75 + 0.2 * k; look(this.camera, this.yaw, -0.04 - 0.46 * k);
    applyPose(this.baer.userData.rig, P && P.pose ? P.pose : POSES.I.v, Math.min(1, dt * 10));
    const by = P && P.face ? 0 : Math.PI; this.baer.rotation.y += (by - this.baer.rotation.y) * Math.min(1, dt * 8);
    this.baer.position.y = 0.72 + Math.abs(Math.sin(b.ph * Math.PI)) * 0.02;
    const strobing = this.clock < this.strobeUntil; this.strobe.material.opacity = strobing && Math.floor(T * 5) % 2 ? 0.92 : 0;
    const key = this.plate.join(''); if (key !== this.plateKey) { this.plateKey = key; this.stack.clear(); let y = 0; ordered(this.plate).forEach((id, i) => { const m = makeItem(id === 'D' ? 'D' : id); m.scale.setScalar(2.2); m.position.y = y; m.rotation.y = i * 0.7; this.stack.add(m); y += { D: 0.07, m: 0.05, l: 0.04, t: 0.035, o: 0.04 }[id]; }); }
    this.myPlac.visible = this.mySignT > 0; if (this.mySignT > 0) setPlacard(this.myPlac, this.mySign);
    this.render3d();
    // ---- UI ----
    const c = this.c; this.begin();
    topBar(this, P?.clock || '02:00', P?.t ?? 0, P?.sc ?? 0, P?.sv ?? 0, P?.pat ?? null);
    c.textAlign = 'center';
    if (atTable) {
      [['D', 1.4], ['m', 0.7], ['l', 0], ['t', -0.7], ['o', -1.4]].forEach(([id, x], i) => this.label(x, 1.4, 2.15, `${i + 1} ${id === 'm' ? 'Meat (hold)' : { D: 'Bread', l: 'Lettuce', t: 'Tomato', o: 'Onion' }[id]}`, '#fff', 10));
      if (this.shave > 0) { const [x, y] = this.proj(BINX.m, 1.9, 2.1); bar(c, x - 40, y, 80, 8, this.shave, '#7dff9a'); }
      c.fillStyle = '#000b'; rr(c, 150, 474, 420, 58, 12); c.fill(); c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '13px Bungee, sans-serif'; c.fillText('PLATE', 164, 498);
      ordered(this.plate).forEach((id, i) => drawItem(c, id, 236 + i * 28, 494, 0.55)); if (!this.plate.length) { c.font = '12px Archivo, sans-serif'; c.fillStyle = '#bba9c8'; c.fillText('empty', 236, 498); }
      this.button('trash', 580, 474, 110, 58); this.button('serve', 700, 474, 120, 58); this.button('turn', 830, 474, 120, 58);
      c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = '13px Bungee, sans-serif'; c.fillText('START OVER', 635, 500); c.fillText('SERVE', 760, 500); c.fillText('WINDOW', 890, 500);
      c.fillStyle = '#bba9c8'; c.font = '10px Archivo, sans-serif'; c.fillText('Backspace', 635, 518); c.fillText('Enter', 760, 518); c.fillText('Space', 890, 518);
    } else {
      const facing = P && P.face; c.fillStyle = '#000b'; rr(c, 300, 62, 360, 30, 8); c.fill(); c.fillStyle = facing ? '#69f0ae' : '#ff8a80'; c.font = '15px Bungee, sans-serif'; c.fillText(!P ? 'Waiting for Bärbel' : facing ? 'Bärbel is signing to you' : 'Bärbel is with the customer', 480, 83);
      this.button('ok', 250, 474, 150, 58); this.button('confused', 410, 474, 170, 58); this.button('turn', 700, 474, 250, 58);
      c.fillStyle = '#fff'; c.font = '13px Bungee, sans-serif'; c.fillText('GOT IT', 325, 500); c.fillText('REPEAT THAT', 495, 500); c.fillText('TURN TO THE TABLE', 825, 500);
      c.fillStyle = '#bba9c8'; c.font = '10px Archivo, sans-serif'; c.fillText('O', 325, 518); c.fillText('?', 495, 518); c.fillText('Space', 825, 518);
      c.textAlign = 'left'; c.fillText('One pose = one portion.', 14, 494); c.fillText('Point = Serve! · other way = start over', 14, 510);
    }
    if (this.res && this.resT > 0) resultPanel(this, this.res);
    if (!P || P.ph !== 'play') { c.fillStyle = '#000a'; c.fillRect(0, 100, VW, 360); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '22px Bungee, sans-serif'; c.fillText(!P ? 'Waiting for Bärbel…' : P.ph === 'end' ? 'Round over' : 'Bärbel starts the round', 480, 280); }
    this.finish(dt);
  }
}
