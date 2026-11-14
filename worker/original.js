// The 1:1 TechnoDoner port (https://github.com/m-abdelhakem/technodoner, MIT): its server.js game logic moved into a
// Durable Object, one game per ?room= (default 'main'). The client is public/original/ (copied 1:1, relative URLs).
//   GET  .../original/events[?room=x]  SSE stream: `retry: 1000`, the current state, then every broadcast
//   POST .../original/action[?room=x]  one action as JSON ({type, ...}), answered 204
// Behaviour and numbers are server.js's. The differences are the platform's: rules.json is fetched from the static
// assets on every `start` (the original reads the file), and the 0.25 s tick only runs while a client is connected.

const INGREDIENTS = ['bread', 'meat', 'lettuce', 'tomato', 'onion'];

// ---------- rules ----------
const FALLBACK_RULES = {
  settings: { roundSeconds: 240, patienceSeconds: 100 },
  manualTitle: 'Döner Manual',
  manualIntro: 'Rules missing. Make it with everything.',
  orders: [{ name: 'The Classic', says: 'ONE WITH EVERYTHING!', ingredients: ['bread', 'meat', 'lettuce', 'tomato', 'onion'] }],
  rules: [],
};

async function loadRules(env, request) {
  try {
    const res = await env.ASSETS.fetch(new URL('/original/rules.json', request.url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = JSON.parse(await res.text());
    r.settings = Object.assign({}, FALLBACK_RULES.settings, r.settings || {});
    if (!Array.isArray(r.orders) || !r.orders.length) r.orders = FALLBACK_RULES.orders;
    if (!Array.isArray(r.rules)) r.rules = [];
    return r;
  } catch (e) {
    console.error('rules.json invalid, using fallback:', e.message);
    return FALLBACK_RULES;
  }
}

function checkCond(c, traits, hour) {
  if (!c) return false;
  if (c.all) return c.all.every((x) => checkCond(x, traits, hour));
  if (c.any) return c.any.some((x) => checkCond(x, traits, hour));
  if (c.not) return !checkCond(c.not, traits, hour);
  if (c.clockAfter != null) return hour >= c.clockAfter;
  if (c.trait) return traits[c.trait] === c.equals;
  return false;
}

function computeExpected(order, traits, hour, rules) {
  let list = [...order.ingredients];
  const applied = [];
  for (const rule of rules) {
    if (!checkCond(rule.when, traits, hour)) continue;
    applied.push(rule.text);
    const e = rule.effect || {};
    if (e.replace) list = list.map((i) => e.replace[i] || i);
    if (e.remove) list = list.filter((i) => !e.remove.includes(i));
    if (e.add) list.push(...e.add);
  }
  return { expected: list.filter((i) => INGREDIENTS.includes(i)), applied };
}

// ---------- state ----------
function freshState(chefFacing = 1) {
  return { phase: 'lobby', timeLeft: 0, roundSeconds: 0, hour: 2, clock: '02:00', score: 0, served: 0, failed: 0, customer: null, plate: [], chefFacing };
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;

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
    this.rules = FALLBACK_RULES; // the original loads rules.json at boot; every `start` reloads it, and nothing reads them before one
    this.state = freshState();
    this.strobeTimer = 10;
    /** @type {Set<WritableStreamDefaultWriter>} */
    this.clients = new Set();
    this.timer = null;
  }

  newCustomer() {
    const { rules, state } = this;
    const order = pick(rules.orders);
    const traits = {
      sunglasses: chance(0.45),
      glitter: chance(0.4),
      drunk: chance(0.35),
      wristband: chance(0.5),
      bucketHat: chance(0.35),
      outfit: pick(['black', 'black', 'neon', 'white']),
    };
    const p = rules.settings.patienceSeconds;
    const { expected, applied } = computeExpected(order, traits, Math.floor(state.hour), rules.rules);
    state.customer = {
      id: Math.random().toString(36).slice(2),
      order: order.name,
      says: order.says,
      traits,
      patience: p,
      maxPatience: p,
      expected,
      applied,
      fur: pick(['#8b5a2b', '#5c3b1e', '#c49a6c', '#3b2a1f', '#d9d2c5']),
    };
    state.plate = [];
  }

  finishCustomer(ok, reason) {
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
    this.broadcast({ type: 'result', ok, reason, delta, expected: c.expected, applied: c.applied, made: [...state.plate], order: c.order });
    this.newCustomer();
  }

  // ---------- game loop ----------
  tick() {
    const { state } = this;
    if (state.phase !== 'playing') return;
    state.timeLeft -= TICK;
    const progress = 1 - state.timeLeft / state.roundSeconds;
    state.hour = 2 + progress * 4;
    const h = Math.floor(state.hour), m = Math.floor((state.hour - h) * 60);
    state.clock = `0${h}:${String(m).padStart(2, '0')}`;

    if (state.customer) {
      state.customer.patience -= TICK;
      if (state.customer.patience <= 0) this.finishCustomer(false, 'Customer got bored and went back to dance');
    }

    this.strobeTimer -= TICK;
    if (this.strobeTimer <= 0) {
      this.broadcast({ type: 'strobe', duration: 2 + Math.random() * 2.5 });
      this.strobeTimer = 7 + Math.random() * 9;
    }

    if (state.timeLeft <= 0) {
      state.phase = 'over';
      state.timeLeft = 0;
      state.customer = null;
    }
    this.broadcastState();
  }

  startTicking() { if (!this.timer) this.timer = setInterval(() => this.tick(), TICK * 1000); }
  stopTicking() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  // ---------- actions ----------
  async handleAction(a, request) {
    switch (a.type) {
      case 'start':
        this.rules = await loadRules(this.env, request);
        this.state = freshState(this.state.chefFacing);
        this.state.phase = 'playing';
        this.state.roundSeconds = this.state.timeLeft = this.rules.settings.roundSeconds;
        this.strobeTimer = 8;
        this.newCustomer();
        this.broadcast({ type: 'started' });
        break;
      case 'gesture':
        this.broadcast({ type: 'gesture', id: a.id });
        break;
      case 'look': // chef turned toward/away from the window
        this.state.chefFacing = a.facing ? 1 : 0;
        break;
      case 'signal': // chef -> cashier
        this.broadcast({ type: 'signal', id: a.id });
        break;
      case 'add':
        if (this.state.phase === 'playing' && INGREDIENTS.includes(a.ing) && this.state.plate.length < 12) this.state.plate.push(a.ing);
        break;
      case 'trash':
        this.state.plate = [];
        break;
      case 'serve':
        if (this.state.phase === 'playing' && this.state.customer) {
          const ok = sameMultiset(this.state.plate, this.state.customer.expected);
          this.finishCustomer(ok, ok ? 'Perfect!' : 'Wrong döner');
        }
        break;
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
