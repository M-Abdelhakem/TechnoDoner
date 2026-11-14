// @ts-nocheck
// The dance language. A pose is 15 numbers in SCREEN space as the viewer sees a bear facing them (x right, y up,
// z toward the viewer): left upper arm dir, left forearm dir, right upper arm dir, right forearm dir (each a unit
// vector; "left" = the arm on the viewer's left), head yaw, head roll, torso lean (radians, + raises the right shoulder).
// The cashier's camera fills the same 15 numbers (poseFromWorld), the buttons pick one of POSES, and the chef's hatch
// plays whichever arrives on the cashier bear. Nothing recognises gestures: the chef reads them, and the score only
// checks the döner.

const n = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const P = (uL, fL, uR, fR, yaw = 0, roll = 0, lean = 0) => [...n(...uL), ...n(...fL), ...n(...uR), ...n(...fR), yaw, roll, lean];

export const POSES = {
  I: { name: 'Rest', v: P([-0.15, -1, 0.1], [0.05, -1, 0.35], [0.15, -1, 0.1], [-0.05, -1, 0.35]) },
  U: { name: 'Arms up', v: P([-0.35, 1, 0], [-0.1, 1, 0], [0.35, 1, 0], [0.1, 1, 0]) },
  L: { name: 'Point left', v: P([-1, 0.15, 0.1], [-1, 0.2, 0], [0.15, -1, 0.1], [-0.05, -1, 0.35], -0.35) },
  R: { name: 'Point right', v: P([-0.15, -1, 0.1], [0.05, -1, 0.35], [1, 0.15, 0.1], [1, 0.2, 0], 0.35) },
  C: { name: 'Clap', v: P([-0.45, -0.55, 0.7], [0.75, 0.15, 0.6], [0.45, -0.55, 0.7], [-0.75, 0.15, 0.6]) },
  H: { name: 'Hands on head', v: P([-0.85, 0.5, 0], [0.6, 0.75, 0], [0.85, 0.5, 0], [-0.6, 0.75, 0]) },
  N: { name: 'Lean', v: P([-1, 0.05, 0], [-1, 0, 0], [1, 0.05, 0], [1, 0, 0], 0, 0.25, 0.4) },
  E: { name: 'Rub eyes', v: P([-0.35, -0.6, 0.7], [0.3, 0.9, 0.3], [0.35, -0.6, 0.7], [-0.3, 0.9, 0.3], 0, 0, 0) },
};
/** the buttons / keys 1-6, in order */
export const POSE_KEYS = ['U', 'L', 'R', 'C', 'H', 'N'];

export const RECIPES = {
  klassik: ['Klassik', 'mltog'], fleisch: ['Nur Fleisch', 'mg'], scharf: ['Scharf', 'mloh'],
  ohnez: ['Ohne Zwiebel', 'mltg'], gemuese: ['Gemüse', 'ltog'], alles: ['Mit Alles', 'mltogh'],
};
// seed picks the look in kit3d: species = seed % 5 (fox, raccoon, boar, rabbit, pigeon), accessory = (seed >> 2) % 4
export const REGULARS = [
  { name: 'Kalle', seed: 2, dance: 'UCU', rec: 'klassik' },
  { name: 'Mia', seed: 0, dance: 'LRC', rec: 'scharf' },
  { name: 'Dörte', seed: 3, dance: 'HUH', rec: 'gemuese' },
  { name: 'Tarek', seed: 1, dance: 'RLU', rec: 'alles' },
  { name: 'Uschi', seed: 4, dance: 'CHN', rec: 'fleisch' },
  { name: 'Jens', seed: 5, dance: 'NUN', rec: 'ohnez' },
  { name: 'Svetlana', seed: 8, dance: 'LCH', rec: 'klassik' },
  { name: 'Ömer', seed: 7, dance: 'ULR', rec: 'scharf' },
];
/** a regular's routine: each pose held this many beats, then one rest beat */
export const BEATS_PER_POSE = 2;
export function danceAt(dance: string, beats: number) {
  const len = dance.length * BEATS_PER_POSE + BEATS_PER_POSE;
  const i = Math.floor(((beats % len) + len) % len / BEATS_PER_POSE);
  return i < dance.length ? dance[i] : 'I';
}

/** nearest named pose and its distance (arms count most, lean a little) */
export function classify(v: number[]) {
  let best = 'I', bd = Infinity;
  for (const k in POSES) {
    const p = POSES[k].v; let d = 0;
    for (let i = 0; i < 12; i++) d += (v[i] - p[i]) ** 2;
    d += ((v[14] - p[14]) * 2) ** 2;
    if (d < bd) { bd = d; best = k; }
  }
  return { key: best, d: bd };
}

/** MediaPipe Pose world landmarks (33 points, metres, image orientation) -> the 15 numbers, mirrored like a selfie */
export function poseFromWorld(w) {
  const m = (p) => [-p.x, -p.y, -p.z];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const SL = m(w[11]), EL = m(w[13]), WL = m(w[15]), SR = m(w[12]), ER = m(w[14]), WR = m(w[16]);
  const nose = m(w[0]), earL = m(w[7]), earR = m(w[8]);
  const uL = n(...sub(EL, SL)), fL = n(...sub(WL, EL)), uR = n(...sub(ER, SR)), fR = n(...sub(WR, ER));
  const mid = [(earL[0] + earR[0]) / 2, (earL[1] + earR[1]) / 2];
  const ew = Math.hypot(earR[0] - earL[0], earR[1] - earL[1]) || 0.1;
  const yaw = Math.max(-0.8, Math.min(0.8, ((nose[0] - mid[0]) / ew) * 1.6));
  const roll = Math.max(-0.6, Math.min(0.6, Math.atan2(earR[1] - earL[1], earR[0] - earL[0])));
  const lean = Math.max(-0.6, Math.min(0.6, Math.atan2(SR[1] - SL[1], SR[0] - SL[0])));
  return [...uL, ...fL, ...uR, ...fR, yaw, roll, lean];
}
/** two decimals is plenty and keeps the relay small */
export const quant = (v: number[]) => v.map((x) => Math.round(x * 100) / 100);
