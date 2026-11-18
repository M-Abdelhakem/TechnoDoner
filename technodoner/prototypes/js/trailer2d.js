// Berlin Bears: interactive promo trailer (16:9 canvas, scripted scenes, one interactive beat)
(function () {
  const BB = window.BB, A = BB.Art, C = A.C;
  const W = 960, H = 540, TEAL = '#16b3a3';
  const $ = s => document.querySelector(s);
  const cv = $('#tv'), ctx = cv.getContext('2d');
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Link the end card to the playable game, once it has a URL.
  const GAME_URL = 'https://claude.ai/artifact/L31oprWLxHt1CUPs4Ue7Xy';

  const SCENES = [
    { id: 'cold', label: 'Berlin, 03:00', d: 6, music: 'title' },
    { id: 'club', label: 'Too loud', d: 6, music: 'bunker', muffle: true },
    { id: 'roles', label: 'Two roles', d: 8, music: 'bunker', muffle: true },
    { id: 'dance', label: 'Copy the dance', d: 9, music: 'bunker' },
    { id: 'signs', label: 'Paw signs', d: 8, music: 'bunker' },
    { id: 'grill', label: 'Cook + serve', d: 7, music: 'kotti' },
    { id: 'devices', label: 'Two phones', d: 6, music: 'title' },
    { id: 'end', label: 'Play', d: 5, music: 'title' },
  ];
  let acc = 0; SCENES.forEach(s => { s.t0 = acc; acc += s.d; });
  const TOTAL = acc;
  const DANCE_AT = SCENES[3].t0 + 3.2; // interactive pause point
  const SEQ = 'URLD';
  const RECIPE = 'mltogh';

  const st = { tt: 0, playing: false, started: false, inter: { done: false, prog: 0, result: null, since: 0, flashT: 0, wrongT: 0 }, pose: null, poseT: 0, sceneIdx: -1, firedCues: new Set() };

  // ---------- helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = x => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
  const fade = (lt, a, b, f) => ease((lt - a) / (f || 0.4)) * (b == null ? 1 : ease((b - lt) / (f || 0.4)));
  function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function txt(s, x, y, font, col, align) { ctx.font = font; ctx.fillStyle = col; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y); }
  function panel(x, y, w, h, r, fill, stroke, lw) { A.rr(ctx, x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); } }
  function caption(main, sub, a, y, col) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = '400 34px Bungee, Archivo, sans-serif';
    const w1 = ctx.measureText(main).width;
    ctx.font = '700 16px Archivo, sans-serif';
    const w2 = sub ? ctx.measureText(sub).width : 0;
    const bw = Math.max(w1, w2) + 40, bx = W / 2 - bw / 2, by = y - 40;
    panel(bx, by, bw, sub ? 82 : 56, 12, 'rgba(12,7,20,.82)');
    ctx.fillStyle = col || C.amber; ctx.fillRect(bx, by, 6, sub ? 82 : 56);
    txt(main, W / 2, y, '400 34px Bungee, Archivo, sans-serif', '#fff', 'center');
    if (sub) txt(sub, W / 2, y + 28, '700 16px Archivo, sans-serif', 'rgba(255,255,255,.82)', 'center');
    ctx.restore();
  }
  function kicker(s, a, col) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = '800 13px Archivo, sans-serif'; const w = ctx.measureText(s).width + 24;
    panel(24, 22, w, 28, 14, col || C.magenta); txt(s, 36, 41, '800 13px Archivo, sans-serif', '#fff');
    ctx.restore();
  }

  // ---------- reusable visuals ----------
  // cartoon kitchen glove pointer (tip at x,y)
  function glove(x, y, s, rot, press, cuff) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); const k = s * (press ? 0.9 : 1); ctx.scale(k, k);
    const fill = '#fffaf0', ink = '#1b1424';
    ctx.lineWidth = 3; ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineJoin = 'round';
    const shape = f => { f(); ctx.fill(); ctx.stroke(); };
    shape(() => { ctx.beginPath(); ctx.ellipse(-25, 38, 9, 14, -0.6, 0, Math.PI * 2); });
    shape(() => A.rr(ctx, -22, 20, 46, 42, 17));
    shape(() => A.rr(ctx, -8, 0, 17, 36, 8.5));
    [[14, 24, 9], [22, 33, 8], [23, 44, 7]].forEach(([cx, cy, r]) => shape(() => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); }));
    ctx.fillStyle = cuff || '#e2332e'; shape(() => A.rr(ctx, -20, 58, 44, 16, 6));
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, 46); ctx.lineTo(10, 46); ctx.stroke();
    ctx.restore();
  }
  function hoverOutline(fn, t) {
    ctx.save(); ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 18; ctx.lineWidth = 6; ctx.strokeStyle = `rgba(255,210,63,${0.75 + 0.25 * Math.sin(t * 8)})`;
    fn(); ctx.stroke(); ctx.restore();
  }
  function bear(kind, x, y, s, o) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); A.drawBear(ctx, 0, 0, Object.assign({ kind, fx: 0, fy: 1, walk: 0 }, o)); ctx.restore(); }
  function signBubble(si, x, y, s, a, edge) {
    const S = SIGN_LIST[si];
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
    panel(-34, -32, 68, 60, 16, C.paper, edge || TEAL, 4);
    if (S.k) A.drawIcon(ctx, S.k, 0, -2, 1.5); else thumb(0, 0, 1, S.up);
    ctx.restore();
  }
  function thumb(x, y, s, up) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, up ? s : -s);
    ctx.fillStyle = up ? '#22b35a' : '#d32222'; ctx.strokeStyle = '#1b1424'; ctx.lineWidth = 2.5;
    A.rr(ctx, -12, -2, 22, 18, 5); ctx.fill(); ctx.stroke();
    A.rr(ctx, -6, -18, 9, 20, 4.5); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  const SIGN_LIST = [{ k: 'm', n: 'Fleisch' }, { k: 'l', n: 'Salat' }, { k: 't', n: 'Tomate' }, { k: 'o', n: 'Zwiebel' }, { k: 'g', n: 'Knoblauch' }, { k: 'h', n: 'Scharf' }, { up: true, n: 'Ja' }, { up: false, n: 'Nein' }];
  function wheel(cx, cy, r, sel, a, t) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    const n = 8, inner = r * 0.38;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + (i - 0.5) * (Math.PI * 2 / n) + 0.02, a1 = a0 + Math.PI * 2 / n - 0.04;
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.arc(cx, cy, inner, a1, a0, true); ctx.closePath();
      ctx.fillStyle = i === sel ? 'rgba(255,210,63,.95)' : 'rgba(255,246,227,.92)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = i === sel ? '#b07d00' : 'rgba(27,20,36,.5)'; ctx.stroke();
      const am = (a0 + a1) / 2, ix = cx + Math.cos(am) * (r + inner) / 2, iy = cy + Math.sin(am) * (r + inner) / 2;
      const S = SIGN_LIST[i];
      if (S.k) A.drawIcon(ctx, S.k, ix, iy, i === sel ? 1.3 : 1.05); else thumb(ix, iy + (S.up ? 4 : -4), i === sel ? 1.15 : 0.95, S.up);
    }
    A.circ(ctx, cx, cy, inner - 6, 'rgba(18,12,28,.9)');
    if (sel >= 0) txt(SIGN_LIST[sel].n.toUpperCase(), cx, cy + 5, '400 13px Bungee, Archivo, sans-serif', '#fff', 'center');
    ctx.restore();
  }
  function logoSign(x, y, s, on) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (on > 0) { ctx.shadowColor = `rgba(255,178,30,${0.7 * on})`; ctx.shadowBlur = 50; }
    const g = ctx.createLinearGradient(0, -80, 0, 80);
    g.addColorStop(0, on > 0.5 ? '#ffd25a' : '#6b5420'); g.addColorStop(1, on > 0.5 ? '#f29a00' : '#4a3a14');
    panel(-220, -82, 440, 164, 18, g, '#2b1d0a', 6);
    ctx.shadowBlur = 0;
    txt('BERLIN', 0, -14, '400 62px Bungee, Archivo, sans-serif', on > 0.5 ? '#c4161c' : '#5a2a1a', 'center');
    txt('BEARS', 0, 50, '400 62px Bungee, Archivo, sans-serif', on > 0.5 ? '#c4161c' : '#5a2a1a', 'center');
    ctx.restore();
  }

  // ---------- environments ----------
  const R1 = rnd(42); const STARS = Array.from({ length: 70 }, () => [R1() * W, R1() * 300, R1()]);
  const R2 = rnd(7); const BLDG = []; for (let x = -20; x < W; x += 50 + R2() * 70) BLDG.push([x, 300 + R2() * 140, 50 + R2() * 70, Math.floor(R2() * 1000)]);
  function skyline(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0716'); g.addColorStop(0.65, '#2e1543'); g.addColorStop(1, '#6a2a52');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    STARS.forEach(([x, y, k]) => { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t * (0.5 + k) + k * 9))})`; ctx.fillRect(x, y, 2, 2); });
    // TV tower
    ctx.fillStyle = '#120a1d';
    ctx.fillRect(724, 150, 14, 330); ctx.beginPath(); ctx.arc(731, 196, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(728, 70, 6, 100); ctx.fillRect(716, 228, 30, 10);
    A.circ(ctx, 731, 70, 4, Math.sin(t * 3) > 0 ? '#ff3b3b' : '#5a1010');
    BLDG.forEach(([x, y, w, s]) => {
      ctx.fillStyle = '#140c20'; ctx.fillRect(x, y, w, H - y);
      for (let wy = y + 12; wy < H - 20; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 16) {
        const on = ((wx * 7 + wy * 13 + s) % 11) < 4;
        if (on) { ctx.fillStyle = 'rgba(255,200,110,.55)'; ctx.fillRect(wx, wy, 7, 10); }
      }
    });
  }
  function bunker(t, beat) {
    // concrete bunker with a leaking magenta door
    ctx.fillStyle = '#2a2530'; ctx.fillRect(250, 370, 460, 170);
    ctx.fillStyle = '#35303d'; for (let i = 0; i < 8; i++) ctx.fillRect(250, 380 + i * 20, 460, 2);
    const glow = 0.35 + 0.5 * Math.pow(1 - beat, 3);
    ctx.save(); ctx.shadowColor = C.magenta; ctx.shadowBlur = 40 * glow; ctx.fillStyle = `rgba(255,63,164,${0.4 + glow * 0.5})`; ctx.fillRect(452, 430, 56, 110); ctx.restore();
    if (!reduce) for (let k = 0; k < 3; k++) { const r = ((t * 1.1 + k / 3) % 1) * 140; ctx.strokeStyle = `rgba(255,63,164,${0.5 * (1 - r / 140)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(480, 470, r, Math.PI, 0); ctx.stroke(); }
  }
  function club(t, beat) {
    ctx.fillStyle = '#0d0912'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    [[C.magenta, 0], [C.cyan, 2.1], ['#ffd23f', 4.2]].forEach(([col, ph]) => {
      const sx = (Math.sin(t * 0.8 + ph) * 0.45 + 0.5) * W, sy = 120;
      const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, 300); gr.addColorStop(0, col + '55'); gr.addColorStop(1, col + '00');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    });
    if (!reduce) { ctx.lineWidth = 2; for (let k = 0; k < 7; k++) { const a = t * 1.2 + k * 0.9; ctx.strokeStyle = k % 2 ? 'rgba(58,224,255,.35)' : 'rgba(255,63,164,.4)'; ctx.beginPath(); ctx.moveTo(480, 0); ctx.lineTo(480 + Math.cos(a) * 800, Math.abs(Math.sin(a)) * 600); ctx.stroke(); } }
    ctx.restore();
    ctx.fillStyle = '#05030a';
    for (let i = 0; i < 28; i++) { const x = i * 36 - 8, bob = reduce ? 0 : Math.abs(Math.sin(t * 6.8 + i * 1.7)) * 10; ctx.beginPath(); ctx.arc(x, 400 - bob, 19, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 21, 410 - bob, 42, 140); if (i % 4 === 1) { ctx.fillRect(x - 26, 360 - bob, 6, 40); } }
    ctx.fillStyle = `rgba(255,255,255,${reduce ? 0 : 0.07 * Math.pow(1 - beat, 4)})`; ctx.fillRect(0, 0, W, H);
  }
  function windowFrame() {
    for (let k = 0; k < 32; k++) { ctx.fillStyle = k % 2 ? '#fff' : C.magenta; ctx.fillRect(k * 30, 0, 30, 30); }
    ctx.beginPath(); for (let k = 0; k <= 32; k++) ctx.arc(k * 30 + 15, 30, 15, 0, Math.PI); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill();
    const g = ctx.createLinearGradient(0, 440, 0, H); g.addColorStop(0, '#c3cad6'); g.addColorStop(1, '#8d98a8');
    ctx.fillStyle = g; ctx.fillRect(0, 446, W, 94); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, 446, W, 3);
    ctx.fillStyle = '#2b3f5c'; ctx.fillRect(0, 30, 18, 416); ctx.fillRect(W - 18, 30, 18, 416);
  }
  function ticket(x, y, revealed, prog, t, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    panel(x, y, 250, 120, 16, C.paper, revealed ? '#22b35a' : C.magenta, 4);
    if (!revealed) {
      txt('DANCE ORDER', x + 125, y + 26, '800 13px Archivo, sans-serif', '#8a1f6a', 'center');
      for (let k = 0; k < 4; k++) A.drawArrow(ctx, SEQ[k], x + 125 + (k - 1.5) * 50, y + 68, 2, k < prog ? '#22b35a' : C.magenta, '#1b1424');
      txt('???', x + 125, y + 108, '400 14px Bungee, Archivo, sans-serif', '#9a8f78', 'center');
    } else {
      txt('MIT ALLES', x + 125, y + 30, '400 20px Bungee, Archivo, sans-serif', '#1b1424', 'center');
      for (let k = 0; k < 6; k++) A.drawIcon(ctx, RECIPE[k], x + 125 + (k - 2.5) * 36, y + 76, 1.15);
    }
    ctx.restore();
  }
  function grillFP(t, o) {
    o = o || {};
    // turquoise tile wall
    ctx.fillStyle = '#d9efeb'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 24; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) { ctx.fillStyle = '#a9dcd4'; ctx.fillRect(i * 40, j * 40, 40, 40); }
    // hatch with Bruno behind club strobe
    panel(300, 24, 360, 170, 16, '#120a1a', '#2b3f5c', 6);
    ctx.save(); A.rr(ctx, 300, 24, 360, 170, 16); ctx.clip();
    const strobe = reduce ? 0.6 : (Math.sin(t * 9) > 0.2 ? 1 : 0.15);
    ctx.globalAlpha = strobe; bear(0, 470, 214, 2.0, { t, pose: o.brunoPose || null, poseT: o.brunoPose ? 1 : 0, dance: !!o.brunoPose }); ctx.globalAlpha = 1;
    const sx = (Math.sin(t * 1.7) * 0.5 + 0.5) * 360 + 300;
    const gr = ctx.createRadialGradient(sx, 60, 0, sx, 60, 180); gr.addColorStop(0, 'rgba(255,63,164,.45)'); gr.addColorStop(1, 'rgba(255,63,164,0)');
    ctx.fillStyle = gr; ctx.fillRect(300, 24, 360, 170);
    ctx.restore();
    txt('HATCH', 314, 44, '800 11px Archivo, sans-serif', 'rgba(255,255,255,.6)');
    if (o.sign != null) signBubble(o.sign, 590, 92, 1, strobe > 0.5 ? 1 : 0.35, '#e2332e');
    // counter
    const g = ctx.createLinearGradient(0, 290, 0, H); g.addColorStop(0, '#d5dbe4'); g.addColorStop(1, '#9aa4b4');
    ctx.fillStyle = g; ctx.fillRect(0, 300, W, 240); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, 300, W, 3);
    // spit (big, left)
    ctx.fillStyle = '#e64a19'; ctx.globalAlpha = 0.28 + 0.12 * Math.sin(t * 6); A.rr(ctx, 40, 110, 210, 300, 24); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#333'; ctx.fillRect(142, 96, 8, 330);
    const spitPath = () => { ctx.beginPath(); ctx.moveTo(78, 128); ctx.lineTo(214, 128); ctx.lineTo(190, 396); ctx.lineTo(102, 396); ctx.closePath(); };
    ctx.save(); spitPath(); ctx.fillStyle = C.meat; ctx.fill(); ctx.clip();
    for (let k = 0; k < 10; k++) { const off = ((t * 40 + k * 18) % 180) - 10; ctx.fillStyle = k % 2 ? C.meatHi : '#a45a30'; ctx.fillRect(70 + off * 0.8, 120, 9, 290); }
    ctx.restore();
    if (o.hover === 'spit') hoverOutline(spitPath, t);
    // cutting board
    const boardPath = () => A.rr(ctx, 330, 360, 260, 140, 18);
    boardPath(); ctx.fillStyle = '#d9a46b'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#87532e'; ctx.stroke();
    if (o.board) A.drawItem(ctx, o.board, 430, 430, 2.6);
    if (o.hover === 'board') hoverOutline(boardPath, t);
    // bins
    ['l', 't', 'o'].forEach((ing, k) => {
      const x = 620 + k * 104, y = 330;
      const p = () => A.rr(ctx, x, y, 92, 100, 14);
      p(); ctx.fillStyle = '#eef3f4'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#5d6777'; ctx.stroke();
      A.drawIcon(ctx, ing, x + 46, y + 50, 2);
      if (o.hover === ing) hoverOutline(p, t);
    });
    // döner in progress
    if (o.doner) { panel(640, 444, 290, 86, 14, '#f6f2ea', '#9aa4b4', 3); A.drawDoner(ctx, o.doner, 720, 492, 1.8); txt('YOUR DÖNER', 800, 470, '800 12px Archivo, sans-serif', '#2b2f3a'); }
  }
  function brunoView(t, o) {
    o = o || {};
    const beat = BB.Audio.beatPhase();
    club(t, beat);
    const pose = o.pose || (Math.floor(t * 2.2) % 5 < 4 ? SEQ[Math.floor(t * 2.2) % 5] : null);
    // customer body + head (big)
    A.ell(ctx, 330, 440, 110, 18, 'rgba(0,0,0,.4)');
    ctx.fillStyle = '#b5523f'; A.rr(ctx, 250, 300, 160, 150, 60); ctx.fill();
    A.drawCustomer(ctx, 330, 230, 3, t, { pose, r: 86, mood: 0.9 });
    windowFrame();
    ticket(560, 90, o.revealed, o.prog || 0, t);
  }

  // ---------- scene renderers ----------
  const R = {};
  R.cold = (lt, t) => {
    skyline(t);
    bunker(t, BB.Audio.beatPhase());
    const on = lt < 1.2 ? 0 : lt < 1.5 ? (Math.floor(lt * 30) % 2) : 1;
    const s = 0.8 + 0.2 * ease((lt - 1.2) / 0.5);
    logoSign(480, 190, s, on);
    caption('A DÖNER CO-OP FOR TWO', 'Berlin. 03:00. One Imbiss window inside a techno bunker.', fade(lt, 2.6, 5.8), 400, C.amber);
  };
  R.club = (lt, t) => {
    brunoView(t, { prog: 0 });
    kicker('BUNKER CLUB · 03:00', fade(lt, 0.2, 5.8), C.magenta);
    // "can't hear" glyph
    const a = fade(lt, 0.8, 5.8);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a; ctx.translate(860, 110);
      A.circ(ctx, 0, 0, 42, 'rgba(18,12,28,.85)', '#ff3fa4', 4);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(-6, -8); ctx.lineTo(8, -20); ctx.lineTo(8, 20); ctx.lineTo(-6, 8); ctx.lineTo(-18, 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-28, -28); ctx.lineTo(28, 28); ctx.stroke();
      ctx.restore();
    }
    caption('NOBODY CAN HEAR A THING', 'So the customers order by dancing.', fade(lt, 1.6, 5.8), 300, C.magenta);
  };
  R.roles = (lt, t) => {
    // split screen: left Bruno at the window, right Bärbel at the grill
    const split = W / 2 + Math.sin(lt * 0.6) * 4;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, split, H); ctx.clip();
    club(t, BB.Audio.beatPhase());
    bear(0, 240, 420, 3.4, { t, pose: Math.floor(t * 2) % 2 ? 'U' : null, poseT: 1, dance: true });
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(split, 0, W - split, H); ctx.clip();
    ctx.fillStyle = '#d9efeb'; ctx.fillRect(split, 0, W, H);
    for (let i = 12; i < 24; i++) for (let j = 0; j < 14; j++) if ((i + j) % 2) { ctx.fillStyle = '#a9dcd4'; ctx.fillRect(i * 40, j * 40, 40, 40); }
    bear(1, 720, 420, 3.4, { t, chopping: true, held: 'Dml', fy: 1 });
    ctx.restore();
    ctx.fillStyle = '#120c1c'; ctx.fillRect(split - 4, 0, 8, H);
    const a1 = fade(lt, 0.3, 7.8), a2 = fade(lt, 1.2, 7.8);
    ctx.save(); ctx.globalAlpha = a1;
    panel(28, 30, 400, 96, 14, 'rgba(226,51,46,.95)');
    txt('BRUNO · KASSE', 46, 66, '400 24px Bungee, Archivo, sans-serif', '#fff');
    txt('Sees the orders. Can’t touch the food.', 46, 96, '700 16px Archivo, sans-serif', '#fff');
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a2;
    panel(W - 428, 30, 400, 96, 14, 'rgba(22,179,163,.95)');
    txt('BÄRBEL · GRILL', W - 410, 66, '400 24px Bungee, Archivo, sans-serif', '#fff');
    txt('Makes the food. Can’t see the orders.', W - 410, 96, '700 16px Archivo, sans-serif', '#fff');
    ctx.restore();
    const a3 = fade(lt, 2.8, 7.8);
    if (a3 > 0) {
      ctx.save(); ctx.globalAlpha = a3;
      panel(110, 440, 740, 70, 14, 'rgba(12,7,20,.88)');
      txt('Bruno sees the orders. Bärbel makes the food.', W / 2, 470, '400 20px Bungee, Archivo, sans-serif', '#fff', 'center');
      txt('Nobody can hear a thing.', W / 2, 497, '700 16px Archivo, sans-serif', C.amber, 'center');
      ctx.restore();
    }
  };
  R.dance = (lt, t) => {
    const I = st.inter;
    const live = !I.done && lt >= 3.2 - 0.001;
    let pose = null;
    if (lt < 3.2) { const k = Math.floor(lt * 1.6) % 5; pose = k < 4 ? SEQ[k] : null; }
    else if (live) { const k = Math.floor(t * 1.8) % 5; pose = k < 4 ? SEQ[k] : null; }
    const revealed = I.done && lt >= 3.2;
    brunoView(t, { pose: revealed ? (Math.floor(t * 2) % 2 ? 'U' : null) : pose, revealed, prog: I.done ? 4 : I.prog });
    kicker('BRUNO’S VIEW · KASSE', 1, '#e2332e');
    // the glove pointer hovering the customer
    const gx = 420 + Math.sin(t * 1.3) * 12, gy = 300 + Math.cos(t * 1.7) * 8;
    if (!live) glove(gx, gy, 1.2, -0.35, false, '#e2332e');
    if (lt < 3.2) caption('READ THE DANCE', 'Every move is a word. Bruno has to copy it.', fade(lt, 0.3, 3.1), 500, C.magenta);
    if (live) {
      ticket(560, 90, false, I.prog, t);
      panel(500, 226, 430, 104, 18, 'rgba(16,8,28,.94)', C.magenta, 4);
      txt('YOUR TURN', 715, 266, '400 30px Bungee, Archivo, sans-serif', '#fff', 'center');
      txt('Copy the dance: arrow keys, WASD or the pad', 715, 294, '700 15px Archivo, sans-serif', 'rgba(255,255,255,.8)', 'center');
      const left = Math.max(0, 10 - (performance.now() - (I.since || performance.now())) / 1000);
      txt(Math.ceil(left) + 's', 715, 318, '700 13px Archivo, sans-serif', 'rgba(255,255,255,.5)', 'center');
      if (I.wrongT > 0) txt('Wrong move! Start again', 715, 370, '400 18px Bungee, Archivo, sans-serif', '#ff6b5f', 'center');
      bear(0, 170, 520, 2.2, { t, pose: st.poseT > 0 ? st.pose : null, poseT: st.poseT, dance: true });
    } else if (I.done && lt >= 3.2) {
      const a = fade(lt, 3.3, 8.8);
      const msg = I.result === 'win' ? 'DECODED!' : I.result === 'auto' ? 'BRUNO GOT IT' : 'DECODED';
      caption(msg, I.result === 'win' ? 'You just took your first order.' : 'Now he knows what to make. Bärbel doesn’t.', a, 470, '#22b35a');
    }
  };
  R.signs = (lt, t) => {
    if (lt < 4.2) {
      brunoView(t, { revealed: true, prog: 4 });
      kicker('BRUNO’S VIEW · SIGN WHEEL', 1, '#e2332e');
      const seqSel = [0, 1, 3, 5];
      const k = clamp(Math.floor((lt - 0.6) / 0.8), -1, 3);
      const sel = k >= 0 ? seqSel[k] : -1;
      const wa = fade(lt, 0.2, 4.1, 0.25);
      wheel(330, 290, 130, sel, wa, t);
      if (sel >= 0) {
        const am = -Math.PI / 2 + sel * (Math.PI * 2 / 8);
        glove(330 + Math.cos(am) * 85, 290 + Math.sin(am) * 85 + 6, 1.05, am + Math.PI / 2, (lt - 0.6) % 0.8 < 0.15, '#e2332e');
      }
      caption('TALK WITH YOUR PAWS', 'Eight hand signs. No words.', fade(lt, 0.4, 4.1), 500, TEAL);
    } else {
      const l2 = lt - 4.2;
      const signs = [0, 1, 3, 5];
      const k = clamp(Math.floor(l2 / 0.85), 0, 3);
      grillFP(t, { sign: signs[k], brunoPose: k % 2 ? 'U' : 'R', hover: null, doner: 'D' });
      kicker('BÄRBEL’S VIEW · GRILL', 1, TEAL);
      caption('THROUGH THE STROBE', 'Bärbel has to catch every sign through the hatch.', fade(l2, 0.2, 3.7), 270, TEAL);
    }
  };
  R.grill = (lt, t) => {
    const steps = [[0, 'spit'], [1.6, 'board'], [3.0, 'l'], [3.8, 'o']];
    let hover = null; steps.forEach(([a, h]) => { if (lt >= a) hover = h; });
    const doner = lt < 1.4 ? 'D' : lt < 3.4 ? 'Dm' : lt < 4.2 ? 'Dml' : 'Dmlo';
    const board = lt < 1.6 ? 'T' : lt < 2.6 ? 'T' : 't';
    if (lt < 5.2) {
      grillFP(t, { hover, doner, board });
      kicker('BÄRBEL’S VIEW · GRILL', 1, TEAL);
      const pos = { spit: [150, 270], board: [470, 420], l: [666, 380], o: [874, 380] }[hover];
      const chopping = hover === 'spit' || hover === 'board';
      glove(pos[0] + (chopping ? Math.sin(t * 22) * 6 : 0), pos[1] + (chopping ? Math.abs(Math.sin(t * 22)) * 10 : 0), 1.25, -0.25, chopping && Math.sin(t * 22) > 0, '#16b3a3');
      caption('SHAVE · CHOP · BUILD', null, fade(lt, 0.2, 5.0), 250, TEAL);
    } else {
      // pass through the hatch, Bruno sauces + serves
      const l2 = lt - 5.2;
      brunoView(t, { revealed: true, prog: 4 });
      kicker('BRUNO SAUCES + SERVES', 1, '#e2332e');
      panel(560, 230, 250, 150, 16, 'rgba(195,202,214,.95)', '#5d6777', 3);
      txt('THE HATCH', 574, 252, '800 12px Archivo, sans-serif', '#2b2f3a');
      A.drawDoner(ctx, l2 < 0.7 ? 'Dmlto' : 'Dmltogh', 685, 320, 2.2);
      if (l2 > 0.9) {
        ctx.save(); ctx.globalAlpha = fade(l2, 0.9);
        txt('+€12', 400, 200 - (l2 - 0.9) * 30, '400 40px Bungee, Archivo, sans-serif', '#5be37a', 'center');
        ctx.restore();
      }
      glove(700 - Math.min(1, l2) * 240, 330 - Math.min(1, l2) * 60, 1.2, -0.5, l2 > 0.8, '#e2332e');
    }
  };
  function phone(x, y, w, h, draw, label, col) {
    panel(x - 12, y - 12, w + 24, h + 24, 28, '#0a0a0e', '#3a3a44', 3);
    ctx.save(); A.rr(ctx, x, y, w, h, 18); ctx.clip();
    ctx.translate(x, y); ctx.scale(w / W, h / H); draw(); ctx.restore();
    A.rr(ctx, x + w / 2 - 40, y - 8, 80, 6, 3); ctx.fillStyle = '#1e1e26'; ctx.fill();
    panel(x + w / 2 - 110, y + h + 24, 220, 34, 17, col);
    txt(label, x + w / 2, y + h + 47, '400 15px Bungee, Archivo, sans-serif', '#fff', 'center');
  }
  R.devices = (lt, t) => {
    ctx.fillStyle = '#120c1c'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(480, 240, 40, 480, 240, 520); g.addColorStop(0, 'rgba(255,63,164,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const pw = 400, ph = 225, y = 120 + (1 - ease(lt / 0.8)) * 60;
    phone(40, y, pw, ph, () => { brunoView(t, { revealed: true, prog: 4 }); wheel(330, 290, 120, Math.floor(t * 1.5) % 8, 1, t); }, 'BRUNO’S PHONE', '#e2332e');
    phone(W - 40 - pw, y, pw, ph, () => grillFP(t, { sign: Math.floor(t * 1.2) % 6, doner: 'Dml', board: 't', hover: 'board' }), 'BÄRBEL’S PHONE', TEAL);
    caption('TWO PHONES. TWO VIEWS. ONE DÖNER.', 'Online co-op on phones or laptops.', fade(lt, 0.6, 5.9), 64, C.amber);
  };
  R.end = (lt, t) => {
    skyline(t);
    ctx.fillStyle = 'rgba(12,7,20,.45)'; ctx.fillRect(0, 0, W, H);
    logoSign(480, 170, 0.9 + 0.05 * ease(lt / 0.6), 1);
    txt('A döner co-op for two bears who can’t hear each other.', 480, 320, '700 18px Archivo, sans-serif', '#fff', 'center');
    bear(0, 300, 470, 1.6, { t, pose: Math.floor(t * 2) % 2 ? 'U' : null, poseT: 1, dance: true });
    bear(1, 660, 470, 1.6, { t, chopping: true, held: 'Dmltogh' });
  };

  // ---------- timeline ----------
  function sceneAt(tt) { for (let i = SCENES.length - 1; i >= 0; i--) if (tt >= SCENES[i].t0) return i; return 0; }
  const CUES = [
    [SCENES[0].t0 + 1.25, () => BB.Audio.sfx('start')],
    [SCENES[3].t0 + 0.0, () => BB.Audio.sfx('order')],
    ...[0, 1, 2, 3].map(k => [SCENES[4].t0 + 0.6 + k * 0.8, () => BB.Audio.sfx('sign')]),
    [SCENES[5].t0 + 0.3, () => BB.Audio.sfx('shave')], [SCENES[5].t0 + 1.8, () => BB.Audio.sfx('chop')], [SCENES[5].t0 + 2.2, () => BB.Audio.sfx('chop')],
    [SCENES[5].t0 + 3.0, () => BB.Audio.sfx('grab')], [SCENES[5].t0 + 3.8, () => BB.Audio.sfx('grab')],
    [SCENES[5].t0 + 5.6, () => BB.Audio.sfx('sauce')], [SCENES[5].t0 + 6.1, () => BB.Audio.sfx('serve')],
    [SCENES[7].t0 + 0.2, () => BB.Audio.sfx('end')],
  ];
  function setScene(i) {
    if (st.sceneIdx === i) return;
    st.sceneIdx = i;
    const S = SCENES[i];
    if (st.playing) { BB.Audio.play(S.music); BB.Audio.muffle(!!S.muffle); }
    document.querySelectorAll('#tv-chapters button').forEach((b, k) => b.classList.toggle('on', k === i));
    $('#tv-cta').hidden = S.id !== 'end';
  }
  function seek(tt, fromUser) {
    st.tt = clamp(tt, 0, TOTAL);
    if (fromUser) {
      if (st.tt > DANCE_AT + 0.05 && !st.inter.done) { st.inter.done = true; st.inter.result = 'skip'; }
      if (st.tt < DANCE_AT - 0.05) { st.inter = { done: false, prog: 0, result: null, since: 0, flashT: 0, wrongT: 0 }; }
      st.firedCues = new Set(CUES.map((c, k) => (c[0] < st.tt ? k : -1)).filter(k => k >= 0));
    }
    st.sceneIdx = -1; setScene(sceneAt(st.tt));
  }
  function play() {
    BB.Audio.init();
    if (st.tt >= TOTAL - 0.05) seek(0, true);
    st.playing = true; st.started = true;
    const S = SCENES[sceneAt(st.tt)]; BB.Audio.play(S.music); BB.Audio.muffle(!!S.muffle);
    $('#tv-play').textContent = 'Pause';
  }
  function pause() { st.playing = false; BB.Audio.stop(); BB.Audio.muffle(false); $('#tv-play').textContent = st.tt >= TOTAL - 0.05 ? 'Replay' : 'Play'; }
  const interLive = () => !st.inter.done && st.tt >= DANCE_AT - 0.001 && st.tt < DANCE_AT + 1;
  function danceInput(d) {
    if (!interLive()) return;
    const I = st.inter;
    st.pose = d; st.poseT = 0.45;
    if (SEQ[I.prog] === d) { I.prog++; BB.Audio.sfx('step', d); if (I.prog >= 4) { I.done = true; I.result = 'win'; BB.Audio.sfx('decoded'); } }
    else { I.prog = SEQ[0] === d ? 1 : 0; I.wrongT = 0.9; BB.Audio.sfx('miss'); }
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$('#trailer').hidden) {
      st.poseT = Math.max(0, st.poseT - dt); st.inter.wrongT = Math.max(0, st.inter.wrongT - dt);
      if (st.playing) {
        if (interLive() && st.tt >= DANCE_AT) {
          if (!st.inter.since) st.inter.since = performance.now();
          if (performance.now() - st.inter.since > 10000) { st.inter.done = true; st.inter.result = 'auto'; BB.Audio.sfx('decoded'); }
        } else {
          const prev = st.tt;
          st.tt = Math.min(TOTAL, st.tt + dt);
          if (prev < DANCE_AT && st.tt >= DANCE_AT && !st.inter.done) st.tt = DANCE_AT;
          CUES.forEach((c, k) => { if (!st.firedCues.has(k) && c[0] <= st.tt) { st.firedCues.add(k); c[1](); } });
          if (st.tt >= TOTAL) { st.tt = TOTAL; pause(); }
        }
        setScene(sceneAt(st.tt));
      }
      $('#tv-pad').hidden = !(st.playing && interLive() && st.tt >= DANCE_AT);
      render(now / 1000);
      const sc = $('#tv-scrub'); if (document.activeElement !== sc) sc.value = Math.round(st.tt / TOTAL * 1000);
      $('#tv-time').textContent = fmt(st.tt) + ' / ' + fmt(TOTAL);
    }
    requestAnimationFrame(tick);
  }
  const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function render(t) {
    ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    const i = sceneAt(st.tt), S = SCENES[i];
    const lt = st.started ? st.tt - S.t0 : 2.2;
    ctx.save();
    (R[st.started ? S.id : 'cold'])(lt, t);
    ctx.restore();
    // scene transition flash
    const into = st.tt - S.t0;
    if (st.started && i > 0 && into < 0.25) { ctx.fillStyle = `rgba(10,6,16,${1 - into / 0.25})`; ctx.fillRect(0, 0, W, H); }
    if (!st.started) {
      ctx.fillStyle = 'rgba(10,6,16,.35)'; ctx.fillRect(0, 0, W, H);
      A.circ(ctx, 480, 420, 44, 'rgba(255,63,164,.95)', '#fff', 4);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(468, 398); ctx.lineTo(500, 420); ctx.lineTo(468, 442); ctx.closePath(); ctx.fill();
      txt('Watch the trailer · 55 s · interactive', 480, 494, '700 15px Archivo, sans-serif', '#fff', 'center');
    }
  }
  function fit() {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(320, Math.round(r.width * dpr)); cv.height = Math.round(cv.width * H / W);
  }

  // ---------- controls ----------
  const chapters = $('#tv-chapters');
  SCENES.forEach((S, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = S.label;
    b.addEventListener('click', () => { seek(S.t0 + 0.01, true); if (!st.playing) play(); });
    chapters.appendChild(b);
  });
  $('#tv-play').addEventListener('click', () => (st.playing ? pause() : play()));
  cv.addEventListener('click', () => { if (interLive() && st.playing) return; st.playing ? pause() : play(); });
  $('#tv-scrub').addEventListener('input', e => { st.started = true; seek(e.target.value / 1000 * TOTAL, true); });
  $('#tv-replay').addEventListener('click', () => { seek(0, true); play(); });
  document.querySelectorAll('#tv-pad button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); danceInput(b.dataset.d); }));
  const KEYD = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', KeyW: 'U', KeyS: 'D', KeyA: 'L', KeyD: 'R' };
  window.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input[type=text]')) return;
    if (KEYD[e.code] && interLive() && st.playing) { e.preventDefault(); if (!e.repeat) danceInput(KEYD[e.code]); return; }
    if ((e.code === 'Space' || e.code === 'KeyK') && e.target === document.body) { e.preventDefault(); st.playing ? pause() : play(); }
    if (e.code === 'KeyM') toggleMute();
  });
  function toggleMute() { BB.Audio.init(); const m = BB.Audio.toggleMute(); document.querySelectorAll('.b-mute').forEach(b => (b.textContent = m ? 'Sound off' : 'Sound on')); }
  document.querySelectorAll('.b-mute').forEach(b => { b.textContent = BB.Audio.muted ? 'Sound off' : 'Sound on'; b.addEventListener('click', toggleMute); });
  const playLink = $('#tv-game');
  if (playLink) { if (GAME_URL) playLink.href = GAME_URL; else playLink.hidden = true; }
  window.addEventListener('resize', fit);
  const start = () => { fit(); setScene(0); $('#tv-cta').hidden = true; requestAnimationFrame(tick); };
  if (document.fonts && document.fonts.load) Promise.race([Promise.all([document.fonts.load('400 20px Bungee'), document.fonts.load('700 14px Archivo')]), new Promise(r => setTimeout(r, 1500))]).then(start, start);
  else start();
  BB.Trailer = { seek, play, pause, st, SCENES, danceInput };
})();
