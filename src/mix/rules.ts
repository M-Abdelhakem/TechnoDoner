// @ts-nocheck
// TechnoDöner rules, after TechnoDoner by m-abdelhakem (MIT): a base döner, customer traits, and a rule book that
// adds or removes portions. Order matters (each rule removes every portion of an ingredient, or adds portions), and
// the döner is a multiset: two onions are two signs.

export const ING = ['D', 'm', 'l', 't', 'o']; // bread, meat, lettuce, tomato, onion (codes match kit3d.makeItem)
export const ING_NAME = { D: 'Bread', m: 'Meat', l: 'Lettuce', t: 'Tomato', o: 'Onion' };
export const BASE = ['D', 'm', 'l', 't'];

export const RULES = [
  { trait: 'sunglasses', add: ['m'], text: 'Sunglasses → +1 Meat' },
  { trait: 'glitter', remove: ['t'], text: 'Glitter on face → NO Tomato' },
  { trait: 'bucketHat', add: ['o', 'o'], text: 'Bucket hat → +2 Onion' },
  { trait: 'wristband', remove: ['l'], text: 'Red wristband → NO Lettuce' },
  { trait: 'drunk', add: ['D'], text: 'Swaying (drunk) → +1 Bread' },
  { trait: 'neon', add: ['o'], text: 'Neon outfit → +1 Onion' },
];
const CHANCE = { sunglasses: 0.45, glitter: 0.4, drunk: 0.35, wristband: 0.5, bucketHat: 0.35, neon: 0.25 };

export function rollTraits(rand = Math.random) { const t = {}; for (const k in CHANCE) t[k] = rand() < CHANCE[k]; return t; }
export function expected(traits) {
  let list = [...BASE]; const applied = [];
  RULES.forEach((r, i) => {
    if (!traits[r.trait]) return; applied.push(i);
    if (r.remove) list = list.filter((x) => !r.remove.includes(x));
    if (r.add) list.push(...r.add);
  });
  return { list, applied };
}
export const sameMultiset = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
/** bread first, then the rest in the order signed: how the plate stacks and how a list reads */
export const ordered = (l) => [...l.filter((x) => x === 'D'), ...l.filter((x) => x !== 'D')];

// The sign language: each portion is one body pose held, then a rest. Camera players do these themselves.
export const SIGNS = [
  { id: 'D', pose: 'C', key: 'Q', label: 'Bread', hint: 'clap, like a sandwich' },
  { id: 'm', pose: 'N', key: 'W', label: 'Meat', hint: 'arms out, spin like the spit' },
  { id: 'l', pose: 'U', key: 'E', label: 'Lettuce', hint: 'hands up, waving leaves' },
  { id: 't', pose: 'H', key: 'R', label: 'Tomato', hint: 'big round circle on your head' },
  { id: 'o', pose: 'E', key: 'T', label: 'Onion', hint: 'rub your eyes, crying' },
  { id: 'serve', pose: 'R', key: 'A', label: 'Serve!', hint: 'point to the side' },
  { id: 'over', pose: 'L', key: 'S', label: 'Start over', hint: 'point the other way' },
];
export const SIGN_BY_POSE = Object.fromEntries(SIGNS.map((s) => [s.pose, s]));
export const SIGN_SECONDS = 1.3, REST_SECONDS = 0.4;
export const ROUND_SECONDS = 240, PATIENCE = 100;
