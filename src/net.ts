// @ts-nocheck
// Two endpoints with one shape: set(patch) merges into my state (sent about 20 times a second), partner() is the
// other role's last state. loopPair() joins two views on one page (playtests); wsEndpoint() goes through the Worker's
// room for <code> (worker/index.js), so it works across devices.

export function loopPair() {
  const a: any = {}, b: any = {};
  return [
    { set(p) { Object.assign(a, p); }, partner() { return b.role ? b : null; }, peers: () => (b.role ? [b] : []), close() {}, status: () => 'local' },
    { set(p) { Object.assign(b, p); }, partner() { return a.role ? a : null; }, peers: () => (a.role ? [a] : []), close() {}, status: () => 'local' },
  ];
}

const apiURL = (path: string, ws = false) => { const u = new URL('api/' + path, location.href); if (ws) u.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'; return u; };

export function wsEndpoint(code: string, role: string | null) {
  const url = apiURL('room/' + code, true);
  let ws: WebSocket, closed = false, status = 'connecting', retry = 0, dirty = false;
  const state: any = {}, others = new Map();
  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => { status = 'open'; retry = 0; dirty = true; };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'hello') { others.clear(); for (const p of m.peers) others.set(p.id, p.d); }
      else if (m.t === 's') others.set(m.id, m.d);
      else if (m.t === 'bye') others.delete(m.id);
    };
    ws.onclose = () => { status = closed ? 'closed' : 'reconnecting'; if (!closed) setTimeout(open, Math.min(4000, 500 * ++retry)); };
    ws.onerror = () => {};
  };
  open();
  const iv = setInterval(() => { if (dirty && ws.readyState === 1) { ws.send(JSON.stringify({ t: 's', d: state })); dirty = false; } }, 50);
  return {
    set(p) { for (const k in p) { if (p[k] === null) delete state[k]; else state[k] = p[k]; } dirty = true; },
    partner() { for (const d of others.values()) if (d && d.bb === 1 && d.role && d.role !== role) return d; return null; },
    peers: () => [...others.values()].filter(Boolean),
    setRole(r) { role = r; },
    close() { closed = true; clearInterval(iv); try { ws.close(); } catch {} },
    status: () => status,
  };
}

/** Quick play: the first press waits with its own code, the next one gets {join: code} */
export async function quickMatch(code: string, cancel = false) {
  try { const r = await fetch(apiURL('quick'), { method: 'POST', body: JSON.stringify({ code, cancel }) }); return await r.json(); }
  catch { return { error: true }; }
}
export const newCode = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
