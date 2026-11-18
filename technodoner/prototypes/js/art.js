// Berlin Bears — drawing primitives (canvas only, no image assets)
(function () {
  const BB = (window.BB = window.BB || {});
  const A = (BB.Art = {});
  const C = (A.C = {
    ink: '#1b1424',
    bread: '#ecbd78', breadDk: '#c88a45', meat: '#8a4a2a', meatHi: '#c27443',
    lettuce: '#66c447', lettuceDk: '#3d8a2c', tomato: '#e8442f', tomatoLt: '#ff8a6e',
    onion: '#b77ad1', onionLt: '#f1def7', garlic: '#f6f2e6', chili: '#e1262b',
    steel: '#9aa4b4', steelDk: '#5d6777', steelTop: '#c3cad6',
    wood: '#b8794a', woodDk: '#87532e',
    paper: '#fff6e3', amber: '#ffb21e', magenta: '#ff3fa4', cyan: '#3ae0ff', bvg: '#f7d117', tile: '#1fb5a8',
  });
  A.rr = function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
  };
  const rr = A.rr;
  function circ(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function ell(ctx, x, y, rx, ry, fill, stroke, lw) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  A.circ = circ; A.ell = ell;

  // ---------- ingredients ----------
  function lettuceShreds(ctx, x, y, s) {
    ctx.lineCap = 'round';
    const pts = [[-8, -3, 6, -6], [-6, 4, 8, 1], [-2, -7, 3, 7], [-10, 1, -2, 6], [2, -4, 10, -1]];
    ctx.lineWidth = 3.4 * s; ctx.strokeStyle = C.lettuceDk;
    pts.forEach(p => { ctx.beginPath(); ctx.moveTo(x + p[0] * s, y + p[1] * s); ctx.lineTo(x + p[2] * s, y + p[3] * s); ctx.stroke(); });
    ctx.lineWidth = 2.2 * s; ctx.strokeStyle = C.lettuce;
    pts.forEach(p => { ctx.beginPath(); ctx.moveTo(x + p[0] * s, y + p[1] * s); ctx.lineTo(x + p[2] * s, y + p[3] * s); ctx.stroke(); });
  }
  function tomatoSlices(ctx, x, y, s) {
    [[-6, 2], [3, -3], [6, 5]].forEach(([dx, dy]) => {
      circ(ctx, x + dx * s, y + dy * s, 6 * s, C.tomato, C.ink, 1.4 * s);
      circ(ctx, x + dx * s, y + dy * s, 3.4 * s, C.tomatoLt);
    });
  }
  function onionRings(ctx, x, y, s) {
    [[-5, 1], [4, -3], [3, 6]].forEach(([dx, dy]) => {
      circ(ctx, x + dx * s, y + dy * s, 5.5 * s, null, C.onion, 2.4 * s);
      circ(ctx, x + dx * s, y + dy * s, 3 * s, null, C.onionLt, 1.4 * s);
    });
  }
  function meatPile(ctx, x, y, s) {
    ctx.lineCap = 'round';
    const pts = [[-9, 2, -1, -4], [-4, 6, 7, 1], [0, -6, 9, -2], [-8, -4, 2, 3], [-2, 2, 6, 7]];
    ctx.lineWidth = 4.6 * s; ctx.strokeStyle = C.meat;
    pts.forEach(p => { ctx.beginPath(); ctx.moveTo(x + p[0] * s, y + p[1] * s); ctx.quadraticCurveTo(x + (p[0] + p[2]) / 2 * s, y + (p[1] + p[3]) / 2 * s - 3 * s, x + p[2] * s, y + p[3] * s); ctx.stroke(); });
    ctx.lineWidth = 1.8 * s; ctx.strokeStyle = C.meatHi;
    pts.forEach(p => { ctx.beginPath(); ctx.moveTo(x + p[0] * s, y + p[1] * s - 1); ctx.lineTo(x + p[2] * s, y + p[3] * s - 1); ctx.stroke(); });
  }
  function bottle(ctx, x, y, s, col, cap) {
    rr(ctx, x - 6 * s, y - 8 * s, 12 * s, 18 * s, 4 * s); ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 1.5 * s; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 3 * s, y - 8 * s); ctx.lineTo(x, y - 15 * s); ctx.lineTo(x + 3 * s, y - 8 * s); ctx.closePath();
    ctx.fillStyle = cap; ctx.fill(); ctx.stroke();
    rr(ctx, x - 4 * s, y - 2 * s, 8 * s, 6 * s, 1.5 * s); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
  }
  // Recipe icon (chopped forms + sauces)
  A.drawIcon = function (ctx, ch, x, y, s) {
    s = s || 1;
    if (ch === 'm') meatPile(ctx, x, y, s);
    else if (ch === 'l') lettuceShreds(ctx, x, y, s);
    else if (ch === 't') tomatoSlices(ctx, x, y, s);
    else if (ch === 'o') onionRings(ctx, x, y, s);
    else if (ch === 'g') bottle(ctx, x, y + 2 * s, s, C.garlic, '#d8d0b8');
    else if (ch === 'h') bottle(ctx, x, y + 2 * s, s, C.chili, '#7a1010');
  };
  A.drawDoner = function (ctx, item, x, y, s) {
    const c = item.slice(1);
    // pita pocket
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-17, -4); ctx.quadraticCurveTo(-18, 14, 0, 15); ctx.quadraticCurveTo(18, 14, 17, -4);
    ctx.quadraticCurveTo(0, 2, -17, -4); ctx.closePath();
    ctx.fillStyle = C.bread; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.breadDk; ctx.stroke();
    // fillings peeking out
    const fill = [];
    if (c.includes('l')) fill.push(C.lettuce);
    if (c.includes('t')) fill.push(C.tomato);
    if (c.includes('o')) fill.push(C.onion);
    if (c.includes('m')) fill.push(C.meat);
    fill.forEach((col, i) => {
      const n = 4;
      for (let k = 0; k < n; k++) {
        const fx = -13 + k * 8.5 + (i % 2) * 3, fy = -6 - i * 2.2 + Math.sin(k * 2 + i) * 1.5;
        circ(ctx, fx, fy, 3.8, col);
      }
    });
    // back flap
    ctx.beginPath(); ctx.moveTo(-17, -4); ctx.quadraticCurveTo(0, -14 - fill.length * 2, 17, -4);
    ctx.lineWidth = 3; ctx.strokeStyle = C.breadDk; ctx.stroke();
    // sauces
    const drizzle = (col, off) => {
      ctx.beginPath(); ctx.lineWidth = 2.2; ctx.strokeStyle = col;
      for (let k = 0; k <= 6; k++) { const px = -12 + k * 4, py = -8 - fill.length * 1.5 + off + (k % 2 ? 3 : -2); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    };
    if (c.includes('g')) drizzle('#fffdf3', 0);
    if (c.includes('h')) drizzle(C.chili, 3);
    ctx.restore();
  };
  A.drawItem = function (ctx, item, x, y, s) {
    s = s || 1;
    if (!item) return;
    if (item[0] === 'D') return A.drawDoner(ctx, item, x, y, s);
    ell(ctx, x, y + 9 * s, 13 * s, 4 * s, 'rgba(0,0,0,.18)');
    switch (item) {
      case 'L':
        circ(ctx, x, y, 13 * s, C.lettuce, C.lettuceDk, 2 * s);
        ctx.strokeStyle = C.lettuceDk; ctx.lineWidth = 1.6 * s;
        ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 2 * s); ctx.quadraticCurveTo(x, y + 6 * s, x + 8 * s, y - 3 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 5 * s, y - 9 * s); ctx.quadraticCurveTo(x, y - 2 * s, x + 6 * s, y - 9 * s); ctx.stroke();
        break;
      case 'T':
        circ(ctx, x, y, 12 * s, C.tomato, '#9a2516', 2 * s);
        circ(ctx, x - 4 * s, y - 4 * s, 3 * s, 'rgba(255,255,255,.45)');
        ctx.fillStyle = C.lettuceDk; ctx.beginPath();
        for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ctx.lineTo(x + Math.cos(a) * 5 * s, y - 10 * s + Math.sin(a) * 3 * s); }
        ctx.fill();
        break;
      case 'O':
        ell(ctx, x, y + 1 * s, 12 * s, 11 * s, C.onion, '#6e3a86', 2 * s);
        ctx.beginPath(); ctx.moveTo(x - 3 * s, y - 9 * s); ctx.lineTo(x, y - 16 * s); ctx.lineTo(x + 3 * s, y - 9 * s); ctx.fillStyle = C.onion; ctx.fill();
        ctx.strokeStyle = C.onionLt; ctx.lineWidth = 1.3 * s;
        ctx.beginPath(); ctx.moveTo(x, y - 9 * s); ctx.quadraticCurveTo(x - 7 * s, y, x, y + 11 * s); ctx.stroke();
        break;
      case 'l': lettuceShreds(ctx, x, y, s * 1.1); break;
      case 't': tomatoSlices(ctx, x, y, s * 1.1); break;
      case 'o': onionRings(ctx, x, y, s * 1.1); break;
      case 'm': meatPile(ctx, x, y, s * 1.1); break;
    }
  };

  // ---------- bears ----------
  const BEARS = A.BEARS = [
    { name: 'Bruno', body: '#8b5a34', dark: '#5f3a1f', snout: '#d9a877', hat: '#e2332e', hatDk: '#9c1b18', kind: 'cap' },
    { name: 'Bärbel', body: '#efe3cf', dark: '#c9b89c', snout: '#fff7ea', hat: '#16b3a3', hatDk: '#0d7a6f', kind: 'band' },
  ];
  // b: {kind, fx, fy, walk, pose, held, chopping, t, dance, emote, emoteT, ghost}
  A.drawBear = function (ctx, x, y, b) {
    const P = BEARS[b.kind || 0];
    const t = b.t || 0;
    const moving = b.walk && b.moving;
    let bob = moving ? Math.abs(Math.sin(b.walk)) * -3 : Math.sin(t * 2.4 + b.kind) * 0.8;
    const pose = b.poseT > 0 ? b.pose : null;
    let squat = pose === 'D' ? 6 : 0;
    if (b.dance && !pose) bob += Math.sin(t * 13) * 1.5;
    const fx = b.fx || 0, fy = b.fy == null ? 1 : b.fy;
    ctx.save();
    if (b.ghost) ctx.globalAlpha = 0.55;
    ell(ctx, x, y + 14, 20, 7, 'rgba(0,0,0,.25)');
    const by = y - 2 + bob + squat;
    const hy = y - 26 + bob + squat * 1.4;
    const lean = pose === 'L' ? -5 : pose === 'R' ? 5 : 0;
    // held item behind when facing up
    const hx = x + fx * 19, hyI = y - 4 + fy * 10;
    if (b.held && fy < 0) A.drawItem(ctx, b.held, hx, hyI - 8, 0.9);
    // feet
    const step = moving ? Math.sin(b.walk) * 4 : 0;
    ell(ctx, x - 9, y + 12 + step * 0.3, 7, 5, P.dark);
    ell(ctx, x + 9, y + 12 - step * 0.3, 7, 5, P.dark);
    // body
    ell(ctx, x + lean * 0.4, by, 19, 18, P.body, P.dark, 2);
    // apron
    ctx.beginPath(); ctx.ellipse(x + lean * 0.4, by + 4, 11, 12, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    ctx.fillStyle = P.hat; ctx.fillRect(x - 6 + lean * 0.4, by - 4, 12, 2.5);
    // arms
    let al, ar; // [x,y]
    const chopOff = b.chopping ? Math.sin(t * 28) * 5 : 0;
    if (pose === 'U') { al = [x - 15, hy - 14]; ar = [x + 15, hy - 14]; }
    else if (pose === 'L') { al = [x - 30, hy + 2]; ar = [x + 14, by + 4]; }
    else if (pose === 'R') { al = [x - 14, by + 4]; ar = [x + 30, hy + 2]; }
    else if (pose === 'D') { al = [x - 22, by + 10]; ar = [x + 22, by + 10]; }
    else if (b.held || b.chopping) {
      const px = -fy, py = fx; // perpendicular
      al = [x + fx * 15 + px * 10, by + fy * 8 + py * 6 - 2 + chopOff];
      ar = [x + fx * 15 - px * 10, by + fy * 8 - py * 6 - 2 - chopOff];
    } else { al = [x - 18, by + 2 + step * 0.4]; ar = [x + 18, by + 2 - step * 0.4]; }
    circ(ctx, al[0], al[1], 6.5, P.body, P.dark, 2);
    circ(ctx, ar[0], ar[1], 6.5, P.body, P.dark, 2);
    // head
    const hx2 = x + lean + fx * 2;
    circ(ctx, hx2 - 12, hy - 11, 6.5, P.body, P.dark, 2);
    circ(ctx, hx2 + 12, hy - 11, 6.5, P.body, P.dark, 2);
    circ(ctx, hx2 - 12, hy - 11, 3, P.snout);
    circ(ctx, hx2 + 12, hy - 11, 3, P.snout);
    circ(ctx, hx2, hy, 16, P.body, P.dark, 2);
    if (fy >= 0 || fx !== 0) {
      const sx = hx2 + fx * 5, sy = hy + 5 + (fy > 0 ? 1 : 0);
      ell(ctx, sx, sy, 8, 6, P.snout);
      circ(ctx, sx + fx * 2, sy - 2, 2.8, C.ink);
      const ex = fx * 4;
      if (b.dance && pose) {
        // happy closed eyes
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(hx2 - 6 + ex, hy - 3, 3, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(hx2 + 6 + ex, hy - 3, 3, Math.PI, 0); ctx.stroke();
      } else {
        if (fx <= 0) circ(ctx, hx2 - 6 + ex, hy - 3, 2.4, C.ink);
        if (fx >= 0) circ(ctx, hx2 + 6 + ex, hy - 3, 2.4, C.ink);
      }
    }
    // hat
    if (P.kind === 'cap') {
      ctx.beginPath(); ctx.arc(hx2, hy - 4, 15, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath();
      ctx.fillStyle = P.hat; ctx.fill(); ctx.strokeStyle = P.hatDk; ctx.lineWidth = 2; ctx.stroke();
      ell(ctx, hx2 + fx * 12, hy - 8 + (fy > 0 ? 3 : fy < 0 ? -4 : 0), fx ? 9 : 11, 3.5, P.hatDk);
    } else {
      ctx.fillStyle = P.hat; ctx.strokeStyle = P.hatDk; ctx.lineWidth = 2;
      rr(ctx, hx2 - 15, hy - 12, 30, 7, 3); ctx.fill(); ctx.stroke();
      const kx = hx2 - fx * 14 + (fx === 0 ? 13 : 0);
      ctx.beginPath(); ctx.moveTo(kx, hy - 9); ctx.lineTo(kx + 7, hy - 15); ctx.lineTo(kx + 8, hy - 4); ctx.closePath(); ctx.fill();
    }
    // held item in front
    if (b.held && fy >= 0) A.drawItem(ctx, b.held, hx, hyI + 2, 0.9);
    ctx.restore();
    if (b.emote != null && b.emote >= 0 && b.emoteT > 0) A.drawSign(ctx, x, y - 70, BB.SIGNS[b.emote], Math.min(1, b.emoteT * 3), b.kind);
  };

  // Hand-sign bubble: a paw holding up an ingredient icon
  A.drawSign = function (ctx, x, y, ch, a, kind) {
    const P = BEARS[kind || 0];
    ctx.save(); ctx.globalAlpha = a;
    const s = 0.7 + 0.3 * a;
    ctx.translate(x, y); ctx.scale(s, s);
    rr(ctx, -24, -22, 48, 40, 14); ctx.fillStyle = C.paper; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = P.hat; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, 17); ctx.lineTo(0, 27); ctx.lineTo(6, 17); ctx.fillStyle = C.paper; ctx.fill();
    ctx.strokeStyle = P.hat; ctx.beginPath(); ctx.moveTo(-6, 18); ctx.lineTo(0, 27); ctx.lineTo(6, 18); ctx.stroke();
    A.drawIcon(ctx, ch, 0, -2, 1.05);
    // little paw
    circ(ctx, 15, 10, 6, P.body, P.dark, 1.5);
    ctx.restore();
  };

  // ---------- customers (Berlin wildlife) ----------
  const SPECIES = [
    { n: 'fox', c: '#e2752c', d: '#9c4515', m: '#fff1e2' },
    { n: 'raccoon', c: '#8f8e98', d: '#4a4955', m: '#e7e5ea' },
    { n: 'boar', c: '#6d4a35', d: '#3f2a1d', m: '#a77a5d' },
    { n: 'rabbit', c: '#e9dcc8', d: '#a8977c', m: '#fff' },
    { n: 'pigeon', c: '#8796b0', d: '#4f5c75', m: '#c4d0e3' },
  ];
  A.drawCustomer = function (ctx, x, y, seed, t, o) {
    o = o || {};
    const sp = SPECIES[seed % SPECIES.length];
    const acc = (seed >> 3) % 4;
    const pose = o.pose;
    const r = o.r || 22;
    const k = r / 22;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    let tilt = pose === 'L' ? -0.25 : pose === 'R' ? 0.25 : 0;
    let dy = pose === 'U' ? -4 : pose === 'D' ? 5 : Math.sin(t * 3 + seed) * 1.2;
    // arms for dance
    if (pose) {
      const arm = (ax, ay) => circ(ctx, ax, ay, 5.5, sp.c, sp.d, 2);
      if (pose === 'U') { arm(-17, -26); arm(17, -26); }
      else if (pose === 'L') { arm(-30, -6); arm(14, 14); }
      else if (pose === 'R') { arm(-14, 14); arm(30, -6); }
      else { arm(-20, 18); arm(20, 18); }
    }
    ctx.translate(0, dy); ctx.rotate(tilt);
    // ears
    if (sp.n === 'fox') { tri(ctx, -16, -10, -8, -30, -2, -14, sp.c, sp.d); tri(ctx, 16, -10, 8, -30, 2, -14, sp.c, sp.d); }
    else if (sp.n === 'rabbit') { ell(ctx, -8, -30, 5, 15, sp.c, sp.d, 2); ell(ctx, 8, -30, 5, 15, sp.c, sp.d, 2); ell(ctx, -8, -30, 2, 10, '#f5b9c4'); ell(ctx, 8, -30, 2, 10, '#f5b9c4'); }
    else if (sp.n === 'raccoon') { circ(ctx, -14, -15, 7, sp.c, sp.d, 2); circ(ctx, 14, -15, 7, sp.c, sp.d, 2); }
    else if (sp.n === 'boar') { tri(ctx, -16, -8, -14, -24, -4, -14, sp.c, sp.d); tri(ctx, 16, -8, 14, -24, 4, -14, sp.c, sp.d); }
    circ(ctx, 0, 0, 20, sp.c, sp.d, 2.5);
    if (sp.n === 'raccoon') { ell(ctx, -8, -2, 8, 5, '#2b2a33'); ell(ctx, 8, -2, 8, 5, '#2b2a33'); }
    if (sp.n === 'pigeon') { ctx.beginPath(); ctx.arc(0, 8, 18, 0.2, Math.PI - 0.2); ctx.lineWidth = 5; ctx.strokeStyle = '#5fbf9f'; ctx.stroke(); }
    // muzzle
    if (sp.n === 'boar') { ell(ctx, 0, 8, 10, 7, sp.m, sp.d, 2); circ(ctx, -3, 8, 1.8, sp.d); circ(ctx, 3, 8, 1.8, sp.d); tri(ctx, -9, 10, -7, 2, -5, 10, '#fff', null); tri(ctx, 9, 10, 7, 2, 5, 10, '#fff', null); }
    else if (sp.n === 'pigeon') { tri(ctx, -5, 4, 5, 4, 0, 13, '#e3a33b', '#8a5a16'); }
    else { ell(ctx, 0, 8, 9, 7, sp.m); circ(ctx, 0, 5, 3, C.ink); }
    // eyes
    const angry = o.mood < 0.25;
    if (acc === 1) {
      rr(ctx, -16, -8, 14, 8, 3); ctx.fillStyle = '#111'; ctx.fill();
      rr(ctx, 2, -8, 14, 8, 3); ctx.fill(); ctx.fillRect(-3, -6, 6, 2);
    } else {
      circ(ctx, -7, -3, 3, sp.n === 'raccoon' ? '#fff' : C.ink);
      circ(ctx, 7, -3, 3, sp.n === 'raccoon' ? '#fff' : C.ink);
      if (sp.n === 'raccoon') { circ(ctx, -7, -3, 1.6, C.ink); circ(ctx, 7, -3, 1.6, C.ink); }
    }
    if (angry) {
      ctx.strokeStyle = '#c4161c'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-12, -11); ctx.lineTo(-3, -7); ctx.moveTo(12, -11); ctx.lineTo(3, -7); ctx.stroke();
    }
    if (acc === 2) { // beanie
      ctx.beginPath(); ctx.arc(0, -6, 20, Math.PI, 0); ctx.closePath(); ctx.fillStyle = ['#2b2b2b', '#d84a7c', '#2f6fd1', '#e9a12a'][seed % 4]; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-20, -9, 40, 4);
    }
    if (acc === 3) circ(ctx, 19, 6, 2.6, null, '#ffd23f', 2);
    ctx.restore();
  };
  function tri(ctx, a, b, c, d, e, f, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  A.tri = tri;

  // ---------- dance arrows ----------
  A.drawArrow = function (ctx, d, x, y, s, fill, stroke) {
    const ang = { U: -Math.PI / 2, R: 0, D: Math.PI / 2, L: Math.PI }[d];
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(0, -9); ctx.lineTo(0, -4); ctx.lineTo(-9, -4); ctx.lineTo(-9, 4); ctx.lineTo(0, 4); ctx.lineTo(0, 9); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = 2 / s; ctx.strokeStyle = stroke; ctx.stroke(); }
    ctx.restore();
  };

  // ---------- tiles ----------
  const THEMES = A.THEMES = {
    kotti: { floorA: '#f2efe6', floorB: '#cfe4ea', grout: '#b9c6cc', counter: '#9aa4b4', top: '#d5dbe4', front: '#6b7585', bg: '#22324a' },
    bunker: { floorA: '#2a2630', floorB: '#24212a', grout: '#1a171f', counter: '#3d3946', top: '#5b5566', front: '#24212b', bg: '#0b0910' },
    u8: { floorA: '#6c7078', floorB: '#666a72', grout: '#5a5d65', counter: '#c8c2b0', top: '#e6e0cf', front: '#8f8a7a', bg: '#101317' },
  };
  A.drawFloor = function (ctx, x, y, c, r, theme, t, extra) {
    const th = THEMES[theme];
    const T = BB.T;
    if (theme === 'kotti') {
      ctx.fillStyle = (c + r) % 2 ? th.floorA : th.floorB; ctx.fillRect(x, y, T, T);
    } else if (theme === 'bunker') {
      ctx.fillStyle = th.floorA; ctx.fillRect(x, y, T, T);
      ctx.strokeStyle = th.grout; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
      if (extra && extra.dance) {
        const hue = [320, 190, 50, 270][(c + r + Math.floor(t * 2.13)) % 4];
        ctx.fillStyle = `hsla(${hue},95%,60%,${0.35 + 0.25 * Math.max(0, Math.sin(t * Math.PI * 4.27))})`;
        ctx.fillRect(x + 4, y + 4, T - 8, T - 8);
      }
    } else {
      ctx.fillStyle = th.floorA; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      for (let k = 0; k < 6; k++) { const px = ((c * 37 + r * 91 + k * 53) % 60) + 2, py = ((c * 17 + r * 29 + k * 71) % 60) + 2; ctx.fillRect(x + px, y + py, 2, 2); }
      if (r === 3 || r === 4) { ctx.fillStyle = 'rgba(247,209,23,.12)'; }
    }
  };
  function counterBase(ctx, x, y, th) {
    const T = BB.T;
    ctx.fillStyle = th.front; ctx.fillRect(x, y + T - 14, T, 14);
    ctx.fillStyle = th.top; ctx.fillRect(x, y, T, T - 14);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, y, T, 3);
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
  }
  function crate(ctx, x, y, label, col) {
    rr(ctx, x + 6, y + 6, 52, 38, 5); ctx.fillStyle = C.wood; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.woodDk; ctx.stroke();
    ctx.fillStyle = C.woodDk; ctx.fillRect(x + 6, y + 22, 52, 3);
    ctx.fillStyle = col; rr(ctx, x + 18, y + 40, 28, 10, 3); ctx.fill();
  }
  A.drawStation = function (ctx, ch, x, y, theme, t, st) {
    const th = THEMES[theme];
    const T = BB.T;
    st = st || {};
    if (ch === 'P') {
      ell(ctx, x + 32, y + 40, 14, 6, 'rgba(0,0,0,.25)');
      rr(ctx, x + 26, y - 30, 12, 72, 6); ctx.fillStyle = C.bvg; ctx.fill(); ctx.strokeStyle = '#a88a00'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 29, y - 26, 3, 64);
      return;
    }
    if (ch === 'D') {
      const open = st.open;
      ctx.fillStyle = '#c8c2b0'; ctx.fillRect(x, y, T, T);
      if (open) {
        const g = ctx.createLinearGradient(0, y, 0, y + T);
        g.addColorStop(0, '#fff3b0'); g.addColorStop(1, '#ffd84a');
        ctx.fillStyle = g; ctx.fillRect(x + 4, y, T - 8, T - 6);
        ctx.fillStyle = '#9aa0a8'; ctx.fillRect(x, y, 4, T); ctx.fillRect(x + T - 4, y, 4, T);
        ctx.fillStyle = 'rgba(46,200,90,.85)'; ctx.fillRect(x + 8, y + T - 10, T - 16, 5);
      } else {
        ctx.fillStyle = '#d7d2c3'; ctx.fillRect(x + 2, y, T / 2 - 3, T - 6); ctx.fillRect(x + T / 2 + 1, y, T / 2 - 3, T - 6);
        ctx.fillStyle = '#2b3442'; rr(ctx, x + 8, y + 8, 18, 26, 4); ctx.fill(); rr(ctx, x + 38, y + 8, 18, 26, 4); ctx.fill();
        ctx.fillStyle = '#e1262b'; ctx.fillRect(x + 8, y + T - 10, T - 16, 5);
      }
      return;
    }
    counterBase(ctx, x, y, th);
    switch (ch) {
      case 'B': crate(ctx, x, y, 'BROT', C.bread);
        ell(ctx, x + 22, y + 18, 12, 7, C.bread, C.breadDk, 1.5); ell(ctx, x + 40, y + 20, 12, 7, C.bread, C.breadDk, 1.5); ell(ctx, x + 31, y + 12, 12, 7, C.bread, C.breadDk, 1.5); break;
      case 'L': crate(ctx, x, y, '', C.lettuce); A.drawItem(ctx, 'L', x + 24, y + 20, 0.8); A.drawItem(ctx, 'L', x + 41, y + 18, 0.8); break;
      case 'T': crate(ctx, x, y, '', C.tomato); A.drawItem(ctx, 'T', x + 22, y + 20, 0.8); A.drawItem(ctx, 'T', x + 40, y + 20, 0.8); A.drawItem(ctx, 'T', x + 31, y + 13, 0.8); break;
      case 'O': crate(ctx, x, y, '', C.onion); A.drawItem(ctx, 'O', x + 23, y + 21, 0.8); A.drawItem(ctx, 'O', x + 41, y + 21, 0.8); break;
      case 'C':
        rr(ctx, x + 8, y + 7, 48, 36, 6); ctx.fillStyle = '#d9a46b'; ctx.fill(); ctx.strokeStyle = C.woodDk; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x + 14, y + 14, 36, 2); ctx.fillRect(x + 14, y + 30, 30, 2);
        if (!st.item) { ctx.fillStyle = '#ccd3dd'; ctx.fillRect(x + 20, y + 22, 26, 6); ctx.fillStyle = '#333'; ctx.fillRect(x + 12, y + 22, 9, 6); }
        break;
      case 'S': {
        // vertical döner spit with heater
        ctx.fillStyle = '#e64a19'; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6); rr(ctx, x + 6, y - 22, 52, 64, 10); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x + 30, y - 26, 4, 70);
        ctx.beginPath(); ctx.moveTo(x + 16, y - 18); ctx.lineTo(x + 48, y - 18); ctx.lineTo(x + 42, y + 34); ctx.lineTo(x + 22, y + 34); ctx.closePath();
        ctx.fillStyle = C.meat; ctx.fill(); ctx.strokeStyle = '#5a2c14'; ctx.lineWidth = 2; ctx.stroke();
        ctx.save(); ctx.clip();
        for (let k = 0; k < 7; k++) {
          const off = ((t * 18 + k * 9) % 63) - 8;
          ctx.fillStyle = k % 2 ? C.meatHi : '#a45a30'; ctx.fillRect(x + 14 + off * 0.6, y - 20, 4, 56);
        }
        ctx.fillStyle = 'rgba(255,190,90,.35)'; ctx.fillRect(x + 14, y - 20, 8, 56);
        ctx.restore();
        ell(ctx, x + 32, y + 36, 14, 4, '#777');
        break;
      }
      case 'G': A.drawIcon(ctx, 'g', x + 22, y + 22, 1.3); A.drawIcon(ctx, 'g', x + 42, y + 24, 1.1); break;
      case 'H': A.drawIcon(ctx, 'h', x + 22, y + 22, 1.3); A.drawIcon(ctx, 'h', x + 42, y + 24, 1.1); break;
      case 'W':
        ctx.fillStyle = theme === 'bunker' ? '#1b1722' : '#2b3f5c'; ctx.fillRect(x, y, T, 14);
        for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#fff' : (theme === 'bunker' ? C.magenta : '#e2332e'); ctx.fillRect(x + k * 16, y + 14, 16, 8); }
        ctx.beginPath(); ctx.moveTo(x, y + 22); for (let k = 0; k <= 4; k++) ctx.arc(x + k * 16 + 8, y + 22, 8, 0, Math.PI); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill();
        circ(ctx, x + 50, y + 38, 6, '#e9c46a', '#8a6a1a', 2); ctx.fillStyle = '#8a6a1a'; ctx.fillRect(x + 47, y + 43, 6, 2);
        break;
      case 'X':
        rr(ctx, x + 14, y + 8, 36, 38, 6); ctx.fillStyle = '#3c4a3f'; ctx.fill(); ctx.strokeStyle = '#1e2620'; ctx.lineWidth = 2; ctx.stroke();
        ell(ctx, x + 32, y + 10, 18, 5, '#2a352c'); ctx.fillStyle = '#9fb3a4'; ctx.font = '700 10px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MÜLL', x + 32, y + 32);
        break;
    }
  };
})();
