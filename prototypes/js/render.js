// Berlin Bears — world + HUD renderer
(function () {
  const BB = (window.BB = window.BB || {});
  const A = BB.Art, C = A.C;
  const R = (BB.Render = {});
  const T = BB.T, HUD = BB.HUD, COLS = BB.COLS, ROWS = BB.ROWS;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  R.reduceMotion = reduce;
  let darkCv = null;

  function wrap(ctx, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
      else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy;
  }
  R.wrap = wrap;

  R.isDanceZone = function (w, c, r) {
    return !!(w.L.dance && w.tileAt(c, r) === '.' && w.tileAt(c, r - 1) === 'W');
  };

  function drawTicket(ctx, w, o, x, y, opts) {
    const W = 196, H = 112;
    const pct = Math.max(0, o.pat / o.max);
    const urgent = pct < 0.25;
    ctx.save();
    if (urgent && !reduce) ctx.translate(Math.sin(opts.t * 40) * 1.5, 0);
    A.rr(ctx, x, y, W, H, 10);
    ctx.fillStyle = C.paper; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = urgent ? '#e1262b' : 'rgba(0,0,0,.35)'; ctx.stroke();
    // customer portrait
    A.rr(ctx, x + 8, y + 8, 60, 70, 8); ctx.fillStyle = w.L.theme === 'bunker' ? '#2a1a3a' : w.L.theme === 'u8' ? '#2b3442' : '#cfe4ea'; ctx.fill();
    let pose = null;
    if (o.enc && o.dec < 0 && o.dance) {
      const step = Math.floor(opts.t * 2.2) % (o.dance.length + 1);
      pose = step < o.dance.length ? o.dance[step] : null;
    }
    ctx.save(); A.rr(ctx, x + 8, y + 8, 60, 70, 8); ctx.clip();
    A.drawCustomer(ctx, x + 38, y + 48, o.seed, opts.t, { pose, mood: pct, r: 20 });
    ctx.restore();
    // body
    ctx.fillStyle = C.ink; ctx.textAlign = 'left';
    const hidden = o.enc && o.dec >= 0 && opts.online && o.dec !== opts.myIdx;
    if (o.enc && o.dec < 0) {
      ctx.font = '700 11px Archivo, sans-serif'; ctx.fillStyle = '#7a2a7a';
      ctx.fillText('DANCE ORDER', x + 76, y + 22);
      const n = o.dance.length, sp = Math.min(28, 112 / n);
      for (let i = 0; i < n; i++) {
        const done = i < o.dp;
        A.drawArrow(ctx, o.dance[i], x + 88 + i * sp, y + 46, 1.05, done ? '#22b35a' : '#ff3fa4', C.ink);
      }
      ctx.font = '600 10px Archivo, sans-serif'; ctx.fillStyle = '#555';
      ctx.fillText('Copy it at the window', x + 76, y + 72);
    } else if (hidden) {
      ctx.font = '700 11px Archivo, sans-serif'; ctx.fillStyle = '#0d7a6f';
      ctx.fillText((A.BEARS[o.dec] || {}).name + ' decoded it', x + 76, y + 22);
      for (let i = 0; i < 4; i++) { A.circ(ctx, x + 88 + i * 26, y + 46, 10, '#e9e1cf', '#bdb29a', 2); }
      ctx.font = '700 16px Archivo, sans-serif'; ctx.fillStyle = '#9a8f78'; ctx.textAlign = 'center';
      for (let i = 0; i < 4; i++) ctx.fillText('?', x + 88 + i * 26, y + 52);
      ctx.textAlign = 'left'; ctx.font = '600 10px Archivo, sans-serif'; ctx.fillStyle = '#555';
      ctx.fillText('Watch for hand signs', x + 76, y + 72);
    } else {
      ctx.font = '800 13px Archivo, sans-serif';
      ctx.fillText(BB.RECIPES[o.k].name, x + 76, y + 22);
      const c = o.c, n = c.length;
      const sp = Math.min(24, 116 / n);
      for (let i = 0; i < n; i++) A.drawIcon(ctx, c[i], x + 86 + i * sp, y + 48, 0.82);
    }
    // patience bar
    A.rr(ctx, x + 76, y + 86, 110, 12, 6); ctx.fillStyle = '#e5dcc6'; ctx.fill();
    A.rr(ctx, x + 76, y + 86, Math.max(6, 110 * pct), 12, 6);
    ctx.fillStyle = pct > 0.5 ? '#22b35a' : pct > 0.25 ? '#f0a30a' : '#e1262b'; ctx.fill();
    ctx.font = '700 10px Archivo, sans-serif'; ctx.fillStyle = '#666'; ctx.textAlign = 'center';
    ctx.fillText('#' + o.id, x + 38, y + 96);
    ctx.restore();
  }

  function drawHUD(ctx, w, o) {
    const th = A.THEMES[w.L.theme];
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, BB.W, HUD);
    // rail
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, 4, 816, 3);
    w.orders.forEach((ord, i) => { if (i < 4) drawTicket(ctx, w, ord, 8 + i * 202, 8, o); });
    // clock panel
    const x = 824;
    A.rr(ctx, x, 8, 128, 112, 10); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    const tm = Math.max(0, Math.ceil(w.time));
    ctx.fillStyle = tm <= 20 ? '#ff5a4f' : '#fff'; ctx.textAlign = 'center';
    ctx.font = '400 30px Bungee, Archivo, sans-serif';
    ctx.fillText(Math.floor(tm / 60) + ':' + String(tm % 60).padStart(2, '0'), x + 64, 48);
    ctx.font = '400 26px Bungee, Archivo, sans-serif'; ctx.fillStyle = C.amber;
    ctx.fillText('€' + w.score, x + 64, 86);
    ctx.font = '600 11px Archivo, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText(w.L.name.toUpperCase() + ' · ' + w.L.clock, x + 64, 108);
  }

  R.renderWorld = function (ctx, w, o) {
    o = o || {};
    const t = o.t || 0;
    const th = A.THEMES[w.L.theme];
    ctx.save();
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, BB.W, BB.H);
    drawHUD(ctx, w, o);
    ctx.save();
    let sx = 0, sy = 0;
    if (w.shake > 0 && !reduce) { sx = (Math.random() - 0.5) * w.shake * 10; sy = (Math.random() - 0.5) * w.shake * 6; }
    ctx.translate(sx, HUD + sy);
    ctx.beginPath(); ctx.rect(-12, -12, BB.W + 24, ROWS * T + 24); ctx.clip();
    const beat = BB.Audio ? BB.Audio.beatPhase() : (t * 2.13) % 1;
    // floors
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = w.tileAt(c, r);
      if (ch === '.' || ch === 'P') A.drawFloor(ctx, c * T, r * T, c, r, w.L.theme, t, { dance: ch === '.' && R.isDanceZone(w, c, r) });
    }
    // stations, row by row, then bears in that row
    const bears = w.players.map((p, i) => ({ p, i })).sort((a, b) => a.p.y - b.p.y);
    let bi = 0;
    const local = o.local || [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = w.tileAt(c, r);
        if (ch === '.') continue;
        const idx = r * COLS + c;
        const item = w.items[idx];
        A.drawStation(ctx, ch, c * T, r * T, w.L.theme, t, { item, open: w.train && w.train.open });
        if (item) A.drawItem(ctx, item, c * T + 32, r * T + 24, 1);
        const pr = w.prog[idx];
        if (pr > 0 && pr < 1) bar(ctx, c * T + 8, r * T + 2, 48, pr);
      }
      // highlight targets of local bears on this row
      local.forEach(i => {
        const p = w.players[i]; if (!p) return;
        const tg = w.target(p);
        if (tg && tg[1] === r && w.tileAt(tg[0], tg[1]) !== '.') {
          ctx.save(); ctx.strokeStyle = A.BEARS[i].hat; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 30;
          A.rr(ctx, tg[0] * T + 3, tg[1] * T + 3, T - 6, T - 6, 8); ctx.stroke(); ctx.restore();
        }
      });
      while (bi < bears.length && bears[bi].p.y < r + 1) { drawBearAt(ctx, w, bears[bi], t, o); bi++; }
    }
    while (bi < bears.length) { drawBearAt(ctx, w, bears[bi], t, o); bi++; }
    // popups
    (w.popups || []).forEach(pp => {
      const a = 1 - pp.age / 1.4; if (a <= 0) return;
      ctx.globalAlpha = a; ctx.font = '400 22px Bungee, Archivo, sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(pp.txt, pp.x * T, pp.y * T - pp.age * 40);
      ctx.fillStyle = pp.col; ctx.fillText(pp.txt, pp.x * T, pp.y * T - pp.age * 40); ctx.globalAlpha = 1;
    });
    // environmental overlays
    if (w.L.theme === 'bunker') bunkerLights(ctx, w, t, beat);
    if (w.train) trainDark(ctx, w, t, o);
    ctx.restore();
    // dance prompt for local dancers
    local.forEach(i => { const p = w.players[i]; if (p && p.dance) dancePrompt(ctx, w, p, i, t); });
    // train status chip
    if (w.train) trainChip(ctx, w, t);
    if (w.phase === 'intro') introCard(ctx, w, t, o);
    if (w.phase === 'end') { ctx.fillStyle = 'rgba(10,6,16,.6)'; ctx.fillRect(0, 0, BB.W, BB.H); }
    ctx.restore();
  };

  function bar(ctx, x, y, w, p) {
    A.rr(ctx, x, y, w, 9, 4.5); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
    A.rr(ctx, x + 1.5, y + 1.5, Math.max(4, (w - 3) * p), 6, 3); ctx.fillStyle = '#5be37a'; ctx.fill();
  }

  function drawBearAt(ctx, w, e, t, o) {
    const p = e.p;
    A.drawBear(ctx, p.x * T, p.y * T, {
      kind: e.i, fx: p.fx, fy: p.fy, walk: p.walk, moving: p.moving, pose: p.pose, poseT: p.poseT,
      held: p.held, chopping: p.chopping, t, dance: p.dance, emote: p.emote, emoteT: p.emoteT,
    });
    if (p.shave > 0 && p.shave < 1) bar(ctx, p.x * T - 22, p.y * T - 58, 44, p.shave);
    if (o.labels) {
      ctx.font = '700 11px Archivo, sans-serif'; ctx.textAlign = 'center';
      const name = A.BEARS[e.i].name + (o.myIdx === e.i ? ' (you)' : '');
      const tw = ctx.measureText(name).width + 10;
      A.rr(ctx, p.x * T - tw / 2, p.y * T + 20, tw, 15, 7); ctx.fillStyle = A.BEARS[e.i].hat; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(name, p.x * T, p.y * T + 31);
    }
  }

  function bunkerLights(ctx, w, t, beat) {
    const drop = w.dropOn;
    ctx.save();
    const pulse = reduce ? 0.15 : 0.1 + 0.18 * Math.pow(1 - beat, 3);
    ctx.fillStyle = `rgba(20,0,40,${drop ? 0.55 : 0.22 - pulse * 0.5})`;
    ctx.fillRect(0, 0, BB.W, ROWS * T);
    ctx.globalCompositeOperation = 'lighter';
    const spots = [[C.magenta, 0], [C.cyan, 2.1], ['#ffd23f', 4.2]];
    spots.forEach(([col, ph]) => {
      const sx = (Math.sin(t * 0.7 + ph) * 0.45 + 0.5) * BB.W, sy = (Math.cos(t * 0.9 + ph * 1.3) * 0.4 + 0.5) * ROWS * T;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 170);
      g.addColorStop(0, col + (drop ? '55' : '33')); g.addColorStop(1, col + '00');
      ctx.fillStyle = g; ctx.fillRect(sx - 170, sy - 170, 340, 340);
    });
    if (drop && !reduce) {
      ctx.strokeStyle = 'rgba(255,63,164,.35)'; ctx.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const a = t * 1.3 + k * 1.05;
        ctx.beginPath(); ctx.moveTo(BB.W / 2, -10); ctx.lineTo(BB.W / 2 + Math.cos(a) * 900, -10 + Math.abs(Math.sin(a)) * 700); ctx.stroke();
      }
    }
    ctx.restore();
    if (drop) {
      ctx.font = '400 18px Bungee, Archivo, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = C.magenta;
      ctx.fillText('BASS DROP', BB.W - 16, ROWS * T - 14);
    }
  }

  function trainDark(ctx, w, t, o) {
    const d = w.train.dark;
    if (d <= 0.01) return;
    if (!darkCv) { darkCv = document.createElement('canvas'); darkCv.width = BB.W; darkCv.height = ROWS * T; }
    const dc = darkCv.getContext('2d');
    dc.globalCompositeOperation = 'source-over';
    dc.clearRect(0, 0, BB.W, ROWS * T);
    dc.fillStyle = `rgba(4,6,12,${0.93 * d})`; dc.fillRect(0, 0, BB.W, ROWS * T);
    // tunnel light strips flash past
    const flick = (t * 3) % 1 < 0.12;
    if (flick && !reduce) { dc.fillStyle = `rgba(255,220,140,${0.12 * d})`; dc.fillRect(0, 0, BB.W, ROWS * T); }
    dc.globalCompositeOperation = 'destination-out';
    w.players.forEach((p, i) => {
      const mine = !o.online || o.myIdx === i;
      const rad = mine ? 150 : 95;
      const g = dc.createRadialGradient(p.x * T, p.y * T - 10, 10, p.x * T, p.y * T - 10, rad);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = g; dc.fillRect(p.x * T - rad, p.y * T - rad - 10, rad * 2, rad * 2);
    });
    // spit heaters glow a little
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (w.tileAt(c, r) === 'S') {
      const g = dc.createRadialGradient(c * T + 32, r * T + 20, 4, c * T + 32, r * T + 20, 60);
      g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = g; dc.fillRect(c * T - 30, r * T - 40, 124, 124);
    }
    ctx.drawImage(darkCv, 0, 0);
  }

  function trainChip(ctx, w, t) {
    const tr = w.train;
    const x = 8, y = HUD + ROWS * T - 44;
    ctx.save();
    A.rr(ctx, x, y, 270, 36, 8); ctx.fillStyle = tr.open ? 'rgba(20,110,50,.92)' : 'rgba(30,30,40,.92)'; ctx.fill();
    ctx.strokeStyle = C.bvg; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.bvg; A.rr(ctx, x + 8, y + 8, 30, 20, 4); ctx.fill();
    ctx.fillStyle = '#123'; ctx.font = '400 13px Bungee, Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('U8', x + 23, y + 23);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '700 13px Archivo, sans-serif';
    const s = Math.ceil(tr.t);
    ctx.fillText(tr.open ? (tr.stop + ' · doors open ' + s + 's') : ('Tunnel · next stop in ' + s + 's'), x + 46, y + 23);
    ctx.restore();
  }

  function dancePrompt(ctx, w, p, i, t) {
    const o = w.orders.find(q => q.enc && q.dec < 0);
    const x = BB.W / 2 - 180, y = HUD + 80;
    ctx.save();
    A.rr(ctx, x, y, 360, 92, 14); ctx.fillStyle = 'rgba(16,8,28,.88)'; ctx.fill();
    ctx.strokeStyle = C.magenta; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '400 15px Bungee, Archivo, sans-serif';
    ctx.fillText(A.BEARS[i].name.toUpperCase() + ' IS DANCING', x + 180, y + 24);
    if (o) {
      const n = o.dance.length;
      for (let k = 0; k < n; k++) {
        const done = k < o.dp, next = k === o.dp;
        A.drawArrow(ctx, o.dance[k], x + 180 + (k - (n - 1) / 2) * 52, y + 56, next ? 2 + 0.2 * Math.sin(t * 10) : 1.8, done ? '#22b35a' : next ? '#fff' : 'rgba(255,63,164,.8)', C.ink);
      }
    }
    ctx.font = '600 11px Archivo, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText('Copy the moves with your arrows / joystick · Grab to stop', x + 180, y + 86);
    ctx.restore();
  }

  function introCard(ctx, w, t, o) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,6,16,.72)'; ctx.fillRect(0, 0, BB.W, BB.H);
    const x = BB.W / 2 - 300, y = 130;
    A.rr(ctx, x, y, 600, 360, 20); ctx.fillStyle = C.paper; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = w.L.theme === 'bunker' ? C.magenta : w.L.theme === 'u8' ? C.bvg : '#e2332e'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = C.ink;
    ctx.font = '400 16px Bungee, Archivo, sans-serif'; ctx.fillText('SHIFT ' + (w.lv + 1) + ' · ' + w.L.clock, BB.W / 2, y + 46);
    ctx.font = '400 44px Bungee, Archivo, sans-serif'; ctx.fillText(w.L.name.toUpperCase(), BB.W / 2, y + 100);
    ctx.font = '600 16px Archivo, sans-serif'; ctx.fillStyle = '#3a3346';
    let yy = wrap(ctx, w.L.blurb, BB.W / 2, y + 138, 520, 22);
    ctx.font = '700 16px Archivo, sans-serif'; ctx.fillStyle = '#7a2a7a';
    wrap(ctx, w.L.twist, BB.W / 2, yy + 32, 520, 22);
    ctx.font = '400 26px Bungee, Archivo, sans-serif'; ctx.fillStyle = '#e2332e';
    ctx.fillText(Math.max(1, Math.ceil(w.phaseT)), BB.W / 2, y + 340);
    ctx.restore();
  }
})();
