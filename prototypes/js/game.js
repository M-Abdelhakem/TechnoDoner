// Berlin Bears — world simulation, controls, host/guest netcode, main loop
(function () {
  const BB = (window.BB = window.BB || {});
  const COLS = BB.COLS, ROWS = BB.ROWS, OC = BB.ORDER_CHARS;
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  const STOPS = ['Hermannstraße', 'Boddinstraße', 'Leinestraße', 'Hermannplatz', 'Schönleinstraße', 'Kottbusser Tor', 'Moritzplatz', 'Heinrich-Heine-Str.', 'Jannowitzbrücke', 'Alexanderplatz', 'Weinmeisterstraße', 'Rosenthaler Platz'];

  function newPlayer(pos) {
    return { x: pos[0], y: pos[1], fx: 0, fy: 1, vx: 0, vy: 0, held: null, chopping: false, shave: 0, walk: 0, moving: false,
      pose: null, poseT: 0, emote: -1, emoteT: 0, dance: false, _chopT: 0 };
  }
  const canAdd = (d, ing) => 'mlto'.includes(ing) && !d.slice(1).includes(ing);
  const addTo = (d, ch) => 'D' + OC.split('').filter(x => d.slice(1).includes(x) || x === ch).join('');

  class World {
    constructor(lv, rid) {
      this.lv = lv; this.L = BB.LEVELS[lv]; this.rid = rid || 1;
      this.tiles = this.L.map.join('');
      this.items = {}; this.prog = {};
      this.players = [0, 1].map(i => newPlayer(this.L.spawnPos[i]));
      this.orders = []; this.score = 0; this.served = 0; this.failed = 0; this.stars = 0;
      this.time = this.L.duration; this.phase = 'intro'; this.phaseT = 5;
      this.events = []; this.evId = 0; this.oid = 0; this.spawnT = this.L.spawn[0]; this.lastK = null;
      this.clock = 0; this.dropOn = false; this.shake = 0; this.popups = []; this._seenEv = 0;
      this.train = this.L.train ? { open: true, t: this.L.station, jolt: 0, dark: 0, si: 0, stop: STOPS[0], warned: false } : null;
    }
    tileAt(c, r) { if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return '#'; return this.tiles[r * COLS + c]; }
    solid(c, r) { return this.tileAt(c, r) !== '.'; }
    target(p) { return [Math.floor(p.x) + p.fx, Math.floor(p.y) + p.fy]; }
    inDanceZone(p) { return BB.Render.isDanceZone(this, Math.floor(p.x), Math.floor(p.y)); }
    emit(type, x, y, txt) { this.events.push({ id: ++this.evId, type, x, y, txt }); if (this.events.length > 12) this.events.shift(); }

    spawnOrder() {
      const L = this.L;
      let k = L.recipes[Math.floor(Math.random() * L.recipes.length)];
      if (k === this.lastK) k = L.recipes[Math.floor(Math.random() * L.recipes.length)];
      this.lastK = k;
      let dance = '';
      if (L.dance) {
        const D = 'ULRD';
        while (dance.length < L.dlen) { const d = D[Math.floor(Math.random() * 4)]; if (dance.slice(-1) !== d) dance += d; }
      }
      this.orders.push({ id: ++this.oid, k, c: BB.RECIPES[k].c, pat: L.patience, max: L.patience, seed: Math.floor(Math.random() * 997), enc: !!L.dance, dance, dp: 0, dec: -1 });
      this.emit('order', 7.5, 0.5, '');
    }

    update(dt, inputs) {
      this.clock += dt;
      this.dropOn = !!(this.L.dance && (this.clock % 36) > 29);
      if (this.phase === 'intro') { this.phaseT -= dt; if (this.phaseT <= 0) { this.phase = 'play'; this.emit('start', 7.5, 4, 'LOS!'); } return; }
      if (this.phase !== 'play') return;
      this.time -= dt;
      if (this.time <= 0) {
        this.time = 0; this.phase = 'end';
        const s = this.L.stars; this.stars = this.score >= s[2] ? 3 : this.score >= s[1] ? 2 : this.score >= s[0] ? 1 : 0;
        this.emit('end', 7.5, 4, 'Feierabend!');
        return;
      }
      // train cycle
      const tr = this.train;
      if (tr) {
        tr.t -= dt;
        if (tr.open && tr.t < 2.5 && !tr.warned) { tr.warned = true; this.emit('warn', 7.5, 1.2, 'Zurückbleiben, bitte!'); }
        if (tr.t <= 0) {
          if (tr.open) { tr.open = false; tr.t = this.L.tunnel; this.emit('doors', 7.5, 1.2, ''); }
          else {
            tr.open = true; tr.t = this.L.station; tr.jolt++; tr.si++; tr.stop = STOPS[tr.si % STOPS.length]; tr.warned = false;
            this.emit('arrive', 7.5, 2, tr.stop);
            for (let k = 0; k < 2 && this.orders.length < this.L.maxOrders; k++) this.spawnOrder();
          }
        }
        tr.dark += ((tr.open ? 0 : 1) - tr.dark) * Math.min(1, dt * 2.5);
      }
      // orders
      if (!tr || this.clock < 8) {
        this.spawnT -= dt;
        if (this.spawnT <= 0) {
          if (this.orders.length < this.L.maxOrders) this.spawnOrder();
          this.spawnT = tr ? 999 : this.L.spawn[1] * (0.8 + Math.random() * 0.4);
        }
        if (!tr && this.orders.length === 0) this.spawnT = Math.min(this.spawnT, 2.5);
      }
      for (let i = this.orders.length - 1; i >= 0; i--) {
        const o = this.orders[i];
        o.pat -= dt;
        if (o.pat <= 0) {
          this.orders.splice(i, 1); this.failed++; this.score = Math.max(0, this.score - 5);
          this.emit('expire', 2 + i * 3.1, 0.6, 'Left hungry −€5');
        }
      }
      // player actions
      inputs.forEach((inp, i) => {
        if (!inp) return;
        const p = this.players[i];
        for (let k = 0; k < Math.min(3, inp.grabs || 0); k++) this.doGrab(i);
        if (inp.chop) this.doChop(i, dt); else { p.chopping = false; p.shave = 0; }
        (inp.dances || []).forEach(d => this.doDance(i, d));
      });
    }

    doGrab(i) {
      const p = this.players[i];
      const [c, r] = this.target(p);
      const ch = this.tileAt(c, r), idx = r * COLS + c, it = this.items[idx], h = p.held;
      const X = c + 0.5, Y = r + 0.3;
      if (ch === '.' || ch === 'P' || c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
      if (ch === 'X') { if (h) { p.held = null; this.emit('trash', X, Y, ''); } return; }
      if (ch === 'W' || ch === 'D') {
        if (h && h[0] === 'D') {
          if (ch === 'D' && !(this.train && this.train.open)) { this.emit('closed', X, Y + 0.6, 'Doors closed!'); return; }
          this.serve(p, X, Y);
        } else if (h) this.emit('nope', X, Y + 0.6, 'Wrap it in bread first');
        return;
      }
      if (ch === 'G' || ch === 'H') {
        const s = ch === 'G' ? 'g' : 'h';
        if (h && h[0] === 'D' && !h.includes(s)) { p.held = addTo(h, s); this.emit('sauce', X, Y, ''); }
        else if (h && h[0] !== 'D') this.emit('nope', X, Y + 0.6, 'Sauce goes on a döner');
        return;
      }
      if ('BLTO'.includes(ch)) {
        const raw = ch === 'B' ? 'D' : ch;
        if (!h) { p.held = raw; this.emit('grab', X, Y, ''); }
        else if (h === raw) { p.held = null; this.emit('place', X, Y, ''); }
        return;
      }
      if (ch === 'S') { if (h && !(h[0] === 'D')) this.emit('nope', X, Y + 0.6, 'Hold CHOP to shave'); return; }
      // counters and boards
      if (!h && it) { p.held = it; delete this.items[idx]; delete this.prog[idx]; this.emit('grab', X, Y, ''); return; }
      if (h && !it) { this.items[idx] = h; p.held = null; this.emit('place', X, Y, ''); return; }
      if (h && it) {
        if (h[0] === 'D' && canAdd(h, it)) { p.held = addTo(h, it); delete this.items[idx]; delete this.prog[idx]; this.emit('place', X, Y, ''); }
        else if (it[0] === 'D' && canAdd(it, h)) { this.items[idx] = addTo(it, h); p.held = null; this.emit('place', X, Y, ''); }
        else if ('LTO'.includes(h) || 'LTO'.includes(it)) this.emit('nope', X, Y + 0.6, 'Chop it first');
      }
    }

    doChop(i, dt) {
      const p = this.players[i];
      const [c, r] = this.target(p);
      const ch = this.tileAt(c, r), idx = r * COLS + c;
      if (ch === 'C') {
        const it = this.items[idx];
        if (it && 'LTO'.includes(it)) {
          p.chopping = true;
          this.prog[idx] = (this.prog[idx] || 0) + dt / 1.15;
          if (this.prog[idx] >= 1) { this.items[idx] = it.toLowerCase(); delete this.prog[idx]; this.emit('chopped', c + 0.5, r + 0.3, ''); }
          return;
        }
      }
      if (ch === 'S') {
        const h = p.held;
        if (!h || (h[0] === 'D' && !h.includes('m'))) {
          p.chopping = true; p.shave += dt / 1.25;
          if (p.shave >= 1) { p.shave = 0; p.held = h ? addTo(h, 'm') : 'm'; this.emit('shaved', c + 0.5, r + 0.3, ''); }
          return;
        }
      }
      p.chopping = false; p.shave = 0;
    }

    doDance(i, d) {
      const p = this.players[i];
      if (!this.L.dance || !this.inDanceZone(p)) return;
      const o = this.orders.find(q => q.enc && q.dec < 0);
      if (!o) return;
      if (o.dance[o.dp] === d) {
        o.dp++; this.emit('step', p.x, p.y - 1, d);
        if (o.dp >= o.dance.length) { o.dec = i; this.emit('decoded', p.x, p.y - 1, 'Decoded: ' + BB.RECIPES[o.k].name); }
      } else {
        o.dp = o.dance[0] === d ? 1 : 0; o.pat = Math.max(1, o.pat - 3);
        this.emit('miss', p.x, p.y - 1, 'Wrong move!');
      }
    }

    serve(p, X, Y) {
      const c = p.held.slice(1);
      const cands = this.orders.filter(o => o.c === c);
      if (!cands.length) { this.emit('wrong', X, Y + 0.7, 'Nobody ordered that'); return; }
      cands.sort((a, b) => ((a.enc && a.dec < 0) - (b.enc && b.dec < 0)) || a.id - b.id);
      const o = cands[0];
      const gain = 8 + Math.round(4 * o.pat / o.max);
      this.score += gain; this.served++;
      this.orders.splice(this.orders.indexOf(o), 1);
      p.held = null;
      this.emit('serve', X, Y + 0.6, '+€' + gain);
    }

    snapshot() {
      const pr = {}; for (const k in this.prog) pr[k] = r2(this.prog[k]);
      const tr = this.train;
      return {
        rid: this.rid, lv: this.lv, ph: this.phase, pt: r1(this.phaseT), tm: r1(this.time), cl: r1(this.clock),
        sc: this.score, sv: this.served, fl: this.failed, st: this.stars, it: this.items, pr,
        p: this.players.map(p => [r2(p.x), r2(p.y), p.fx, p.fy, p.held || '', p.chopping ? 1 : 0, r2(p.shave), p.pose || '', r2(p.poseT), p.emote, r2(p.emoteT), p.dance ? 1 : 0, p.moving ? 1 : 0]),
        o: this.orders.map(o => [o.id, o.k, r1(o.pat), o.max, o.seed, o.enc ? 1 : 0, o.dance, o.dp, o.dec]),
        ev: this.events.slice(-8).map(e => [e.id, e.type, r2(e.x), r2(e.y), e.txt || '']),
        tr: tr ? [tr.open ? 1 : 0, r1(tr.t), tr.jolt, r2(tr.dark), tr.si] : 0, dr: this.dropOn ? 1 : 0,
      };
    }

    applySnapshot(s, myIdx) {
      this.phase = s.ph; this.phaseT = s.pt; this.time = s.tm; this.clock = s.cl;
      this.score = s.sc; this.served = s.sv; this.failed = s.fl; this.stars = s.st;
      this.items = Object.assign({}, s.it || {}); this.prog = Object.assign({}, s.pr || {});
      this.dropOn = !!s.dr;
      (s.p || []).forEach((a, i) => {
        const p = this.players[i]; if (!p) return;
        p.held = a[4] || null; p.chopping = !!a[5]; p.shave = a[6];
        if (i !== myIdx) {
          p._tx = a[0]; p._ty = a[1]; if (p._init !== true) { p.x = a[0]; p.y = a[1]; p._init = true; }
          p.fx = a[2]; p.fy = a[3]; p.pose = a[7] || null; p.poseT = a[8]; p.emote = a[9]; p.emoteT = a[10]; p.dance = !!a[11]; p.moving = !!a[12];
        }
      });
      this.orders = (s.o || []).map(a => ({ id: a[0], k: a[1], c: BB.RECIPES[a[1]].c, pat: a[2], max: a[3], seed: a[4], enc: !!a[5], dance: a[6], dp: a[7], dec: a[8] }));
      this.events = (s.ev || []).map(a => ({ id: a[0], type: a[1], x: a[2], y: a[3], txt: a[4] }));
      if (this.train && s.tr) {
        const t = this.train; t.open = !!s.tr[0]; t.t = s.tr[1]; t.jolt = s.tr[2]; t.dark = s.tr[3]; t.si = s.tr[4]; t.stop = STOPS[t.si % STOPS.length];
      }
    }
  }
  BB.World = World;

  // ---------- movement ----------
  const RAD = 0.31;
  function collide(w, p) {
    for (let k = 0; k < 2; k++) {
      const c0 = Math.floor(p.x - RAD), c1 = Math.floor(p.x + RAD), q0 = Math.floor(p.y - RAD), q1 = Math.floor(p.y + RAD);
      for (let r = q0; r <= q1; r++) for (let c = c0; c <= c1; c++) {
        if (!w.solid(c, r)) continue;
        const nx = Math.max(c, Math.min(p.x, c + 1)), ny = Math.max(r, Math.min(p.y, r + 1));
        let dx = p.x - nx, dy = p.y - ny; const d = Math.hypot(dx, dy);
        if (d < RAD) {
          if (d > 1e-6) { p.x += dx / d * (RAD - d); p.y += dy / d * (RAD - d); }
          else { p.y = r + 1 + RAD; }
        }
      }
    }
    p.x = Math.max(RAD, Math.min(COLS - RAD, p.x)); p.y = Math.max(RAD, Math.min(ROWS - RAD, p.y));
  }
  function moveBear(w, p, mx, my, dt, other) {
    let len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; len = 1; }
    p.moving = len > 0.2;
    if (p.moving) {
      if (Math.abs(mx) > Math.abs(my)) { p.fx = Math.sign(mx); p.fy = 0; } else { p.fx = 0; p.fy = Math.sign(my); }
      p.walk += dt * 13;
    }
    const sp = 4.5;
    const dx = (mx * sp + p.vx) * dt, dy = (my * sp + p.vy) * dt;
    const damp = Math.pow(0.03, dt); p.vx *= damp; p.vy *= damp;
    p.x += dx; collide(w, p); p.y += dy; collide(w, p);
    if (other) {
      const ox = p.x - other.x, oy = p.y - other.y, d = Math.hypot(ox, oy), min = RAD * 2;
      if (d < min && d > 1e-4) { p.x += ox / d * (min - d); p.y += oy / d * (min - d); collide(w, p); }
    }
  }
  BB.moveBear = moveBear;

  // ---------- keyboard / touch controllers ----------
  const SCHEMES = {
    solo: { dir: { U: ['KeyW', 'ArrowUp'], D: ['KeyS', 'ArrowDown'], L: ['KeyA', 'ArrowLeft'], R: ['KeyD', 'ArrowRight'] }, grab: ['KeyE', 'Space', 'Enter', 'Period'], chop: ['KeyQ', 'ShiftLeft', 'ShiftRight', 'Slash', 'KeyF'], signs: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'] },
    p1: { dir: { U: ['KeyW'], D: ['KeyS'], L: ['KeyA'], R: ['KeyD'] }, grab: ['KeyE'], chop: ['KeyQ'], signs: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'] },
    p2: { dir: { U: ['ArrowUp'], D: ['ArrowDown'], L: ['ArrowLeft'], R: ['ArrowRight'] }, grab: ['Period', 'Enter', 'NumpadEnter'], chop: ['Slash', 'ShiftRight', 'Numpad0'], signs: ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6'] },
  };
  const GAME_KEYS = new Set([].concat(...Object.values(SCHEMES).map(s => [].concat(...Object.values(s.dir), s.grab, s.chop, s.signs))));
  const down = new Set();
  class Ctrl {
    constructor(scheme) { this.s = SCHEMES[scheme]; this.grabs = 0; this.chopEdge = false; this.dirs = []; this.signs = []; this.touch = { mx: 0, my: 0, chop: false }; }
    press(code) {
      const s = this.s;
      if (s.grab.includes(code)) this.grabs++;
      if (s.chop.includes(code)) this.chopEdge = true;
      for (const d in s.dir) if (s.dir[d].includes(code)) this.dirs.push(d);
      const si = s.signs.indexOf(code); if (si >= 0) this.signs.push(si);
    }
    read() {
      const s = this.s, any = a => a.some(k => down.has(k));
      let mx = (any(s.dir.R) ? 1 : 0) - (any(s.dir.L) ? 1 : 0) + this.touch.mx;
      let my = (any(s.dir.D) ? 1 : 0) - (any(s.dir.U) ? 1 : 0) + this.touch.my;
      const out = { mx, my, chop: any(s.chop) || this.touch.chop, grabs: this.grabs, chopEdge: this.chopEdge, dirs: this.dirs, signs: this.signs };
      this.grabs = 0; this.chopEdge = false; this.dirs = []; this.signs = [];
      return out;
    }
  }
  BB.Ctrl = Ctrl;

  // ---------- session ----------
  const G = (BB.Game = {
    mode: null, // 'local' | 'host' | 'guest' | null
    world: null, ctrls: [], local: [], myIdx: -1, net: null, gr: null, code: null, lv: 0, rid: 0,
    guestPeer: null, gIn: null, gOut: { g: 0, seq: 0, dq: [] }, lastSend: 0, hostSeenAt: 0, guestSeenAt: 0,
    lastJolt: {}, paused: false, onUI: () => {},
  });

  window.addEventListener('keydown', e => {
    if (GAME_KEYS.has(e.code) && G.mode && G.world && !e.target.closest('input,textarea')) e.preventDefault();
    if (e.repeat) return;
    if (e.target && e.target.closest && e.target.closest('input,textarea')) return;
    down.add(e.code);
    G.ctrls.forEach(c => c.press(e.code));
  });
  window.addEventListener('keyup', e => { down.delete(e.code); });
  window.addEventListener('blur', () => down.clear());

  // Local-bear control: movement, dance mode, signs. Returns the action input for the host.
  function clientControl(w, i, ctrl, dt) {
    const s = ctrl.read();
    const p = w.players[i], other = w.players[1 - i];
    for (const k of s.signs) { p.emote = k; p.emoteT = 2.6; BB.Audio.sfx('sign'); }
    p.emoteT = Math.max(0, p.emoteT - dt); p.poseT = Math.max(0, p.poseT - dt);
    const none = { grabs: 0, chop: false, dances: [] };
    if (w.phase !== 'play' || G.paused) { p.dance = false; p.moving = false; moveBear(w, p, 0, 0, dt, other); return none; }
    const hasEnc = w.orders.some(o => o.enc && o.dec < 0);
    const zone = w.inDanceZone(p);
    let toggled = false;
    if (s.chopEdge) {
      if (!p.dance && w.L.dance && zone && hasEnc) { p.dance = true; p.fx = 0; p.fy = -1; toggled = true; BB.Audio.sfx('sign'); }
      else if (p.dance) { p.dance = false; toggled = true; }
    }
    if (p.dance) {
      if (s.grabs > 0 || !hasEnc || !zone) { p.dance = false; moveBear(w, p, 0, 0, dt, other); return none; }
      const dances = [];
      for (const d of s.dirs) { p.pose = d; p.poseT = 0.45; dances.push(d); }
      p.moving = false; moveBear(w, p, 0, 0, dt, other);
      return { grabs: 0, chop: false, dances };
    }
    moveBear(w, p, s.mx, s.my, dt, other);
    return { grabs: s.grabs, chop: s.chop && !toggled, dances: [] };
  }

  const EV = {
    grab: ['grab'], place: ['place'], trash: ['trash'], sauce: ['sauce'], chopped: ['place'], shaved: ['grab'],
    serve: ['serve', '#5be37a'], wrong: ['wrong', '#ff6b5f'], expire: ['expire', '#ff6b5f'], nope: ['wrong', '#ffd23f'],
    closed: ['wrong', '#ff6b5f'], order: ['order'], step: ['step'], miss: ['miss', '#ff6b5f'], decoded: ['decoded', '#3ae0ff'],
    doors: ['doors'], warn: ['doors', '#f7d117'], arrive: ['brake', '#f7d117'], start: ['start', '#ffd23f'], end: ['end', '#ffd23f'],
  };
  function handleEvents(w) {
    for (const e of w.events) {
      if (e.id <= w._seenEv) continue;
      w._seenEv = e.id;
      const m = EV[e.type]; if (!m) continue;
      BB.Audio.sfx(m[0], e.txt);
      if (m[1] && e.txt && e.type !== 'step') w.popups.push({ x: e.x, y: e.y, txt: e.txt, col: m[1], age: 0 });
      if (e.type === 'arrive') w.shake = 1;
      if (e.type === 'end' || e.type === 'start') G.onUI();
    }
  }
  function applyJolt(w) {
    if (!w.train) return;
    const j = w.train.jolt;
    if (G.lastJolt[w.rid] == null) { G.lastJolt[w.rid] = j; return; }
    if (j !== G.lastJolt[w.rid]) {
      G.lastJolt[w.rid] = j;
      G.local.forEach(i => { const p = w.players[i]; p.vx += 5.5; p.dance = false; });
    }
  }
  function visuals(w, dt) {
    w.popups.forEach(p => p.age += dt); w.popups = w.popups.filter(p => p.age < 1.4);
    w.shake = Math.max(0, w.shake - dt * 2);
    w.players.forEach((p, i) => {
      if (p.chopping) { p._chopT -= dt; if (p._chopT <= 0) { p._chopT = 0.17; BB.Audio.sfx(w.tileAt(...w.target(p)) === 'S' ? 'shave' : 'chop'); } }
      if (!G.local.includes(i)) {
        if (p._tx != null) { const k = Math.min(1, dt * 14); p.x += (p._tx - p.x) * k; p.y += (p._ty - p.y) * k; }
        if (p.moving) p.walk += dt * 13;
      }
    });
  }

  G.startLocal = function (lv) {
    G.leave(true);
    G.mode = 'local'; G.lv = lv; G.world = new World(lv, ++G.rid);
    G.ctrls = [new Ctrl('p1'), new Ctrl('p2')]; G.local = [0, 1]; G.myIdx = -1; G.paused = false;
    BB.Audio.play(G.world.L.music); G.onUI();
  };
  G.restartLocal = function (lv) { G.startLocal(lv == null ? G.lv : lv); };

  G.hostCreate = async function () {
    G.leave(true);
    const net = await BB.Net.get();
    if (!net) throw new Error('offline');
    G.net = net; G.code = BB.Net.makeCode();
    G.gr = await net.join(BB.Net.roomName(G.code));
    G.mode = 'host'; G.world = null; G.myIdx = 0; G.local = [0]; G.ctrls = [new Ctrl('solo')];
    G.guestPeer = null; G.gIn = null;
    try { await net.lobby.presence({ bbk: { code: G.code, open: 1, lv: G.lv } }); } catch (e) {}
    G.onUI();
    return G.code;
  };
  G.hostStart = function (lv) {
    if (G.mode !== 'host') return;
    G.lv = lv; G.world = new World(lv, ++G.rid); G.paused = false;
    BB.Audio.play(G.world.L.music);
    try { G.net.lobby.presence({ bbk: { code: G.code, open: G.guestPeer ? 0 : 1, lv } }); } catch (e) {}
    G.onUI();
  };
  G.hostToLobby = function () { if (G.mode === 'host') { G.world = null; BB.Audio.play('title'); G.onUI(); } };
  G.joinKitchen = async function (code) {
    G.leave(true);
    const net = await BB.Net.get();
    if (!net) throw new Error('offline');
    G.net = net; G.code = String(code).toUpperCase();
    G.gr = await net.join(BB.Net.roomName(G.code));
    G.mode = 'guest'; G.world = null; G.myIdx = 1; G.local = [1]; G.ctrls = [new Ctrl('solo')];
    G.gOut = { g: 0, seq: 0, dq: [] }; G.hostSeenAt = performance.now();
    G.gr.presence({ role: 'guest', rid: 0 }).catch(() => {});
    G.onUI();
  };
  G.leave = function (silent) {
    try {
      if (G.gr) { G.gr.presence({ role: null, s: null }).catch(() => {}); G.gr.leave && G.gr.leave().catch(() => {}); }
      if (G.mode === 'host' && G.net) G.net.lobby.presence({ bbk: null }).catch(() => {});
    } catch (e) {}
    G.gr = null; G.mode = null; G.world = null; G.ctrls = []; G.local = []; G.myIdx = -1; G.guestPeer = null; G.paused = false;
    if (!silent) { BB.Audio.play('title'); G.onUI(); }
  };
  G.status = function () {
    if (G.mode === 'host') return { partner: !!G.guestPeer };
    if (G.mode === 'guest') return { host: performance.now() - G.hostSeenAt < 4000 };
    return {};
  };

  G.frame = function (dt) {
    const w = G.world;
    if (G.mode === 'local' && w) {
      if (!G.paused) {
        const inputs = [0, 1].map(i => clientControl(w, i, G.ctrls[i], dt));
        applyJolt(w);
        w.update(dt, inputs);
      }
      handleEvents(w); visuals(w, dt);
      return;
    }
    if (G.mode === 'host') hostFrame(dt);
    else if (G.mode === 'guest') guestFrame(dt);
  };

  function hostFrame(dt) {
    const now = performance.now();
    const others = BB.Net.others(G.gr);
    const gp = others.find(p => p.presence && p.presence.role === 'guest');
    if (gp) {
      G.guestSeenAt = now;
      if (G.guestPeer !== gp.peer) {
        G.guestPeer = gp.peer;
        const q = gp.presence;
        G.gIn = { g: q.g || 0, seq: (q.dq || []).reduce((m, a) => Math.max(m, a[0]), 0) };
        BB.Audio.sfx('join');
        try { G.net.lobby.presence({ bbk: { code: G.code, open: 0, lv: G.lv } }); } catch (e) {}
        G.onUI();
      }
    } else if (G.guestPeer && now - G.guestSeenAt > 4000) {
      G.guestPeer = null; G.gIn = null;
      try { G.net.lobby.presence({ bbk: { code: G.code, open: 1, lv: G.lv } }); } catch (e) {}
      G.onUI();
    }
    const w = G.world;
    if (w) {
      const in0 = clientControl(w, 0, G.ctrls[0], dt);
      let in1 = null;
      if (gp && gp.presence) {
        const q = gp.presence, p = w.players[1];
        if (q.rid === w.rid) {
          p._tx = q.x; p._ty = q.y;
          if (!p._init) { p.x = q.x; p.y = q.y; p._init = true; }
          p.fx = q.fx; p.fy = q.fy; p.moving = !!q.mv; p.pose = q.pose || null; p.poseT = q.pt || 0;
          p.emote = q.em == null ? -1 : q.em; p.emoteT = q.et || 0; p.dance = !!q.dn;
          const grabs = Math.max(0, (q.g || 0) - G.gIn.g); G.gIn.g = q.g || 0;
          const dances = (q.dq || []).filter(a => a[0] > G.gIn.seq).sort((a, b) => a[0] - b[0]);
          if (dances.length) G.gIn.seq = dances[dances.length - 1][0];
          // act at the guest's reported position
          p.x = q.x; p.y = q.y;
          in1 = { grabs, chop: !!q.c, dances: dances.map(a => a[1]) };
        } else {
          G.gIn.g = q.g || 0; G.gIn.seq = (q.dq || []).reduce((m, a) => Math.max(m, a[0]), G.gIn.seq);
        }
      }
      applyJolt(w);
      w.update(dt, [in0, in1]);
      handleEvents(w); visuals(w, dt);
      if (now - G.lastSend > 33) { G.lastSend = now; sendPresence({ role: 'host', s: trimSnap(w.snapshot()) }); }
    } else if (now - G.lastSend > 250) {
      G.lastSend = now; sendPresence({ role: 'host', s: { ph: 'wait', lv: G.lv, rid: G.rid } });
    }
  }
  function trimSnap(s) {
    let j = JSON.stringify(s);
    if (j.length > 3600) { s.ev = s.ev.slice(-3); j = JSON.stringify(s); }
    if (j.length > 3600) { s.ev = []; }
    return s;
  }
  function sendPresence(obj) {
    if (!G.gr) return;
    G.gr.presence(obj).catch(e => { if (e && e.code === 'invalid_argument') console.warn('presence too big?', e.message); });
  }

  function guestFrame(dt) {
    const now = performance.now();
    const others = BB.Net.others(G.gr);
    const hp = others.find(p => p.presence && p.presence.role === 'host');
    const s = hp && hp.presence && hp.presence.s;
    if (s) G.hostSeenAt = now;
    const prevState = G._guestState;
    if (!s) { G._guestState = now - G.hostSeenAt > 4000 ? 'lost' : 'connecting'; }
    else if (s.ph === 'wait') { G._guestState = 'wait'; G.guestLv = s.lv; if (G.world) { G.world = null; BB.Audio.play('title'); } }
    else {
      G._guestState = 'play';
      if (!G.world || G.world.rid !== s.rid) {
        G.world = new World(s.lv, s.rid); G.lv = s.lv; BB.Audio.play(G.world.L.music);
        G.world._seenEv = 0;
      }
      G.world.applySnapshot(s, 1);
    }
    if (prevState !== G._guestState) G.onUI();
    const w = G.world;
    if (w) {
      const inp = clientControl(w, 1, G.ctrls[0], dt);
      applyJolt(w);
      G.gOut.g += inp.grabs;
      inp.dances.forEach(d => { G.gOut.dq.push([++G.gOut.seq, d]); });
      if (G.gOut.dq.length > 8) G.gOut.dq = G.gOut.dq.slice(-8);
      if (G._phaseSeen !== w.phase) { G._phaseSeen = w.phase; G.onUI(); }
      handleEvents(w); visuals(w, dt);
      if (now - G.lastSend > 33) {
        G.lastSend = now;
        const p = w.players[1];
        sendPresence({ role: 'guest', rid: w.rid, x: r2(p.x), y: r2(p.y), fx: p.fx, fy: p.fy, mv: p.moving ? 1 : 0, g: G.gOut.g, c: inp.chop ? 1 : 0,
          dq: G.gOut.dq, pose: p.pose || '', pt: r2(p.poseT), em: p.emote, et: r2(p.emoteT), dn: p.dance ? 1 : 0 });
      }
    } else if (now - G.lastSend > 250) {
      G.lastSend = now; sendPresence({ role: 'guest', rid: 0, g: G.gOut.g, dq: G.gOut.dq });
    }
  }

  // Guest's chop held must be re-sent continuously; clientControl returns it per frame (handled above).
})();
