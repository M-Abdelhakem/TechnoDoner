// @ts-nocheck
// The promo page. render.mjs opens it in headless Chrome, calls PROMO.setup(1|2), then PROMO.frame(i) for every
// frame (a JPEG data URL of the 1080x1920 canvas) and PROMO.audio() once (a WAV). Nothing here reads the clock:
// frame i is beat B = i / FPS / SPB, so a render is the same every time.
import * as THREE from 'three';
import { W as CW, H as CH, FPS, SPB, clamp, lerp, smooth, easeOut, back, hash, punch, mulberry32, stepAt } from './util';
import { renderMusic, wavBase64 } from './music';

Math.random = mulberry32(20261114); // the kit's textures and crowds use Math.random: make them repeatable

const cv = document.getElementById('out') as HTMLCanvasElement; const c = cv.getContext('2d');
let S, UI; // modules, imported after the fonts are in (kit3d draws Bungee into its sign textures)
let WIN, KIT, SELF, CLUB, MIA, KALLE, TAREK;
const FULL = [0, 0, CW, CH], TOP = [0, 0, CW, 960], BOT = [0, 960, CW, 960];
const bob = (B, ph = 0, a = 0.03) => Math.abs(Math.sin(Math.PI * (B + ph))) * a;

function draw3d(scene, cam, rect, scan = 0.22) {
  const [x, y, w, h] = rect; const img = S.shoot(scene, cam, Math.round(w / 4), Math.round(h / 4));
  c.save(); c.imageSmoothingEnabled = false; c.drawImage(img, x, y, w, h); c.restore(); UI.scanlines(c, x, y, w, h, scan);
}
const proj = (cam, p, rect) => S.project(cam, p, rect);
const headPt = (m, off) => { m.updateMatrixWorld(true); const v = m.userData.rig.head.localToWorld(new THREE.Vector3(...off)); return [v.x, v.y, v.z]; };
const flash = (B, at, len = 0.25, col = '255,255,255', a = 0.8) => { const k = B - at; if (k >= 0 && k < len) { c.fillStyle = `rgba(${col},${a * (1 - k / len)})`; c.fillRect(0, 0, CW, CH); } };
const K = (B, at, d = 0.3) => clamp((B - at) / d);
function divider(y) { c.fillStyle = UI.COL.night; c.fillRect(0, y - 9, CW, 18); c.fillStyle = UI.COL.pink; c.fillRect(0, y - 4, CW, 8); }
function floatText(txt, x, y, t, col, size = 70) { if (t < 0 || t > 1) return; c.save(); c.globalAlpha = 1 - t; c.font = UI.FONT(size); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = size * 0.22; c.strokeStyle = '#000'; const yy = y - t * 120, s = lerp(1.5, 1, easeOut(t * 4)); c.translate(x, yy); c.scale(s, s); c.strokeText(txt, 0, 0); c.fillStyle = col; c.fillText(txt, 0, 0); c.restore(); }
function coins(B, at, x, y) { const t = B - at; if (t < 0 || t > 2.5) return; for (let i = 0; i < 14; i++) { const a = hash(i) * Math.PI * 2, sp = 300 + hash(i + 7) * 500, tt = t * SPB; const px = x + Math.cos(a) * sp * tt, py = y + Math.sin(a) * sp * tt * 0.7 + 900 * tt * tt; c.save(); c.globalAlpha = clamp(1.6 - t * 0.7); UI.circ(c, px, py, 30, UI.COL.amber); c.fillStyle = '#7a4a00'; c.font = UI.FONT(34); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('€', px, py + 2); c.restore(); } }
const ITEM_ICON = { D: 'D', m: 'm', l: 'L', t: 'T', o: 'O', h: 'h' };

// ----------------------------------------------------------- shared end card
const URL = 'berlin-bears.joakim-isoaho.workers.dev';
function url(txt, x, y, k) {
  if (k <= 0) return; c.save(); let px = 40; c.font = UI.AFONT(px, 900); while (c.measureText(txt).width > 760 && px > 20) c.font = UI.AFONT(--px, 900);
  const w = c.measureText(txt).width + 60; c.globalAlpha = clamp(k * 3); c.translate(x, y); const s = lerp(0.7, 1, back(k)); c.scale(s, s);
  c.fillStyle = '#000c'; UI.rr(c, -w / 2, -38, w, 76, 38); c.fill(); c.lineWidth = 4; c.strokeStyle = UI.COL.amber; c.stroke();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 0, 2); c.restore();
}
function endCard(B, b0) {
  const t = B - b0; CLUB.update(B);
  const moves = ['U', 'C', 'L', 'U', 'H', 'C', 'R', 'U'], mv = (o) => moves[(Math.floor(t) + o) % moves.length];
  S.pose(CLUB.bru, S.poseAt([[b0 + Math.floor(t) - 1, mv(7)], [b0 + Math.floor(t), mv(0)]], B, 0.2));
  S.pose(CLUB.bae, S.poseAt([[b0 + Math.floor(t) - 1, mv(3)], [b0 + Math.floor(t), mv(4)]], B, 0.2));
  S.aim(CLUB.cam, [Math.sin(t * 0.3) * 0.25, 0.95, lerp(5.0, 4.3, easeOut(t / 3))], [0, 1.25, 0], 54 * (1 - 0.06 * punch(B, [b0, b0 + 1, b0 + 2, b0 + 4, b0 + 6])));
  draw3d(CLUB.s, CLUB.cam, FULL);
  c.fillStyle = 'rgba(19,12,26,.35)'; c.fillRect(0, 0, CW, 820);
  // title slam
  const k = K(B, b0, 0.35);
  c.save(); const s = lerp(2.2, 1, easeOut(k)); c.globalAlpha = clamp(k * 3); c.translate(480, 420); c.scale(s, s); c.rotate(-0.04); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.font = UI.FONT(150); c.lineWidth = 30; c.strokeStyle = '#000'; c.strokeText('TECHNO', 0, -95); c.fillStyle = UI.COL.pink; c.fillText('TECHNO', 0, -95);
  c.font = UI.FONT(178); c.lineWidth = 34; c.strokeText('DÖNER', 0, 85); c.fillStyle = '#7a3e00'; c.fillText('DÖNER', 8, 93); c.fillStyle = UI.COL.amber; c.fillText('DÖNER', 0, 85);
  c.restore();
  UI.caption(c, '2 players · 2 phones', { y: 640, size: 58, k: K(B, b0 + 1, 0.3) });
  UI.caption(c, 'play free in your browser', { y: 760, size: 50, style: 'box', bg: UI.COL.teal, col: '#06201d', k: K(B, b0 + 2, 0.3) });
  url(URL, 480, 905, K(B, b0 + 2.5, 0.3));
  flash(B, b0, 0.3);
}

// =========================================================== PROMO 1: POV at the döner window
const P1 = {
  beats: 50,
  cue: {
    beats: 50,
    sections: [[0, 'drop'], [36, 'break'], [40, 'build'], [41.75, 'gap'], [42, 'drop'], [49, 'tail']],
    sfx: [[4, 'whoosh'], [4.2, 'what'], [5, 'sign'], [6.5, 'sign'], [8, 'sign'], [10, 'whoosh'], [10.6, 'seen'], [12.1, 'seen'], [13.6, 'seen'], [16, 'whoosh'], [20, 'whoosh'], [22, 'seen'], [22.1, 'pop'],
      [24, 'whoosh'], [24.2, 'place'], [25, 'sizzle', 0.8], [26.2, 'place'], [27, 'chop'], [27.25, 'chop'], [27.5, 'chop'], [27.75, 'chop'], [28.2, 'place'], [29, 'chop'], [29.25, 'chop'], [29.5, 'chop'], [29.75, 'chop'],
      [30, 'squirt'], [31, 'whoosh'], [31.1, 'seen'], [32, 'whoosh'], [32.9, 'stamp'], [32.95, 'ching'], [33.05, 'perfect'],
      [36, 'whoosh'], [37, 'knock'], [38, 'knock'], [38.05, 'bad'], [39, 'knock'], [40, 'knock'], [40.5, 'knock'], [41, 'knock'], [41.5, 'knock']],
  },
  draw(B) {
    c.fillStyle = UI.COL.night; c.fillRect(0, 0, CW, CH);
    if (B < 4) { // ---- hook: POV at the window
      WIN.setCustomer(MIA); WIN.hold(null); WIN.update(B); MIA.userData.brows.visible = false;
      const w = clamp((B + 0.7) / 2.4); MIA.position.set(lerp(-2.4, 0, easeOut(w)), 1.75 + bob(B, 0, 0.05), -0.75); MIA.rotation.y = 0.7 * (1 - smooth(w * 1.2));
      S.pose(MIA, w < 1 ? S.PV.I : S.poseAt([[2.4, 'I'], [3, 'U']], B));
      S.aim(WIN.cam, [0, 1.62, lerp(2.5, 1.8, easeOut(B / 4))], [0, 1.6, -3], 64 * (1 - 0.09 * punch(B, [0, 2])));
      draw3d(WIN.s, WIN.cam, FULL);
      UI.caption(c, 'POV: you work the *döner window* at a Berlin *techno club*', { y: 236, size: 66, style: 'box', k: clamp(0.8 + B * 2), from: 0.85 });
    } else if (B < 10) { // ---- too loud to talk, the regular dances
      WIN.setCustomer(MIA); WIN.hold(null); WIN.update(B); MIA.rotation.y = 0;
      const dance = [[4, 'I'], [5, 'L'], [6.5, 'R'], [8, 'C'], [9.5, 'I']];
      MIA.position.set(0, 1.75 + bob(B, 0, 0.05), -0.75); S.pose(MIA, S.poseAt(dance, B));
      S.aim(WIN.cam, [0, 1.58, 2.3], [0, 1.5, -0.8], 58 * (1 - 0.1 * punch(B, [4, 5, 6.5, 8])));
      draw3d(WIN.s, WIN.cam, FULL);
      UI.caption(c, "it's *too loud* to talk", { y: 236, size: 96, k: K(B, 4, 0.25) });
      if (B >= 4.15 && B < 5.1) { const [hx, hy] = proj(WIN.cam, headPt(MIA, [0.35, 0.35, 0]), FULL); UI.chip(c, 'WHAT?!', Math.min(740, hx + 120), hy - 40, { size: 56, k: K(B, 4.15, 0.2), bg: '#fff', col: UI.COL.night, border: UI.COL.night, rot: 0.08 }); }
      [['L', 5], ['R', 6.5], ['C', 8]].forEach(([p, b], i) => UI.poseTile(c, p, 250 + i * 230, 1400, 92, K(B, b, 0.25), { bg: i === Math.floor(clamp((B - 5) / 1.5, 0, 2.99)) ? UI.COL.amber : '#fff' }));
    } else if (B < 16) { // ---- copy it with your body: Bärbel + the player on camera
      SELF.update(B);
      S.pose(SELF.me, S.poseAt([[10, 'I'], [10.6, 'L'], [12.1, 'R'], [13.6, 'C'], [15.2, 'I']], B, 0.3));
      S.aim(SELF.cam, [0, 0.95, 3.0], [0, 1.12, 0], 48 * (1 - 0.08 * punch(B, [10.6, 12.1, 13.6])));
      draw3d(SELF.s, SELF.cam, TOP);
      const pv = S.poseAt([[10, 'I'], [10.35, 'L'], [11.85, 'R'], [13.35, 'C'], [15, 'I']], B, 0.25);
      UI.cameraView(c, pv, 0, 960, CW, 960, B, { dx: -0.06 });
      divider(960);
      UI.caption(c, 'so you copy it *with your body*', { y: 214, size: 70, style: 'box', k: K(B, 10, 0.25) });
      UI.chip(c, 'BÄRBEL · CASHIER', 300, 890, { size: 36, k: K(B, 10.3, 0.25), border: UI.COL.teal });
      [['L', 10.6], ['R', 12.1], ['C', 13.6]].forEach(([p, b], i) => { if (B >= b + 0.3) UI.chip(c, '✓', 590 + i * 105, 1048, { size: 44, bg: UI.COL.green, border: '#fff', k: K(B, b + 0.3, 0.2) }); });
    } else if (B < 20) { // ---- the chef can't see the customer: the strobing hatch
      KIT.update(B, 1); KIT.bruno.visible = false; KIT.baer.rotation.y = 0; KIT.pass(null); KIT.portions([]); KIT.board(null);
      KIT.baer.position.y = 0.82 + bob(B, 0, 0.03);
      S.pose(KIT.baer, S.poseAt([[16, 'I'], [16.5, 'L'], [17.5, 'R'], [18.5, 'C'], [19.5, 'I']], B, 0.2));
      S.aim(KIT.cam, [S.HX, 1.72, lerp(1.1, 0.8, (B - 16) / 4)], [S.HX, 1.58, -1.6], 52 * (1 - 0.08 * punch(B, [16, 18])));
      draw3d(KIT.s, KIT.cam, FULL);
      if (Math.floor(B * 8) % 2 === 0) { c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, 0, CW, CH); }
      UI.caption(c, "your chef *can't see* the customer", { y: 236, size: 80, k: K(B, 16, 0.25) });
      UI.chip(c, "BRUNO'S VIEW", 480, 1440, { size: 40, k: K(B, 16.4, 0.25), border: UI.COL.pink });
    } else if (B < 24) { // ---- he decodes the dance from his book
      KIT.update(B, 0.6); KIT.bruno.visible = true; KIT.pass(null); KIT.portions([]); KIT.board(null);
      const br = KIT.bruno; S.pose(br, S.PV.BOOK); br.userData.squint(smooth((B - 20.3) / 0.4)); br.userData.rig.head.rotation.x = 0.12; br.userData.rig.head.rotation.z = Math.sin(B * Math.PI) * 0.12;
      br.position.y = 0.62 + bob(B, 0, 0.02);
      S.aim(KIT.cam, [S.HX + Math.sin(B) * 0.05, 1.62, -0.85], [S.HX, 1.24, 1.15], 46 * (1 - 0.07 * punch(B, [20, 22])));
      draw3d(KIT.s, KIT.cam, FULL);
      UI.caption(c, 'he decodes it from *his book*', { y: 236, size: 78, k: K(B, 20, 0.25) });
      const sl = easeOut(K(B, 20.25, 0.5)); c.save(); c.translate(100, lerp(1950, 1005, sl)); c.scale(0.9, 0.9); UI.stammBook(c, 0, 0, 830, [0, 1, 2], 1, smooth(K(B, 22, 0.3))); c.restore();
      UI.chip(c, "THAT'S MIA! 🦊", 480, 935, { size: 54, k: K(B, 22, 0.25), bg: UI.COL.green, border: '#fff', rot: -0.05 });
    } else if (B < 32) { // ---- the cook montage, one cut per beat
      const i = Math.floor(B - 24), t = B - 24 - i; KIT.update(B, 0); KIT.bruno.visible = false; KIT.pass(null); KIT.board(null);
      const order = [['D', 24.02], ['m', 26.15], ['l', 28.15], ['o', 29.9], ['h', 30.2]];
      KIT.portions(order.map(([k2, b]) => [k2, K(B, b, 0.35)]));
      const plateCam = (pz) => S.aim(KIT.cam, [0.42 + Math.sin(B * 0.7) * 0.3, 1.82, 1.1 + pz], [0.42, 1.05, -0.06], 38 * (1 - 0.12 * punch(B, [24 + i])));
      let word = '', col = '#fff';
      if (i === 0) { plateCam(0); word = 'BREAD'; }
      else if (i === 1) { KIT.shave(B); S.aim(KIT.cam, [0.55, 1.78, 1.25], [1.15, 1.25, -0.62], 54 * (1 - 0.1 * punch(B, [25]))); word = 'SHAVE!'; col = UI.COL.amber; }
      else if (i === 2) { plateCam(-0.05); word = 'MEAT'; }
      else if (i === 3 || i === 5) { KIT.board(t < 0.5 ? (i === 3 ? 'L' : 'O') : i === 3 ? 'l' : 'o'); KIT.knife.position.y = 1.08 + Math.abs(Math.sin(t * Math.PI * 4)) * 0.16; S.aim(KIT.cam, [-0.22, 1.78, 1.05], [-0.5, 1.02, -0.12], 42 * (1 - 0.1 * punch(B, [24 + i]))); word = i === 3 ? 'CHOP!' : 'ONION'; col = i === 3 ? UI.COL.amber : '#fff'; }
      else if (i === 4) { plateCam(0.03); word = 'SALAD'; }
      else if (i === 6) { plateCam(0); KIT.drip.visible = t < 0.6; KIT.drip.position.set(0.42 + Math.sin(t * 12) * 0.05, 1.18, -0.06); word = 'CHILI'; col = '#ff5a40'; }
      else { KIT.pass('Dmloh'); KIT.portions([]); KIT.baer.rotation.y = 0; S.pose(KIT.baer, S.poseAt([[31, 'I'], [31.3, 'U']], B)); S.aim(KIT.cam, [S.HX, 1.7, 0.7], [S.HX, 1.45, -1.4], 50 * (1 - 0.1 * punch(B, [31]))); word = 'PASS!'; col = UI.COL.green; }
      if (i !== 7) KIT.pass(null);
      draw3d(KIT.s, KIT.cam, FULL);
      // the order so far, as the game's icons
      const got = order.filter(([, b]) => B >= b).length;
      c.fillStyle = '#000b'; UI.rr(c, 150, 230, 660, 140, 30); c.fill(); c.lineWidth = 5; c.strokeStyle = UI.COL.amber; c.stroke();
      order.forEach(([k2], j) => { c.save(); c.globalAlpha = j < got ? 1 : 0.25; UI.drawItem(c, ITEM_ICON[k2], 230 + j * 125, 300, 2.3); c.restore(); });
      floatText(word, 480, 1420, t * 0.9, col, 130);
      flash(B, 24 + i, 0.12, '255,255,255', 0.35);
    } else if (B < 36) { // ---- PERFECT
      WIN.setCustomer(MIA); WIN.update(B); MIA.position.set(0, 1.75 + bob(B, 0, 0.06), -0.75);
      S.pose(MIA, S.poseAt([[32, 'I'], [33, 'U'], [34, 'C'], [35, 'U']], B));
      const g = easeOut(K(B, 32.1, 0.7)); WIN.hold(B < 33.2 ? 'Dmloh' : null); WIN.hand.position.set(lerp(0.3, 0.04, g), lerp(-0.34, -0.12, g), lerp(-0.8, -1.25, g));
      S.aim(WIN.cam, [0, 1.58, 2.3], [0, 1.5, -0.8], 58 * (1 - 0.1 * punch(B, [32, 33, 34, 35])));
      draw3d(WIN.s, WIN.cam, FULL);
      coins(B, 33, 480, 1150);
      UI.stamp(c, 'PERFECT', '+€12', 480, 1150, K(B, 32.9, 0.35));
      UI.caption(c, 'every order, *no words*', { y: 236, size: 76, k: K(B, 33.5, 0.25) });
    } else if (B < 42) { // ---- the fail beat: arms crossed, BANG
      WIN.setCustomer(KALLE); WIN.hold(null); WIN.update(B); KALLE.userData.brows.visible = true;
      const bangs = [37, 38, 39, 40, 40.5, 41, 41.5];
      let pv = S.PV.X; for (const b of bangs) { if (B >= b - 0.35 && B < b) pv = S.lerpPose(S.PV.X, S.PV.BANGU, smooth((B - b + 0.35) / 0.25)); else if (B >= b && B < b + 0.3) pv = S.lerpPose(S.PV.BANGD, S.PV.X, smooth((B - b) / 0.3)); }
      S.pose(KALLE, pv); KALLE.position.set(0, 1.75, -0.75);
      const sh = punch(B, bangs, 0.3) * 0.05;
      S.aim(WIN.cam, [(hash(Math.floor(B * 30)) - 0.5) * sh, 1.58 + (hash(Math.floor(B * 30) + 5) - 0.5) * sh, 2.3], [0, 1.5, -0.8], 54 * (1 - 0.06 * punch(B, bangs, 0.3)));
      draw3d(WIN.s, WIN.cam, FULL);
      c.fillStyle = `rgba(255,32,64,${0.12 * punch(B, bangs, 0.3)})`; c.fillRect(0, 0, CW, CH);
      if (B < 38) UI.caption(c, 'but if you’re *too slow*…', { y: 236, size: 78, k: K(B, 36, 0.25), hl: UI.COL.red });
      else UI.caption(c, 'ABOUT TO LEAVE!', { y: 236, size: 74, maxW: 860, k: K(B, 38, 0.2), col: UI.COL.red, rot: Math.sin(B * 20) * 0.02 });
      // patience: about to leave
      const blink = Math.floor(B * 4) % 2 === 0; c.fillStyle = '#000a'; UI.rr(c, 200, 360, 560, 26, 13); c.fill(); if (blink) { c.fillStyle = UI.COL.red; UI.rr(c, 200, 360, 560 * lerp(0.12, 0.03, (B - 36) / 6), 26, 13); c.fill(); }
      c.save(); c.font = UI.FONT(40); c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = 9; c.strokeStyle = '#000'; const st = `⏳ ${Math.max(1, Math.ceil(lerp(8, 2, (B - 36) / 6)))}s`; c.strokeText(st, 480, 440); c.fillStyle = UI.COL.red; c.fillText(st, 480, 440); c.restore();
      bangs.forEach((b, j) => { const [x, y] = proj(WIN.cam, [0.3, 0.92, -0.35], FULL); floatText('BANG', Math.min(740, Math.max(200, x + (hash(j) - 0.5) * 420)), Math.min(1380, y),  (B - b) / 0.9, '#ff7a30', 96); });
    } else endCard(B, 42);
  },
};

// =========================================================== PROMO 2: can you decode this order?
// Tarek (REGULARS[3]: raccoon, dance RLU, usual "Mit Alles") among look-alike routines in Bruno's book.
const BOOK_ROWS = [0, 1, 3, 7], ANSWER_ROW = 2; // Kalle UCU, Mia LRC, Tarek RLU, Ömer ULR
const ALLES = ['D', 'm', 'l', 't', 'o', 'g', 'h'], ALLES_NAME = ['BREAD', 'MEAT', 'SALAD', 'TOMATO', 'ONION', 'GARLIC', 'CHILI'];
const routine = (b0, step) => [[b0, 'I'], [b0 + 0.3, 'R'], [b0 + 0.3 + step, 'L'], [b0 + 0.3 + 2 * step, 'U'], [b0 + 0.3 + 3 * step, 'I']];
const HOOK_DANCE = [...routine(0, 1.4), ...routine(4.6, 1.0).slice(1)];
const YOU_DANCE = [[29, 'I'], [29.3, 'R'], [30.5, 'L'], [31.7, 'U'], [33, 'I'], [37, 'U']];
const ADD1 = (i) => 20.6 + i * 0.6, ADD2 = (i) => 33.2 + i * 0.55;
function tarek(B, seq) {
  WIN.setCustomer(TAREK); WIN.hold(null); WIN.update(B); TAREK.userData.brows.visible = false; TAREK.rotation.y = 0;
  TAREK.position.set(0, 1.75 + bob(B, 0, 0.05), -0.75); S.pose(TAREK, seq ? S.poseAt(seq, B) : S.PV.I);
}
function book(x, y, sc, hk) { c.save(); c.translate(x, y); c.scale(sc, sc); UI.stammBook(c, 0, 0, 830, BOOK_ROWS, ANSWER_ROW, hk); c.restore(); }
function danceTiles(B, seq, y, r = 92, gap = 230) {
  const cur = stepAt(seq, B);
  ['R', 'L', 'U'].forEach((p, i) => { const first = seq.find(([, k]) => k === p); if (!first) return; UI.poseTile(c, p, 480 - gap + i * gap, y, r, K(B, first[0], 0.25), { bg: cur && cur.v === p ? UI.COL.amber : '#fff' }); });
}
function answerRow(B, at, y) {
  c.fillStyle = '#000b'; UI.rr(c, 75, y - 65, 810, 130, 30); c.fill(); c.lineWidth = 5; c.strokeStyle = UI.COL.amber; c.stroke();
  ALLES.forEach((k2, j) => { c.save(); c.globalAlpha = B >= at(j) ? 1 : 0.2; UI.drawItem(c, ITEM_ICON[k2], 140 + j * 113, y, 2.0); c.restore(); });
}
const P2 = {
  beats: 50,
  cue: {
    beats: 50,
    sections: [[0, 'drop'], [12, 'build'], [17.75, 'gap'], [18, 'drop'], [27, 'build'], [28.875, 'gap'], [29, 'drop'], [41.75, 'gap'], [42, 'drop'], [49, 'tail']],
    sfx: [...HOOK_DANCE.filter(([, k]) => k !== 'I').map(([b]) => [b, 'sign']), [8, 'whoosh'], [12, 'whoosh'], [12, 'tick'], [14, 'tick'], [16, 'tick'],
      [18.05, 'seen'], [18.3, 'pop'], [20.5, 'whoosh'], ...ALLES.map((_, i) => [ADD1(i) + 0.05, 'place']), [25, 'seen'],
      [27, 'whoosh'], [29, 'whoosh'], [29.3, 'sign'], [30.5, 'sign'], [31.7, 'sign'], [32.2, 'seen'], [33, 'whoosh'], ...ALLES.map((_, i) => [ADD2(i) + 0.05, 'place']), [37, 'whoosh'],
      [38, 'whoosh'], [38.9, 'stamp'], [38.95, 'ching'], [39.05, 'perfect']],
  },
  draw(B) {
    c.fillStyle = UI.COL.night; c.fillRect(0, 0, CW, CH);
    if (B < 8) { // ---- the hook: a regular dances their order
      tarek(B, HOOK_DANCE);
      S.aim(WIN.cam, [0, 1.58, lerp(2.7, 2.3, easeOut(B / 8))], [0, 1.5, -0.8], 58 * (1 - 0.09 * punch(B, [0, ...HOOK_DANCE.filter(([, k]) => k !== 'I').map(([b]) => b)])));
      draw3d(WIN.s, WIN.cam, FULL);
      UI.caption(c, 'Can you decode *this order?* 🥙', { y: 236, size: 80, style: 'box', k: clamp(0.8 + B * 2), from: 0.85 });
      danceTiles(B, HOOK_DANCE.filter(([b]) => b < 4.6), 1400);
      UI.chip(c, 'HIS DANCE = HIS ORDER', 480, 1235, { size: 42, k: K(B, 4.6, 0.25), border: UI.COL.pink });
    } else if (B < 12) { // ---- flash Bruno's book
      tarek(B, null); S.aim(WIN.cam, [0, 1.58, 2.3], [0, 1.5, -0.8], 58); draw3d(WIN.s, WIN.cam, FULL);
      c.fillStyle = 'rgba(10,6,16,.72)'; c.fillRect(0, 0, CW, CH);
      const k = easeOut(K(B, 8, 0.3)); c.save(); c.globalAlpha = k; c.translate(0, lerp(300, 0, k)); book(85, 400, 0.95, 0); c.restore();
      UI.caption(c, "check *Bruno's book* 📖", { y: 220, size: 70, k: K(B, 8, 0.25) });
      danceTiles(B, [[8.6, 'R'], [8.9, 'L'], [9.2, 'U'], [9.5, 'I']], 1320, 80, 200);
      flash(B, 8, 0.15);
    } else if (B < 18) { // ---- countdown: comment your answer
      tarek(B, routine(12, 1).concat(routine(16, 0.6).slice(1)));
      S.aim(WIN.cam, [0, 1.6, 1.9], [0, 1.55, -0.8], 52); draw3d(WIN.s, WIN.cam, [70, 330, 400, 520]);
      c.lineWidth = 8; c.strokeStyle = UI.COL.pink; UI.rr(c, 70, 330, 400, 520, 20); c.stroke();
      book(150, 885, 0.68, 0);
      const n = 3 - Math.floor((B - 12) / 2), nk = ((B - 12) % 2) / 2;
      c.save(); const s = lerp(1.6, 1, easeOut(nk * 4)); c.translate(690, 590); c.scale(s, s); UI.circ(c, 0, 0, 170, UI.COL.pink); c.lineWidth = 12; c.strokeStyle = '#fff'; c.beginPath(); c.arc(0, 0, 170, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - nk)); c.stroke();
      c.font = UI.FONT(230); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(String(n), 0, 14); c.restore();
      UI.caption(c, 'comment your answer 👇', { y: 214, size: 70, style: 'box', bg: UI.COL.amber, k: K(B, 12, 0.25) });
      flash(B, 12, 0.15); flash(B, 14, 0.1, '255,79,168', 0.3); flash(B, 16, 0.1, '255,79,168', 0.3);
    } else if (B < 20.5) { // ---- the drop: the matching row
      tarek(B, null); S.aim(WIN.cam, [0, 1.58, 2.3], [0, 1.5, -0.8], 58); draw3d(WIN.s, WIN.cam, FULL);
      c.fillStyle = 'rgba(10,6,16,.72)'; c.fillRect(0, 0, CW, CH);
      const z = 1 + 0.04 * punch(B, [18, 19]); c.save(); c.translate(480, 730); c.scale(z, z); c.translate(-480, -730); book(85, 400, 0.95, smooth(K(B, 18, 0.3))); c.restore();
      UI.caption(c, 'ANSWER:', { y: 220, size: 100, k: K(B, 18, 0.2) });
      UI.chip(c, "IT'S TAREK → MIT ALLES!", 480, 1250, { size: 50, k: K(B, 18.3, 0.25), bg: UI.COL.green, border: '#fff', rot: -0.04 });
      flash(B, 18, 0.3);
    } else if (B < 27) { // ---- stack his usual, portion by portion
      KIT.update(B, 0); KIT.bruno.visible = false; KIT.pass(null); KIT.board(null);
      KIT.portions(ALLES.map((k2, i) => [k2, K(B, ADD1(i), 0.35)]));
      const orbit = (B - 20.5) * 0.1 - 0.3; S.aim(KIT.cam, [0.42 + Math.sin(orbit) * 1.25, lerp(1.95, 1.75, (B - 20.5) / 6.5), -0.06 + Math.cos(orbit) * 1.25], [0.42, 1.05, -0.06], 42 * (1 - 0.1 * punch(B, ALLES.map((_, i) => ADD1(i)))));
      draw3d(KIT.s, KIT.cam, FULL);
      UI.caption(c, 'his usual: *mit alles*', { y: 220, size: 76, k: K(B, 20.5, 0.25) });
      answerRow(B, ADD1, 500);
      const cur = stepAt(ALLES.map((_, i) => [ADD1(i), i]), B);
      if (cur && B < 25) UI.chip(c, ALLES_NAME[cur.v], 480, 1300, { size: 62, k: clamp(cur.t / 0.2), border: UI.COL.teal });
      if (B >= 25) UI.caption(c, 'did you get it? 👀', { y: 1250, size: 80, k: K(B, 25, 0.25), col: UI.COL.amber });
    } else if (B < 29) { // ---- the twist
      UI.cameraView(c, S.poseAt([[27, 'I'], [28.2, 'W']], B), 0, 0, CW, CH, B, { cy: 0.5, size: 0.17 });
      UI.caption(c, 'now do it with *your body* 💃', { y: 300, size: 84, style: 'box', k: K(B, 27, 0.25) });
    } else if (B < 38) { // ---- you dance it, Bruno decodes and cooks
      UI.cameraView(c, S.poseAt(YOU_DANCE, B, 0.25), 0, 0, CW, 960, B, { cy: 0.66, size: 0.24 });
      KIT.update(B, 0); KIT.bruno.visible = false; KIT.board(null); KIT.baer.rotation.y = 0; KIT.baer.position.y = 0.82 + bob(B, 0, 0.02);
      if (B < 33) {
        KIT.portions([]); KIT.pass(null);
        S.pose(KIT.baer, S.poseAt(YOU_DANCE.map(([b, k2]) => [b + 0.15, k2]), B, 0.25));
        S.aim(KIT.cam, [S.HX, 1.6, 0.6], [S.HX, 1.5, -1.8], 46 * (1 - 0.08 * punch(B, [29.45, 30.65, 31.85])));
        draw3d(KIT.s, KIT.cam, BOT);
        UI.chip(c, "BRUNO'S VIEW: BÄRBEL", 480, 1035, { size: 38, k: K(B, 29.1, 0.25), border: UI.COL.teal });
        if (B >= 32.2) UI.chip(c, 'TAREK! → MIT ALLES', 480, 1440, { size: 50, k: K(B, 32.2, 0.25), bg: UI.COL.green, border: '#fff', rot: -0.03 });
      } else {
        KIT.portions(ALLES.map((k2, i) => [k2, K(B, ADD2(i), 0.3)])); KIT.pass(null);
        S.aim(KIT.cam, [0.42, 1.62, 0.95], [0.42, 0.98, -0.06], 36 * (1 - 0.08 * punch(B, ALLES.map((_, i) => ADD2(i)))));
        draw3d(KIT.s, KIT.cam, BOT);
        const done = ALLES.filter((_, i) => B >= ADD2(i)).length;
        UI.chip(c, `BRUNO COOKS  ${done}/7`, 480, 1035, { size: 40, k: K(B, 33, 0.25), border: UI.COL.teal });
        if (B >= 37) UI.chip(c, 'PASS! 👉', 480, 1330, { size: 64, k: K(B, 37, 0.2), bg: UI.COL.green, border: '#fff' });
      }
      divider(960);
      danceTiles(B, YOU_DANCE.slice(0, 5), 820, 62, 150);
    } else if (B < 42) { // ---- PERFECT
      tarek(B, [[38, 'I'], [39, 'U'], [40, 'C'], [41, 'U']]);
      const g = easeOut(K(B, 38.1, 0.7)); WIN.hold(B < 39.2 ? 'Dmlto' : null); WIN.hand.position.set(lerp(0.3, 0.04, g), lerp(-0.34, -0.12, g), lerp(-0.8, -1.25, g));
      S.aim(WIN.cam, [0, 1.58, 2.3], [0, 1.5, -0.8], 58 * (1 - 0.1 * punch(B, [38, 39, 40, 41])));
      draw3d(WIN.s, WIN.cam, FULL);
      coins(B, 39, 480, 1150); UI.stamp(c, 'PERFECT', '+€12', 480, 1150, K(B, 38.9, 0.35));
      UI.caption(c, 'without saying *a word*', { y: 236, size: 76, k: K(B, 39.5, 0.25) });
    } else endCard(B, 42);
  },
};

const PROMOS = { 1: P1, 2: P2 };
let cur = P1;
(window as any).PROMO = {
  ready: (async () => {
    await Promise.all([document.fonts.load('100px Bungee'), document.fonts.load('700 40px Archivo'), document.fonts.load('900 40px Archivo'), document.fonts.load('400 40px Archivo')]);
    await document.fonts.ready;
    S = await import('./scenes'); UI = await import('./ui');
    WIN = S.windowScene(); KIT = S.kitchenScene(); SELF = S.selfScene(); CLUB = S.clubScene();
    MIA = S.regular(0); KALLE = S.regular(2); TAREK = S.regular(1);
    return { bungee: document.fonts.check('40px Bungee'), archivo: document.fonts.check('700 40px Archivo') };
  })(),
  setup(id) { cur = PROMOS[id]; return { frames: Math.round(cur.beats * SPB * FPS), fps: FPS, seconds: cur.beats * SPB }; },
  frame(i, q = 0.93) { cur.draw(i / FPS / SPB); return cv.toDataURL('image/jpeg', q); },
  png(i) { cur.draw(i / FPS / SPB); return cv.toDataURL('image/png'); },
  async audio() { return wavBase64(await renderMusic(cur.cue)); },
};
