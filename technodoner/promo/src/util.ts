// @ts-nocheck
// Timing and easing shared by the promo timelines. Everything is a function of the beat number B (128 BPM), so a
// frame is fully determined by its index.
export const BPM = 128, SPB = 60 / BPM, FPS = 30, W = 1080, H = 1920;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x) => Math.pow(clamp(x), 3);
export const back = (x) => { x = clamp(x); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export function bounce(x) {
  x = clamp(x); const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375;
}
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** decaying punch after the latest onset in `beats` (0..1) */
export function punch(B, beats, len = 0.5) { let k = 0; for (const b of beats) if (B >= b && B - b < len) k = Math.max(k, 1 - (B - b) / len); return k * k; }
/** local beat inside [a, b), or null */
export const seg = (B, a, b) => (B >= a && B < b ? B - a : null);
/** the step of a list [[beat, value]] that is active at B, with how long it has been active */
export function stepAt(list, B) { let i = -1; for (let k = 0; k < list.length; k++) if (list[k][0] <= B) i = k; return i < 0 ? null : { i, v: list[i][1], t: B - list[i][0], prev: i > 0 ? list[i - 1][1] : null }; }
