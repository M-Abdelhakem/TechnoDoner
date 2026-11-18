// Berlin Bears: Roles. Session (split / host / guest), input, events, page glue
(function () {
  const BB = window.BB, R = BB.Roles, A = BB.Art;
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const cv = $('#game'), ctx = cv.getContext('2d');
  const KX = [170, 480, 790];

  const S = {
    mode: null, // 'split' | 'host' | 'guest'
    world: null, roles: [], net: null, gr: null, code: null, si: 0, rid: 0, hostRole: 'grill',
    ui: {}, out: { seq: 0, acts: [] }, inSeq: 0, guestPeer: null, guestSeenAt: 0, hostSeenAt: 0, lastSend: 0, gState: null,
  };
  BB.RS = S;
  const other = r => (r === 'grill' ? 'kasse' : 'grill');

  function makeUI(role) {
    const ui = { role, hits: [], sel: 0, dancing: -1, pose: null, poseT: 0 };
    ui.send = (name, arg) => sendAct(role, name, arg);
    ui.danceMove = d => {
      if (ui.dancing < 0) return;
      ui.pose = d; ui.poseT = 0.45; BB.Audio.sfx('step', d);
      sendAct(role, 'dance', [ui.dancing, d]);
    };
    ui.onCustomer = i => {
      const w = S.world; if (!w) return;
      const c = w.slots[i]; ui.sel = i;
      if (!c) return;
      if (c.enc && !c.dec) { ui.dancing = ui.dancing === i ? -1 : i; return; }
      if (w.pass) sendAct(role, 'serve', i);
    };
    return ui;
  }
  function sendAct(role, name, arg) {
    const w = S.world; if (!w) return;
    if (name === 'sign') BB.Audio.sfx('sign');
    if (S.mode === 'guest') { S.out.acts.push([++S.out.seq, name, arg]); if (S.out.acts.length > 14) S.out.acts = S.out.acts.slice(-14); return; }
    w.act(role, name, arg);
  }

  // ---------- keyboard ----------
  window.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input')) return;
    const w = S.world;
    if (e.code === 'KeyM' && !w) { toggleMute(); return; }
    if (!w || screen) return;
    if (e.repeat && !['KeyW', 'KeyD'].includes(e.code)) { if (S.roles.length) e.preventDefault(); return; }
    let used = false;
    S.roles.forEach(role => { if (keyFor(role, e.code)) used = true; });
    if (used || e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Backspace') e.preventDefault();
  });
  function keyFor(role, code) {
    const ui = S.ui[role], K = R.KEYS[role], w = S.world;
    if (role === 'grill') {
      if (code === K.pita) return ui.send('pita'), true;
      if (code === K.spit) return ui.send('spit'), true;
      const p = K.pos.indexOf(code); if (p >= 0) return ui.send('pos', p), true;
      if (code === K.chop) return ui.send('chop'), true;
      if (code === K.pass) return ui.send('pass'), true;
      if (code === K.trash) return ui.send('trash'), true;
      if (K.signs[code] != null) return ui.send('sign', K.signs[code]), true;
      return false;
    }
    // kasse
    const dirs = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' };
    if (ui.dancing >= 0) {
      if (dirs[code]) return ui.danceMove(dirs[code]), true;
      if (code === K.stop || code === K.go) { ui.dancing = -1; return true; }
    } else {
      if (code === K.left || code === K.right) {
        const dir = code === K.left ? -1 : 1;
        for (let k = 1; k <= 3; k++) { const n = (ui.sel + dir * k + 3) % 3; if (w.slots[n]) { ui.sel = n; break; } }
        return true;
      }
      if (code === K.go) { ui.onCustomer(ui.sel); return true; }
    }
    if (code === K.back) return ui.send('reject'), true;
    if (K.signs[code] != null) return ui.send('sign', K.signs[code]), true;
    const ti = K.torch.indexOf(code); if (ti >= 0) return ui.send('torch', ti), true;
    return false;
  }

  // ---------- pointer ----------
  cv.addEventListener('pointerdown', e => {
    if (!S.world || screen) return;
    const r = cv.getBoundingClientRect();
    const lx = (e.clientX - r.left) / r.width * logicalW(), ly = (e.clientY - r.top) / r.height * R.H;
    const idx = S.roles.length > 1 ? (lx >= R.W ? 1 : 0) : 0;
    const role = S.roles[idx]; if (!role) return;
    const x = lx - idx * R.W, ui = S.ui[role];
    for (let i = ui.hits.length - 1; i >= 0; i--) {
      const h = ui.hits[i];
      if (x >= h.x && x <= h.x + h.w && ly >= h.y && ly <= h.y + h.h) { e.preventDefault(); BB.Audio.init(); h.act(); return; }
    }
  });

  // ---------- events → sound + popups ----------
  function handleEvents(w) {
    const has = r => S.roles.includes(r);
    for (const e of w.events) {
      if (e.id <= w._seen) continue;
      w._seen = e.id;
      const pk = (txt, col, slot) => w.popups.push({ role: 'kasse', txt, col, x: slot >= 0 ? KX[slot] : 480, y: 300, age: 0 });
      const pg = (txt, col, x, y) => w.popups.push({ role: 'grill', txt, col, x: x || 520, y: y || 455, age: 0 });
      switch (e.type) {
        case 'arrive': if (has('kasse')) BB.Audio.sfx('order'); break;
        case 'serve': BB.Audio.sfx('serve'); pk(e.txt, '#5be37a', e.a); pg(e.txt, '#5be37a', 788, 140); break;
        case 'wrong': BB.Audio.sfx('wrong'); pk(e.txt, '#ff6b5f', e.a); pg('Wrong döner!', '#ff6b5f', 788, 140); break;
        case 'leave': BB.Audio.sfx('expire'); pk('Left hungry ' + e.txt, '#ff6b5f', e.a); break;
        case 'step': if (S.mode === 'guest' || !has('kasse')) {} break;
        case 'miss': if (has('kasse')) { BB.Audio.sfx('miss'); pk('Wrong move', '#ff6b5f', e.a); } break;
        case 'decoded': if (has('kasse')) { BB.Audio.sfx('decoded'); pk('Decoded!', '#3ae0ff', e.a); } exitDance(); break;
        case 'sign': if (!(S.roles.length === 1 && S.roles[0] === e.txt)) BB.Audio.sfx('sign'); break;
        case 'pita': case 'add': case 'refill': if (has('grill')) BB.Audio.sfx('grab'); break;
        case 'sauce': if (has('grill')) BB.Audio.sfx('sauce'); break;
        case 'shave': if (has('grill')) BB.Audio.sfx('shave'); break;
        case 'chop': if (has('grill')) BB.Audio.sfx('chop'); break;
        case 'prep': if (has('grill')) BB.Audio.sfx('place'); break;
        case 'pass': BB.Audio.sfx('place'); if (has('kasse')) pk('Döner on the pass!', '#ffd23f', -1); break;
        case 'trash': BB.Audio.sfx('trash'); break;
        case 'gnope': if (has('grill')) { BB.Audio.sfx('wrong'); pg(e.txt, '#ffd23f'); } break;
        case 'knope': if (has('kasse')) { BB.Audio.sfx('wrong'); pk(e.txt, '#ffd23f', e.a); } break;
        case 'gfeel': if (has('grill')) pg('+' + e.txt + '?', '#f7d117'); break;
        case 'torch': if (has('grill')) BB.Audio.sfx('sign'); break;
        case 'warn': BB.Audio.sfx('doors'); pk('Zurückbleiben, bitte!', '#f7d117', -1); pg('Doors closing!', '#f7d117', 480, 280); break;
        case 'doors': BB.Audio.sfx('doors'); break;
        case 'stop': BB.Audio.sfx('brake'); w.shake = 1; pk(e.txt, '#f7d117', -1); pg('Brakes! Bins shuffled', '#f7d117', 520, 300); break;
        case 'start': BB.Audio.sfx('start'); onUI(); break;
        case 'end': BB.Audio.sfx('end'); onUI(); break;
      }
    }
  }
  function exitDance() {
    const ui = S.ui.kasse; if (!ui || ui.dancing < 0) return;
    const c = S.world && S.world.slots[ui.dancing];
    if (!c || c.dec) ui.dancing = -1;
  }

  // ---------- sessions ----------
  function freshUIs() { S.ui = { grill: makeUI('grill'), kasse: makeUI('kasse') }; }
  S.startSplit = si => {
    S.leave(true); freshUIs();
    S.mode = 'split'; S.roles = ['kasse', 'grill']; S.si = si; S.world = new R.World(si, ++S.rid); S.world._seen = 0;
    BB.Audio.play(R.SHIFTS[si].music); fit(); onUI();
  };
  S.hostCreate = async () => {
    S.leave(true);
    const net = await BB.Net.get(); if (!net) throw new Error('offline');
    S.net = net; S.code = BB.Net.makeCode(); S.gr = await net.join(BB.Net.roomName(S.code));
    S.mode = 'host'; S.world = null; S.roles = [S.hostRole]; S.guestPeer = null; freshUIs();
    net.lobby.presence({ bbk: { code: S.code, open: 1, lv: S.si, v: 'roles' } }).catch(() => {});
    fit(); return S.code;
  };
  S.hostStart = si => {
    if (S.mode !== 'host') return;
    S.si = si; S.roles = [S.hostRole]; S.world = new R.World(si, ++S.rid); S.world._seen = 0; freshUIs();
    BB.Audio.play(R.SHIFTS[si].music); onUI();
  };
  S.joinKitchen = async code => {
    S.leave(true);
    const net = await BB.Net.get(); if (!net) throw new Error('offline');
    S.net = net; S.code = String(code).toUpperCase(); S.gr = await net.join(BB.Net.roomName(S.code));
    S.mode = 'guest'; S.world = null; S.roles = []; S.out = { seq: 0, acts: [] }; S.hostSeenAt = performance.now(); S.gState = 'connecting'; freshUIs();
    S.gr.presence({ role: 'guest', acts: [] }).catch(() => {});
    fit();
  };
  S.leave = silent => {
    try {
      if (S.gr) { S.gr.presence({ role: null, s: null, acts: null }).catch(() => {}); S.gr.leave && S.gr.leave().catch(() => {}); }
      if (S.mode === 'host' && S.net) S.net.lobby.presence({ bbk: null }).catch(() => {});
    } catch (e) {}
    S.gr = null; S.mode = null; S.world = null; S.roles = []; S.guestPeer = null;
    if (!silent) { BB.Audio.play('title'); fit(); }
  };

  function frame(dt) {
    const now = performance.now();
    if (S.mode === 'split' && S.world) { S.world.update(dt); }
    else if (S.mode === 'host') {
      const gp = BB.Net.others(S.gr).find(p => p.presence && p.presence.role === 'guest');
      if (gp) {
        S.guestSeenAt = now;
        if (S.guestPeer !== gp.peer) {
          S.guestPeer = gp.peer; S.inSeq = (gp.presence.acts || []).reduce((m, a) => Math.max(m, a[0]), 0);
          BB.Audio.sfx('join'); S.net.lobby.presence({ bbk: { code: S.code, open: 0, lv: S.si, v: 'roles' } }).catch(() => {}); onUI();
        }
        if (S.world && gp.presence.rid === S.world.rid) {
          const acts = (gp.presence.acts || []).filter(a => a[0] > S.inSeq).sort((a, b) => a[0] - b[0]);
          acts.forEach(a => { S.inSeq = a[0]; S.world.act(other(S.hostRole), a[1], a[2]); });
        } else if (gp.presence.acts) S.inSeq = gp.presence.acts.reduce((m, a) => Math.max(m, a[0]), S.inSeq);
      } else if (S.guestPeer && now - S.guestSeenAt > 4000) {
        S.guestPeer = null; S.net.lobby.presence({ bbk: { code: S.code, open: 1, lv: S.si, v: 'roles' } }).catch(() => {}); onUI();
      }
      if (S.world) {
        S.world.update(dt);
        if (now - S.lastSend > 33) { S.lastSend = now; S.gr.presence({ role: 'host', hr: S.hostRole, s: S.world.snapshot() }).catch(() => {}); }
      } else if (now - S.lastSend > 250) { S.lastSend = now; S.gr.presence({ role: 'host', hr: S.hostRole, s: { ph: 'wait', si: S.si, rid: S.rid } }).catch(() => {}); }
    } else if (S.mode === 'guest') {
      const hp = BB.Net.others(S.gr).find(p => p.presence && p.presence.role === 'host');
      const s = hp && hp.presence && hp.presence.s;
      const prev = S.gState;
      if (s) S.hostSeenAt = now;
      if (!s) S.gState = now - S.hostSeenAt > 4000 ? 'lost' : 'connecting';
      else if (s.ph === 'wait') { S.gState = 'wait'; S.guestSi = s.si; S.guestRole = other(hp.presence.hr || 'grill'); if (S.world) { S.world = null; BB.Audio.play('title'); } }
      else {
        S.gState = 'play';
        const myRole = other(hp.presence.hr || 'grill');
        if (!S.world || S.world.rid !== s.rid) { S.world = new R.World(s.si, s.rid); S.world._seen = 0; S.roles = [myRole]; S.si = s.si; freshUIs(); BB.Audio.play(R.SHIFTS[s.si].music); fit(); }
        S.world.apply(s);
        if (S.world._ph !== S.world.phase) { S.world._ph = S.world.phase; onUI(); }
      }
      if (prev !== S.gState) onUI();
      if (now - S.lastSend > 33) { S.lastSend = now; S.gr.presence({ role: 'guest', rid: S.world ? S.world.rid : 0, acts: S.out.acts }).catch(() => {}); }
    }
    const w = S.world;
    if (w) {
      handleEvents(w); exitDance();
      w.popups.forEach(p => p.age += dt); w.popups = w.popups.filter(p => p.age < 1.6);
      w.shake = Math.max(0, (w.shake || 0) - dt * 2);
      Object.values(S.ui).forEach(u => { u.poseT = Math.max(0, u.poseT - dt); });
      const ku = S.ui.kasse; if (ku && !w.slots[ku.sel]) { const n = w.slots.findIndex(c => c); if (n >= 0) ku.sel = n; }
    }
  }

  // ---------- render ----------
  const logicalW = () => (S.roles.length > 1 ? R.W * 2 : R.W);
  function fit() {
    const st = $('#stage'), LW = logicalW();
    const s = Math.min(st.clientWidth / LW, st.clientHeight / R.H);
    const dw = Math.floor(LW * s), dh = Math.floor(R.H * s);
    cv.style.width = dw + 'px'; cv.style.height = dh + 'px';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(dw * dpr); cv.height = Math.round(dh * dpr);
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    $('#rotate').hidden = !(coarse && st.clientHeight > st.clientWidth && S.world);
  }
  window.addEventListener('resize', fit);
  let attract = null;
  function render(t) {
    const LW = logicalW();
    ctx.setTransform(cv.width / LW, 0, 0, cv.height / R.H, 0, 0);
    const w = S.world;
    if (!w) {
      if (!attract) { attract = new R.World(1, 0); attract.phase = 'play'; attract._seen = 0; for (let i = 0; i < 3; i++) attract.spawn(); attract.slots[0].dec = true; attract.slots[2].dp = 2; attract.pass = 'Dmltog'; attract.signs.kasse = [[1, 0, 0], [2, 1, 0], [3, 3, 0]]; }
      attract.clock = 1 + (t % 6); attract.slots.forEach(c => c && (c.pat = c.max * (0.4 + 0.5 * Math.abs(Math.sin(t * 0.1 + c.seed)))));
      R.drawKasse(ctx, attract, { hits: [], sel: 1, dancing: -1, send() {}, onCustomer() {} }, t);
      ctx.fillStyle = 'rgba(14,8,22,.66)'; ctx.fillRect(0, 0, LW, R.H);
      return;
    }
    S.roles.forEach((role, i) => {
      ctx.save(); ctx.translate(i * R.W, 0);
      ctx.beginPath(); ctx.rect(0, 0, R.W, R.H); ctx.clip();
      if (w.shake > 0 && !BB.Render.reduceMotion) ctx.translate((Math.random() - 0.5) * 12 * w.shake, (Math.random() - 0.5) * 8 * w.shake);
      const ui = S.ui[role];
      (role === 'kasse' ? R.drawKasse : R.drawGrill)(ctx, w, ui, t);
      drawTopBar(ctx, w, role);
      R.drawOverlay(ctx, w, role, t);
      ctx.restore();
    });
    if (S.roles.length > 1) { ctx.fillStyle = '#120c1c'; ctx.fillRect(R.W - 3, 0, 6, R.H); }
  }
  function drawTopBar(ctx, w, role) {
    // top bar is drawn by the role screens' shared helper; partner status chip for online play
    if (S.mode !== 'host' && S.mode !== 'guest') return;
    const ok = S.mode === 'host' ? !!S.guestPeer : S.gState === 'play';
    ctx.font = '700 11px Archivo, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = ok ? '#7ef0a0' : '#ff6b5f';
    ctx.fillText(ok ? '● partner online · ' + S.code : '● partner offline', 330, 47);
  }
  let last = performance.now();
  function loop(now) {
    now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    frame(dt);
    render(now / 1000);
    requestAnimationFrame(loop);
  }
  // keep simulation + networking alive when animation frames stall (hidden tab, background pane)
  setInterval(() => {
    const now = performance.now();
    if (now - last < 200) return;
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    frame(dt);
  }, 100);
  BB.RS._render = () => render(performance.now() / 1000);

  // ---------- menus ----------
  let screen = 'home', timer = null, selSi = 0;
  function show(name) {
    screen = name;
    $$('.screen').forEach(el => { el.hidden = el.dataset.screen !== name; });
    $('#ui').hidden = !name;
    $('#b-menu').hidden = !(S.world && !name);
    clearInterval(timer); timer = null;
    if (name === 'online') { refreshLobby(); timer = setInterval(refreshLobby, 700); }
    if (name === 'host') { renderHost(); timer = setInterval(renderHost, 400); }
    if (name === 'guest') { renderGuest(); timer = setInterval(renderGuest, 400); }
  }
  function cards(el, onPick, cur) {
    el.innerHTML = '';
    R.SHIFTS.forEach((sh, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'lvl lvl-' + sh.id + (cur === i ? ' sel' : '');
      b.innerHTML = `<span class="lvl-n">Shift ${i + 1} · ${sh.clock}</span><span class="lvl-t">${sh.name}</span><span class="lvl-d">${sh.rule}</span>`;
      b.addEventListener('click', () => onPick(i)); el.appendChild(b);
    });
  }
  $('#b-online').addEventListener('click', () => { BB.Audio.init(); BB.Audio.play('title'); show('online'); });
  $('#b-split').addEventListener('click', () => { BB.Audio.init(); BB.Audio.play('title'); cards($('#split-levels'), i => { show(null); S.startSplit(i); }); show('split'); });
  $('#b-howto').addEventListener('click', () => show('howto'));
  $$('[data-back]').forEach(b => b.addEventListener('click', () => { if (S.mode) S.leave(); show(b.dataset.back); }));
  async function refreshLobby() {
    const net = await BB.Net.get();
    $('#online-off').hidden = !!net; $('#online-on').hidden = !net;
    if (!net) return;
    $('#net-kind').textContent = net.kind === 'shim' ? 'Local test mode: other tabs in this browser' : 'Live room on claude.ai: both devices open this page while signed in';
    const seen = new Set();
    const ks = BB.Net.others(net.lobby).map(p => p.presence && p.presence.bbk).filter(k => k && k.open && k.code && k.v === 'roles' && !seen.has(k.code) && seen.add(k.code));
    const html = ks.map(k => { const code = String(k.code).replace(/[^A-Z0-9]/gi, '').slice(0, 6); const sh = R.SHIFTS[k.lv | 0] || R.SHIFTS[0]; return `<button type="button" class="kitchen" data-code="${code}"><b>${code}</b><span>${sh.name} · needs a partner</span></button>`; }).join('');
    const list = $('#kitchens');
    if (list.dataset.html !== html) {
      list.dataset.html = html;
      list.innerHTML = html || '<p class="muted">No open kitchens yet. Host one, or type a code.</p>';
      list.querySelectorAll('.kitchen').forEach(b => b.addEventListener('click', () => join(b.dataset.code)));
    }
  }
  $('#b-host').addEventListener('click', async () => { try { await S.hostCreate(); show('host'); } catch (e) { toast('Online play is not available in this view.'); } });
  $('#join-form').addEventListener('submit', e => { e.preventDefault(); const c = $('#join-code').value.trim(); if (c.length >= 3) join(c); });
  async function join(code) { try { await S.joinKitchen(code); show('guest'); } catch (e) { toast('Could not join that kitchen.'); } }
  $$('[data-role]').forEach(b => b.addEventListener('click', () => { S.hostRole = b.dataset.role; S.roles = [S.hostRole]; renderHost(true); }));
  function renderHost(force) {
    if (S.mode !== 'host') return;
    $('#host-code').textContent = S.code;
    $('#host-partner').textContent = S.guestPeer ? 'Your partner is in. They play ' + (S.hostRole === 'grill' ? 'Bärbel at the window.' : 'Bruno at the grill.') : 'Waiting for a partner. On the other device, open this page, choose Play online, then join ' + S.code + '.';
    $('#host-partner').className = S.guestPeer ? 'ok' : 'muted';
    $$('[data-role]').forEach(b => b.classList.toggle('sel', b.dataset.role === S.hostRole));
    const el = $('#host-levels');
    if (force === true || !el.dataset.built || +el.dataset.sel !== selSi) { cards(el, i => { selSi = i; S.si = i; renderHost(true); }, selSi); el.dataset.built = 1; el.dataset.sel = selSi; }
    $('#b-host-start').disabled = !S.guestPeer;
    $('#b-host-start').textContent = S.guestPeer ? 'Start shift' : 'Waiting for partner…';
  }
  $('#b-host-start').addEventListener('click', () => { S.hostStart(selSi); show(null); });
  function renderGuest() {
    if (S.mode !== 'guest') return;
    $('#guest-code').textContent = S.code;
    const sh = R.SHIFTS[S.guestSi | 0];
    const you = S.guestRole === 'kasse' ? 'You play Bärbel at the window.' : S.guestRole === 'grill' ? 'You play Bruno at the grill.' : '';
    $('#guest-status').textContent = S.gState === 'lost' ? 'Can’t see the host. Check the code, and make sure their page is open.' : S.gState === 'wait' ? `Connected. ${you} The host is picking a shift (${sh.name}).` : S.gState === 'play' ? 'Shift running…' : 'Connecting…';
    if (S.gState === 'play' && screen === 'guest') show(null);
  }
  $('#b-menu').addEventListener('click', () => show('pause'));
  $('#b-resume').addEventListener('click', () => show(null));
  $('#b-quit').addEventListener('click', () => { S.leave(); show('home'); });
  window.addEventListener('keydown', e => { if (e.code === 'Escape' && S.world && S.ui.kasse && S.ui.kasse.dancing < 0) { if (screen === 'pause') show(null); else if (!screen) show('pause'); } });

  function renderEnd() {
    const w = S.world;
    $('#end-title').textContent = w.S.name + ' · Feierabend!';
    $('#end-stars').innerHTML = [0, 1, 2].map(i => `<span class="star ${i < w.stars ? 'on' : ''}">★</span>`).join('');
    $('#end-score').textContent = '€' + w.score;
    const next = w.S.stars.find(s => s > w.score);
    $('#end-detail').textContent = `${w.served} döner served · ${w.failed} left hungry` + (next ? ` · next star at €${next}` : '');
    const guest = S.mode === 'guest';
    $('#end-actions').hidden = guest; $('#end-wait').hidden = !guest;
    $('#b-next').hidden = w.si >= R.SHIFTS.length - 1;
    if (w.stars) BB.Audio.sfx('star');
  }
  $('#b-retry').addEventListener('click', () => { const si = S.world.si; show(null); S.mode === 'host' ? S.hostStart(si) : S.startSplit(si); });
  $('#b-next').addEventListener('click', () => { const si = Math.min(R.SHIFTS.length - 1, S.world.si + 1); selSi = si; show(null); S.mode === 'host' ? S.hostStart(si) : S.startSplit(si); });
  $('#b-end-menu').addEventListener('click', () => { if (S.mode === 'host') { S.world = null; BB.Audio.play('title'); show('host'); } else { S.leave(); show('home'); } });
  $('#b-end-leave').addEventListener('click', () => { S.leave(); show('home'); });
  function onUI() {
    const w = S.world;
    if (w && w.phase === 'end' && screen !== 'end') { renderEnd(); show('end'); }
    else if (w && w.phase !== 'end' && screen === 'end') show(null);
    else if (S.mode === 'guest' && !w && !screen) show('guest');
    $('#b-menu').hidden = !(w && !screen);
  }
  let toastT;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3500); }
  function toggleMute() { BB.Audio.init(); const m = BB.Audio.toggleMute(); $$('.b-mute').forEach(b => (b.textContent = m ? 'Sound off' : 'Sound on')); }
  $$('.b-mute').forEach(b => { b.textContent = BB.Audio.muted ? 'Sound off' : 'Sound on'; b.addEventListener('click', toggleMute); });

  const start = () => { show('home'); fit(); requestAnimationFrame(loop); };
  if (document.fonts && document.fonts.load) Promise.race([Promise.all([document.fonts.load('400 20px Bungee'), document.fonts.load('700 14px Archivo')]), new Promise(r => setTimeout(r, 1500))]).then(start, start);
  else start();
})();
