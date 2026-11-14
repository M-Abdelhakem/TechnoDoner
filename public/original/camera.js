// The cashier's camera (optional): MediaPipe Pose Landmarker lite on the webcam does two things.
//  1. Her body is the dance controller: the world landmarks become the 15-number pose (common.js poseFromWorld),
//     mirrored like a selfie. Nothing leaves the device but those numbers.
//  2. Her right wrist (landmark 16, or 15 when that one is more visible) is a big paw cursor; holding it over a target
//     for 0.5 s acts as a click, with a ring filling up. Targets are the page's (the sill, the regular).
// Loaded only when switched on; GPU first, CPU as the fallback.
import { poseFromWorld } from './common.js';

const BUNDLE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs';
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const DWELL = 0.5; // seconds
const RING = 2 * Math.PI * 46;

export function createCamera({ button, targets, onState = () => {} }) {
  const css = document.createElement('style');
  css.textContent = `
    #paw { position: fixed; z-index: 30; left: 0; top: 0; width: 104px; height: 104px; margin: -52px 0 0 -52px; pointer-events: none; display: none; }
    #paw .e { position: absolute; inset: 0; display: grid; place-items: center; font-size: 58px; filter: drop-shadow(0 0 10px #ff00aa); }
    #paw svg { position: absolute; inset: 0; transform: rotate(-90deg); }
    #paw circle { fill: none; stroke-width: 8; }
    #paw .bg { stroke: #fff3; } #paw .fg { stroke: #00e676; stroke-linecap: round; }
    #paw.lost { opacity: 0.3; }
    #camPreview { position: fixed; z-index: 6; right: 16px; top: 132px; width: 160px; border-radius: 10px; border: 2px solid #00e5ff; transform: scaleX(-1); display: none; background: #000; }
    #camStatus { position: fixed; z-index: 6; left: 50%; transform: translateX(-50%); bottom: 150px; font-size: 15px; font-weight: 700; background: #000d; padding: 6px 12px; border-radius: 10px; display: none; max-width: 90vw; text-align: center; }`;
  document.head.appendChild(css);
  const paw = document.createElement('div');
  paw.id = 'paw';
  paw.innerHTML = `<svg viewBox="0 0 104 104"><circle class="bg" cx="52" cy="52" r="46"/><circle class="fg" cx="52" cy="52" r="46" stroke-dasharray="0 ${RING}"/></svg><div class="e">🐾</div>`;
  const fg = paw.querySelector('.fg');
  const video = document.createElement('video');
  video.id = 'camPreview'; video.muted = true; video.playsInline = true; video.autoplay = true;
  const status = document.createElement('div');
  status.id = 'camStatus';
  document.body.append(paw, video, status);

  let on = false, loading = false, landmarker = null, stream = null, lastVT = -1;
  let pose = null, poseSeen = 0, px = innerWidth / 2, py = innerHeight / 2, handSeen = 0;
  let dwellKey = null, dwellT = 0, lastFired = null;
  const say = (t) => { status.textContent = t; status.style.display = t ? 'block' : 'none'; };
  const label = () => { button.innerHTML = on ? '📷 Camera: ON' : loading ? '📷 Loading…' : '📷 Use camera'; button.classList.toggle('on', on); onState(on); };

  async function makeLandmarker() {
    const vision = await import(BUNDLE);
    const files = await vision.FilesetResolver.forVisionTasks(WASM);
    const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numPoses: 1 });
    try { return await vision.PoseLandmarker.createFromOptions(files, opts('GPU')); }
    catch (e) { console.warn('pose GPU failed, using CPU', e); return vision.PoseLandmarker.createFromOptions(files, opts('CPU')); }
  }

  async function start() {
    if (loading) return;
    loading = true; label(); say('Asking for the camera…');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('this browser has no camera access here');
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
      video.srcObject = stream; video.style.display = 'block';
      await video.play().catch(() => {});
      say('Loading the pose model…');
      landmarker = landmarker || (await makeLandmarker());
      on = true; paw.style.display = 'block';
      say('Step back so your arms are in the picture. Copy the dance! Hold your right paw on the sill or the regular for ½ s.');
      setTimeout(() => on && say(''), 6000);
    } catch (e) {
      console.warn('camera failed', e);
      stop(); say(`No camera: ${e && e.name === 'NotAllowedError' ? 'permission denied' : (e && e.message) || e}. Use keys 1–6 and click.`);
      setTimeout(() => !on && say(''), 6000);
    }
    loading = false; label();
  }
  function stop() {
    on = false;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null; video.srcObject = null; video.style.display = 'none'; paw.style.display = 'none';
    pose = null; dwellKey = null; dwellT = 0; label();
  }
  button.onclick = () => { button.blur(); on ? stop() : start(); };
  label();

  function track() {
    if (!landmarker || video.readyState < 2 || video.currentTime === lastVT) return;
    lastVT = video.currentTime;
    let res;
    try { res = landmarker.detectForVideo(video, performance.now()); } catch { return; }
    const w = res && res.worldLandmarks && res.worldLandmarks[0], img = res && res.landmarks && res.landmarks[0];
    if (!img) return;
    // the body: only while both shoulders are seen (close to a laptop the arms leave the frame; keep the last pose then)
    if (w && (img[11].visibility ?? 1) > 0.5 && (img[12].visibility ?? 1) > 0.5) { pose = poseFromWorld(w); poseSeen = performance.now(); }
    // the hand: right wrist, or the left one if it is clearly the more visible; mirrored and stretched to the edges
    const r = img[16], l = img[15];
    const p = (l && (l.visibility ?? 0) > (r.visibility ?? 0)) ? l : r;
    if ((p.visibility ?? 1) < 0.4) return;
    handSeen = performance.now();
    const nx = Math.min(1, Math.max(0, ((1 - p.x) - 0.15) / 0.7)), ny = Math.min(1, Math.max(0, (p.y - 0.1) / 0.65));
    px += (nx * innerWidth - px) * 0.45; py += (ny * innerHeight - py) * 0.45;
  }

  // call every frame
  function update(dt) {
    if (!on) return;
    track();
    const lost = performance.now() - handSeen > 400;
    paw.classList.toggle('lost', lost);
    paw.style.transform = `translate(${px}px, ${py}px)`;
    let hit = null;
    if (!lost) for (const t of targets()) if (t && Math.hypot(t.x - px, t.y - py) < t.r) { hit = t; break; }
    const key = hit ? hit.key : null;
    if (key !== lastFired) lastFired = null; // re-armed once the paw has left what it last clicked
    if (key && key === dwellKey && key !== lastFired) {
      dwellT += dt;
      if (dwellT >= DWELL) { hit.fire(); lastFired = key; dwellT = 0; }
    } else { dwellKey = key; dwellT = 0; }
    const k = key && key !== lastFired ? Math.min(1, dwellT / DWELL) : 0;
    fg.setAttribute('stroke-dasharray', `${k * RING} ${RING}`);
  }
  return {
    update,
    get on() { return on; },
    /** the latest body pose (15 numbers), or null when the body has not been seen for a moment */
    pose: () => (on && pose && performance.now() - poseSeen < 1200 ? pose : null),
  };
}
