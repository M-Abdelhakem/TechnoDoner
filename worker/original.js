// TechnoDöner · Original: the look of https://github.com/m-abdelhakem/technodoner (MIT) — its three.js club, bears and
// HTML overlays — playing the Regulars loop. Its server.js became this Durable Object, one game per ?room= (default
// 'main'). The client is public/original/.
//   GET  .../original/events[?room=x]  SSE stream: `retry: 1000`, the current state (+ the latest cashier pose), then
//        every broadcast: state (4×/s while playing), started, result, strobe, sill, signal, pose
//   POST .../original/action[?room=x]  one action as JSON ({type, ...}), answered 204
// The loop: one regular at a time steps up and dances their routine. The cashier copies it with her body (camera or
// keys) and her pose is relayed here (`pose`, ~15×/s, rebroadcast as is, no video). The chef reads it, looks the dance up
// in his book of regulars, cooks their usual and `serve`s it onto the window sill; the cashier `take`s it and `give`s it
// to the regular, which is when it is scored (multiset check). rules.json (fetched from the static assets on `level` and
// `start`) holds the regulars, their usuals and the difficulty numbers. The 0.25 s tick only runs while a client is
// connected, so a room nobody watches is paused.

const INGREDIENTS = ['bread', 'meat', 'lettuce', 'tomato', 'onion'];
const SIGNAL_IDS = ['ok', 'confused']; // common.js CHEF_SIGNALS
const PLATE_MAX = 12;

// used when rules.json is missing or broken (rules.json has the same numbers)
const FALLBACK_LEVELS = {
  chill: { label: 'Chill', emoji: '😌', patienceSeconds: 120, danceLen: 2, beatsPerPose: 2, strobeRate: 0.5, bpm: 112 },
  normal: { label: 'Normal', emoji: '🙂', patienceSeconds: 95, danceLen: 3, beatsPerPose: 2, strobeRate: 1, bpm: 122 },
  rave: { label: 'Rave', emoji: '🔥', patienceSeconds: 75, danceLen: 4, beatsPerPose: 1, strobeRate: 2, bpm: 132 },
};
const FALLBACK_RULES = {
  settings: { roundSeconds: 180 },
  orders: { klassik: { name: 'Klassik', items: ['bread', 'meat', 'lettuce', 'tomato', 'onion'] } },
  regulars: [{ name: 'Kalle', dance: 'UCU', d4: 'UCUH', order: 'klassik' }],
  levels: FALLBACK_LEVELS,
};

async function loadRules(env, request) {
  try {
    const res = await env.ASSETS.fetch(new URL('/original/rules.json', request.url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = JSON.parse(await res.text());
    r.settings = Object.assign({}, FALLBACK_RULES.settings, r.settings || {});
    r.levels = Object.assign({}, FALLBACK_LEVELS, r.levels && typeof r.levels === 'object' ? r.levels : {});
    if (!r.orders || typeof r.orders !== 'object') throw new Error('no orders');
    r.regulars = (Array.isArray(r.regulars) ? r.regulars : []).filter((R) => R && R.name && typeof R.dance === 'string' && r.orders[R.order]);
    if (!r.regulars.length) throw new Error('no regulars');
    return r;
  } catch (e) {
    console.error('rules.json invalid, using fallback:', e.message);
    return FALLBACK_RULES;
  }
}

// a level's numbers, with Normal's filling any gaps
function levelOf(rules, id) {
  return { ...FALLBACK_LEVELS.normal, ...(rules.levels[id] || rules.levels.normal || {}), id };
}
// a regular's routine at a difficulty: Chill the first two poses, Normal three, Rave four (src/poses.ts danceFor)
const danceFor = (R, len) => (len >= 4 && R.d4 ? R.d4 : R.dance.slice(0, len));

// ---------- state ----------
// customer: what both pages may see (no order: only the chef's book knows it); sill: the döner the chef put on the
// window sill; carry: the döner in the cashier's paws (both null or arrays of ingredient ids)
function freshState(level = 'normal') {
  return { phase: 'lobby', timeLeft: 0, roundSeconds: 0, hour: 2, clock: '02:00', score: 0, served: 0, failed: 0, customer: null, plate: [], sill: null, carry: null, level };
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const x = [...a].sort(), y = [...b].sort();
  return x.every((v, i) => v === y[i]);
}

const TICK = 0.25;
const enc = new TextEncoder();

export class OriginalGame {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.rules = FALLBACK_RULES; // every `level` and `start` reloads rules.json
    this.state = freshState();
    this.level = levelOf(this.rules, 'normal');
    this.want = null; // the current regular's usual (kept off the broadcast state)
    this.recent = [];
    this.pose = null; // the cashier's latest pose, for clients that connect later
    this.strobeTimer = 10;
    this.pingTicks = 0;
    /** @type {Set<WritableStreamDefaultWriter>} */
    this.clients = new Set();
    this.timer = null;
    // the difficulty survives the Durable Object being evicted between visits
    ctx.blockConcurrencyWhile(async () => {
      const l = await ctx.storage.get('level').catch(() => null);
      if (typeof l === 'string') this.state.level = l;
    });
  }

  newCustomer() {
    const { rules, state, level: L } = this;
    const n = rules.regulars.length;
    let i;
    do { i = Math.floor(Math.random() * n); } while (n > 3 && this.recent.includes(i)); // no regular twice within three
    this.recent = [i, ...this.recent].slice(0, 3);
    const R = rules.regulars[i], O = rules.orders[R.order];
    this.want = O.items.filter((x) => INGREDIENTS.includes(x));
    const p = L.patienceSeconds;
    state.customer = {
      id: Math.random().toString(36).slice(2),
      reg: i,
      name: R.name,
      dance: danceFor(R, L.danceLen),
      beatsPerPose: L.beatsPerPose,
      patience: p,
      maxPatience: p,
    };
    this.orderName = O.name;
    state.plate = [];
    state.sill = null;
    state.carry = null;
  }

  // made: the döner that was handed over (or whatever was in the works when the regular left)
  finishCustomer(ok, reason, made) {
    const { state } = this;
    const c = state.customer;
    let delta;
    if (ok) {
      delta = 100 + Math.round((c.patience / c.maxPatience) * 50);
      state.served++;
    } else {
      delta = -50;
      state.failed++;
    }
    state.score += delta;
    made = made || state.carry || state.sill || state.plate;
    this.broadcast({ type: 'result', ok, reason, delta, name: c.name, order: this.orderName, expected: [...this.want], made: [...made], cid: c.id });
    this.newCustomer();
  }

  // ---------- game loop ----------
  tick() {
    const { state } = this;
    if (state.phase !== 'playing') {
      // keep idle lobby streams alive through proxies (a comment line, ignored by EventSource)
      if (++this.pingTicks >= 60) { this.pingTicks = 0; for (const w of this.clients) this.write(w, ': ping\n\n'); }
      return;
    }
    state.timeLeft -= TICK;
    const progress = 1 - state.timeLeft / state.roundSeconds;
    state.hour = 2 + progress * 4;
    const h = Math.floor(state.hour), m = Math.floor((state.hour - h) * 60);
    state.clock = `0${h}:${String(m).padStart(2, '0')}`;

    if (state.customer) {
      state.customer.patience -= TICK;
      if (state.customer.patience <= 0) this.finishCustomer(false, 'went back to dance');
    }

    this.strobeTimer -= TICK;
    if (this.strobeTimer <= 0) {
      this.broadcast({ type: 'strobe', duration: 2 + Math.random() * 2.5 });
      this.strobeTimer = (7 + Math.random() * 9) / (this.level.strobeRate || 1);
    }

    if (state.timeLeft <= 0) {
      state.phase = 'over';
      state.timeLeft = 0;
      state.customer = null;
      state.plate = [];
      state.sill = null;
      state.carry = null;
    }
    this.broadcastState();
  }

  startTicking() { if (!this.timer) this.timer = setInterval(() => this.tick(), TICK * 1000); }
  stopTicking() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  // ---------- actions ----------
  async handleAction(a, request) {
    const s = this.state, playing = s.phase === 'playing';
    switch (a.type) {
      case 'pose': { // the cashier's body, 15 numbers (common.js POSES layout); relayed as is, no state broadcast
        const v = a.v;
        if (!Array.isArray(v) || v.length !== 15) return;
        const q = v.map((x) => Math.max(-3, Math.min(3, Math.round((Number(x) || 0) * 100) / 100)));
        this.pose = q;
        this.broadcast({ type: 'pose', v: q });
        return;
      }
      case 'signal': // chef -> cashier ("got it" / "repeat that")
        if (SIGNAL_IDS.includes(a.id)) this.broadcast({ type: 'signal', id: a.id });
        return;
      case 'start':
        this.rules = await loadRules(this.env, request);
        this.state = freshState(this.state.level);
        this.level = levelOf(this.rules, this.state.level);
        this.state.phase = 'playing';
        this.state.roundSeconds = this.state.timeLeft = this.rules.settings.roundSeconds;
        this.strobeTimer = 8 / (this.level.strobeRate || 1);
        this.recent = [];
        this.newCustomer();
        this.broadcast({ type: 'started', level: this.state.level });
        break;
      case 'level': { // the cashier's lobby picker; not mid-round
        if (playing) break;
        this.rules = await loadRules(this.env, request);
        const id = String(a.id || '');
        if (!Object.hasOwn(this.rules.levels, id)) break;
        this.state.level = id;
        this.ctx.storage.put('level', id).catch(() => {});
        break;
      }
      case 'add':
        if (playing && INGREDIENTS.includes(a.ing) && s.plate.length < PLATE_MAX) s.plate.push(a.ing);
        break;
      case 'trash': // the chef starts over: the plate and anything still on the sill go in the bin
        s.plate = [];
        s.sill = null;
        break;
      case 'serve': // chef: the plate goes onto the window sill (one döner at a time)
        if (playing && s.customer && !s.sill && !s.carry && s.plate.length) {
          s.sill = s.plate;
          s.plate = [];
          this.broadcast({ type: 'sill' });
        }
        break;
      case 'take': // the cashier picks the döner up from the sill
        if (playing && s.sill && !s.carry) {
          s.carry = s.sill;
          s.sill = null;
        }
        break;
      case 'give': // ...and hands it to the regular: this is when it is scored
        if (playing && s.customer && s.carry && (!a.cid || a.cid === s.customer.id)) {
          const made = s.carry;
          const ok = sameMultiset(made, this.want);
          this.finishCustomer(ok, ok ? 'Perfect!' : 'Wrong döner', made);
        }
        break;
      default:
        return;
    }
    this.broadcastState();
  }

  // ---------- SSE ----------
  drop(w) {
    if (!this.clients.delete(w)) return;
    w.abort().catch(() => {});
    if (!this.clients.size) this.stopTicking();
  }
  write(w, text) { w.write(enc.encode(text)).catch(() => this.drop(w)); }
  send(w, msg) { this.write(w, `data: ${JSON.stringify(msg)}\n\n`); }
  broadcast(msg) { for (const w of this.clients) this.send(w, msg); }
  broadcastState() { this.broadcast({ type: 'state', state: this.state }); }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path.endsWith('/events')) {
      const { readable, writable } = new TransformStream();
      const w = writable.getWriter();
      this.clients.add(w);
      w.closed.catch(() => this.drop(w)); // the client went away
      this.write(w, 'retry: 1000\n\n');
      this.send(w, { type: 'state', state: this.state });
      if (this.pose) this.send(w, { type: 'pose', v: this.pose });
      this.startTicking();
      return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
    }
    if (path.endsWith('/action') && request.method === 'POST') {
      const body = await request.text();
      try { await this.handleAction(JSON.parse(body), request); } catch (e) { console.error(e); }
      return new Response(null, { status: 204 });
    }
    return new Response('not found', { status: 404 });
  }
}

export async function handleOriginal(request, env, url) {
  const room = String(url.searchParams.get('room') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'main';
  return env.ORIGINAL.get(env.ORIGINAL.idFromName(room)).fetch(request);
}
