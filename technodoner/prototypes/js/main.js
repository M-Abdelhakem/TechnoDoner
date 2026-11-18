// Berlin Bears — page glue: menus, touch controls, canvas loop, routing
(function () {
  const BB = window.BB, G = BB.Game, A = BB.Art;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const cv = $('#game'), ctx = cv.getContext('2d');
  let screen = 'home', netInfo = null, selLv = 0, lobbyTimer = null;

  // ---------- canvas sizing ----------
  function fit() {
    const st = $('#stage');
    const W = st.clientWidth, H = st.clientHeight;
    const s = Math.min(W / BB.W, H / BB.H);
    const dw = Math.floor(BB.W * s), dh = Math.floor(BB.H * s);
    cv.style.width = dw + 'px'; cv.style.height = dh + 'px';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(dw * dpr); cv.height = Math.round(dh * dpr);
    ctx.setTransform(cv.width / BB.W, 0, 0, cv.height / BB.H, 0, 0);
    const rot = $('#rotate');
    if (rot) rot.hidden = !(isTouch() && H > W && G.world);
  }
  window.addEventListener('resize', fit);
  const isTouch = () => document.body.classList.contains('touch');
  window.addEventListener('touchstart', () => { if (!isTouch()) { document.body.classList.add('touch'); syncTouch(); fit(); } }, { passive: true });
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');

  // ---------- screens ----------
  function show(name) {
    screen = name;
    $$('.screen').forEach(el => { el.hidden = el.dataset.screen !== name; });
    $('#ui').hidden = !name;
    if (lobbyTimer) { clearInterval(lobbyTimer); lobbyTimer = null; }
    if (name === 'online') { refreshLobby(); lobbyTimer = setInterval(refreshLobby, 700); }
    if (name === 'host') { renderHost(); lobbyTimer = setInterval(renderHost, 500); }
    if (name === 'guest') { renderGuest(); lobbyTimer = setInterval(renderGuest, 500); }
    syncTouch();
  }
  function inGame() { return !!(G.world && G.world.phase !== 'end' && !screen); }

  function levelCards(container, onPick, current) {
    container.innerHTML = '';
    BB.LEVELS.forEach((L, i) => {
      const b = document.createElement('button');
      b.className = 'lvl lvl-' + L.theme + (current === i ? ' sel' : '');
      b.type = 'button';
      b.innerHTML = `<span class="lvl-n">Shift ${i + 1} · ${L.clock}</span><span class="lvl-t">${L.name}</span><span class="lvl-d">${L.twist}</span>`;
      b.addEventListener('click', () => onPick(i));
      container.appendChild(b);
    });
  }

  // home
  $('#b-trailer').addEventListener('click', () => { location.hash = 'trailer'; });
  $('#b-online').addEventListener('click', async () => { BB.Audio.init(); BB.Audio.play('title'); show('online'); });
  $('#b-local').addEventListener('click', () => { BB.Audio.init(); BB.Audio.play('title'); levelCards($('#local-levels'), i => { show(null); G.startLocal(i); }); show('local'); });
  $('#b-howto').addEventListener('click', () => show('howto'));
  $$('[data-back]').forEach(b => b.addEventListener('click', () => { if (G.mode) G.leave(); show(b.dataset.back); }));

  // online lobby
  async function refreshLobby() {
    netInfo = await BB.Net.get();
    const off = $('#online-off'), on = $('#online-on');
    off.hidden = !!netInfo; on.hidden = !netInfo;
    if (!netInfo) return;
    $('#net-kind').textContent = netInfo.kind === 'shim' ? 'Local test mode: other tabs in this browser' : 'Live room on claude.ai';
    const list = $('#kitchens');
    const ks = BB.Net.others(netInfo.lobby).map(p => p.presence && p.presence.bbk).filter(k => k && k.open && k.code);
    const seen = new Set();
    const html = ks.filter(k => !seen.has(k.code) && seen.add(k.code)).map(k => {
      const code = String(k.code).replace(/[^A-Z0-9]/gi, '').slice(0, 6);
      const L = BB.LEVELS[k.lv | 0] || BB.LEVELS[0];
      return `<button type="button" class="kitchen" data-code="${code}"><b>${code}</b><span>${L.name} · waiting for a partner</span></button>`;
    }).join('');
    if (list.dataset.html !== html) {
      list.dataset.html = html;
      list.innerHTML = html || '<p class="muted">No open kitchens yet. Host one, or type a code.</p>';
      list.querySelectorAll('.kitchen').forEach(b => b.addEventListener('click', () => join(b.dataset.code)));
    }
  }
  $('#b-host').addEventListener('click', async () => {
    try { await G.hostCreate(); show('host'); } catch (e) { toast('Online play is not available in this view.'); }
  });
  $('#join-form').addEventListener('submit', e => { e.preventDefault(); const c = $('#join-code').value.trim(); if (c.length >= 3) join(c); });
  async function join(code) {
    try { await G.joinKitchen(code); show('guest'); } catch (e) { toast('Could not join that kitchen.'); }
  }

  // host
  function renderHost() {
    if (G.mode !== 'host') return;
    $('#host-code').textContent = G.code;
    const st = G.status();
    $('#host-partner').textContent = st.partner ? 'Bärbel is in the kitchen. Ready when you are.' : 'Waiting for a partner… On the other device, open this page, choose Play online and join ' + G.code + '.';
    $('#host-partner').className = st.partner ? 'ok' : 'muted';
    $('#b-host-start').textContent = st.partner ? 'Start shift' : 'Start without partner';
    const cards = $('#host-levels');
    if (!cards.dataset.built || +cards.dataset.sel !== selLv) {
      levelCards(cards, i => { selLv = i; G.lv = i; renderHost(); }, selLv);
      cards.dataset.built = '1'; cards.dataset.sel = selLv;
    }
  }
  $('#b-host-start').addEventListener('click', () => { G.hostStart(selLv); show(null); });

  // guest
  function renderGuest() {
    if (G.mode !== 'guest') return;
    $('#guest-code').textContent = G.code;
    const st = G._guestState;
    const L = BB.LEVELS[G.guestLv | 0];
    $('#guest-status').textContent = st === 'lost' ? 'Can’t see the host. Check the code, or ask them to keep the page open.'
      : st === 'wait' ? `Connected. The host is picking a shift (${L.name}).`
        : st === 'play' ? 'Shift running…' : 'Connecting…';
    if (st === 'play' && screen === 'guest') show(null);
  }

  // in-game menu
  $('#b-menu').addEventListener('click', () => { if (G.mode === 'local') G.paused = true; show('pause'); });
  $('#b-resume').addEventListener('click', () => { G.paused = false; show(null); });
  $('#b-quit').addEventListener('click', () => { G.leave(); show('home'); });
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && G.world) { if (screen === 'pause') { G.paused = false; show(null); } else if (!screen) { if (G.mode === 'local') G.paused = true; show('pause'); } }
    if (e.code === 'KeyM' && !e.target.closest('input')) toggleMute();
  });

  // end of shift
  function renderEnd() {
    const w = G.world; if (!w) return;
    $('#end-title').textContent = w.L.name + ' · Feierabend!';
    $('#end-stars').innerHTML = [0, 1, 2].map(i => `<span class="star ${i < w.stars ? 'on' : ''}">★</span>`).join('');
    $('#end-score').textContent = '€' + w.score;
    $('#end-detail').textContent = `${w.served} döner served · ${w.failed} customers left hungry · next star at €${w.L.stars.find(s => s > w.score) || '—'}`;
    const guest = G.mode === 'guest';
    $('#end-actions').hidden = guest; $('#end-wait').hidden = !guest;
    $('#b-next').hidden = w.lv >= BB.LEVELS.length - 1;
    if (w.stars > 0) BB.Audio.sfx('star');
  }
  $('#b-retry').addEventListener('click', () => { const lv = G.world.lv; show(null); G.mode === 'host' ? G.hostStart(lv) : G.startLocal(lv); });
  $('#b-next').addEventListener('click', () => { const lv = Math.min(BB.LEVELS.length - 1, G.world.lv + 1); selLv = lv; show(null); G.mode === 'host' ? G.hostStart(lv) : G.startLocal(lv); });
  $('#b-end-menu').addEventListener('click', () => { if (G.mode === 'host') { G.hostToLobby(); show('host'); } else { G.leave(); show('home'); } });
  $('#b-end-leave').addEventListener('click', () => { G.leave(); show('home'); });

  G.onUI = function () {
    const w = G.world;
    if (w && w.phase === 'end' && screen !== 'end') { renderEnd(); show('end'); }
    else if (w && w.phase !== 'end' && screen === 'end') show(null);
    else if (G.mode === 'guest' && !w && screen !== 'guest' && screen !== 'pause') show('guest');
    $('#b-menu').hidden = !w;
    fit(); syncTouch();
  };

  // ---------- toast / mute ----------
  let toastT = null;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3500); }
  function toggleMute() { BB.Audio.init(); const m = BB.Audio.toggleMute(); $$('.b-mute').forEach(b => b.textContent = m ? 'Sound off' : 'Sound on'); }
  $$('.b-mute').forEach(b => { b.textContent = BB.Audio.muted ? 'Sound off' : 'Sound on'; b.addEventListener('click', toggleMute); });

  // ---------- touch controls ----------
  function syncTouch() {
    const on = isTouch() && !!G.world && !screen;
    $('#touch').hidden = !on;
  }
  const joy = $('#joy'), knob = $('#knob');
  let joyId = null, ox = 0, oy = 0, flicked = false;
  const ctrl = () => G.ctrls[0];
  joy.addEventListener('pointerdown', e => {
    joyId = e.pointerId; joy.setPointerCapture(e.pointerId);
    const r = joy.getBoundingClientRect(); ox = e.clientX; oy = e.clientY;
    knob.style.left = (ox - r.left) + 'px'; knob.style.top = (oy - r.top) + 'px'; knob.classList.add('on');
    joy.style.setProperty('--bx', (ox - r.left) + 'px'); joy.style.setProperty('--by', (oy - r.top) + 'px'); joy.classList.add('on');
  });
  joy.addEventListener('pointermove', e => {
    if (e.pointerId !== joyId || !ctrl()) return;
    let dx = (e.clientX - ox) / 48, dy = (e.clientY - oy) / 48;
    const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    ctrl().touch.mx = dx; ctrl().touch.my = dy;
    const r = joy.getBoundingClientRect();
    knob.style.left = (ox - r.left + dx * 40) + 'px'; knob.style.top = (oy - r.top + dy * 40) + 'px';
    if (m > 0.8 && !flicked) { flicked = true; ctrl().dirs.push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')); }
    if (m < 0.35) flicked = false;
  });
  const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; flicked = false; if (ctrl()) { ctrl().touch.mx = 0; ctrl().touch.my = 0; } knob.classList.remove('on'); joy.classList.remove('on'); };
  joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
  $('#t-grab').addEventListener('pointerdown', e => { e.preventDefault(); if (ctrl()) ctrl().grabs++; });
  const chopBtn = $('#t-chop');
  chopBtn.addEventListener('pointerdown', e => { e.preventDefault(); chopBtn.setPointerCapture(e.pointerId); if (ctrl()) { ctrl().chopEdge = true; ctrl().touch.chop = true; } });
  const chopUp = () => { if (ctrl()) ctrl().touch.chop = false; };
  chopBtn.addEventListener('pointerup', chopUp); chopBtn.addEventListener('pointercancel', chopUp);
  // sign buttons with drawn icons
  $$('#signs button').forEach((b, i) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; b.appendChild(c);
    const x = c.getContext('2d'); x.scale(2, 2); A.drawIcon(x, BB.SIGNS[i], 16, 16, 0.95);
    b.addEventListener('pointerdown', e => { e.preventDefault(); if (ctrl()) ctrl().signs.push(i); });
  });
  // recipe/ingredient icons in How to play
  $$('canvas[data-icon]').forEach(c => {
    const x = c.getContext('2d'); c.width = 56; c.height = 56; x.scale(2, 2);
    const k = c.dataset.icon;
    if (k.length > 1) A.drawItem(x, k, 14, 15, 0.62); else if ('LTO'.includes(k)) A.drawItem(x, k, 14, 14, 0.75); else A.drawIcon(x, k, 14, 14, 0.85);
  });

  // ---------- attract-mode kitchen behind menus ----------
  let attract = null;
  function makeAttract() {
    const w = new BB.World(0, 0); w.phase = 'play';
    w.orders = [['klassik', 61], ['scharf', 40], ['fleisch', 18]].map(([k, pat], i) => ({ id: 41 + i, k, c: BB.RECIPES[k].c, pat, max: 75, seed: 7 + i * 13, enc: false, dance: '', dp: 0, dec: -1 }));
    w.items = { [3 * 15 + 7]: 'T', [4 * 15 + 5]: 'Dml', [4 * 15 + 9]: 'l' };
    w.prog = { [3 * 15 + 7]: 0.45 };
    w.score = 47; w.time = 102;
    return w;
  }
  function animateAttract(w, t) {
    const a = w.players[0], b = w.players[1];
    // Bruno shuttles between spit and island; Bärbel chops at the island
    const k = (Math.sin(t * 0.6) + 1) / 2;
    a.x = 12.4 + k * 1.2; a.y = 1.5 + (1 - k) * 0.2; a.fx = 1; a.fy = 0; a.moving = Math.abs(Math.cos(t * 0.6)) > 0.3; a.walk = t * 10;
    a.chopping = !a.moving; a.held = a.moving ? 'm' : null;
    b.x = 7.5; b.y = 2.42; b.fx = 0; b.fy = 1; b.chopping = true; b.moving = false;
    w.prog[3 * 15 + 7] = (t * 0.6) % 1;
    w.orders.forEach(o => { o.pat -= 0.016; if (o.pat < 4) o.pat = 75; });
    if (Math.floor(t / 4) % 3 === 1) { b.emote = 3; b.emoteT = 1; } else b.emoteT = 0;
  }

  // ---------- main loop ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    if (location.hash !== '#trailer') {
      if (G.mode) G.frame(dt);
      if (G.world) {
        const online = G.mode === 'host' || G.mode === 'guest';
        BB.Render.renderWorld(ctx, G.world, { t, local: G.local, online, myIdx: G.myIdx, labels: online });
        if (G.paused) { ctx.fillStyle = 'rgba(10,6,16,.55)'; ctx.fillRect(0, 0, BB.W, BB.H); }
      } else {
        if (!attract) attract = makeAttract();
        animateAttract(attract, t);
        BB.Render.renderWorld(ctx, attract, { t, local: [] });
        ctx.fillStyle = 'rgba(14,8,22,.62)'; ctx.fillRect(0, 0, BB.W, BB.H);
      }
    }
    requestAnimationFrame(loop);
  }

  // ---------- routing ----------
  function route() {
    const tr = location.hash === '#trailer';
    $('#stage').hidden = tr; $('#trailer').hidden = !tr;
    if (tr) { if (G.mode) G.leave(true); BB.Trailer && BB.Trailer.open(); }
    else { BB.Trailer && BB.Trailer.close(); fit(); if (!G.mode && screen !== 'home' && !['online', 'local', 'howto'].includes(screen)) show('home'); }
  }
  window.addEventListener('hashchange', route);
  BB.goPlay = function (where) {
    if (location.hash === '#trailer') location.hash = 'play'; else route();
    BB.Audio.init(); BB.Audio.play('title');
    if (where === 'online') show('online'); else if (where === 'local') $('#b-local').click(); else show('home');
  };

  const start = () => { show('home'); route(); fit(); requestAnimationFrame(loop); };
  if (document.fonts && document.fonts.load) {
    Promise.race([Promise.all([document.fonts.load('400 20px Bungee'), document.fonts.load('700 14px Archivo')]), new Promise(r => setTimeout(r, 1500))]).then(start, start);
  } else start();
})();
