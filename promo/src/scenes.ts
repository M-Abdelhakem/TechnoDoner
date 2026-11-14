// @ts-nocheck
// The 3D sets for the promo, rebuilt from the game's own views (src/views.ts, src/mix/views.ts) with the game's art
// kit (src/kit3d.ts, read-only): the street window, the kitchen with the hatch, Bärbel's self view and the club.
// Each is rendered at PS2 resolution (270 px wide for a full portrait frame) and scaled up 4x pixel-crisp.
import * as THREE from 'three';
import { LI, lam, basic, M, GEO, getTex, makeItem, makeBear, makeCustomer, makeFigure, applyPose, tex } from '../../src/kit3d';
import { POSES } from '../../src/poses';
import { BPM, hash, lerp, clamp, smooth, bounce } from './util';

export const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
/** render a scene at w x h (low-res pixels) and return the canvas */
export function shoot(scene, cam, w, h) {
  renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  renderer.setClearColor(0x120a18); renderer.clear(); renderer.render(scene, cam); return renderer.domElement;
}
/** world point -> pixel in a destination rect the scene was drawn into */
export function project(cam, p, rect) { const v = new THREE.Vector3(...p).project(cam); return [rect[0] + ((v.x + 1) / 2) * rect[2], rect[1] + ((1 - v.y) / 2) * rect[3]]; }
export function aim(cam, pos, at, fov) { cam.position.set(...pos); cam.lookAt(...at); if (fov) cam.fov = fov; }

// ---- poses: the game's POSES plus a few for the promo ----
const n3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const P = (uL, fL, uR, fR, yaw = 0, roll = 0, lean = 0) => [...n3(...uL), ...n3(...fL), ...n3(...uR), ...n3(...fR), yaw, roll, lean];
export const PV = Object.fromEntries(Object.entries(POSES).map(([k, p]) => [k, p.v]));
// arms crossed, pushed forward so the forearms clear the (scaled-up) customer's belly and sit above the counter
PV.X = P([-0.2, -0.35, 0.95], [0.95, 0.08, 0.3], [0.2, -0.35, 0.95], [-0.95, 0.12, 0.3]);
const X = PV.X;
PV.BOOK = P([-0.3, -0.75, 0.6], [0.25, 0.05, 0.97], [0.3, -0.75, 0.6], [-0.25, 0.05, 0.97], 0, 0, 0);
PV.BANGU = [...X.slice(0, 6), ...n3(0.35, 0.55, 0.75), ...n3(0.05, 1, 0.25), 0.15, -0.1, 0.05];
PV.BANGD = [...X.slice(0, 6), ...n3(0.2, -0.3, 0.95), ...n3(0.0, -0.55, 0.85), 0.1, 0.12, -0.08];
PV.GIVE = P([-0.15, -1, 0.1], [0.05, -1, 0.35], [0.1, -0.2, 1], [0, 0.1, 1]);
PV.HUH = P([-0.6, -0.6, 0.5], [-0.3, 0.7, 0.4], [0.6, -0.6, 0.5], [0.3, 0.7, 0.4], 0, 0.3, 0);
PV.CHEF = P([-0.3, -0.7, 0.65], [0.1, -0.2, 1], [0.3, -0.7, 0.65], [-0.1, -0.2, 1]);
export const lerpPose = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
/** a routine [[beat, key], ...] -> the pose vector at B, blending into each new pose over `blend` beats */
export function poseAt(seq, B, blend = 0.22) {
  let i = -1; for (let k = 0; k < seq.length; k++) if (seq[k][0] <= B) i = k;
  if (i < 0) return PV.I;
  const prev = i > 0 ? PV[seq[i - 1][1]] : PV.I; return lerpPose(prev, PV[seq[i][1]], smooth((B - seq[i][0]) / blend));
}
export const pose = (model, v) => applyPose(model.userData.rig, v, 1);

// ---- textures of our own ----
let FLOOR;
const clubFloor = () => FLOOR || (FLOOR = tex(32, 32, (c) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#24142f' : '#140a1c'; c.fillRect(i * 8, j * 8, 8, 8); } c.fillStyle = '#ff4fa833'; c.fillRect(3, 3, 2, 2); c.fillStyle = '#22b0a233'; c.fillRect(19, 27, 2, 2); }, [24, 24]));
function bookTex() {
  return tex(64, 48, (c) => {
    c.fillStyle = '#5a2a14'; c.fillRect(0, 0, 64, 48); c.fillStyle = '#7a3e1f'; c.fillRect(2, 2, 60, 44); c.fillStyle = '#ffb238'; c.fillRect(6, 8, 52, 2); c.fillRect(6, 38, 52, 2);
    c.font = '9px Bungee, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffe0a0'; c.fillText('STAMM', 32, 22); c.fillText('KUNDEN', 32, 32);
  });
}

/** angry brows for the impatient customer */
function brows(model) {
  const head = model.userData.rig.head, b = new THREE.Group();
  [-1, 1].forEach((s) => { const m = M(GEO.box(0.15, 0.04, 0.03), lam(0x140a0a), s * 0.11, 0.14, 0.285); m.rotation.z = s * 0.45; b.add(m); });
  head.add(b); b.visible = false; model.userData.brows = b; return b;
}
function squintable(bear) {
  const head = bear.userData.rig.head; const eyes = head.children.filter((m) => m.geometry?.parameters?.radius === 0.035);
  const br = new THREE.Group(); [-1, 1].forEach((s) => { const m = M(GEO.box(0.13, 0.03, 0.03), lam(0x1a0e08), s * 0.11, 0.13, 0.285); m.rotation.z = s * 0.3; br.add(m); }); head.add(br); br.visible = false;
  bear.userData.squint = (k) => { eyes.forEach((e) => (e.scale.y = lerp(1, 0.22, k))); br.visible = k > 0.3; };
}
const bob = (B, ph = 0, a = 0.03) => Math.abs(Math.sin(Math.PI * (B + ph))) * a;

// =================================== the street window (Bärbel's view) ===================================
export function windowScene() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x0a0812); s.fog = new THREE.Fog(0x0d0a16, 4, 17);
  const cam = new THREE.PerspectiveCamera(60, 0.5625, 0.05, 60); s.add(cam);
  s.add(new THREE.HemisphereLight(0xb8c0ff, 0x201018, 0.6 * LI)); const d = new THREE.DirectionalLight(0xfff0dd, 0.55 * LI); d.position.set(0.5, 3, 3); s.add(d);
  const lamp = new THREE.PointLight(0xffb060, 2.2 * LI, 9, 0); lamp.position.set(-2.2, 3.1, -2.4); s.add(lamp);
  const g = M(new THREE.PlaneGeometry(40, 40), lam(0xffffff, { map: getTex('asphalt') }), 0, 0, -8); g.rotation.x = -Math.PI / 2; s.add(g);
  s.add(M(GEO.box(14, 0.12, 2), lam(0x4a4652), 0, 0.06, -1.6));
  s.add(M(GEO.box(16, 7, 1), lam(0xffffff, { map: getTex('concrete') }), 0, 3.5, -8.5));
  s.add(M(GEO.box(1.5, 2.3, 0.1), basic(0x2a0606), 0.6, 1.15, -7.95));
  const clubSign = M(new THREE.PlaneGeometry(2.4, 0.6), basic(0xffffff, { map: getTex('sign:club'), transparent: true, blending: THREE.AdditiveBlending, fog: false }), 0.6, 2.75, -7.9); s.add(clubSign);
  const door = new THREE.PointLight(0xff3060, 2 * LI, 6, 0); door.position.set(0.6, 1.6, -7.2); s.add(door);
  const clubbers = []; for (let i = 0; i < 13; i++) { const f = makeFigure(new THREE.Color().setHSL(0.72 + hash(i) * 0.2, 0.45, 0.2 + hash(i + 9) * 0.12)); f.position.set(-3.8 + i * 0.6, 0, -7.0 + (i % 2) * 0.35); f.userData.ph = hash(i * 5); s.add(f); clubbers.push(f); }
  s.add(M(GEO.cyl(0.05, 0.06, 3.2, 6), lam(0x333338), -2.2, 1.6, -2.4)); s.add(M(GEO.sph(0.16, 6), basic(0xffd890), -2.2, 3.2, -2.4));
  // the kiosk window frame, neon above
  const wall = lam(0x2a1a2e), z = -0.32;
  s.add(M(GEO.box(4.4, 0.9, 0.12), wall, 0, 2.75, z)); s.add(M(GEO.box(0.6, 3.2, 0.12), wall, -1.25, 1.6, z)); s.add(M(GEO.box(0.6, 3.2, 0.12), wall, 1.25, 1.6, z));
  const neon = M(new THREE.PlaneGeometry(1.3, 0.33), basic(0xffffff, { map: getTex('sign:doner'), transparent: true, blending: THREE.AdditiveBlending, fog: false }), 0, 2.55, z + 0.07); neon.visible = false; s.add(neon);
  const ring = { material: { color: new THREE.Color() } };
  // counter
  s.add(M(GEO.box(4.2, 0.9, 1.3), lam(0x7d8796, { map: getTex('steel') }), 0, 0.45, -0.05)); s.add(M(GEO.box(4.22, 0.05, 1.32), lam(0x6f7886), 0, 0.905, -0.05));
  // napkin box + sauce bottles for set dressing
  s.add(M(GEO.box(0.18, 0.12, 0.12), lam(0xe8e2d6), -0.85, 0.99, 0.15)); [[0.8, 'g'], [0.94, 'h']].forEach(([x, k]) => { const it = makeItem(k); it.scale.setScalar(1.4); it.position.set(x, 0.93, 0.2); s.add(it); });
  // Bärbel's paw, holding something
  const hand = new THREE.Group(); hand.position.set(0.3, -0.34, -0.8); cam.add(hand); hand.add(M(GEO.sph(0.1, 7), lam(0xefe6d2), 0, -0.02, 0));
  const handItem = new THREE.Group(); handItem.position.set(-0.02, 0.05, 0); handItem.scale.setScalar(1.6); hand.add(handItem); hand.visible = false;
  let cust = null;
  const api = {
    s, cam, hand,
    setCustomer(m) { if (cust === m) return; if (cust) s.remove(cust); cust = m; if (m) s.add(m); },
    get cust() { return cust; },
    hold(code) { while (handItem.children.length) handItem.remove(handItem.children[0]); if (code) handItem.add(makeItem(code)); hand.visible = !!code; },
    update(B) {
      clubbers.forEach((f) => (f.position.y = bob(B, f.userData.ph, 0.16)));
      const ph = B % 1; door.intensity = (1 + 2.5 * Math.pow(1 - ph, 3)) * LI; ring.material.color.setHSL(0.9 + 0.05 * Math.sin(B), 1, 0.55);
      neon.material.opacity = hash(Math.floor(B * 8)) < 0.06 ? 0.4 : 1;
    },
  };
  return api;
}
export function regular(seed) { const m = makeCustomer(seed); brows(m); m.scale.setScalar(1.3); return m; }

// =================================== the kitchen (Bruno's view) ===================================
export const HX = 0.15;
export function kitchenScene() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x0b1416); s.fog = new THREE.Fog(0x0b1416, 4, 12);
  const cam = new THREE.PerspectiveCamera(56, 0.5625, 0.05, 60);
  s.add(new THREE.HemisphereLight(0xfff0d8, 0x332018, 0.75 * LI)); const kl = new THREE.PointLight(0xffe0b0, 1.2 * LI, 6, 0); kl.position.set(0, 2.5, 0.6); s.add(kl);
  const tm = lam(0xffffff, { map: getTex('tiles') }), z = -1.0;
  s.add(M(GEO.box(2.6, 3.2, 0.1), tm, -1.7, 1.6, z)); s.add(M(GEO.box(2.6, 3.2, 0.1), tm, 2.0, 1.6, z)); s.add(M(GEO.box(1.1, 1.2, 0.1), tm, HX, 0.6, z)); s.add(M(GEO.box(1.1, 1.05, 0.1), tm, HX, 2.68, z));
  // back wall behind Bruno (only seen from the hatch)
  s.add(M(GEO.box(5, 3.2, 0.1), tm, 0, 1.6, 2.6)); s.add(M(GEO.box(1.6, 0.06, 0.3), lam(0x8a5530), HX, 2.0, 2.45));
  [0, 1, 2].forEach((i) => { const j = M(GEO.cyl(0.08, 0.08, 0.2, 6), lam([0xe8402f, 0x4fae35, 0xffb238][i]), HX - 0.4 + i * 0.4, 2.13, 2.42); s.add(j); });
  // the street side: Bärbel at the window, lit by the club
  s.add(M(GEO.box(3, 3, 0.1), lam(0x1a0c2a), HX, 1.5, -2.9));
  const cl = new THREE.PointLight(0xff4fa8, 1.4 * LI, 3.5, 0); cl.position.set(HX - 0.4, 2.2, -1.4); s.add(cl);
  const front = new THREE.DirectionalLight(0xffffff, 0.6 * LI); front.position.set(HX, 2, 1); front.target.position.set(HX, 1.3, -1.8); s.add(front, front.target);
  const baer = makeBear(1); baer.scale.setScalar(0.74); baer.position.set(HX, 0.82, -1.8); s.add(baer);
  const dark = M(new THREE.PlaneGeometry(1.1, 0.95), basic(0x05000a, { transparent: true, opacity: 0, fog: false }), HX, 1.675, -1.06); s.add(dark);
  // Bruno himself, for the shots from the hatch
  const bruno = makeBear(0); bruno.scale.setScalar(0.92); bruno.position.set(HX, 0.62, 1.15); bruno.rotation.y = Math.PI; s.add(bruno); squintable(bruno);
  const book = new THREE.Group(); const bk = M(GEO.box(0.5, 0.36, 0.05), [lam(0x5a2a14), lam(0x5a2a14), lam(0x5a2a14), lam(0x5a2a14), lam(0xffffff, { map: bookTex() }), lam(0xefe2c4)]); book.add(bk);
  book.position.set(0, 0.62, 0.62); book.rotation.x = -0.35; bruno.userData.rig.torso.add(book); bruno.userData.book = book;
  // counter, spit, bread, veg, sauces, board, plate, trash, hatch shelf (as in the game)
  s.add(M(GEO.box(4.4, 0.95, 1.15), lam(0xffffff, { map: getTex('wood') }), 0, 0.475, -0.4)); s.add(M(GEO.box(4.42, 0.04, 1.17), lam(0xd8a06a), 0, 0.96, -0.4));
  const sp = new THREE.Group(); sp.position.set(1.35, 0, -0.62); sp.add(M(GEO.cyl(0.016, 0.016, 1.3, 5), lam(0xcccccc), 0, 1.55, 0)); const meat = M(GEO.cyl(0.24, 0.14, 0.75, 8), lam(0x8a4b2a), 0, 1.42, 0); sp.add(meat);
  for (let k = 0; k < 3; k++) meat.add(M(GEO.cyl(0.242 - k * 0.04, 0.22 - k * 0.04, 0.04, 8), lam(0xb86a3c), 0, 0.3 - k * 0.25, 0));
  s.add(sp); const heat = M(GEO.box(0.5, 0.8, 0.05), basic(0xff6a1a), 1.35, 1.42, -0.93); s.add(heat);
  const br = new THREE.Group(); br.position.set(-1.3, 0.98, -0.5); br.add(M(GEO.box(0.46, 0.12, 0.32), lam(0x9a6638), 0, 0.06, 0)); for (let k = 0; k < 3; k++) { const p = makeItem('D'); p.scale.setScalar(1.3); p.position.set(-0.12 + k * 0.12, 0.1 + k * 0.015, 0); br.add(p); } s.add(br);
  [['L', -0.88], ['T', -0.58], ['O', -0.28]].forEach(([k, x]) => { const g = new THREE.Group(); g.position.set(x, 0.98, -0.62); g.add(M(GEO.box(0.27, 0.1, 0.24), lam(0xdde1e6), 0, 0.05, 0)); [-0.06, 0.06].forEach((dx) => { const it = makeItem(k); it.scale.setScalar(1.05); it.position.set(dx, 0.06, 0); g.add(it); }); s.add(g); });
  const hot = makeItem('h'); hot.scale.setScalar(1.6); hot.position.set(0.82, 0.98, -0.6); s.add(hot); const garl = makeItem('g'); garl.scale.setScalar(1.6); garl.position.set(0.62, 0.98, -0.6); s.add(garl);
  s.add(M(GEO.box(0.62, 0.035, 0.34), lam(0xe2b07a), -0.5, 0.995, -0.08)); const boardItem = new THREE.Group(); boardItem.position.set(-0.5, 1.015, -0.08); boardItem.scale.setScalar(1.9); s.add(boardItem);
  const knife = new THREE.Group(); knife.add(M(GEO.box(0.02, 0.09, 0.26), lam(0xe6ebf0), 0, 0, 0)); knife.add(M(GEO.box(0.03, 0.05, 0.12), lam(0x2a1a10), 0, 0.01, 0.19)); knife.position.set(-0.5, 1.15, -0.08); knife.rotation.y = 0.5; s.add(knife);
  s.add(M(GEO.cyl(0.21, 0.19, 0.03, 12), lam(0xf4f1ea), 0.42, 0.995, -0.06));
  const stack = new THREE.Group(); stack.position.set(0.42, 1.012, -0.06); s.add(stack);
  s.add(M(GEO.box(1.15, 0.04, 0.3), lam(0xd6dbe2), HX, 1.2, -0.88));
  const pass = new THREE.Group(); pass.position.set(HX, 1.22, -0.88); pass.scale.setScalar(1.6); s.add(pass);
  const shavings = []; for (let i = 0; i < 14; i++) { const m = M(GEO.box(0.11, 0.022, 0.05), lam(i % 2 ? 0xa85d33 : 0x7a3e1f)); m.visible = false; s.add(m); shavings.push(m); }
  const drip = M(GEO.box(0.025, 0.2, 0.025), basic(0xe0262a)); drip.visible = false; s.add(drip);
  const set = (grp, code, sc = 1) => { if (grp.userData.code === code) return; grp.userData.code = code; while (grp.children.length) grp.remove(grp.children[0]); if (code) { const it = makeItem(code); it.scale.setScalar(sc); grp.add(it); } };
  const api = {
    s, cam, baer, bruno, dark, cl, meat, hot, knife, stack, drip,
    board: (code) => set(boardItem, code), pass: (code) => set(pass, code),
    /** the plate as one döner item ('Dml...') */
    plate(code) { if (stack.userData.mode !== 'item' || stack.userData.code !== code) { stack.userData.mode = 'item'; stack.userData.code = code; while (stack.children.length) stack.remove(stack.children[0]); if (code) { const it = makeItem(code); it.scale.setScalar(2.0); stack.add(it); } } },
    /** the Rule Book döner, portion by portion: list of [code, dropK 0..1, gone 0..1] */
    portions(list) {
      const key = list.map((p) => p[0]).join('');
      if (stack.userData.mode !== 'stack' || stack.userData.code !== key) {
        stack.userData.mode = 'stack'; stack.userData.code = key; while (stack.children.length) stack.remove(stack.children[0]);
        let h = 0; list.forEach(([c], i) => {
          const g = new THREE.Group(); let it;
          if (c === 'D') { it = makeItem('D'); it.scale.set(2.0, 2.0, 2.0); }
          else if (c === 'h' || c === 'g') { it = new THREE.Group(); for (let q = 0; q < 4; q++) { const z = M(GEO.box(0.22, 0.008, 0.016), lam(c === 'h' ? 0xe0262a : 0xf4f1e6), 0, 0.01, -0.09 + q * 0.06 + (c === 'g' ? 0.03 : 0)); z.rotation.y = (q % 2 ? 0.35 : -0.35) * (c === 'g' ? -1 : 1); it.add(z); } }
          else { it = makeItem(c); it.scale.setScalar(1.25); }
          g.add(it); g.userData.rest = [c === 'D' ? 0 : Math.sin(i * 2.3) * 0.05, h, c === 'D' ? 0 : Math.cos(i * 2.3) * 0.035]; g.userData.rot = c === 'D' ? 0 : i * 1.1;
          h += c === 'D' ? (i === 0 ? 0.13 : 0.05) : c === 'm' ? 0.03 : 0.024; stack.add(g);
        });
      }
      list.forEach(([c, k, gone = 0], i) => {
        const g = stack.children[i]; const [x, y, z] = g.userData.rest; g.visible = k > 0 && gone < 1;
        g.position.set(x + gone * 0.9, y + (1 - bounce(k)) * 0.5 + gone * 0.4, z); g.rotation.y = g.userData.rot + gone * 4; g.rotation.z = gone * 2;
      });
    },
    update(B, strobe = 0) {
      meat.rotation.y = B * 0.9; heat.material.color.setHSL(0.06, 1, 0.5 + 0.05 * Math.sin(B * 9));
      const ph = B % 1; cl.intensity = (0.5 + 1.8 * (1 - ph)) * LI;
      dark.material.opacity = strobe ? (Math.floor(B * 8) % 2 ? 0.86 : 0.05) * strobe : 0.38 * (1 - Math.pow(1 - ph, 3));
      s.background.setHex(strobe && Math.floor(B * 8) % 2 === 0 ? 0x2a3a40 : 0x0b1416);
      shavings.forEach((m) => (m.visible = false)); drip.visible = false;
    },
    /** meat flying off the spit, k = 0..1 progress of the shave */
    shave(B) { shavings.forEach((m, i) => { const t = ((B * 2 + i / shavings.length) % 1); m.visible = true; const a = hash(i) * 1.4 - 0.2; m.position.set(1.35 + Math.cos(a) * (0.26 + t * 0.25), 1.6 - hash(i + 3) * 0.4 - t * t * 0.6, -0.62 + Math.sin(a) * 0.3 + 0.2); m.rotation.set(t * 9, i, t * 5); }); },
  };
  api.bruno.visible = false;
  return api;
}

// =================================== Bärbel's self view (what Bruno sees, clean) ===================================
export function selfScene() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x1d1030); s.fog = new THREE.Fog(0x1d1030, 3, 9);
  s.add(new THREE.HemisphereLight(0xffffff, 0x302040, 0.9 * LI)); const sl = new THREE.DirectionalLight(0xffe0ff, 0.7 * LI); sl.position.set(1, 2, 3); s.add(sl);
  const rim = new THREE.PointLight(0xff4fa8, 2 * LI, 5, 0); rim.position.set(-1.2, 2, -0.8); s.add(rim); const rim2 = new THREE.PointLight(0x22b0a2, 2 * LI, 5, 0); rim2.position.set(1.2, 2, -0.8); s.add(rim2);
  const fl = M(new THREE.PlaneGeometry(10, 10), lam(0xffffff, { map: clubFloor() }), 0, 0, 0); fl.rotation.x = -Math.PI / 2; s.add(fl);
  s.add(M(GEO.box(8, 4, 0.1), lam(0x14081e), 0, 2, -1.6));
  const ring = M(new THREE.TorusGeometry(1, 0.025, 4, 28), basic(0xff4fa8, { fog: false })); ring.scale.set(1.05, 1.05, 1); ring.position.set(0, 1.05, -1.5); s.add(ring);
  const me = makeBear(1); s.add(me);
  const cam = new THREE.PerspectiveCamera(40, 1.125, 0.1, 20); aim(cam, [0, 0.95, 2.6], [0, 0.8, 0]);
  return { s, cam, me, ring, update(B) { me.position.y = bob(B, 0, 0.04); ring.material.color.setHSL((0.9 + B * 0.02) % 1, 1, 0.55); rim.intensity = (1 + 2 * Math.pow(1 - (B % 1), 2)) * LI; } };
}

// =================================== the club (end card) ===================================
export function clubScene() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x07030c); s.fog = new THREE.Fog(0x07030c, 5, 16);
  s.add(new THREE.HemisphereLight(0xc0b0ff, 0x100818, 0.45 * LI));
  const key = new THREE.DirectionalLight(0xffe8d0, 0.75 * LI); key.position.set(0.5, 2.5, 4); s.add(key);
  const z0 = -2;
  const floor = M(new THREE.PlaneGeometry(40, 40), lam(0xffffff, { map: clubFloor() }), 0, 0, z0); floor.rotation.x = -Math.PI / 2; s.add(floor);
  s.add(M(GEO.box(30, 8, 0.2), lam(0x14081e), 0, 4, z0 - 7));
  const lights = [0xff00aa, 0x00e5ff, 0x7c4dff, 0xff3d00].map((c, i) => { const l = new THREE.PointLight(c, 2 * LI, 14, 0); l.position.set(-4.5 + i * 3, 4.2, z0); s.add(l); return l; });
  const lasers = [0x00ff9c, 0xff0066, 0x00ff9c, 0xff0066, 0x22b0a2].map((c, i) => { const p = new THREE.Group(); p.position.set(-4 + i * 2, 5, z0 - 6); p.add(M(GEO.box(0.035, 0.035, 18), basic(c, { transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, fog: false }), 0, 0, 9)); s.add(p); return p; });
  const booth = M(GEO.box(3, 1.1, 1), lam(0x1a1a1a), 0, 0.55, z0 - 5); s.add(booth); const glow = M(GEO.box(3.05, 0.08, 1.05), basic(0xff00aa), 0, 1.1, z0 - 5); s.add(glow);
  const crowd = []; for (let i = 0; i < 22; i++) { const f = makeFigure(new THREE.Color().setHSL(0.72 + hash(i * 2) * 0.22, 0.5, 0.16 + hash(i * 3) * 0.14)); f.position.set((hash(i * 4) - 0.5) * 11, 0, z0 - 1 + (hash(i * 5) - 0.5) * 5); f.userData.ph = hash(i * 6); s.add(f); crowd.push(f); }
  const bru = makeBear(0), bae = makeBear(1); bru.position.set(-0.6, 0, 0.4); bae.position.set(0.6, 0, 0.4); bru.rotation.y = 0.18; bae.rotation.y = -0.18; s.add(bru, bae);
  const doner = makeItem('Dmlto'); doner.scale.setScalar(3.0); doner.position.set(0, 1.1, 0.5); s.add(doner);
  const cam = new THREE.PerspectiveCamera(55, 0.5625, 0.05, 60);
  return {
    s, cam, bru, bae, doner,
    update(B) {
      const pulse = Math.pow(1 - (B % 1), 3), nb = Math.floor(B);
      lights.forEach((l, i) => (l.intensity = (0.4 + 2.8 * pulse * (nb % 4 === i ? 1 : 0.3)) * LI));
      lasers.forEach((p, i) => { p.rotation.y = Math.sin(B * 0.37 + i) * 0.8; p.rotation.x = 0.3 + Math.sin(B * 0.26 + i * 2) * 0.3; });
      glow.material.color.setHSL((B * 0.05) % 1, 1, 0.5);
      crowd.forEach((f) => (f.position.y = bob(B, f.userData.ph, 0.14)));
      bru.position.y = bob(B, 0, 0.06); bae.position.y = bob(B, 0.5, 0.06);
      doner.rotation.y = B * 0.8; doner.position.y = 1.1 + Math.sin(B * Math.PI / 2) * 0.05;
    },
  };
}
