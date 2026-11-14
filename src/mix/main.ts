// @ts-nocheck
// TechnoDöner app flow: menu (with a QR code of this page), playtests against a bot, two-device kitchens (Quick play,
// code, ?k= link, QR), end screen and keys. Dev handles on window.__td.
import { detectPlatform } from '@jommi/game-platform';
import QRCode from 'qrcode';
import { MixCashier, MixChef } from './views';
import { BotMixChef, BotMixCashier } from './bots';
import { SIGNS, ING } from './rules';
import { loopPair, wsEndpoint, quickMatch, newCode } from '../net';
import { startMusic, stopMusic, initAudio } from '../audio';

const platform = detectPlatform('berlin-bears');
const $ = (id) => document.getElementById(id);
const stage = $('stage'), botstage = $('botstage');
const VER = 2, LOBBY = 'mix';
let views = [], bots = [], cashier = null, mode = null, human = 'both', ep = null, code = null, myRole = null, joinWait = null;

const siteURL = () => location.origin + location.pathname;
QRCode.toCanvas($('siteQr'), siteURL(), { width: 120, margin: 1 }).catch(() => {}); $('siteUrl').textContent = siteURL();

function clearViews() { views.forEach((v) => { v.cam?.stop?.(); v.destroy?.(); }); stage.innerHTML = ''; botstage.innerHTML = ''; views = []; bots = []; cashier = null; }
function show(id) { ['menu', 'wait', 'end'].forEach((x) => ($(x).hidden = x !== id)); }
const chefView = () => views.find((v) => v instanceof MixChef && !v.headless);

function playtest(who) {
  clearViews(); mode = 'solo'; human = who; const [a, b] = loopPair();
  if (who === 'both') { stage.className = 'two'; cashier = new MixCashier(stage, a); views = [cashier, new MixChef(stage, b)]; }
  else if (who === 'cashier') { stage.className = 'one'; cashier = new MixCashier(stage, a); const ch = new MixChef(botstage, b); views = [cashier, ch]; bots = [new BotMixChef(ch)]; }
  else { stage.className = 'one'; const ch = new MixChef(stage, b); cashier = new MixCashier(botstage, a); views = [ch, cashier]; bots = [new BotMixCashier(cashier)]; }
  views.forEach((v) => v.resize()); show(null); startMusic(); cashier.start();
}
function host(role, given?) { clearViews(); code = given || newCode(); ep = wsEndpoint(code, role, VER); enter(role); }
function join(c) {
  clearViews(); code = c.toUpperCase(); ep = wsEndpoint(code, null, VER); mode = 'joining';
  $('waitCode').textContent = code; $('waitMsg').textContent = 'Joining the kitchen…'; $('qrBox').hidden = true; $('openShop').hidden = true; show('wait');
  const t0 = Date.now(); clearInterval(joinWait);
  joinWait = setInterval(() => {
    const h = ep.peers().find((d) => d.bb === VER && d.role);
    if (h) { clearInterval(joinWait); const r = h.role === 'cashier' ? 'chef' : 'cashier'; ep.setRole(r); enter(r); }
    else if (Date.now() - t0 > 20000) { clearInterval(joinWait); $('waitMsg').textContent = 'Nobody is in a TechnoDöner kitchen with that code. Check it and try again.'; }
  }, 200);
}
function enter(role) {
  myRole = role; mode = 'online'; stage.className = 'one';
  if (role === 'cashier') { cashier = new MixCashier(stage, ep); views = [cashier]; } else views = [new MixChef(stage, ep)];
  views[0].resize();
  const link = `${siteURL()}?k=${code}`;
  $('waitCode').textContent = code; $('joinLink').textContent = link; $('qrBox').hidden = false;
  QRCode.toCanvas($('qr'), link, { width: 150, margin: 1 }).catch(() => {});
  show('wait'); startMusic();
}
async function quick() {
  const b = $('quickBtn'); b.disabled = true; b.textContent = 'Looking for a kitchen…';
  const mine = newCode(); const r = await quickMatch(mine, false, LOBBY);
  b.disabled = false; b.textContent = 'Quick play';
  if (r.join) join(r.join); else if (r.host) host('cashier', mine); else $('netNote').textContent = 'Could not reach the kitchen server. Try again, or playtest on this device.';
}
function leave() { stopMusic(); clearInterval(joinWait); ep?.close(); ep = null; if (code && mode === 'online') quickMatch(code, true, LOBBY); clearViews(); mode = null; code = null; show('menu'); }

$('ptCashier').onclick = () => playtest('cashier'); $('ptChef').onclick = () => playtest('chef'); $('ptBoth').onclick = () => playtest('both');
$('quickBtn').onclick = quick; $('hostCashier').onclick = () => host('cashier'); $('hostChef').onclick = () => host('chef');
$('joinBtn').onclick = () => { const c = $('codeIn').value.trim(); if (c) join(c); };
$('codeIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('joinBtn').click(); });
$('openShop').onclick = () => { if (cashier) { cashier.start(); show(null); } };
$('again').onclick = () => { if (cashier) { cashier.start(); show(null); } };
$('leave1').onclick = leave; $('leave2').onclick = leave;
$('copyLink').onclick = () => { navigator.clipboard?.writeText($('joinLink').textContent).then(() => ($('copyLink').textContent = 'Copied'), () => {}); };
addEventListener('pointerdown', initAudio, { once: true });

addEventListener('keydown', (e) => {
  if (!views.length || e.repeat || e.target instanceof HTMLInputElement) return;
  const cashierHuman = mode === 'online' ? myRole === 'cashier' : human !== 'chef';
  const chefHuman = mode === 'online' ? myRole === 'chef' : human !== 'cashier';
  const ch = chefView();
  if (cashierHuman && cashier) {
    if (e.code === 'Space') { e.preventDefault(); cashier.turn(); return; }
    const s = SIGNS.find((s) => s.key === e.key.toUpperCase()); if (s) { cashier.sign(s.id); return; }
    if (e.key === 'c' || e.key === 'C') { cashier.toggleCamera(); return; }
  }
  if (chefHuman && ch) {
    if ((e.code === 'Space' && !cashierHuman) || (e.key === 'f' || e.key === 'F')) { e.preventDefault(); ch.turn(); return; }
    if (e.key >= '1' && e.key <= '5') { const id = ING[+e.key - 1]; if (id === 'm') { if (!ch.watch) ch.add('m'); } else ch.add(id); return; }
    if (e.key === 'Enter') { ch.serve(); return; } if (e.key === 'Backspace') { ch.trash(); return; }
    if (e.key === 'o' || e.key === 'O') { ch.sign('+'); return; } if (e.key === '?' || e.key === '/') { ch.sign('?'); return; }
  }
});
addEventListener('resize', () => views.forEach((v) => v.resize()));

function showEnd(s) {
  const st = s.sc >= 900 ? 3 : s.sc >= 500 ? 2 : s.sc >= 200 ? 1 : 0;
  $('endT').textContent = ['Ach nee…', 'Läuft.', 'Sauber!', 'Döner-Legenden!'][st] + ' ' + '★'.repeat(st) + '☆'.repeat(3 - st);
  $('endS').textContent = `Score ${s.sc} · ${s.sv} served · ${s.fl} failed.`;
  $('again').hidden = !(mode === 'solo' || myRole === 'cashier'); show('end');
}
function step(dt) {
  views.forEach((v) => v.update(dt)); bots.forEach((b) => b.tick(dt));
  if (mode === 'online' && views[0]) {
    const P = views[0].ep.partner(); const ph = myRole === 'cashier' ? cashier.ph : P?.ph;
    if (ph === 'play') { if (!$('wait').hidden || !$('end').hidden) show(null); }
    else if (ph === 'end') { if ($('end').hidden) showEnd(myRole === 'cashier' ? cashier : P); }
    else {
      if ($('wait').hidden) show('wait'); $('qrBox').hidden = !!P; $('openShop').hidden = !(myRole === 'cashier' && P);
      $('waitMsg').textContent = P ? (myRole === 'cashier' ? 'Bruno is in the kitchen. Start the round when you\'re both ready.' : 'You\'re Bruno in the kitchen. Waiting for Bärbel to start the round…') : `You're ${myRole === 'cashier' ? 'Bärbel at the counter' : 'Bruno in the kitchen'}. On the other device, scan the code or open the link.`;
    }
  } else if (mode === 'solo' && cashier?.ph === 'end' && $('end').hidden) showEnd(cashier);
}
let last = performance.now();
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt); views.forEach((v) => { if (!v.headless) v.render(dt); }); requestAnimationFrame(loop); }
setInterval(() => { if (document.hidden) step(0.1); }, 100);
(async () => {
  await platform.ready(); $('loading').hidden = true; show('menu');
  const k = new URLSearchParams(location.search).get('k'); if (k && /^[A-Za-z0-9]{3,6}$/.test(k)) join(k);
  requestAnimationFrame(loop);
})();
(window as any).__td = { get views() { return views; }, get bots() { return bots; }, playtest, host, join, quick, BotMixChef, BotMixCashier };
