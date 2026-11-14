// Döner Bears — tiny zero-dependency server: static files + SSE broadcast + game logic.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const INGREDIENTS = ['bread', 'meat', 'lettuce', 'tomato', 'onion'];

// ---------- rules ----------
const FALLBACK_RULES = {
  settings: { roundSeconds: 240, patienceSeconds: 100 },
  manualTitle: 'Döner Manual',
  manualIntro: 'Rules missing. Make it with everything.',
  orders: [{ name: 'The Classic', says: 'ONE WITH EVERYTHING!', ingredients: ['bread', 'meat', 'lettuce', 'tomato', 'onion'] }],
  rules: [],
};

function loadRules() {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'rules.json'), 'utf8'));
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
let rules = loadRules();
let state = freshState();

function freshState(chefFacing = 1) {
  return { phase: 'lobby', timeLeft: 0, roundSeconds: 0, hour: 2, clock: '02:00', score: 0, served: 0, failed: 0, customer: null, plate: [], chefFacing };
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;

function newCustomer() {
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

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const x = [...a].sort(), y = [...b].sort();
  return x.every((v, i) => v === y[i]);
}

function finishCustomer(ok, reason) {
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
  broadcast({ type: 'result', ok, reason, delta, expected: c.expected, applied: c.applied, made: [...state.plate], order: c.order });
  newCustomer();
}

// ---------- game loop ----------
const TICK = 0.25;
let strobeTimer = 10;
setInterval(() => {
  if (state.phase !== 'playing') return;
  state.timeLeft -= TICK;
  const progress = 1 - state.timeLeft / state.roundSeconds;
  state.hour = 2 + progress * 4;
  const h = Math.floor(state.hour), m = Math.floor((state.hour - h) * 60);
  state.clock = `0${h}:${String(m).padStart(2, '0')}`;

  if (state.customer) {
    state.customer.patience -= TICK;
    if (state.customer.patience <= 0) finishCustomer(false, 'Customer got bored and went back to dance');
  }

  strobeTimer -= TICK;
  if (strobeTimer <= 0) {
    broadcast({ type: 'strobe', duration: 2 + Math.random() * 2.5 });
    strobeTimer = 7 + Math.random() * 9;
  }

  if (state.timeLeft <= 0) {
    state.phase = 'over';
    state.timeLeft = 0;
    state.customer = null;
  }
  broadcastState();
}, TICK * 1000);

// ---------- actions ----------
function handleAction(a) {
  switch (a.type) {
    case 'start':
      rules = loadRules();
      state = freshState(state.chefFacing);
      state.phase = 'playing';
      state.roundSeconds = state.timeLeft = rules.settings.roundSeconds;
      strobeTimer = 8;
      newCustomer();
      broadcast({ type: 'started' });
      break;
    case 'gesture':
      broadcast({ type: 'gesture', id: a.id });
      break;
    case 'look': // chef turned toward/away from the window
      state.chefFacing = a.facing ? 1 : 0;
      break;
    case 'signal': // chef -> cashier
      broadcast({ type: 'signal', id: a.id });
      break;
    case 'add':
      if (state.phase === 'playing' && INGREDIENTS.includes(a.ing) && state.plate.length < 12) state.plate.push(a.ing);
      break;
    case 'trash':
      state.plate = [];
      break;
    case 'serve':
      if (state.phase === 'playing' && state.customer) {
        const ok = sameMultiset(state.plate, state.customer.expected);
        finishCustomer(ok, ok ? 'Perfect!' : 'Wrong döner');
      }
      break;
  }
  broadcastState();
}

// ---------- SSE ----------
const clients = new Set();
function send(res, msg) { res.write(`data: ${JSON.stringify(msg)}\n\n`); }
function broadcast(msg) { for (const c of clients) send(c, msg); }
function broadcastState() { broadcast({ type: 'state', state }); }

// ---------- http ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 1000\n\n');
    clients.add(res);
    send(res, { type: 'state', state });
    req.on('close', () => clients.delete(res));
    return;
  }
  if (url === '/action' && req.method === 'POST') {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      try { handleAction(JSON.parse(body)); } catch (e) { console.error(e); }
      res.writeHead(204).end();
    });
    return;
  }
  const routes = { '/': 'index.html', '/cashier': 'cashier.html', '/chef': 'chef.html' };
  const file = path.join(PUBLIC, routes[url] || url);
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end('not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`\n🐻🥙 Döner Bears running`);
  console.log(`   Cashier: http://localhost:${PORT}/cashier`);
  console.log(`   Chef:    http://localhost:${PORT}/chef`);
  for (const ip of ips) console.log(`   Other laptop: http://${ip}:${PORT}/chef  (or /cashier)`);
  console.log('');
});
