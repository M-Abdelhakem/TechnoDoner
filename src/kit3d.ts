// @ts-nocheck
// The early-PS2 look: low-poly Lambert meshes, tiny Nearest-filtered canvas textures, fog, and a 480x270 render
// scaled up with crisp pixels (views.ts). Bears and customers carry a two-bone arm rig per side so any 15-number pose
// (poses.ts) can be played on them.
import * as THREE from 'three';
import { drawSignIcon, SPECIES } from './draw2d';
import { POSES } from './poses';

export const LI = Math.PI; // three r155+ light units: multiply the old intensities by PI
export function tex(w, h, fn, rep?) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
export const lam = (c, o?) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
export const basic = (c, o?) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
export function M(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }
export const GEO = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  sph: (r, s = 8) => new THREE.SphereGeometry(r, s, Math.max(4, Math.round(s * 0.7))),
  cyl: (a, b, h, s = 8) => new THREE.CylinderGeometry(a, b, h, s),
  cone: (r, h, s = 6) => new THREE.ConeGeometry(r, h, s),
};
const TEX = {};
export function getTex(name) {
  if (TEX[name]) return TEX[name]; let t;
  if (name === 'tiles') t = tex(32, 32, (c) => { c.fillStyle = '#145a5e'; c.fillRect(0, 0, 32, 32); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#2a9a9c' : '#22858a'; c.fillRect(i * 16 + 1, j * 16 + 1, 14, 14); c.fillStyle = '#ffffff30'; c.fillRect(i * 16 + 5, j * 16 + 5, 6, 6); } }, [8, 6]);
  else if (name === 'steel') t = tex(32, 32, (c) => { c.fillStyle = '#a7b0bd'; c.fillRect(0, 0, 32, 32); for (let i = 0; i < 60; i++) { c.fillStyle = Math.random() < 0.5 ? '#bcc4cf' : '#8f99a8'; c.fillRect((Math.random() * 32) | 0, (Math.random() * 32) | 0, 2, 1); } }, [6, 2]);
  else if (name === 'wood') t = tex(32, 32, (c) => { c.fillStyle = '#b77b4a'; c.fillRect(0, 0, 32, 32); for (let y = 0; y < 32; y += 4) { c.fillStyle = y % 8 ? '#a86d3e' : '#c48a58'; c.fillRect(0, y, 32, 2); } }, [4, 1]);
  else if (name === 'asphalt') t = tex(32, 32, (c) => { c.fillStyle = '#26232b'; c.fillRect(0, 0, 32, 32); for (let i = 0; i < 90; i++) { c.fillStyle = Math.random() < 0.5 ? '#302c36' : '#1d1a22'; c.fillRect((Math.random() * 32) | 0, (Math.random() * 32) | 0, 1, 1); } }, [16, 16]);
  else if (name === 'concrete') t = tex(32, 32, (c) => { c.fillStyle = '#3a3640'; c.fillRect(0, 0, 32, 32); c.fillStyle = '#2c2931'; for (let y = 0; y < 32; y += 8) c.fillRect(0, y, 32, 1); for (let i = 0; i < 40; i++) { c.fillStyle = '#ffffff10'; c.fillRect((Math.random() * 32) | 0, (Math.random() * 32) | 0, 2, 2); } c.fillStyle = '#ff4fa855'; c.fillRect(4, 14, 9, 3); c.fillStyle = '#2bc4b455'; c.fillRect(18, 22, 10, 2); }, [8, 3]);
  else if (name === 'sign:club') t = tex(128, 32, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 128, 32); c.font = '20px Bungee, Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ff4fa8'; c.fillText('BUNKER', 64, 17); });
  else if (name === 'sign:doner') t = tex(128, 32, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 128, 32); c.font = '20px Bungee, Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffb238'; c.fillText('DÖNER', 64, 17); });
  else if (name === 'soft') t = tex(32, 32, (c) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 32); });
  else if (name.startsWith('sign:')) t = tex(64, 64, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(32, 32, 31, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = '#1a1020'; c.stroke(); drawSignIcon(c, name.slice(5), 32, 33, 1.3); });
  return (TEX[name] = t);
}

export function makeItem(code) {
  const g = new THREE.Group(); if (!code) return g;
  const add = (geo, c, x, y, z, sx?, sy?, sz?) => { const m = M(geo, lam(c), x, y, z); if (sx) m.scale.set(sx, sy, sz); g.add(m); return m; };
  if (code === 'L') { add(GEO.sph(0.07, 7), 0x4fae35, 0, 0.06, 0); add(GEO.sph(0.045, 6), 0x6fd24c, -0.03, 0.1, 0.02); }
  else if (code === 'l') { for (let i = 0; i < 5; i++) add(GEO.box(0.035, 0.018, 0.09), i % 2 ? 0x6fd24c : 0x3f8f2a, -0.08 + i * 0.04, 0.012, (i % 2) * 0.02); }
  else if (code === 'T') { add(GEO.sph(0.062, 7), 0xe8402f, 0, 0.062, 0); add(GEO.box(0.03, 0.02, 0.03), 0x2f8f2a, 0, 0.13, 0); }
  else if (code === 't') { for (let i = 0; i < 3; i++) add(GEO.cyl(0.042, 0.042, 0.014, 8), 0xe8402f, -0.08 + i * 0.08, 0.01, 0); }
  else if (code === 'O') { add(GEO.sph(0.062, 7), 0xb77ccf, 0, 0.068, 0, 1, 1.15, 1); add(GEO.cone(0.02, 0.05, 5), 0xe9d1f2, 0, 0.15, 0); }
  else if (code === 'o') { for (let i = 0; i < 2; i++) { const m = add(new THREE.TorusGeometry(0.045, 0.012, 4, 10), 0xc58bd6, -0.05 + i * 0.1, 0.014, 0); m.rotation.x = Math.PI / 2; } }
  else if (code === 'm') { for (let i = 0; i < 3; i++) { const m = add(GEO.box(0.13, 0.018, 0.04), i % 2 ? 0xa85d33 : 0x7a3e1f, 0, 0.01 + i * 0.014, -0.035 + i * 0.035); m.rotation.y = i * 0.45; } }
  else if (code === 'g' || code === 'h') { add(GEO.cyl(0.035, 0.04, 0.17, 8), code === 'g' ? 0xf4f1e6 : 0xe0262a, 0, 0.085, 0); add(GEO.cone(0.02, 0.05, 6), code === 'g' ? 0xcccccc : 0xffffdd, 0, 0.195, 0); add(GEO.cyl(0.041, 0.041, 0.04, 8), code === 'g' ? 0x77aa66 : 0x7a1010, 0, 0.08, 0); }
  else if (code[0] === 'D') {
    const k = code.slice(1); add(GEO.sph(0.11, 8), 0xc98b45, 0, 0.03, 0, 1.02, 0.32, 0.72); add(GEO.sph(0.105, 8), 0xe9b872, 0, 0.045, 0, 1, 0.36, 0.66);
    const cols = { m: 0x8a4b2a, l: 0x5fbf3f, t: 0xe8402f, o: 0xc58bd6 }; let i = 0;
    for (const ch of k) if (cols[ch]) { add(GEO.sph(0.03, 5), cols[ch], -0.06 + i * 0.04, 0.08, (i % 2) * 0.02 - 0.01); i++; }
    if (k.includes('g')) add(GEO.box(0.17, 0.008, 0.014), 0xffffff, 0, 0.105, -0.012);
    if (k.includes('h')) add(GEO.box(0.17, 0.008, 0.014), 0xff2020, 0, 0.108, 0.014);
  }
  return g;
}

// ---- arm rig ----
const DOWN = new THREE.Vector3(0, -1, 0), V = new THREE.Vector3(), Q = new THREE.Quaternion(), QI = new THREE.Quaternion();
function arm(parent, mats, col, x, y, z, up, fore, thick, pawR) {
  const sh = new THREE.Group(); sh.position.set(x, y, z); parent.add(sh);
  const mU = M(GEO.cyl(thick, thick * 0.9, up, 6), mats(col), 0, -up / 2, 0); sh.add(mU); sh.add(M(GEO.sph(thick * 1.15, 6), mats(col)));
  const el = new THREE.Group(); el.position.set(0, -up, 0); sh.add(el);
  el.add(M(GEO.sph(thick * 0.95, 6), mats(col))); el.add(M(GEO.cyl(thick * 0.9, thick * 0.85, fore, 6), mats(col), 0, -fore / 2, 0));
  el.add(M(GEO.sph(pawR, 7), mats(col), 0, -fore, 0));
  return { sh, el };
}
/** rig = {L, R, head, torso, cur}; v = 15 numbers. k = smoothing per call (1 = snap) */
export function applyPose(rig, v, k = 1) {
  const cur = rig.cur; for (let i = 0; i < 15; i++) cur[i] += (v[i] - cur[i]) * k;
  for (const [a, o] of [[rig.L, 0], [rig.R, 6]]) {
    a.sh.quaternion.setFromUnitVectors(DOWN, V.set(cur[o], cur[o + 1], cur[o + 2]).normalize());
    Q.setFromUnitVectors(DOWN, V.set(cur[o + 3], cur[o + 4], cur[o + 5]).normalize());
    a.el.quaternion.copy(QI.copy(a.sh.quaternion).invert().multiply(Q));
  }
  if (rig.head) { rig.head.rotation.y = cur[12]; rig.head.rotation.z = -cur[13]; }
  if (rig.torso) rig.torso.rotation.z = cur[14];
}
const rest = () => POSES.I.v.slice();

export function makePlacard() {
  const g = new THREE.Group();
  const disk = M(new THREE.CircleGeometry(0.24, 12), basic(0xffffff, { map: getTex('sign:+'), transparent: true }));
  g.add(disk); g.add(M(GEO.cyl(0.02, 0.02, 0.3, 5), lam(0x8a5530), 0, -0.36, -0.01));
  g.userData.disk = disk; g.userData.code = '+'; return g;
}
export function setPlacard(p, code) { if (p.userData.code !== code) { p.userData.code = code; p.userData.disk.material.map = getTex('sign:' + code); p.userData.disk.material.needsUpdate = true; } }

/** kind 0 = Bruno (brown, red cap, the chef), 1 = Bärbel (cream, teal bandana, the cashier) */
export function makeBear(kind) {
  const g = new THREE.Group(); const body = kind ? 0xefe6d2 : 0x8b5a33, muz = kind ? 0xfffaf0 : 0xc8956a;
  const torso = new THREE.Group(); torso.position.y = 0.05; g.add(torso);
  torso.add(M(GEO.sph(0.42, 9), lam(body), 0, 0.4, 0)); torso.add(M(GEO.box(0.44, 0.42, 0.1), lam(0xffffff), 0, 0.38, 0.36));
  const head = new THREE.Group(); head.position.set(0, 0.95, 0); torso.add(head);
  head.add(M(GEO.sph(0.3, 9), lam(body))); [-1, 1].forEach((s) => head.add(M(GEO.sph(0.1, 6), lam(body), s * 0.22, 0.22, 0)));
  head.add(M(GEO.sph(0.12, 7), lam(muz), 0, -0.07, 0.25)); head.add(M(GEO.sph(0.045, 5), lam(0x1a1010), 0, -0.03, 0.36));
  [-1, 1].forEach((s) => head.add(M(GEO.sph(0.035, 5), lam(0x111111), s * 0.11, 0.06, 0.27)));
  if (kind === 0) { head.add(M(new THREE.SphereGeometry(0.315, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xd8322b), 0, 0.06, 0)); head.add(M(GEO.box(0.3, 0.03, 0.2), lam(0xd8322b), 0, 0.07, 0.3)); }
  else head.add(M(GEO.cyl(0.31, 0.31, 0.08, 10), lam(0x22b0a2), 0, 0.12, 0));
  const mats = (c) => lam(c);
  const L = arm(torso, mats, body, -0.36, 0.64, 0.05, 0.3, 0.28, 0.075, 0.11), R = arm(torso, mats, body, 0.36, 0.64, 0.05, 0.3, 0.28, 0.075, 0.11);
  const plac = makePlacard(); plac.position.set(0.55, 1.25, 0.3); plac.visible = false; g.add(plac);
  g.userData = { rig: { L, R, head, torso, cur: rest() }, plac };
  applyPose(g.userData.rig, POSES.I.v);
  return g;
}

export function makeCustomer(seed) {
  const sp = SPECIES[seed % 5]; const col = { fox: 0xe07b2a, raccoon: 0x8f8f9a, boar: 0x7a5236, rabbit: 0xece2d6, pigeon: 0x8796b0 }[sp];
  const g = new THREE.Group(), mats = []; const L = (c) => { const m = lam(c); mats.push(m); return m; };
  const torso = new THREE.Group(); g.add(torso);
  const add = (geo, c, x, y, z, par = torso) => { const m = M(geo, L(c), x, y, z); par.add(m); return m; };
  const shirt = [0x3b2a7a, 0x1d6f6a, 0x7a1d4f, 0x2a2a2a, 0x5a3a1a][(seed >> 3) % 5];
  const sh = add(GEO.sph(0.4, 8), shirt, 0, -0.55, 0); sh.scale.set(1.3, 0.85, 0.8);
  const head = new THREE.Group(); torso.add(head); const hadd = (geo, c, x, y, z) => add(geo, c, x, y, z, head);
  hadd(GEO.sph(0.3, 9), col, 0, 0, 0);
  if (sp === 'rabbit') [-1, 1].forEach((s) => { const e = hadd(GEO.sph(0.11, 6), col, s * 0.11, 0.4, 0); e.scale.set(0.6, 1.9, 0.6); });
  else if (sp === 'fox') { [-1, 1].forEach((s) => hadd(GEO.cone(0.1, 0.2, 4), col, s * 0.17, 0.3, 0)); hadd(GEO.sph(0.12, 6), 0xfff3e6, 0, -0.09, 0.23); }
  else if (sp !== 'pigeon') [-1, 1].forEach((s) => hadd(GEO.sph(0.1, 6), col, s * 0.22, 0.22, 0));
  if (sp === 'raccoon') hadd(GEO.box(0.44, 0.09, 0.06), 0x2a2a33, 0, 0.05, 0.26);
  if (sp === 'boar') { const s = hadd(GEO.cyl(0.1, 0.1, 0.1, 8), 0xc48a66, 0, -0.07, 0.3); s.rotation.x = Math.PI / 2; [-1, 1].forEach((q) => hadd(GEO.cone(0.02, 0.08, 4), 0xffffff, q * 0.12, -0.15, 0.27)); }
  if (sp === 'pigeon') { const b = hadd(GEO.cone(0.05, 0.14, 5), 0xf2b33a, 0, -0.04, 0.34); b.rotation.x = Math.PI / 2; const nk = add(new THREE.TorusGeometry(0.2, 0.04, 4, 10), 0x4fbf9a, 0, -0.27, 0); nk.rotation.x = Math.PI / 2; }
  if (sp === 'rabbit') hadd(GEO.sph(0.035, 5), 0xf08aa0, 0, -0.04, 0.29);
  [-1, 1].forEach((s) => hadd(GEO.sph(0.04, 5), sp === 'raccoon' ? 0xffffff : 0x141018, s * 0.11, 0.06, 0.27));
  const acc = (seed >> 2) % 4;
  if (acc === 1) hadd(GEO.box(0.42, 0.08, 0.04), 0x111111, 0, 0.07, 0.29);
  if (acc === 2) hadd(new THREE.SphereGeometry(0.315, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0xff4fa8, 0, 0.05, 0);
  if (acc === 3) hadd(GEO.sph(0.03, 4), 0xffd23f, 0.3, -0.06, 0);
  const Lr = arm(torso, L, col, -0.45, -0.32, 0.05, 0.28, 0.26, 0.065, 0.095), Rr = arm(torso, L, col, 0.45, -0.32, 0.05, 0.28, 0.26, 0.065, 0.095);
  g.userData = { mats, rig: { L: Lr, R: Rr, head, torso, cur: rest() } };
  applyPose(g.userData.rig, POSES.I.v);
  return g;
}

export function makeFigure(color) {
  const g = new THREE.Group(); const c = new THREE.Color(color);
  g.add(M(GEO.cyl(0.22, 0.26, 1.1, 6), lam(c), 0, 0.55, 0)); g.add(M(GEO.sph(0.2, 6), lam(c), 0, 1.3, 0)); return g;
}
export function makePoliceCar() {
  const g = new THREE.Group();
  g.add(M(GEO.box(2.2, 0.55, 1.0), lam(0xe8e8ec), 0, 0.5, 0)); g.add(M(GEO.box(1.2, 0.45, 0.9), lam(0x2a6a4a), -0.1, 0.98, 0));
  g.add(M(GEO.box(2.22, 0.12, 1.02), lam(0x1f6a46), 0, 0.5, 0));
  [-0.7, 0.7].forEach((x) => [-0.5, 0.5].forEach((z) => { const w = M(GEO.cyl(0.22, 0.22, 0.12, 8), lam(0x111111), x, 0.22, z); w.rotation.x = Math.PI / 2; g.add(w); }));
  const bl = M(GEO.box(0.5, 0.1, 0.25), basic(0x3060ff), -0.1, 1.26, 0); g.add(bl);
  const light = new THREE.PointLight(0x3a6aff, 0, 9, 0); light.position.set(-0.1, 1.6, 0); g.add(light);
  g.userData = { bl, light }; return g;
}
