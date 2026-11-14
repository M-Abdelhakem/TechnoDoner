// Berlin Bears — networking: claude.ai `room` capability, or a BroadcastChannel shim for local testing
(function () {
  const BB = (window.BB = window.BB || {});
  let roomP = null;

  function isLocalDev() {
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /[?&]shim\b/.test(location.search);
  }

  // ---- shim: same subset of the room API, between tabs of one browser ----
  function makeShim() {
    const ch = new BroadcastChannel('bb-shim-v1');
    const me = Math.random().toString(36).slice(2, 10);
    const LAT = 45; // simulated one-way latency (ms)
    const rooms = {};
    function mkRoom(name) {
      const R = {
        name, pres: {}, others: new Map(), listeners: [], dirty: true, snap: [], left: false,
        presence(patch) {
          for (const k in patch) { if (patch[k] === null) delete R.pres[k]; else R.pres[k] = patch[k]; }
          R.dirty = true; rebuild(R); return Promise.resolve();
        },
        peers() { return R.snap; },
        onPeers(fn) { R.listeners.push(fn); setTimeout(() => fn({ peers: R.snap, joined: R.snap, left: [], updated: [] }), 0); return () => { R.listeners = R.listeners.filter(f => f !== fn); }; },
        connected() { return true; },
        onConnection(fn) { setTimeout(() => fn(true), 0); return () => {}; },
        emit() { return Promise.resolve(); }, on() { return () => {}; },
        leave() { R.left = true; ch.postMessage({ room: name, peer: me, bye: true }); delete rooms[name]; return Promise.resolve(); },
      };
      rebuild(R);
      return R;
    }
    function rebuild(R) {
      const self = { peer: me, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze({ ...R.pres }), updatedAt: Date.now() };
      R.snap = Object.freeze([self, ...R.others.values()]);
      R.listeners.forEach(f => { try { f({ peers: R.snap, joined: [], left: [], updated: [] }); } catch (e) {} });
    }
    ch.onmessage = ev => {
      const m = ev.data; if (!m || m.peer === me) return;
      setTimeout(() => {
        const R = rooms[m.room]; if (!R) return;
        if (m.bye) { R.others.delete(m.peer); rebuild(R); return; }
        R.others.set(m.peer, { peer: m.peer, by: null, isMe: true, sameTab: false, kind: 'viewer', guest: false, presence: Object.freeze(m.pres || {}), updatedAt: Date.now(), seen: Date.now() });
        rebuild(R);
      }, LAT);
    };
    let lastBeat = 0;
    setInterval(() => {
      const nowT = Date.now();
      const beat = nowT - lastBeat > 1000;
      if (beat) lastBeat = nowT;
      for (const name in rooms) {
        const R = rooms[name];
        if (R.dirty || beat) { R.dirty = false; ch.postMessage({ room: name, peer: me, pres: R.pres }); }
        let changed = false;
        R.others.forEach((p, k) => { if (nowT - p.seen > 3500) { R.others.delete(k); changed = true; } });
        if (changed) rebuild(R);
      }
    }, 33);
    window.addEventListener('pagehide', () => { for (const n in rooms) ch.postMessage({ room: n, peer: me, bye: true }); });
    const lobby = mkRoom('lobby'); rooms.lobby = lobby;
    return {
      kind: 'shim',
      lobby,
      join(name) { if (!rooms[name]) rooms[name] = mkRoom(name); return Promise.resolve(rooms[name]); },
    };
  }

  BB.Net = {
    // resolves {kind:'claude'|'shim', lobby, join(name)} or null when online play is unavailable here
    get() {
      if (roomP) return roomP;
      roomP = (async () => {
        if (window.claude && typeof window.claude.use === 'function') {
          try {
            const room = await window.claude.use('room');
            if (room) return { kind: 'claude', lobby: room, join: n => room.join(n) };
          } catch (e) {}
          return isLocalDev() && typeof BroadcastChannel !== 'undefined' ? makeShim() : null;
        }
        if (isLocalDev() && typeof BroadcastChannel !== 'undefined') return makeShim();
        return null;
      })();
      return roomP;
    },
    others(r) {
      try { return (r.peers() || []).filter(p => !p.sameTab && p.kind !== 'agent'); } catch (e) { return []; }
    },
    makeCode() {
      const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
      return s;
    },
    roomName(code) { return 'bbk-' + String(code).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8); },
  };
})();
