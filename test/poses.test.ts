// The dance language: named poses are told apart, the regulars' routines are unambiguous, and the camera mapping is
// mirrored like a selfie (raise your arms -> "Arms up", stretch your own left arm out -> "Point left").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POSES, REGULARS, RECIPES, classify, danceAt, poseFromWorld, quant } from '../src/poses.ts';

test('every named pose classifies as itself', () => {
  for (const k of Object.keys(POSES)) assert.equal(classify(POSES[k].v).key, k);
});

test('regulars have distinct dances, no repeated neighbours, real recipes', () => {
  const seen = new Set();
  for (const R of REGULARS) {
    assert.equal(R.dance.length, 3); assert.ok(!seen.has(R.dance), R.name); seen.add(R.dance);
    for (let i = 1; i < 3; i++) assert.notEqual(R.dance[i], R.dance[i - 1], R.name);
    assert.ok(RECIPES[R.rec], R.rec);
  }
});

test('danceAt holds each pose two beats, then rests', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map((b) => danceAt('UCH', b)).join(''), 'UUCCHHIIU');
});

/** a body in MediaPipe world coordinates (x to the image's right, y down), facing the camera */
function body(lElbow: number[], lWrist: number[], rElbow: number[], rWrist: number[]) {
  const w = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }));
  const p = (x: number, y: number, z = 0) => ({ x, y, z });
  w[0] = p(0, -0.6, -0.1); w[7] = p(0.07, -0.58); w[8] = p(-0.07, -0.58);
  w[11] = p(0.18, -0.4); w[12] = p(-0.18, -0.4); // the person's left shoulder is on the image's right
  w[13] = p(...lElbow); w[15] = p(...lWrist); w[14] = p(...rElbow); w[16] = p(...rWrist);
  return w;
}
test('camera: both arms raised reads as Arms up', () => {
  const v = poseFromWorld(body([0.22, -0.7], [0.24, -0.95], [-0.22, -0.7], [-0.24, -0.95]));
  assert.equal(classify(v).key, 'U');
});
test('camera: your own left arm stretched out reads as Point left (mirrored)', () => {
  const v = poseFromWorld(body([0.46, -0.42], [0.72, -0.45], [-0.2, -0.12], [-0.2, 0.12]));
  assert.equal(classify(v).key, 'L');
  assert.ok(v[0] < -0.8, 'left upper arm points to screen-left');
});
test('quant keeps the relay small', () => {
  assert.ok(JSON.stringify(quant(POSES.N.v)).length < 120);
});
