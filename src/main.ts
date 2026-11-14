// @ts-nocheck
// App flow: the menu, playtests against a bot, two-device kitchens (Quick play, a code, a link or a QR code), the
// end screen and the keys. Dev handles on window.__bb for tests and the lab capture.
import { detectPlatform } from '@jommi/game-platform';
import QRCode from 'qrcode';
import { Cashier, Chef, setTheme } from './views';
// /technodoner is the same game inside the club: its own look, music not muffled, its own rooms and Quick play lobby
const CLUB = document.body.dataset.theme === 'club'; setTheme(CLUB ? 'club' : 'street');
const VER = CLUB ? 2 : 1, LOBBY = CLUB ? 'club' : 'main';
import { BotChef, BotCashier } from './bots';
import { loopPair, wsEndpoint, quickMatch, newCode } from './net';
import { startMusic, stopMusic, initAudio, setIntensity, toggleMute, BPM } from './audio';
import { lv } from './levels';

const platform = detectPlatform('berlin-bears');
const $ = (id) => document.getElementById(id);
const stage = $('stage'), botstage = $('botstage');
const siteURL = () => location.origin + location.pathname;
QRCode.toCanvas($('siteQr'), siteURL(), { width: 120, margin: 1 }).catch(() => {}); $('siteUrl').textContent = siteURL();
let views = [], bots = [], cashier = null, mode = null, human = 'both', ep = null, code = null, myRole = null, joinWait = null, music = false;
let level = 'normal'; try { level = localStorage.getItem('bb-level') || 'normal'; } catch {}
const levelBtns = [...document.querySelectorAll('[data-level]')];
const pickLevel = (l) => { level = l; levelBtns.forEach((b) => b.classList.toggle('on', b.dataset.level === l)); try { localStorage.setItem('bb-level', l); } catch {} };
levelBtns.forEach((b) => (b.onclick = () => pickLevel(b.dataset.level))); pickLevel(level);
const play = (bpm) => { startMusic({ bpm, muffled: !CLUB }); music = true; };

function clearViews() { views.forEach((v) => { v.cam?.stop?.(); v.destroy?.(); }); stage.innerHTML = ''; botstage.innerHTML = ''; views = []; bots = []; cashier = null; }
function show(id) { ['menu', 'wait', 'end'].forEach((x) => ($(x).hidden = x !== id)); }

function playtest(who) {
  clearViews(); mode = 'solo'; human = who; const [a, b] = loopPair();
  if (who === 'both') { stage.className = 'two'; cashier = new Cashier(stage, a); views = [cashier, new Chef(stage, b)]; }
  else if (who === 'cashier') { stage.className = 'one'; cashier = new Cashier(stage, a); const ch = new Chef(botstage, b); views = [cashier, ch]; bots = [new BotChef(ch)]; }
  else { stage.className = 'one'; const ch = new Chef(stage, b); cashier = new Cashier(botstage, a); views = [ch, cashier]; bots = [new BotCashier(cashier)]; }
  views.forEach((v) => v.resize()); show(null); play(lv(level).bpm); cashier.start(level);
}

async function host(role, viaQuick = false) {
  clearViews(); code = viaQuick || newCode(); ep = wsEndpoint(code, role, VER); enter(role);
}
function join(c) {
  clearViews(); code = c.toUpperCase(); ep = wsEndpoint(code, null, VER); mode = 'joining';
  $('waitCode').textContent = code; $('waitMsg').textContent = 'Joining the kitchen…'; $('qrBox').hidden = true; $('openShop').hidden = true; show('wait');
  const t0 = Date.now(); clearInterval(joinWait);
  joinWait = setInterval(() => {
    const h = ep.peers().find((d) => d.bb === VER && d.role);
    if (h) { clearInterval(joinWait); const r = h.role === 'cashier' ? 'chef' : 'cashier'; ep.setRole(r); enter(r); }
    else if (Date.now() - t0 > 30000) { clearInterval(joinWait); $('waitMsg').textContent = 'Nobody is in a kitchen with that code. Check it and try again.'; }
  }, 200);
}
function enter(role) {
  myRole = role; mode = 'online'; stage.className = 'one';
  if (role === 'cashier') { cashier = new Cashier(stage, ep); views = [cashier]; } else views = [new Chef(stage, ep)];
  views[0].resize();
  const link = `${siteURL()}?k=${code}`;
  $('waitCode').textContent = code; $('joinLink').textContent = link; $('qrBox').hidden = false;
  QRCode.toCanvas($('qr'), link, { width: 150, margin: 1 }).catch(() => {});
  show('wait'); play(lv(level).bpm);
}
async function quick() {
  const b = $('quickBtn'); b.disabled = true; b.textContent = 'Looking for a kitchen…';
  const mine = newCode(); const r = await quickMatch(mine, false, LOBBY);
  b.disabled = false; b.textContent = 'Quick play';
  if (r.join) join(r.join); else if (r.host) host('cashier', mine);
  else $('netNote').textContent = 'Could not reach the kitchen server. Try again, or playtest on this device.';
}
function leave() { stopMusic(); music = false; clearInterval(joinWait); ep?.close(); ep = null; if (code && mode === 'online') quickMatch(code, true, LOBBY); clearViews(); mode = null; code = null; show('menu'); }

$('ptCashier').onclick = () => playtest('cashier'); $('ptChef').onclick = () => playtest('chef'); $('ptBoth').onclick = () => playtest('both');
$('quickBtn').onclick = quick; $('hostCashier').onclick = () => host('cashier'); $('hostChef').onclick = () => host('chef');
$('joinBtn').onclick = () => { const c = $('codeIn').value.trim(); if (c) join(c); };
$('codeIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('joinBtn').click(); });
$('openShop').onclick = () => { if (cashier) { cashier.start(level); show(null); } };
$('again').onclick = () => { if (cashier) { cashier.start(level); show(null); } };
$('leave1').onclick = leave; $('leave2').onclick = leave;
$('copyLink').onclick = () => { navigator.clipboard?.writeText($('joinLink').textContent).then(() => ($('copyLink').textContent = 'Copied'), () => {}); };
addEventListener('pointerdown', initAudio, { once: true });

addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if ((e.key === 'm' || e.key === 'M') && !e.repeat) { initAudio(); toggleMute(); return; }
  if (!views.length || e.repeat) return;
  const cashierHuman = mode === 'online' ? myRole === 'cashier' : human !== 'chef';
  const chefView = views.find((v) => v instanceof Chef && !v.headless);
  if (cashierHuman && cashier) {
    if (e.key >= '1' && e.key <= '7') { cashier.setPose('ULRCHNW'[+e.key - 1]); return; }
    if (e.key === '0' || e.code === 'Space') { e.preventDefault(); cashier.setPose('I'); return; }
    if (e.key === 'c' || e.key === 'C') { cashier.toggleCamera(); return; }
    if (e.key === 'g' || e.key === 'G' || (e.key === 'Enter' && mode !== 'solo')) { cashier.click('serve'); return; }
  }
  if (chefView && (!cashierHuman || mode === 'solo') && e.key === 'Enter') { chefView.click('plate'); return; }
  if (chefView && (!cashierHuman || mode === 'solo')) { const k = { 7: '+', 8: '-', 9: '?', 0: 'w' }[e.key] ?? (human === 'chef' || mode === 'online' ? { 1: '+', 2: '-', 3: '?', 4: 'w' }[e.key] : null); if (k) chefView.sign(k); }
});
addEventListener('resize', () => views.forEach((v) => v.resize()));

function showEnd(s) {
  const st = s.sc >= 80 ? 3 : s.sc >= 50 ? 2 : s.sc >= 25 ? 1 : 0;
  $('endT').textContent = ['Ach nee…', 'Läuft.', 'Sauber!', 'Döner-Legenden!'][st] + ' ' + '★'.repeat(st) + '☆'.repeat(3 - st);
  $('endS').textContent = `${s.sv} döner served, ${s.lost} regulars walked off. Takings: €${s.sc}.`;
  $('again').hidden = !(mode === 'solo' || myRole === 'cashier'); show('end');
}
function step(dt) {
  views.forEach((v) => v.update(dt)); bots.forEach((b) => b.tick(dt));
  // the music follows the shift: the cashier's level (the chef hears it from her), and the peak in the last minute
  const src = cashier && cashier.ph !== 'wait' ? cashier : views[0]?.ep?.partner?.();
  if (music && src) { const want = lv(src.lvId || src.lv).bpm; if (want !== BPM) play(want); setIntensity((src.ph === 'play' && src.t < 60) ? 1 : 0); }
  if (mode === 'online' && views[0]) {
    const P = views[0].ep.partner(); const ph = myRole === 'cashier' ? cashier.ph : P?.ph;
    if (ph === 'play') { if (!$('wait').hidden || !$('end').hidden) show(null); }
    else if (ph === 'end') { if ($('end').hidden) showEnd(myRole === 'cashier' ? cashier : P); }
    else {
      if ($('wait').hidden) show('wait'); $('qrBox').hidden = !!P; $('openShop').hidden = !(myRole === 'cashier' && P);
      $('waitMsg').textContent = P ? (myRole === 'cashier' ? 'Bruno is at the grill. Open the window when you\'re both ready.' : 'You\'re Bruno at the grill. Waiting for Bärbel to open the window…') : `You're ${myRole === 'cashier' ? 'Bärbel at the window' : 'Bruno at the grill'}. On the other device, scan the code or open the link.`;
    }
  } else if (mode === 'solo' && cashier?.ph === 'end' && $('end').hidden) showEnd(cashier);
}
let last = performance.now();
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt); views.forEach((v) => { if (!v.headless) v.render(dt); }); requestAnimationFrame(loop); }
// a hidden page (phone screen dimmed, other tab) keeps the kitchen running
setInterval(() => { if (document.hidden) step(0.1); }, 100);

(async () => {
  await platform.ready();
  $('loading').hidden = true; show('menu');
  const k = new URLSearchParams(location.search).get('k'); if (k && /^[A-Za-z0-9]{3,6}$/.test(k)) join(k);
  requestAnimationFrame(loop);
})();
(window as any).__bb = { get views() { return views; }, get bots() { return bots; }, playtest, host, join, quick };
