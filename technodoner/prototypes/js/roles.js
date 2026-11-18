// Berlin Bears: Roles. Asymmetric two-screen co-op.
// Kasse (Bärbel): sees customers + orders, decodes dances, serves. Cannot touch food.
// Grill (Bruno): builds döner. Cannot see or hear the customers. Only sees Bärbel's paw signs.
(function () {
  const BB = window.BB, A = BB.Art, C = A.C;
  const W = 960, H = 640, OC = BB.ORDER_CHARS;
  const r1 = v => Math.round(v * 10) / 10;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SHIFTS = [
    { id: 'kotti', name: 'Kotti Imbiss', clock: '18:00', music: 'kotti', recipes: ['klassik', 'fleisch', 'scharf'], duration: 150, spawn: [2, 15], patience: 70, stars: [30, 60, 90],
      rule: 'Bruno faces the grill and can’t see the window. Bärbel can’t touch food. Only Bärbel knows what people ordered, so sign it to him.' },
    { id: 'bunker', name: 'Bunker Club', clock: '03:00', music: 'bunker', recipes: ['klassik', 'fleisch', 'scharf', 'ohnez', 'gemuese'], duration: 160, spawn: [2, 17], patience: 85, stars: [25, 55, 85], dance: true, dlen: 4,
      rule: 'Way too loud. Customers order by dancing. Bärbel copies the dance to read the ticket, then signs it to Bruno.' },
    { id: 'u8', name: 'U8 Nachtzug', clock: '05:00', music: 'u8', recipes: ['klassik', 'fleisch', 'scharf', 'ohnez', 'gemuese', 'alles'], duration: 160, spawn: [1, 999], patience: 95, stars: [25, 55, 85], train: true, station: 11, tunnel: 12,
      rule: 'Tunnels are pitch black on Bruno’s side, and every stop shuffles his bins. Bärbel has the only torch: she lights up a bin for him. Serve only at stations.' },
  ];
  const STOPS = ['Hermannstraße', 'Boddinstraße', 'Leinestraße', 'Hermannplatz', 'Schönleinstraße', 'Kottbusser Tor', 'Moritzplatz', 'Heinrich-Heine-Str.', 'Jannowitzbrücke', 'Alexanderplatz', 'Weinmeisterstr.', 'Rosenthaler Platz'];
  // signs: 0-5 ingredients, then words
  const SIGNS = [{ k: 'm' }, { k: 'l' }, { k: 't' }, { k: 'o' }, { k: 'g' }, { k: 'h' }, { txt: 'JA', col: '#1f9d4f' }, { txt: 'NEIN', col: '#d32222' }, { txt: '?', col: '#2f6fd1' }, { txt: 'LOS!', col: '#e0218a' }];
  const KEYS = {
    grill: { pita: 'KeyQ', spit: 'KeyW', pos: ['KeyE', 'KeyR', 'KeyT', 'KeyA', 'KeyS'], chop: 'KeyD', pass: 'KeyF', trash: 'KeyX', signs: { Digit1: 6, Digit2: 7, Digit3: 8, Digit4: 9 } },
    kasse: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', go: 'Enter', back: 'Backspace', stop: 'Escape',
      signs: { KeyU: 0, KeyI: 1, KeyO: 2, KeyJ: 3, KeyK: 4, KeyL: 5, KeyN: 6, KeyM: 7, Comma: 8, Period: 9 }, torch: ['Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'] },
  };
  const KEYLBL = { KeyQ: 'Q', KeyW: 'W', KeyE: 'E', KeyR: 'R', KeyT: 'T', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyF: 'F', KeyX: 'X', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', KeyU: 'U', KeyI: 'I', KeyO: 'O', KeyJ: 'J', KeyK: 'K', KeyL: 'L', KeyN: 'N', KeyM: 'M', Comma: ',', Period: '.', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0' };
  const addTo = (d, ch) => 'D' + OC.split('').filter(x => d.slice(1).includes(x) || x === ch).join('');

  // ------------------------------------------------------------------ world (host-authoritative)
  class World {
    constructor(si, rid) {
      this.si = si; this.S = SHIFTS[si]; this.rid = rid;
      this.slots = [null, null, null];
      this.pass = ''; this.cur = ''; this.shave = 0; this.board = ''; this.chop = 0;
      this.bins = { l: 3, t: 3, o: 3 }; this.order = ['l', 't', 'o', 'g', 'h'];
      this.torch = -1; this.torchT = 0;
      this.signs = { kasse: [], grill: [] }; this.signSeq = 0;
      this.score = 0; this.served = 0; this.failed = 0; this.stars = 0;
      this.time = this.S.duration; this.phase = 'intro'; this.phaseT = 6; this.clock = 0;
      this.events = []; this.evId = 0; this.cid = 0; this.spawnT = this.S.spawn[0];
      this.train = this.S.train ? { open: true, t: this.S.station, si: 0, jolt: 0, dark: 0, warned: false } : null;
      this.popups = []; this._seen = 0; this.shake = 0;
    }
    emit(type, a, txt) { this.events.push({ id: ++this.evId, type, a: a == null ? -1 : a, txt: txt || '' }); if (this.events.length > 12) this.events.shift(); }
    spawn() {
      const free = [0, 1, 2].filter(i => !this.slots[i]); if (!free.length) return;
      const slot = free[Math.floor(Math.random() * free.length)];
      const S = this.S, k = S.recipes[Math.floor(Math.random() * S.recipes.length)];
      let dance = '';
      if (S.dance) { while (dance.length < S.dlen) { const d = 'ULRD'[Math.floor(Math.random() * 4)]; if (dance.slice(-1) !== d) dance += d; } }
      this.slots[slot] = { id: ++this.cid, seed: Math.floor(Math.random() * 997), k, c: BB.RECIPES[k].c, pat: S.patience, max: S.patience, enc: !!S.dance, dance, dp: 0, dec: !S.dance };
      this.emit('arrive', slot);
    }
    update(dt) {
      this.clock += dt;
      this.torchT = Math.max(0, this.torchT - dt); if (!this.torchT) this.torch = -1;
      if (this.phase === 'intro') { this.phaseT -= dt; if (this.phaseT <= 0) { this.phase = 'play'; this.emit('start'); } return; }
      if (this.phase !== 'play') return;
      this.time -= dt;
      if (this.time <= 0) {
        this.time = 0; this.phase = 'end';
        const s = this.S.stars; this.stars = this.score >= s[2] ? 3 : this.score >= s[1] ? 2 : this.score >= s[0] ? 1 : 0;
        this.emit('end'); return;
      }
      const tr = this.train;
      if (tr) {
        tr.t -= dt;
        if (tr.open && tr.t < 2.5 && !tr.warned) { tr.warned = true; this.emit('warn'); }
        if (tr.t <= 0) {
          if (tr.open) { tr.open = false; tr.t = this.S.tunnel; this.emit('doors'); }
          else {
            tr.open = true; tr.t = this.S.station; tr.si++; tr.jolt++; tr.warned = false;
            // the brakes throw the bins around
            const o = this.order.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
            this.order = o;
            this.emit('stop', -1, STOPS[tr.si % STOPS.length]);
            this.spawn(); if (Math.random() < 0.7) this.spawn();
          }
        }
        tr.dark += ((tr.open ? 0 : 1) - tr.dark) * Math.min(1, dt * 2.5);
      }
      if (!tr || this.clock < 8) {
        this.spawnT -= dt;
        if (this.spawnT <= 0) { this.spawn(); this.spawnT = tr ? 999 : this.S.spawn[1] * (0.8 + Math.random() * 0.4); }
        if (!tr && this.slots.every(s => !s)) this.spawnT = Math.min(this.spawnT, 2);
      }
      this.slots.forEach((c, i) => {
        if (!c) return;
        c.pat -= dt;
        if (c.pat <= 0) { this.slots[i] = null; this.failed++; this.score = Math.max(0, this.score - 5); this.emit('leave', i, '−€5'); }
      });
      // prune old signs
      ['kasse', 'grill'].forEach(r => { this.signs[r] = this.signs[r].filter(s => this.clock - s[2] < 9).slice(-5); });
    }
    act(role, name, arg) {
      if (this.phase !== 'play' && name !== 'sign') return;
      if (name === 'sign') { if (arg >= 0 && arg < SIGNS.length) { this.signs[role].push([++this.signSeq, arg, this.clock]); this.signs[role] = this.signs[role].slice(-5); this.emit('sign', arg, role); } return; }
      if (role === 'grill') this.grillAct(name, arg); else this.kasseAct(name, arg);
    }
    grillAct(name, arg) {
      const dark = this.train && this.train.dark > 0.5;
      switch (name) {
        case 'pita':
          if (this.cur) this.emit('gnope', -1, 'One döner at a time'); else { this.cur = 'D'; this.emit('pita'); }
          break;
        case 'spit':
          if (!this.cur) { this.emit('gnope', -1, 'Grab a pita first'); break; }
          if (this.cur.includes('m')) { this.emit('gnope', -1, 'Already has meat'); break; }
          this.shave += 0.25; this.emit('shave');
          if (this.shave >= 1) { this.shave = 0; this.cur = addTo(this.cur, 'm'); this.emit('add', -1, 'm'); }
          break;
        case 'pos': {
          const ing = this.order[arg]; if (!ing) break;
          if (ing === 'g' || ing === 'h') {
            if (!this.cur) { this.emit('gnope', -1, 'Grab a pita first'); break; }
            if (this.cur.includes(ing)) { this.emit('gnope', -1, 'Already sauced'); break; }
            this.cur = addTo(this.cur, ing); this.emit('sauce', -1, ing); break;
          }
          if (this.bins[ing] <= 0) {
            if (!this.board) { this.board = ing.toUpperCase(); this.chop = 0; this.emit('prep', -1, ing); }
            else this.emit('gnope', -1, 'Board is busy: chop!');
            break;
          }
          if (!this.cur) { this.emit('gnope', -1, 'Grab a pita first'); break; }
          if (this.cur.includes(ing)) { this.emit('gnope', -1, 'Already in there'); break; }
          this.bins[ing]--; this.cur = addTo(this.cur, ing); this.emit('add', -1, ing);
          if (dark) this.emit('gfeel', -1, BB.ING[ing]);
          break;
        }
        case 'chop':
          if (!this.board) { this.emit('gnope', -1, 'Nothing to chop'); break; }
          this.chop += 1 / 6; this.emit('chop');
          if (this.chop >= 0.999) { const ing = this.board.toLowerCase(); this.bins[ing] += 3; this.board = ''; this.chop = 0; this.emit('refill', -1, ing); }
          break;
        case 'pass':
          if (!this.cur) { this.emit('gnope', -1, 'Nothing to pass'); break; }
          if (this.pass) { this.emit('gnope', -1, 'The pass is full'); break; }
          if (this.cur === 'D') { this.emit('gnope', -1, 'It’s just bread…'); break; }
          this.pass = this.cur; this.cur = ''; this.shave = 0; this.emit('pass');
          break;
        case 'trash':
          if (this.cur) { this.cur = ''; this.shave = 0; this.emit('trash'); }
          break;
      }
    }
    kasseAct(name, arg) {
      const c = this.slots[arg];
      switch (name) {
        case 'dance': {
          const [slot, d] = arg; const q = this.slots[slot];
          if (!q || !q.enc || q.dec) break;
          if (q.dance[q.dp] === d) { q.dp++; this.emit('step', slot, d); if (q.dp >= q.dance.length) { q.dec = true; this.emit('decoded', slot, BB.RECIPES[q.k].name); } }
          else { q.dp = q.dance[0] === d ? 1 : 0; q.pat = Math.max(1, q.pat - 3); this.emit('miss', slot); }
          break;
        }
        case 'serve':
          if (!c) break;
          if (!this.pass) { this.emit('knope', arg, 'Nothing on the pass'); break; }
          if (this.train && !this.train.open) { this.emit('knope', arg, 'Doors are closed!'); break; }
          if (this.pass.slice(1) === c.c) {
            const gain = 8 + Math.round(4 * c.pat / c.max);
            this.score += gain; this.served++; this.slots[arg] = null; this.pass = '';
            this.emit('serve', arg, '+€' + gain);
          } else {
            this.pass = ''; c.pat = Math.max(1, c.pat - 8);
            this.emit('wrong', arg, 'That’s not mine!');
          }
          break;
        case 'reject':
          if (this.pass) { this.pass = ''; this.emit('trash'); }
          break;
        case 'torch':
          if (this.train) { this.torch = arg; this.torchT = 3; this.emit('torch', arg); }
          break;
      }
    }
    snapshot() {
      const tr = this.train;
      return { rid: this.rid, si: this.si, ph: this.phase, pt: r1(this.phaseT), tm: r1(this.time), cl: r1(this.clock), sc: this.score, sv: this.served, fl: this.failed, st: this.stars,
        sl: this.slots.map(c => c ? [c.id, c.seed, c.k, r1(c.pat), c.max, c.enc ? 1 : 0, c.dance, c.dp, c.dec ? 1 : 0] : 0),
        pa: this.pass, cu: this.cur, sh: this.shave, bo: this.board, ch: r1(this.chop), bi: [this.bins.l, this.bins.t, this.bins.o], or: this.order.join(''),
        to: this.torch, tt: r1(this.torchT), sg: { k: this.signs.kasse, g: this.signs.grill },
        tr: tr ? [tr.open ? 1 : 0, r1(tr.t), tr.si, tr.jolt, r1(tr.dark)] : 0,
        ev: this.events.slice(-8).map(e => [e.id, e.type, e.a, e.txt]) };
    }
    apply(s) {
      this.phase = s.ph; this.phaseT = s.pt; this.time = s.tm; this.clock = s.cl; this.score = s.sc; this.served = s.sv; this.failed = s.fl; this.stars = s.st;
      this.slots = s.sl.map(a => a ? { id: a[0], seed: a[1], k: a[2], c: BB.RECIPES[a[2]].c, pat: a[3], max: a[4], enc: !!a[5], dance: a[6], dp: a[7], dec: !!a[8] } : null);
      this.pass = s.pa; this.cur = s.cu; this.shave = s.sh; this.board = s.bo; this.chop = s.ch;
      this.bins = { l: s.bi[0], t: s.bi[1], o: s.bi[2] }; this.order = s.or.split('');
      this.torch = s.to; this.torchT = s.tt; this.signs = { kasse: s.sg.k, grill: s.sg.g };
      if (this.train && s.tr) Object.assign(this.train, { open: !!s.tr[0], t: s.tr[1], si: s.tr[2], jolt: s.tr[3], dark: s.tr[4] });
      this.events = s.ev.map(a => ({ id: a[0], type: a[1], a: a[2], txt: a[3] }));
    }
  }

  // ------------------------------------------------------------------ drawing helpers
  function txt(ctx, s, x, y, font, col, align) { ctx.font = font; ctx.fillStyle = col; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y); }
  function panel(ctx, x, y, w, h, r, fill, stroke, lw) { A.rr(ctx, x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); } }
  function keycap(ctx, label, x, y, dim) {
    if (!label) return;
    ctx.font = '800 13px Archivo, sans-serif';
    const w = Math.max(20, ctx.measureText(label).width + 10);
    panel(ctx, x - w / 2, y - 11, w, 20, 5, dim ? 'rgba(255,246,227,.35)' : C.paper, null);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - w / 2 + 3, y + 8, w - 6, 2);
    txt(ctx, label, x, y + 4, '800 13px Archivo, sans-serif', '#1b1424', 'center');
  }
  function drawSignBubble(ctx, x, y, si, a, s, edge) {
    const S = SIGNS[si]; if (!S) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
    panel(ctx, -32, -30, 64, 56, 16, C.paper, edge || '#16b3a3', 4);
    if (S.k) A.drawIcon(ctx, S.k, 0, -2, 1.5);
    else { ctx.font = (S.txt.length > 2 ? '400 17px' : '400 24px') + ' Bungee, Archivo, sans-serif'; ctx.fillStyle = S.col; ctx.textAlign = 'center'; ctx.fillText(S.txt, 0, 8); }
    ctx.restore();
  }
  function bust(ctx, kind, x, y, s, opts) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    A.drawBear(ctx, 0, 0, Object.assign({ kind, fx: 0, fy: 1, t: opts.t, walk: 0 }, opts));
    ctx.restore();
  }
  function bar(ctx, x, y, w, h, p, col) { panel(ctx, x, y, w, h, h / 2, 'rgba(0,0,0,.5)'); panel(ctx, x + 2, y + 2, Math.max(h - 4, (w - 4) * p), h - 4, (h - 4) / 2, col || '#5be37a'); }
  function topBar(ctx, w, role, t) {
    ctx.fillStyle = '#120c1c'; ctx.fillRect(0, 0, W, 52);
    const B = A.BEARS[role === 'grill' ? 0 : 1];
    panel(ctx, 10, 8, 300, 36, 10, B.hat);
    txt(ctx, (role === 'grill' ? 'BRUNO · GRILL' : 'BÄRBEL · KASSE'), 22, 32, '400 17px Bungee, Archivo, sans-serif', '#fff');
    txt(ctx, role === 'grill' ? 'Can’t see customers' : 'Can’t touch food', 300, 31, '700 12px Archivo, sans-serif', 'rgba(255,255,255,.85)', 'right');
    txt(ctx, w.S.name.toUpperCase() + ' · ' + w.S.clock, 480, 33, '700 13px Archivo, sans-serif', 'rgba(255,255,255,.7)', 'center');
    const tm = Math.max(0, Math.ceil(w.time));
    txt(ctx, Math.floor(tm / 60) + ':' + String(tm % 60).padStart(2, '0'), 830, 36, '400 24px Bungee, Archivo, sans-serif', tm <= 20 ? '#ff5a4f' : '#fff', 'right');
    txt(ctx, '€' + w.score, 948, 36, '400 24px Bungee, Archivo, sans-serif', C.amber, 'right');
  }
  function signRow(ctx, list, x, y, now, edge) {
    // recent signs, oldest left
    list.forEach((s, i) => {
      const age = now - s[2];
      const a = Math.max(0, Math.min(1, (9 - age) / 2));
      const pop = Math.min(1, age * 5);
      drawSignBubble(ctx, x + i * 70, y, s[1], a, (i === list.length - 1 ? 1 : 0.8) * (0.6 + 0.4 * pop), edge);
    });
  }

  // ---- Kasse screen ----
  function drawKasse(ctx, w, ui, t) {
    ui.hits = [];
    const sh = w.S.id;
    // scene background
    if (sh === 'kotti') {
      const g = ctx.createLinearGradient(0, 52, 0, 420); g.addColorStop(0, '#f08a4b'); g.addColorStop(0.55, '#a8487a'); g.addColorStop(1, '#3b2a5c');
      ctx.fillStyle = g; ctx.fillRect(0, 52, W, 370);
      ctx.fillStyle = '#2a1f3f';
      [[0, 160, 120], [110, 200, 90], [190, 140, 140], [330, 190, 110], [430, 120, 170], [600, 170, 130], [720, 135, 120], [840, 185, 130]].forEach(([x, y, w2]) => ctx.fillRect(x, y, w2, 420 - y));
      ctx.fillStyle = 'rgba(255,214,120,.7)';
      for (let i = 0; i < 70; i++) { const x = (i * 97) % 940 + 10, y = 170 + ((i * 53) % 180); if ((i * 7 + Math.floor(t / 3)) % 5) ctx.fillRect(x, y, 6, 8); }
      ctx.fillStyle = '#1d3d8f'; panel(ctx, 380, 70, 200, 30, 4, '#f2f2f2', '#1d3d8f', 3);
      txt(ctx, 'Kottbusser Tor', 480, 91, '700 16px Archivo, sans-serif', '#1d3d8f', 'center');
    } else if (sh === 'bunker') {
      ctx.fillStyle = '#0d0a12'; ctx.fillRect(0, 52, W, 370);
      const beat = BB.Audio.beatPhase();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      [[C.magenta, 0], [C.cyan, 2], ['#ffd23f', 4]].forEach(([col, ph]) => {
        const sx = (Math.sin(t * 0.8 + ph) * 0.45 + 0.5) * W, sy = 140;
        const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, 260); gr.addColorStop(0, col + '55'); gr.addColorStop(1, col + '00');
        ctx.fillStyle = gr; ctx.fillRect(0, 52, W, 370);
      });
      if (!reduce) { ctx.strokeStyle = 'rgba(255,63,164,.4)'; ctx.lineWidth = 2; for (let k = 0; k < 6; k++) { const a = t * 1.1 + k; ctx.beginPath(); ctx.moveTo(480, 52); ctx.lineTo(480 + Math.cos(a) * 700, 52 + Math.abs(Math.sin(a)) * 400); ctx.stroke(); } }
      ctx.restore();
      ctx.fillStyle = '#05030a';
      for (let i = 0; i < 26; i++) { const x = i * 38 - 10, bob = reduce ? 0 : Math.abs(Math.sin(t * 13.6 / 2 + i)) * 8; ctx.beginPath(); ctx.arc(x, 330 - bob, 20, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 22, 340 - bob, 44, 90); }
      ctx.fillStyle = `rgba(255,255,255,${reduce ? 0 : 0.06 * Math.pow(1 - beat, 4)})`; ctx.fillRect(0, 52, W, 370);
    } else {
      const tr = w.train, open = tr && tr.open;
      if (open) {
        ctx.fillStyle = '#d9d2b8'; ctx.fillRect(0, 52, W, 370);
        ctx.fillStyle = '#c4bb9a'; for (let i = 0; i < 16; i++) ctx.fillRect(i * 62, 52, 2, 370);
        panel(ctx, 330, 80, 300, 40, 4, '#1d3d8f'); txt(ctx, STOPS[tr.si % STOPS.length], 480, 107, '700 19px Archivo, sans-serif', '#fff', 'center');
        ctx.fillStyle = '#9a927a'; ctx.fillRect(0, 380, W, 40);
      } else {
        ctx.fillStyle = '#07080c'; ctx.fillRect(0, 52, W, 370);
        if (!reduce) { ctx.fillStyle = 'rgba(255,220,150,.5)'; for (let i = 0; i < 4; i++) { const x = W - ((t * 900 + i * 260) % (W + 200)); ctx.fillRect(x, 150, 120, 4); } }
        txt(ctx, 'Tunnel · next stop in ' + Math.ceil(tr.t) + 's', 480, 110, '700 18px Archivo, sans-serif', 'rgba(255,255,255,.7)', 'center');
      }
    }
    // window frame
    ctx.fillStyle = '#2b3f5c'; ctx.fillRect(0, 52, W, 10);
    for (let k = 0; k < 30; k++) { ctx.fillStyle = k % 2 ? '#fff' : (sh === 'bunker' ? C.magenta : sh === 'u8' ? C.bvg : '#e2332e'); ctx.fillRect(k * 32, 62, 32, 14); }
    // customers
    const xs = [170, 480, 790];
    w.slots.forEach((c, i) => {
      const x = xs[i];
      if (!c) { txt(ctx, w.train && !w.train.open ? '' : '· empty ·', x, 300, '600 14px Archivo, sans-serif', 'rgba(255,255,255,.35)', 'center'); return; }
      const sel = ui.sel === i;
      const pct = Math.max(0, c.pat / c.max);
      let pose = null;
      if (c.enc && !c.dec) { const step = Math.floor(t * 2.1) % (c.dance.length + 1); pose = step < c.dance.length ? c.dance[step] : null; }
      else if (c.dec && c.enc && !reduce) pose = Math.floor(t * 2) % 2 ? 'U' : null;
      // body
      A.ell(ctx, x, 418, 70, 14, 'rgba(0,0,0,.3)');
      ctx.fillStyle = ['#3f6fb5', '#b5523f', '#3fa36f', '#8a3fb5', '#c9a227'][c.seed % 5];
      A.rr(ctx, x - 52, 320, 104, 110, 40); ctx.fill();
      A.drawCustomer(ctx, x, 270, c.seed, t, { pose, mood: pct, r: 54 });
      // ticket bubble
      const bx = x - 125, by = 92, bw = 250, bh = 104;
      panel(ctx, bx, by, bw, bh, 16, C.paper, sel ? C.bvg : 'rgba(0,0,0,.4)', sel ? 5 : 2);
      ctx.beginPath(); ctx.moveTo(x - 14, by + bh); ctx.lineTo(x, by + bh + 18); ctx.lineTo(x + 14, by + bh); ctx.fillStyle = C.paper; ctx.fill();
      if (c.enc && !c.dec) {
        txt(ctx, 'DANCE ORDER', x, by + 24, '800 12px Archivo, sans-serif', '#8a1f6a', 'center');
        const n = c.dance.length;
        for (let k = 0; k < n; k++) A.drawArrow(ctx, c.dance[k], x + (k - (n - 1) / 2) * 46, by + 60, 1.9, k < c.dp ? '#22b35a' : C.magenta, '#1b1424');
        txt(ctx, ui.dancing === i ? 'Copy it! ← ↑ → ↓' : 'Select + Enter to copy it', x, by + 94, '700 12px Archivo, sans-serif', '#555', 'center');
      } else {
        txt(ctx, BB.RECIPES[c.k].name, x, by + 26, '400 17px Bungee, Archivo, sans-serif', '#1b1424', 'center');
        const n = c.c.length, sp = Math.min(40, 220 / n);
        for (let k = 0; k < n; k++) A.drawIcon(ctx, c.c[k], x + (k - (n - 1) / 2) * sp, by + 64, 1.3);
      }
      bar(ctx, x - 70, 438 - 26, 140, 14, pct, pct > 0.5 ? '#22b35a' : pct > 0.25 ? '#f0a30a' : '#e1262b');
      if (sel) { A.tri(ctx, x - 12, 445, x + 12, 445, x, 432, C.bvg); }
      ui.hits.push({ x: bx, y: by, w: bw, h: 340, act: () => ui.onCustomer(i) });
    });
    // counter
    const g2 = ctx.createLinearGradient(0, 440, 0, H); g2.addColorStop(0, '#c3cad6'); g2.addColorStop(1, '#8d98a8');
    ctx.fillStyle = g2; ctx.fillRect(0, 440, W, 200);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(0, 440, W, 3);
    // the pass
    panel(ctx, 16, 456, 270, 170, 14, 'rgba(0,0,0,.18)', 'rgba(0,0,0,.25)');
    txt(ctx, 'THE PASS', 30, 478, '800 12px Archivo, sans-serif', '#2b2f3a');
    if (w.pass) {
      A.drawDoner(ctx, w.pass, 100, 548, 2.3);
      const cs = w.pass.slice(1);
      cs.split('').forEach((ch, k) => A.drawIcon(ctx, ch, 196 + (k % 2) * 34, 500 + Math.floor(k / 2) * 34, 0.85));
      keycap(ctx, 'Enter', 60, 610); txt(ctx, 'serve', 84, 614, '700 12px Archivo, sans-serif', '#2b2f3a');
      keycap(ctx, '⌫', 160, 610); txt(ctx, 'send back', 176, 614, '700 12px Archivo, sans-serif', '#2b2f3a');
      ui.hits.push({ x: 16, y: 586, w: 270, h: 40, act: () => ui.send('reject') });
    } else txt(ctx, 'Waiting for Bruno…', 150, 550, '700 14px Archivo, sans-serif', 'rgba(0,0,0,.4)', 'center');
    // hatch into the kitchen
    panel(ctx, 300, 456, 330, 170, 14, '#1fb5a8', '#0d6f66', 3);
    ctx.save(); A.rr(ctx, 300, 456, 330, 170, 14); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 12; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) ctx.fillRect(300 + i * 28, 456 + j * 28, 28, 28);
    if (w.train && w.S.train) {
      // torch strip: Bärbel can see Bruno's bins and light one
      const dark = w.train.dark;
      txt(ctx, 'YOUR TORCH · light a bin for Bruno', 465, 478, '800 12px Archivo, sans-serif', '#063b36', 'center');
      w.order.forEach((ing, k) => {
        const x = 318 + k * 62, y = 492;
        const lit = w.torch === k;
        panel(ctx, x, y, 54, 72, 8, lit ? '#fff3b0' : '#e9e1cf', lit ? '#f7d117' : '#6b6250', lit ? 4 : 2);
        A.drawIcon(ctx, ing, x + 27, y + 32, 1.1);
        keycap(ctx, KEYLBL[KEYS.kasse.torch[k]], x + 27, y + 86);
        ui.hits.push({ x, y, w: 54, h: 100, act: () => ui.send('torch', k) });
      });
      if (dark > 0.5) txt(ctx, 'Bruno is in the dark', 465, 616, '700 11px Archivo, sans-serif', '#063b36', 'center');
    } else {
      bust(ctx, 0, 410, 600, 2.2, { t, chopping: !!w.board && w.phase === 'play', held: w.cur || null, fy: 1 });
      if (w.cur) { txt(ctx, 'Building:', 520, 488, '700 12px Archivo, sans-serif', '#063b36'); A.drawDoner(ctx, w.cur, 560, 540, 1.4); }
      else txt(ctx, 'Hands empty', 540, 500, '700 12px Archivo, sans-serif', '#063b36', 'center');
    }
    ctx.restore();
    signRow(ctx, w.signs.grill, 344, 600 - 120, w.clock, '#e2332e');
    // sign pad
    panel(ctx, 644, 456, 300, 170, 14, 'rgba(0,0,0,.18)', 'rgba(0,0,0,.25)');
    txt(ctx, 'PAW SIGNS → BRUNO', 658, 478, '800 12px Archivo, sans-serif', '#2b2f3a');
    const keysK = Object.keys(KEYS.kasse.signs);
    for (let i = 0; i < 10; i++) {
      const col = i < 6 ? i % 3 : (i - 6), row = i < 6 ? Math.floor(i / 3) : 2;
      const x = i < 6 ? 662 + col * 90 : 658 + col * 70, y = i < 6 ? 488 + row * 46 : 584, bw = i < 6 ? 82 : 64;
      panel(ctx, x, y, bw, 38, 9, C.paper, 'rgba(0,0,0,.3)');
      const S = SIGNS[i];
      if (S.k) A.drawIcon(ctx, S.k, x + 26, y + 19, 0.85);
      else txt(ctx, S.txt, x + (i < 6 ? 30 : 24), y + 25, '400 13px Bungee, Archivo, sans-serif', S.col, 'center');
      keycap(ctx, KEYLBL[keysK[i]], x + bw - 14, y + 19);
      ui.hits.push({ x, y, w: bw, h: 38, act: () => ui.send('sign', i) });
    }
    // dance mode: Bärbel dances in the counter area, pad for touch
    if (ui.dancing >= 0 && w.slots[ui.dancing]) {
      const x = xs[ui.dancing];
      ctx.strokeStyle = C.magenta; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 40;
      A.rr(ctx, x - 130, 88, 260, 112, 18); ctx.stroke(); ctx.setLineDash([]);
      panel(ctx, 16, 456, 614, 170, 14, 'rgba(16,8,28,.94)', C.magenta, 3);
      bust(ctx, 1, 110, 608, 1.9, { t, pose: ui.pose, poseT: ui.poseT, dance: true });
      txt(ctx, 'BÄRBEL IS DANCING', 230, 486, '400 15px Bungee, Archivo, sans-serif', '#fff');
      txt(ctx, 'Copy the moves · Esc to stop', 230, 506, '700 12px Archivo, sans-serif', 'rgba(255,255,255,.7)');
      [['U', 470, 500], ['L', 400, 572], ['D', 470, 572], ['R', 540, 572]].forEach(([d, bx, by]) => {
        panel(ctx, bx - 32, by - 30, 64, 60, 14, 'rgba(255,63,164,.95)', '#fff', 3);
        A.drawArrow(ctx, d, bx, by, 2.1, '#fff', null);
        ui.hits.push({ x: bx - 32, y: by - 30, w: 64, h: 60, act: () => ui.danceMove(d) });
      });
    }
    // doors closed tint
    if (w.train && !w.train.open) { panel(ctx, 16, 456, 270, 170, 14, 'rgba(225,38,43,.12)'); txt(ctx, 'DOORS CLOSED', 150, 500, '400 14px Bungee, Archivo, sans-serif', '#b0181d', 'center'); }
    topBar(ctx, w, 'kasse', t);
  }

  // ---- Grill screen ----
  const POSX = [372, 486, 600, 714, 828];
  function drawGrill(ctx, w, ui, t) {
    ui.hits = [];
    const dark = w.train ? w.train.dark : 0;
    // tiled wall
    ctx.fillStyle = '#e8f3f1'; ctx.fillRect(0, 52, W, 588);
    for (let i = 0; i < 24; i++) for (let j = 0; j < 6; j++) { if ((i + j) % 2) { ctx.fillStyle = '#bfe3dd'; ctx.fillRect(i * 40, 52 + j * 40, 40, 40); } }
    ctx.fillStyle = '#1fb5a8'; ctx.fillRect(0, 290, W, 6);
    // hatch to the window (Bärbel)
    panel(ctx, 20, 64, 600, 170, 16, '#2b3f5c', '#16253a', 4);
    ctx.save(); A.rr(ctx, 20, 64, 600, 170, 16); ctx.clip();
    ctx.fillStyle = w.S.id === 'bunker' ? '#1a0f24' : w.S.id === 'u8' ? '#262a33' : '#d8836a'; ctx.fillRect(20, 64, 600, 170);
    bust(ctx, 1, 110, 260, 2.1, { t, fy: 1, dance: false, pose: null });
    ctx.restore();
    txt(ctx, 'BÄRBEL’S SIGNS', 200, 88, '800 12px Archivo, sans-serif', 'rgba(255,255,255,.75)');
    signRow(ctx, w.signs.kasse, 236, 160, w.clock, '#16b3a3');
    if (!w.signs.kasse.length) txt(ctx, 'You can’t see the customers. Watch Bärbel.', 200, 165, '700 14px Archivo, sans-serif', 'rgba(255,255,255,.6)');
    // the pass
    panel(ctx, 636, 64, 304, 170, 16, '#c3cad6', '#5d6777', 3);
    txt(ctx, 'THE PASS → BÄRBEL', 650, 88, '800 12px Archivo, sans-serif', '#2b2f3a');
    if (w.pass) { A.drawDoner(ctx, w.pass, 790, 160, 1.8); txt(ctx, 'waiting to be served', 788, 222, '700 12px Archivo, sans-serif', '#2b2f3a', 'center'); }
    else { txt(ctx, 'empty', 788, 165, '700 14px Archivo, sans-serif', 'rgba(0,0,0,.35)', 'center'); }
    // counter
    const g = ctx.createLinearGradient(0, 300, 0, H); g.addColorStop(0, '#d5dbe4'); g.addColorStop(1, '#9aa4b4');
    ctx.fillStyle = g; ctx.fillRect(0, 300, W, 340); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, 300, W, 3);
    // spit
    const sx = 40, sy = 250;
    ctx.fillStyle = '#e64a19'; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6); A.rr(ctx, sx, sy, 150, 190, 18); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#333'; ctx.fillRect(sx + 72, sy - 6, 6, 196);
    ctx.save(); ctx.beginPath(); ctx.moveTo(sx + 30, sy + 14); ctx.lineTo(sx + 120, sy + 14); ctx.lineTo(sx + 104, sy + 176); ctx.lineTo(sx + 46, sy + 176); ctx.closePath();
    ctx.fillStyle = C.meat; ctx.fill(); ctx.clip();
    for (let k = 0; k < 9; k++) { const off = ((t * 30 + k * 14) % 126) - 10; ctx.fillStyle = k % 2 ? C.meatHi : '#a45a30'; ctx.fillRect(sx + 26 + off * 0.75, sy + 10, 7, 170); }
    ctx.restore();
    station(ctx, ui, sx, sy, 150, 200, 'SPIT', KEYS.grill.spit, () => ui.send('spit'));
    if (w.shave > 0) bar(ctx, sx + 15, sy + 186, 120, 12, w.shave);
    // pita stack
    const px = 210, py = 320;
    panel(ctx, px, py, 130, 120, 14, '#b8794a', '#87532e', 3);
    for (let k = 0; k < 4; k++) A.ell(ctx, px + 65, py + 82 - k * 12, 46, 14, C.bread, C.breadDk, 2);
    station(ctx, ui, px, py, 130, 120, 'PITA', KEYS.grill.pita, () => ui.send('pita'));
    // bins + sauces (positions; U8 shuffles them and the dark hides them)
    w.order.forEach((ing, k) => {
      const x = POSX[k] - 50, y = 320, bw = 100, bh = 120;
      const lit = w.torch === k;
      const hidden = dark > 0.5 && !lit;
      const isSauce = ing === 'g' || ing === 'h';
      panel(ctx, x, y, bw, bh, 14, hidden ? '#3b3f47' : isSauce ? '#f3eee2' : '#dfe7ea', lit ? C.bvg : '#5d6777', lit ? 5 : 3);
      if (!hidden) {
        if (isSauce) { A.drawIcon(ctx, ing, x + 38, y + 56, 2.2); A.drawIcon(ctx, ing, x + 66, y + 62, 1.7); }
        else {
          const n = w.bins[ing];
          if (n > 0) A.drawIcon(ctx, ing, x + 50, y + 54, 2.1); else { txt(ctx, 'EMPTY', x + 50, y + 50, '400 14px Bungee, Archivo, sans-serif', '#b0181d', 'center'); A.drawItem(ctx, ing.toUpperCase(), x + 50, y + 82, 0.9); }
          for (let p = 0; p < 3; p++) A.circ(ctx, x + 32 + p * 18, y + 102, 6, p < n ? '#22b35a' : 'rgba(0,0,0,.2)');
        }
      } else txt(ctx, '?', x + 50, y + 74, '400 34px Bungee, Archivo, sans-serif', 'rgba(255,255,255,.3)', 'center');
      station(ctx, ui, x, y, bw, bh, '', KEYS.grill.pos[k], () => ui.send('pos', k));
    });
    // cutting board
    const cx = 40, cy = 470;
    panel(ctx, cx, cy, 300, 150, 16, '#d9a46b', '#87532e', 3);
    txt(ctx, 'BOARD', cx + 16, cy + 24, '800 12px Archivo, sans-serif', '#5a3416');
    if (w.board) {
      const raw = w.board, chopped = raw.toLowerCase();
      A.drawItem(ctx, w.chop > 0.5 ? chopped : raw, cx + 120, cy + 78, 2.0);
      bar(ctx, cx + 30, cy + 120, 240, 16, w.chop);
      txt(ctx, 'tap fast to chop', cx + 200, cy + 60, '700 12px Archivo, sans-serif', '#5a3416');
    } else txt(ctx, 'Empty bins: tap one to start chopping', cx + 150, cy + 84, '700 12px Archivo, sans-serif', '#5a3416', 'center');
    station(ctx, ui, cx, cy, 300, 150, '', KEYS.grill.chop, () => ui.send('chop'), 'CHOP');
    // current döner
    panel(ctx, 356, 470, 330, 150, 16, '#f6f2ea', '#9aa4b4', 3);
    txt(ctx, 'YOUR DÖNER', 372, 494, '800 12px Archivo, sans-serif', '#2b2f3a');
    if (w.cur) {
      A.drawDoner(ctx, w.cur, 470, 560, 2.4);
      w.cur.slice(1).split('').forEach((ch, k) => A.drawIcon(ctx, ch, 586 + (k % 2) * 40, 516 + Math.floor(k / 2) * 34, 0.95));
    } else txt(ctx, 'Grab a pita', 520, 556, '700 14px Archivo, sans-serif', 'rgba(0,0,0,.35)', 'center');
    // pass + trash buttons
    panel(ctx, 700, 470, 130, 150, 16, '#16b3a3', '#0d7a6f', 3);
    txt(ctx, 'PASS', 765, 548, '400 22px Bungee, Archivo, sans-serif', '#fff', 'center');
    txt(ctx, 'to Bärbel', 765, 570, '700 12px Archivo, sans-serif', '#e6fffb', 'center');
    station(ctx, ui, 700, 470, 130, 150, '', KEYS.grill.pass, () => ui.send('pass'));
    panel(ctx, 842, 470, 100, 150, 16, '#3c4a3f', '#1e2620', 3);
    txt(ctx, 'MÜLL', 892, 552, '400 16px Bungee, Archivo, sans-serif', '#9fb3a4', 'center');
    station(ctx, ui, 842, 470, 100, 150, '', KEYS.grill.trash, () => ui.send('trash'));
    // Bruno's own reply signs
    const gk = Object.keys(KEYS.grill.signs);
    gk.forEach((code, i) => {
      const x = 636 + i * 76, y = 244;
      panel(ctx, x, y, 68, 40, 10, C.paper, 'rgba(0,0,0,.3)');
      const S = SIGNS[6 + i];
      txt(ctx, S.txt, x + 26, y + 27, '400 13px Bungee, Archivo, sans-serif', S.col, 'center');
      keycap(ctx, KEYLBL[code], x + 56, y + 20);
      ui.hits.push({ x, y, w: 68, h: 40, act: () => ui.send('sign', 6 + i) });
    });
    // darkness (U8 tunnels): everything dims except the torch beam
    if (dark > 0.02) {
      ctx.save();
      ctx.fillStyle = `rgba(3,4,8,${0.82 * dark})`;
      ctx.beginPath(); ctx.rect(0, 296, W, 344);
      if (w.torch >= 0) { const tx = POSX[w.torch]; ctx.moveTo(tx + 80, 380); ctx.arc(tx, 380, 80, 0, Math.PI * 2, true); }
      ctx.fill('evenodd');
      ctx.restore();
      if (dark > 0.5) txt(ctx, 'TUNNEL · it’s pitch black. Ask Bärbel for the torch.', 480, 456, '700 14px Archivo, sans-serif', '#f7d117', 'center');
    }
    topBar(ctx, w, 'grill', t);
  }
  function station(ctx, ui, x, y, w, h, label, code, fn, label2) {
    if (label) txt(ctx, label, x + 12, y + 24, '800 12px Archivo, sans-serif', '#1b1424');
    keycap(ctx, KEYLBL[code] + (label2 ? ' · ' + label2 : ''), x + w - 22 - (label2 ? 28 : 0), y + 18);
    ui.hits.push({ x, y, w, h, act: fn });
  }

  // ---- shared overlays ----
  function drawOverlay(ctx, w, role, t) {
    // popups
    w.popups.forEach(p => {
      if (p.role && p.role !== role) return;
      const a = Math.max(0, 1 - p.age / 1.6);
      ctx.globalAlpha = a; ctx.font = '400 26px Bungee, Archivo, sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(p.txt, p.x, p.y - p.age * 40);
      ctx.fillStyle = p.col; ctx.fillText(p.txt, p.x, p.y - p.age * 40); ctx.globalAlpha = 1;
    });
    if (w.phase === 'intro') {
      ctx.fillStyle = 'rgba(10,6,16,.78)'; ctx.fillRect(0, 0, W, H);
      panel(ctx, 140, 110, 680, 410, 22, C.paper, role === 'grill' ? '#e2332e' : '#16b3a3', 6);
      txt(ctx, 'SHIFT ' + (w.si + 1) + ' · ' + w.S.clock, 480, 156, '400 16px Bungee, Archivo, sans-serif', '#1b1424', 'center');
      txt(ctx, w.S.name.toUpperCase(), 480, 206, '400 42px Bungee, Archivo, sans-serif', '#1b1424', 'center');
      const B = A.BEARS[role === 'grill' ? 0 : 1];
      panel(ctx, 200, 228, 560, 40, 10, B.hat);
      txt(ctx, role === 'grill' ? 'YOU ARE BRUNO AT THE GRILL' : 'YOU ARE BÄRBEL AT THE WINDOW', 480, 255, '400 17px Bungee, Archivo, sans-serif', '#fff', 'center');
      ctx.font = '700 16px Archivo, sans-serif'; ctx.fillStyle = '#3a3346';
      const you = role === 'grill' ? 'You build the döner. You can’t see or hear the customers. Only Bärbel knows what they want.'
        : 'You see the customers. You can’t touch food. Sign each order to Bruno, then serve what lands on the pass.';
      let yy = BB.Render.wrap(ctx, you, 480, 300, 580, 23);
      ctx.fillStyle = '#7a2a7a'; BB.Render.wrap(ctx, w.S.rule, 480, yy + 34, 580, 23);
      txt(ctx, Math.max(1, Math.ceil(w.phaseT)), 480, 498, '400 28px Bungee, Archivo, sans-serif', '#e2332e', 'center');
    }
    if (w.phase === 'end') { ctx.fillStyle = 'rgba(10,6,16,.6)'; ctx.fillRect(0, 0, W, H); }
  }

  BB.Roles = { SHIFTS, SIGNS, KEYS, KEYLBL, World, drawKasse, drawGrill, drawOverlay, W, H };
})();
