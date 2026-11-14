// @ts-nocheck
// TechnoDöner stand-ins for one-device playtests.
// BotMixChef watches the window and reads Bärbel's pose stream like a player would (nearest pose, held a moment, a
// rest between portions), cooks the list on "Serve!", and starts over on "Start over".
// BotMixCashier reads the customer, works out the döner from the rule book, turns and signs it once Bruno watches,
// and signs it again when he answers "repeat that".
import { classify } from '../poses';
import { expected, ordered, SIGN_BY_POSE } from './rules';

export class BotMixChef {
  constructor(ch) { Object.assign(this, { ch, st: 'watch', cur: 'I', held: 0, last: 'I', list: [], q: [], t: 0, before: 0 }); }
  tick(dt) {
    const ch = this.ch, P = ch.P; if (!P || P.ph !== 'play') { this.list = []; this.q = []; this.st = 'watch'; return; }
    this.t -= dt;
    if (this.st === 'watch') {
      if (!ch.watch) { if (this.t <= 0) { ch.turn(); this.t = 0.4; } return; }
      if (!P.pose || !P.face) return;
      const c = classify(P.pose); const k = c.d < 0.9 ? c.key : '?';
      if (k === this.cur) this.held += dt; else { this.cur = k; this.held = 0; }
      if (this.held < 0.25 || k === '?' || k === this.last) return;
      this.last = k; if (k === 'I') return;
      const s = SIGN_BY_POSE[k]; if (!s) return;
      if (s.id === 'serve') { this.q = [...this.list]; this.list = []; this.st = 'cook'; this.t = 0.3; ch.sign('+'); }
      else if (s.id === 'over') this.list = [];
      else if (s.id !== 'hurry') this.list.push(s.id);
      return;
    }
    if (this.t > 0) return;
    if (ch.watch) { ch.turn(); this.t = 0.6; return; }
    if (this.q.length) {
      const id = this.q[0];
      if (id === 'm') { const n = ch.plate.filter((x) => x === 'm').length; if (ch.holdId !== 'm') { this.before = n; ch.holdId = 'm'; } else if (n > this.before) { ch.holdId = null; this.q.shift(); this.t = 0.3; } return; }
      ch.click(id); this.q.shift(); this.t = 0.35; return;
    }
    if (ch.sillBusy()) { this.t = 0.3; return; } // the last one is still on the sill
    ch.serve(); this.st = 'watch'; this.t = 0.5; this.last = 'I';
  }
}

export class BotMixCashier {
  constructor(ca) { Object.assign(this, { ca, st: 'read', cid: 0, t: 0, asked: 0 }); }
  tick(dt) {
    const ca = this.ca; if (ca.ph !== 'play' || !ca.cust) return; const P = ca.ep.partner();
    if (ca.cust.id !== this.cid) { this.cid = ca.cust.id; this.st = 'read'; this.t = 1.6; if (ca.face !== 0) ca.turn(); }
    this.t -= dt; if (this.t > 0) return;
    if (this.st === 'read') { if (ca.face !== 1) ca.turn(); this.st = 'sign'; this.t = 0.8; return; }
    if (this.st === 'sign') { if (!P || !P.watch) { this.t = 0.3; return; } ordered(expected(ca.cust.traits).list).forEach((id) => ca.sign(id)); ca.sign('serve'); this.st = 'wait'; return; }
    if (this.st === 'wait' && ca.pSign === '?' && ca.pSignT > 1.9 && ca.sawSign !== this.asked) { this.asked = ca.sawSign; ca.q = []; this.st = 'sign'; }
    // Bruno passed it: take it off the sill, turn round, hand it over
    if (this.st === 'wait' && ca.sill && !ca.held) { if (ca.face !== 1) { ca.turn(); this.t = 0.6; return; } ca.take(); ca.turn(); this.st = 'give'; this.t = 0.7; return; }
    if (this.st === 'give') { if (ca.face !== 0) { ca.turn(); this.t = 0.6; return; } ca.give(); this.st = 'read'; this.t = 1; }
  }
}
