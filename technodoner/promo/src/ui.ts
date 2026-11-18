// @ts-nocheck
// 2D layer: TikTok captions, chips, stamps, the books, the camera silhouette, scanlines. Captions stay inside the
// safe zone: x 60..900 (the right 15% is TikTok's buttons), y 200..1530 (the bottom 20% is the caption/music bar).
import { drawItem, drawPoseIcon, drawFace, rr, circ } from '../../src/draw2d';
import { REGULARS, RECIPES } from '../../src/poses';
import { clamp, back, easeOut, lerp, hash } from './util';

export const COL = { night: '#130c1a', amber: '#ffb238', pink: '#ff4fa8', teal: '#22b0a2', white: '#ffffff', red: '#ff2040', green: '#3fbf5f' };
export const SAFE = { x0: 60, x1: 900, cx: 480, y0: 200, y1: 1530 };
const FONT = (px) => `${px}px Bungee, "Apple Color Emoji", sans-serif`;
const AFONT = (px, w = 700) => `${w} ${px}px Archivo, "Apple Color Emoji", sans-serif`;

/** word-wrap a string with *highlighted* words into lines of [{t, hl}] */
function wrap(c, text, maxW) {
  const words = text.split(' ').map((w) => ({ t: w.replace(/\*/g, ''), hl: w.includes('*') }));
  let hl = false; words.forEach((w, i) => { const raw = text.split(' ')[i]; const open = raw.startsWith('*'), close = raw.endsWith('*'); w.hl = hl || open; if (open) hl = true; if (close) hl = false; });
  const lines = []; let cur = [];
  for (const w of words) { const test = [...cur, w].map((q) => q.t).join(' '); if (cur.length && c.measureText(test).width > maxW) { lines.push(cur); cur = [w]; } else cur.push(w); }
  if (cur.length) lines.push(cur); return lines;
}
/**
 * A caption. o: {x, y (top), size, maxW, style: 'box' | 'outline', k: pop-in progress 0..1, hl colour, col}
 */
export function caption(c, text, o: any = {}) {
  const size = o.size || 84, maxW = o.maxW || 800, cx = o.x ?? SAFE.cx, y = o.y ?? 250, style = o.style || 'outline', k = o.k ?? 1;
  if (k <= 0) return 0;
  c.save(); c.font = FONT(size); c.textBaseline = 'middle'; c.textAlign = 'left';
  const lines = wrap(c, text, maxW), lh = size * 1.18, h = lines.length * lh;
  const s = lerp(o.from ?? 0.6, 1, back(k)); c.globalAlpha = clamp(k * 3) * (o.alpha ?? 1);
  c.translate(cx, y + h / 2); c.rotate(o.rot || 0); c.scale(s, s); c.translate(-cx, -(y + h / 2));
  lines.forEach((ln, i) => {
    const str = ln.map((w) => w.t).join(' '), lw = c.measureText(str).width, ly = y + i * lh + lh / 2; let x = cx - lw / 2;
    if (style === 'box') { c.fillStyle = o.bg || '#ffffff'; rr(c, x - size * 0.32, ly - lh / 2 - 2, lw + size * 0.64, lh + 4, size * 0.22); c.fill(); }
    ln.forEach((w, j) => {
      const t = (j ? ' ' : '') + w.t, tw = c.measureText(t).width;
      if (style === 'outline') { c.lineJoin = 'round'; c.lineWidth = size * 0.2; c.strokeStyle = '#000'; c.strokeText(t, x, ly + size * 0.06); c.fillStyle = '#000'; c.fillText(t, x + size * 0.04, ly + size * 0.1); }
      c.fillStyle = style === 'box' ? (w.hl ? o.hl || COL.pink : o.col || '#130c1a') : w.hl ? o.hl || COL.amber : o.col || '#fff';
      c.fillText(t, x, ly); x += tw;
    });
  });
  c.restore(); return h;
}
/** a rounded label with optional draw callback for an icon on its left */
export function chip(c, text, x, y, o: any = {}) {
  const size = o.size || 44, k = o.k ?? 1; if (k <= 0) return;
  c.save(); c.font = FONT(size); const tw = c.measureText(text).width, iw = o.icon ? size * 1.5 : 0, w = tw + iw + size * 0.9, h = size * 1.6;
  const s = lerp(0.5, 1, back(k)); c.translate(x, y); c.rotate(o.rot || 0); c.scale(s, s); c.globalAlpha = clamp(k * 3);
  c.fillStyle = o.bg || COL.night; rr(c, -w / 2, -h / 2, w, h, h / 2.6); c.fill(); if (o.border !== false) { c.lineWidth = 5; c.strokeStyle = o.border || COL.amber; c.stroke(); }
  if (o.icon) o.icon(c, -w / 2 + size * 0.45 + iw / 2, 0, size);
  c.fillStyle = o.col || '#fff'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(text, -w / 2 + size * 0.45 + iw, size * 0.04);
  c.restore();
}
/** the big rubber stamp: PERFECT +€12 */
export function stamp(c, text, sub, x, y, k, o: any = {}) {
  if (k <= 0) return; const s = k < 1 ? lerp(2.4, 1, easeOut(k * 1.6)) : 1;
  c.save(); c.translate(x, y); c.rotate(o.rot ?? -0.12); c.scale(s, s); c.globalAlpha = clamp(k * 4);
  const size = o.size || 120; c.font = FONT(size); const tw = c.measureText(text).width; c.font = FONT(size * 0.7); const sw = sub ? c.measureText(sub).width : 0;
  const w = Math.max(tw, sw) + size * 0.8, h = size * (sub ? 2.15 : 1.4);
  c.fillStyle = o.bg || COL.green; rr(c, -w / 2, -h / 2, w, h, 26); c.fill(); c.lineWidth = 10; c.strokeStyle = '#fff'; c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.font = FONT(size); c.fillText(text, 0, sub ? -h * 0.2 : 4);
  if (sub) { c.font = FONT(size * 0.7); c.fillStyle = o.subCol || '#fff7c0'; c.fillText(sub, 0, h * 0.24); }
  c.restore();
}
/** CRT-ish scanlines over a 4x-scaled low-res image, plus a vignette */
let SCAN;
export function scanlines(c, x, y, w, h, a = 0.22) {
  if (!SCAN) { SCAN = document.createElement('canvas'); SCAN.width = 4; SCAN.height = 4; const s = SCAN.getContext('2d'); s.fillStyle = `rgba(0,0,0,${a})`; s.fillRect(0, 3, 4, 1); s.fillStyle = `rgba(0,0,0,${a * 0.4})`; s.fillRect(0, 2, 4, 1); }
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.fillStyle = c.createPattern(SCAN, 'repeat'); c.translate(0, y); c.fillRect(x, 0, w, h);
  c.restore(); c.save(); const g = c.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
}
/** a pose pictogram on a round tile */
export function poseTile(c, key, x, y, r, k = 1, o: any = {}) {
  if (k <= 0) return; const s = lerp(0.3, 1, back(k)); c.save(); c.translate(x, y); c.scale(s, s);
  circ(c, 0, 0, r, o.bg || '#fff'); c.lineWidth = 6; c.strokeStyle = o.ring || COL.night; c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
  drawPoseIcon(c, key, 0, -r * 0.05, r / 26, o.fg || COL.night); c.restore();
}

// ---- Bruno's book of regulars (STAMMKUNDEN) ----
export function stammBook(c, x, y, w, rows, hi, hk) {
  const rh = 150, h = 120 + rows.length * rh;
  c.save(); c.translate(x, y); c.rotate(-0.025);
  c.fillStyle = '#00000066'; rr(c, 10, 14, w, h, 18); c.fill();
  c.fillStyle = '#efe2c4'; rr(c, 0, 0, w, h, 18); c.fill(); c.fillStyle = '#d9c9a6'; c.fillRect(w - 16, 0, 16, h);
  c.fillStyle = '#5a2a14'; c.font = FONT(50); c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.fillText('STAMMKUNDEN', 30, 66); c.font = AFONT(26, 400); c.fillStyle = '#7a5a40'; c.fillText("Bruno's book of regulars", 30, 100);
  rows.forEach((ri, i) => {
    const R = REGULARS[ri], yy = 118 + i * rh, on = i === hi && hk > 0;
    c.fillStyle = on ? `rgba(63,191,95,${0.25 + 0.45 * hk})` : i % 2 ? '#e8d8b6' : '#f3e9d2'; c.fillRect(12, yy, w - 40, rh - 8);
    if (on && hk > 0) { c.lineWidth = 8; c.strokeStyle = COL.green; c.strokeRect(12, yy, w - 40, rh - 8); }
    drawFace(c, R.seed, 70, yy + 82, 36); c.fillStyle = '#3a2010'; c.font = FONT(30); c.fillText(R.name, 120, yy + 44);
    [...R.dance].forEach((k, j) => drawPoseIcon(c, k, 145 + j * 66, yy + 98, 1.45, '#3a2010'));
    const rc = RECIPES[R.rec]; c.fillStyle = '#7a5a40'; c.font = FONT(26); c.fillText(rc[0], 370, yy + 44);
    [...rc[1]].forEach((ch, j) => drawItem(c, 'lto'.includes(ch) ? ch.toUpperCase() : ch, 392 + j * 52 - (rc[1].length > 5 ? j * 6 : 0), yy + 98, 1.15));
  });
  c.restore();
}

// ---- the player on camera: a stylised silhouette with MediaPipe-ish landmarks, drawn low-res ----
let SIL;
export function cameraView(c, v, x, y, w, h, B, o: any = {}) {
  const lw = Math.round(w / 4), lh = Math.round(h / 4);
  if (!SIL) { SIL = document.createElement('canvas'); }
  SIL.width = lw; SIL.height = lh; const s = SIL.getContext('2d');
  // a dark bedroom at night, lit by the phone
  const g = s.createLinearGradient(0, 0, 0, lh); g.addColorStop(0, '#2a2140'); g.addColorStop(1, '#120c1c'); s.fillStyle = g; s.fillRect(0, 0, lw, lh);
  s.fillStyle = '#3a2f55'; s.fillRect(lw * 0.68, lh * 0.1, lw * 0.22, lh * 0.32); s.fillStyle = '#4b3f6e'; s.fillRect(lw * 0.7, lh * 0.12, lw * 0.18, lh * 0.28); // window
  s.fillStyle = '#ffd89022'; s.beginPath(); s.arc(lw * 0.15, lh * 0.2, lh * 0.25, 0, 7); s.fill(); // lamp glow
  s.fillStyle = '#1c1428'; s.fillRect(0, lh * 0.82, lw, lh * 0.18);
  // the body
  const S = lh * (o.size || 0.27), cx = lw / 2 + (o.dx || 0) * lw, cy = lh * (o.cy || 0.56) + Math.abs(Math.sin(Math.PI * B)) * lh * 0.012;
  s.save(); s.translate(cx, cy + S * 1.6); s.rotate(-v[14] * 0.7); s.translate(-cx, -(cy + S * 1.6));
  const sh = [[cx - 0.45 * S, cy], [cx + 0.45 * S, cy]], UA = 0.68 * S, FA = 0.62 * S;
  const joints = sh.map(([sx, sy], i) => { const oo = i * 6; const ex = sx + v[oo] * UA, ey = sy - v[oo + 1] * UA; return [[sx, sy], [ex, ey], [ex + v[oo + 3] * FA, ey - v[oo + 4] * FA]]; });
  const body = (col, grow) => {
    s.fillStyle = col; s.strokeStyle = col; s.lineCap = 'round'; s.lineJoin = 'round';
    s.beginPath(); s.moveTo(cx - 0.55 * S - grow, cy - 0.12 * S - grow); s.lineTo(cx + 0.55 * S + grow, cy - 0.12 * S - grow); s.lineTo(cx + 0.48 * S + grow, cy + 2.4 * S); s.lineTo(cx - 0.48 * S - grow, cy + 2.4 * S); s.closePath(); s.fill();
    s.lineWidth = 0.18 * S + grow * 2; s.beginPath(); s.moveTo(cx, cy); s.lineTo(cx + v[12] * 0.1 * S, cy - 0.45 * S); s.stroke();
    s.beginPath(); s.arc(cx + v[12] * 0.15 * S, cy - 0.66 * S, 0.3 * S + grow, 0, 7); s.fill();
    joints.forEach(([a, b, cc]) => { s.lineWidth = 0.26 * S + grow * 2; s.beginPath(); s.moveTo(...a); s.lineTo(...b); s.lineTo(...cc); s.stroke(); s.beginPath(); s.arc(cc[0], cc[1], 0.15 * S + grow, 0, 7); s.fill(); });
  };
  body(COL.pink, 1.5); body('#4a2470', 0);
  // landmarks
  s.strokeStyle = COL.teal; s.lineWidth = 1; s.fillStyle = '#7dfff0';
  joints.forEach((j) => { s.beginPath(); s.moveTo(...j[0]); s.lineTo(...j[1]); s.lineTo(...j[2]); s.stroke(); j.forEach(([px, py]) => s.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2)); });
  s.beginPath(); s.moveTo(...joints[0][0]); s.lineTo(...joints[1][0]); s.stroke(); s.fillRect(Math.round(cx + v[12] * 0.15 * S) - 1, Math.round(cy - 0.66 * S) - 1, 2, 2);
  s.restore();
  c.save(); c.imageSmoothingEnabled = false; c.drawImage(SIL, x, y, w, h); c.restore();
  scanlines(c, x, y, w, h, 0.16);
  // camera UI: corner brackets + REC
  c.save(); c.strokeStyle = '#ffffffcc'; c.lineWidth = 6; const m = 40, L = 70;
  [[x + m, y + m, 1, 1], [x + w - m - 150, y + m, -1, 1], [x + m, y + h - m, 1, -1], [x + w - m - 150, y + h - m, -1, -1]].forEach(([px, py, sx, sy]) => { c.beginPath(); c.moveTo(px, py + sy * L); c.lineTo(px, py); c.lineTo(px + sx * L, py); c.stroke(); });
  if (Math.floor(B * 2) % 2 === 0) circ(c, x + m + 40, y + m + 46, 13, '#ff2040');
  c.font = FONT(34); c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(o.label || 'YOUR CAMERA', x + m + 66, y + m + 48);
  c.restore();
}
export { drawItem, drawPoseIcon, rr, circ, FONT, AFONT };
