// The game's Worker. It serves dist/ and relays the two-device co-op:
//   GET  /api/room/<code>  (WebSocket)  one Durable Object per kitchen code. Each socket sends its own state
//                                      ({t:'s', d:{...}}); the room keeps the last state of every socket, sends all of them
//                                      to a newcomer and forwards every update to the others. No video, only bear poses
//                                      and game state, about 20 updates a second per player.
//   POST /api/quick {code}             one Lobby object pairs "Quick play" presses: the first waits with its code, the
//                                      next gets {join: code}.
// On the workers.dev address it asks search engines to stay away: while the game is an experiment that is its only
// address. A release adds the jommi.fi/games/berlin-bears/play route in wrangler.jsonc and strips that prefix here
// (Termination's src/worker.js is the reference).

import { handleOriginal } from './original.js';
export { OriginalGame } from './original.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export class Room {
  constructor(state) {
    this.state = state;
    /** @type {Map<string,{ws:WebSocket,d:any}>} */
    this.peers = new Map();
  }
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    if (this.peers.size >= 4) return new Response('room full', { status: 409 });
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const id = crypto.randomUUID().slice(0, 8);
    this.peers.set(id, { ws: server, d: null });
    server.send(JSON.stringify({ t: 'hello', id, peers: [...this.peers].filter(([k, p]) => k !== id && p.d).map(([k, p]) => ({ id: k, d: p.d })) }));
    const others = (msg) => { for (const [k, p] of this.peers) if (k !== id) try { p.ws.send(msg); } catch {} };
    server.addEventListener('message', (e) => {
      if (typeof e.data !== 'string' || e.data.length > 8192) return;
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 's' && m.d && typeof m.d === 'object') { const p = this.peers.get(id); if (p) p.d = m.d; others(JSON.stringify({ t: 's', id, d: m.d })); }
    });
    const bye = () => { if (this.peers.delete(id)) others(JSON.stringify({ t: 'bye', id })); };
    server.addEventListener('close', bye);
    server.addEventListener('error', bye);
    return new Response(null, { status: 101, webSocket: client });
  }
}

export class Lobby {
  constructor() { this.waiting = null; }
  async fetch(request) {
    let body = {}; try { body = await request.json(); } catch {}
    const code = String(body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const now = Date.now();
    if (body.cancel) { if (this.waiting && this.waiting.code === code) this.waiting = null; return json({ ok: true }); }
    if (this.waiting && this.waiting.code !== code && now - this.waiting.at < 90_000) { const join = this.waiting.code; this.waiting = null; return json({ join }); }
    this.waiting = { code, at: now };
    return json({ host: true });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // the 1:1 TechnoDoner port (public/original/, worker/original.js): its /original/events and /original/action
    if (/\/original\/(events|action)$/.test(url.pathname)) return handleOriginal(request, env, url);
    const room = url.pathname.match(/\/api\/room\/([A-Za-z0-9]{3,6})$/);
    if (room) return env.ROOMS.get(env.ROOMS.idFromName(room[1].toUpperCase())).fetch(request);
    if (url.pathname.endsWith('/api/quick') && request.method === 'POST') {
      // one Lobby per game version (body.lobby), so Quick play never pairs two different versions
      const lobby = String(new URL(request.url).searchParams.get('lobby') || 'main').replace(/[^a-z0-9]/g, '').slice(0, 16) || 'main';
      return env.LOBBY.get(env.LOBBY.idFromName(lobby)).fetch(request);
    }
    const response = await env.ASSETS.fetch(request);
    if (!url.hostname.endsWith('.workers.dev')) return response;
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
