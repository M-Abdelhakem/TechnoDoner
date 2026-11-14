// @ts-nocheck
// Stand-ins so one person can playtest either seat.
// BotChef reads the cashier bear's pose stream exactly as a player would see it (nearest named pose, held a moment),
// matches the last three against the book, then cooks that regular's usual.
// BotCashier copies the regular's dance on the beat and serves whatever comes through the hatch.
import { classify, REGULARS, RECIPES, danceAt, danceFor, POSES } from './poses';
import { lv } from './levels';
import { beat } from './audio';

export class BotChef {
  constructor(ch) { Object.assign(this, { ch, cur: 'I', held: 0, last: '', seq: '', q: [], t: 0, busy: -1, busySv: -1, busyT: 0 }); }
  tick(dt) {
    const ch = this.ch, P = ch.P; if (!P || P.ph !== 'play') { this.q = []; this.seq = ''; return; }
    if (P.pose) {
      const c = classify(P.pose); const k = c.d < 0.9 ? c.key : '?';
      if (k === this.cur) this.held += dt; else { this.cur = k; this.held = 0; }
      const L = lv(P.lv);
      if (this.held > Math.min(0.3, (60 / L.bpm) * L.beatsPerPose * 0.6) && k !== '?' && k !== 'W' && k !== 'X' && k !== this.last) {
        this.last = k;
        if (k === 'I') this.seq = ''; else this.seq = (this.seq + k).slice(-L.danceLen);
        const reg = REGULARS.findIndex((R) => danceFor(R, L.danceLen) === this.seq);
        if (reg >= 0) {
          if (P.sv !== this.busySv || this.busy !== reg || this.busyT > 25) {
            if (!this.q.length && !ch.pass && !ch.plate) {
              const c = RECIPES[REGULARS[reg].rec][1];
              this.q = ['bread', ...(c.includes('m') ? ['m'] : []), ...[...c].filter((x) => 'lto'.includes(x)).map((x) => 'v' + x.toUpperCase()), ...[...c].filter((x) => 'gh'.includes(x)).map((x) => 's' + x), 'pass'];
              this.busy = reg; this.busySv = P.sv; this.busyT = 0; this.t = 0.6; ch.sign('+');
            }
          }
          this.seq = '';
        }
      }
    }
    this.busyT += dt;
    if (!this.q.length) return; this.t -= dt; if (this.t > 0) return; const a = this.q[0];
    if (a === 'bread') { ch.click('bread'); this.q.shift(); this.t = 0.6; }
    else if (a === 'm') { if (ch.plate && ch.plate.includes('m')) { ch.holdId = null; this.q.shift(); this.t = 0.5; } else ch.holdId = 'spit'; }
    else if (a[0] === 'v') { const X = a[1]; if (ch.board !== X && ch.board !== X.toLowerCase()) { ch.click(X); this.t = 0.4; } else if (ch.board === X) ch.holdId = 'board'; else { ch.holdId = null; ch.click('board'); this.q.shift(); this.t = 0.5; } }
    else if (a[0] === 's') { ch.click(a[1]); this.q.shift(); this.t = 0.5; }
    else if (a === 'pass') { if (!ch.pass) { ch.click('plate'); this.q.shift(); this.t = 0.6; } }
  }
}

export class BotCashier {
  constructor(ca) { this.ca = ca; this.t = 0; }
  tick(dt) {
    const ca = this.ca; if (ca.ph !== 'play') return;
    const cu = ca.queue[0];
    ca.setPose(cu ? danceAt(ca.danceOf(cu), beat().n, ca.L.beatsPerPose) : 'I', true);
    this.t -= dt; if (this.t > 0) return;
    if (ca.tray && !ca.held) { ca.click('tray'); this.t = 0.8; return; }
    if (ca.held && cu) { ca.serve(); this.t = 1; }
  }
}
