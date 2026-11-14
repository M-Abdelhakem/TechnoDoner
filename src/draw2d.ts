// @ts-nocheck
// 2D drawing for the UI layer and the little textures: food icons, sign badges, pose pictograms, regulars' faces.
import { POSES } from './poses';

export const ORD = 'mltogh';
export const NAMES = { m: 'Fleisch', l: 'Salat', t: 'Tomate', o: 'Zwiebel', g: 'Knoblauch', h: 'Scharf', '+': 'Ja!', '-': 'Nein!', '?': 'Nochmal', w: 'Moment' };
export const SPECIES = ['fox', 'raccoon', 'boar', 'rabbit', 'pigeon'];
export const SPECIES_COL = { fox: '#e07b2a', raccoon: '#8f8f9a', boar: '#7a5236', rabbit: '#ece2d6', pigeon: '#8796b0' };

export function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
export function circ(c, x, y, r, f) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = f; c.fill(); }
export function bar(c, x, y, w, h, v, col) { c.fillStyle = '#000a'; rr(c, x, y, w, h, h / 2); c.fill(); c.fillStyle = col; rr(c, x, y, Math.max(h, w * Math.max(0, Math.min(1, v))), h, h / 2); c.fill(); }
export function paw(c, x, y, r, col, rot = 0) { c.save(); c.translate(x, y); c.rotate(rot); circ(c, 0, 0, r, col); [-0.9, -0.3, 0.3, 0.9].forEach((a) => circ(c, Math.sin(a) * r * 1.05, -Math.cos(a) * r * 1.05, r * 0.38, col)); c.restore(); }

export function drawItem(c, it, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  if (it === 'L') { circ(c, 0, 0, 15, '#4fae35'); circ(c, -5, -4, 9, '#6fd24c'); circ(c, 6, 3, 6, '#3f8f2a'); }
  else if (it === 'l') { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#6fd24c' : '#3f8f2a'; rr(c, -16 + i * 5.5, -8 + (i % 3) * 4, 7, 13, 3); c.fill(); } }
  else if (it === 'T') { circ(c, 0, 0, 14, '#e8402f'); circ(c, -5, -5, 4, '#ff8a70'); c.fillStyle = '#2f8f2a'; c.fillRect(-4, -17, 8, 6); }
  else if (it === 't') { [-10, 0, 10].forEach((dx) => { circ(c, dx, 2, 8, '#e8402f'); circ(c, dx, 2, 4.5, '#ff9a80'); }); }
  else if (it === 'O') { c.fillStyle = '#b77ccf'; c.beginPath(); c.ellipse(0, 2, 13, 14, 0, 0, 7); c.fill(); c.fillStyle = '#e9d1f2'; c.fillRect(-2, -16, 4, 7); }
  else if (it === 'o') { c.strokeStyle = '#c58bd6'; c.lineWidth = 3.5; [-8, 7].forEach((dx) => { c.beginPath(); c.arc(dx, 2, 8, 0, 7); c.stroke(); }); }
  else if (it === 'm') { for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#a85d33' : '#7a3e1f'; rr(c, -15 + i * 2, -10 + i * 5, 28, 6, 3); c.fill(); } }
  else if (it === 'g') { c.fillStyle = '#f4f1e6'; rr(c, -8, -14, 16, 26, 4); c.fill(); c.fillStyle = '#bbb'; c.fillRect(-2, -20, 4, 7); c.fillStyle = '#7a6'; c.fillRect(-8, -4, 16, 6); }
  else if (it === 'h') { c.fillStyle = '#e0262a'; rr(c, -8, -14, 16, 26, 4); c.fill(); c.fillStyle = '#ffd'; c.fillRect(-2, -20, 4, 7); c.fillStyle = '#7a1010'; c.fillRect(-8, -4, 16, 6); }
  else if (it && it[0] === 'D') {
    const k = it.slice(1); c.fillStyle = '#c98b45'; c.beginPath(); c.ellipse(0, 5, 22, 15, 0, 0, 7); c.fill(); c.fillStyle = '#e9b872'; c.beginPath(); c.ellipse(0, 1, 19, 11, 0, 0, 7); c.fill();
    const cols = { m: '#8a4b2a', l: '#5fbf3f', t: '#e8402f', o: '#c58bd6' }; let i = 0; for (const ch of k) if (cols[ch]) { circ(c, -11 + i * 7.5, -2, 5.5, cols[ch]); i++; }
  }
  c.restore();
}
export function drawSignIcon(c, k, x, y, s = 1) {
  if ('mltogh'.includes(k)) { drawItem(c, 'lto'.includes(k) ? k.toUpperCase() : k, x, y, s); return; }
  c.save(); c.translate(x, y); c.scale(s, s); c.textAlign = 'center'; c.textBaseline = 'middle';
  if (k === '+' || k === '-') {
    circ(c, 0, 0, 17, k === '+' ? '#3fbf5f' : '#e04040'); c.strokeStyle = '#fff'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath();
    if (k === '+') { c.moveTo(-8, 0); c.lineTo(-2, 7); c.lineTo(9, -7); } else { c.moveTo(-7, -7); c.lineTo(7, 7); c.moveTo(7, -7); c.lineTo(-7, 7); }
    c.stroke();
  } else { circ(c, 0, 0, 17, k === '?' ? '#7a5cff' : '#ffb238'); c.fillStyle = '#fff'; c.font = '20px Bungee, sans-serif'; c.fillText(k === '?' ? '↻' : '…', 0, 2); }
  c.restore();
}
/** stick figure of a pose, as the viewer sees a bear facing them */
export function drawPoseIcon(c, key, x, y, s = 1, col = '#fff') {
  const v = POSES[key].v; c.save(); c.translate(x, y); c.scale(s, s); c.rotate(-v[14] * 0.9);
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 3.2; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(0, -6); c.lineTo(0, 12); c.moveTo(0, 12); c.lineTo(-6, 22); c.moveTo(0, 12); c.lineTo(6, 22); c.stroke();
  c.beginPath(); c.arc(v[12] * 3, -12, 5.5, 0, 7); c.fill();
  for (const [sx, o] of [[-5, 0], [5, 6]]) { const ex = sx + v[o] * 9, ey = -4 - v[o + 1] * 9; const wx = ex + v[o + 3] * 8, wy = ey - v[o + 4] * 8; c.beginPath(); c.moveTo(sx, -4); c.lineTo(ex, ey); c.lineTo(wx, wy); c.stroke(); }
  c.restore();
}
/** a regular's face for the chef's book */
export function drawFace(c, seed, x, y, r) {
  const sp = SPECIES[seed % 5], col = SPECIES_COL[sp];
  if (sp === 'rabbit') { c.fillStyle = col; [-1, 1].forEach((q) => { c.beginPath(); c.ellipse(x + q * r * 0.35, y - r * 1.1, r * 0.2, r * 0.55, 0, 0, 7); c.fill(); }); }
  else if (sp === 'fox') { c.fillStyle = col; [-1, 1].forEach((q) => { c.beginPath(); c.moveTo(x + q * r * 0.9, y - r * 1.1); c.lineTo(x + q * r * 0.2, y - r * 0.7); c.lineTo(x + q * r, y - r * 0.3); c.fill(); }); }
  else if (sp !== 'pigeon') { circ(c, x - r * 0.7, y - r * 0.7, r * 0.32, col); circ(c, x + r * 0.7, y - r * 0.7, r * 0.32, col); }
  circ(c, x, y, r, col);
  if (sp === 'raccoon') { c.fillStyle = '#2a2a33'; rr(c, x - r * 0.75, y - r * 0.32, r * 1.5, r * 0.4, r * 0.2); c.fill(); }
  if (sp === 'fox') circ(c, x, y + r * 0.42, r * 0.38, '#fff3e6');
  if (sp === 'boar') { circ(c, x, y + r * 0.35, r * 0.34, '#c48a66'); }
  if (sp === 'pigeon') { c.fillStyle = '#f2b33a'; c.beginPath(); c.moveTo(x - r * 0.18, y + r * 0.1); c.lineTo(x + r * 0.18, y + r * 0.1); c.lineTo(x, y + r * 0.45); c.fill(); }
  const acc = (seed >> 2) % 4;
  circ(c, x - r * 0.33, y - r * 0.12, r * 0.12, sp === 'raccoon' ? '#fff' : '#141018'); circ(c, x + r * 0.33, y - r * 0.12, r * 0.12, sp === 'raccoon' ? '#fff' : '#141018');
  if (acc === 1) { c.fillStyle = '#111'; rr(c, x - r * 0.65, y - r * 0.3, r * 1.3, r * 0.3, 4); c.fill(); }
  if (acc === 2) { c.fillStyle = '#ff4fa8'; c.beginPath(); c.arc(x, y - r * 0.4, r * 0.95, Math.PI, 0); c.fill(); }
}
