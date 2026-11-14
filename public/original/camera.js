// The cashier's camera (optional): MediaPipe Pose Landmarker lite on the webcam does two things.
//  1. Her body is the dance controller: the world landmarks become the 15-number pose (common.js poseFromWorld),
//     mirrored like a selfie and eased. Nothing leaves the device but those numbers.
//  2. Serving: while she carries a döner, either wrist (landmark 15 or 16) above her own nose line for 0.4 s serves it,
//     with a big ring filling up. It is measured against her nose, not a screen zone, so it works wherever she sits.
// Tracking is forgiving: the arms count from a low visibility, and a landmark that drops out keeps its last good value
// for 300 ms (single-frame dropouts are ignored). A paw cursor follows her hand, eased.
// Loaded only when switched on; GPU first, CPU as the fallback.
import { poseFromWorld } from './common.js';

const BUNDLE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs';
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const RAISE = 0.4; // seconds with a hand up to serve
const HOLD = 300; // ms a dropped landmark keeps its last good value
const VIS_ARM = 0.3; // visibility the arms (elbows, wrists) need
const VIS_BODY = 0.3; // ...and the shoulders and nose
const ABOVE = 0.03; // a wrist counts as raised this far above the nose (image coordinates, 0..1 from the top)
const RING = 2 * Math.PI * 88;

/**
 * canServe(): the regular's name while she holds a döner for them, else null. onServe(): hand it over.
 * carrying(): whether there is a döner in her paws (the paw cursor shows it).
 */
export function createCamera({ button, canServe = () => null, onServe = () => {}, carrying = () => false, onState = () => {} }) {
  const css = document.createElement('style');
  css.textContent = `
    #paw { position: fixed; z-index: 30; left: 0; top: 0; width: 90px; height: 90px; margin: -45px 0 0 -45px; pointer-events: none; display: none; place-items: center; font-size: 54px; filter: drop-shadow(0 0 10px #ff00aa); transition: opacity .2s; }
    #paw.lost { opacity: 0.25; }
    #raiseRing { position: fixed; z-index: 14; left: 50%; top: 46%; width: 200px; height: 200px; margin: -100px 0 0 -100px; pointer-events: none; display: none; }
    #raiseRing svg { position: absolute; inset: 0; transform: rotate(-90deg); }
    #raiseRing circle { fill: #000b; stroke-width: 16; }
    #raiseRing .bg { stroke: #ffffff2a; } #raiseRing .fg { fill: none; stroke: #00e676; stroke-linecap: round; filter: drop-shadow(0 0 10px #00e676); }
    #raiseRing .t { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; font-size: 64px; line-height: 1; }
    #raiseRing .t small { font-size: 18px; font-weight: 900; color: #00e676; margin-top: 4px; }
    #camPreview { position: fixed; z-index: 6; right: 16px; top: 250px; width: 160px; border-radius: 10px; border: 2px solid #00e5ff; transform: scaleX(-1); display: none; background: #000; }
    #camPreview.up { border-color: #00e676; box-shadow: 0 0 18px #00e676; }
    #camStatus { position: fixed; z-index: 6; left: 50%; transform: translateX(-50%); bottom: 150px; font-size: 16px; font-weight: 800; background: #000d; padding: 8px 14px; border-radius: 10px; display: none; max-width: 90vw; text-align: center; }`;
  document.head.appendChild(css);
  const paw = document.createElement('div');
  paw.id = 'paw'; paw.textContent = '🐾';
  const ring = document.createElement('div');
  ring.id = 'raiseRing';
  ring.innerHTML = `<svg viewBox="0 0 200 200"><circle class="bg" cx="100" cy="100" r="88"/><circle class="fg" cx="100" cy="100" r="88" stroke-dasharray="0 ${RING}"/></svg><div class="t">🙋<small></small></div>`;
  const fg = ring.querySelector('.fg'), ringLabel = ring.querySelector('small');
  const video = document.createElement('video');
  video.id = 'camPreview'; video.muted = true; video.playsInline = true; video.autoplay = true;
  const status = document.createElement('div');
  status.id = 'camStatus';
  document.body.append(paw, ring, video, status);

  let on = false, loading = false, landmarker = null, stream = null, lastVT = -1;
  let pose = null, poseSeen = 0;
  const armGood = [null, null], armAt = [0, 0]; // last good 6 numbers per arm (pose layout: 0 = viewer's left, 1 = right)
  let hand = null, handAt = 0, px = innerWidth / 2, py = innerHeight / 2; // the paw cursor's target (0..1) and position
  let raised = false, raisedAt = 0, fill = 0;
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
      on = true; paw.style.display = 'grid';
      say('Sit back so your arms are in the picture. Copy the dance! When the döner lands in your paws: raise a hand above your head.');
      setTimeout(() => on && say(''), 7000);
    } catch (e) {
      console.warn('camera failed', e);
      stop(); say(`No camera: ${e && e.name === 'NotAllowedError' ? 'permission denied' : (e && e.message) || e}. Use keys 1–6 and F to serve.`);
      setTimeout(() => !on && say(''), 6000);
    }
    loading = false; label();
  }
  function stop() {
    on = false;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null; video.srcObject = null; video.style.display = 'none'; paw.style.display = 'none'; ring.style.display = 'none';
    pose = null; hand = null; raised = false; fill = 0; armGood[0] = armGood[1] = null; label();
  }
  button.onclick = () => { button.blur(); on ? stop() : start(); };
  label();

  function track() {
    if (!landmarker || video.readyState < 2 || video.currentTime === lastVT) return;
    lastVT = video.currentTime;
    let res;
    try { res = landmarker.detectForVideo(video, performance.now()); } catch { return; }
    const w = res && res.worldLandmarks && res.worldLandmarks[0], img = res && res.landmarks && res.landmarks[0];
    if (!img) return; // nobody in the picture this frame: everything keeps its last good value (see HOLD)
    const now = performance.now();
    const vis = (i) => (img[i] && img[i].visibility) ?? 1;

    // the body: needs both shoulders; an arm whose elbow or wrist is not seen keeps its last good value for a moment
    if (w && vis(11) > VIS_BODY && vis(12) > VIS_BODY) {
      const p = poseFromWorld(w);
      [[13, 15], [14, 16]].forEach(([el, wr], a) => {
        const o = a * 6;
        if (vis(el) > VIS_ARM && vis(wr) > VIS_ARM) { armGood[a] = p.slice(o, o + 6); armAt[a] = now; }
        else if (armGood[a] && now - armAt[a] < HOLD) for (let i = 0; i < 6; i++) p[o + i] = armGood[a][i];
      });
      pose = pose ? pose.map((x, i) => x + (p[i] - x) * 0.55) : p; // eased (the page eases the bear once more)
      poseSeen = now;
    }

    // the serve: either wrist above her own nose line
    const nose = img[0];
    if (nose && vis(0) > VIS_BODY) {
      const up = [15, 16].filter((i) => vis(i) > VIS_ARM);
      if (up.length) { raised = up.some((i) => img[i].y < nose.y - ABOVE); raisedAt = now; }
    }

    // the paw cursor: the raised wrist, else the more visible one; mirrored and stretched to the edges
    const l = img[15], r = img[16];
    let p = vis(16) >= vis(15) ? r : l;
    if (raised) p = l.y < r.y && vis(15) > VIS_ARM ? l : vis(16) > VIS_ARM ? r : l;
    if ((p.visibility ?? 1) > VIS_ARM) {
      hand = [Math.min(1, Math.max(0, ((1 - p.x) - 0.15) / 0.7)), Math.min(1, Math.max(0, (p.y - 0.1) / 0.65))];
      handAt = now;
    }
  }

  // call every frame
  function update(dt) {
    if (!on) return;
    track();
    const now = performance.now();
    // paw cursor, eased (frame-rate independent)
    const lost = !hand || now - handAt > HOLD;
    paw.classList.toggle('lost', lost);
    if (hand) { const k = 1 - Math.exp(-dt * 14); px += (hand[0] * innerWidth - px) * k; py += (hand[1] * innerHeight - py) * k; }
    paw.style.transform = `translate(${px}px, ${py}px)`;
    const pawE = carrying() ? '🥙' : '🐾';
    if (paw.textContent !== pawE) paw.textContent = pawE;

    // the serve ring: fills while a hand is up (a dropout under 300 ms does not count as down), drains when it is down
    const up = raised && now - raisedAt < HOLD;
    video.classList.toggle('up', up);
    const name = canServe();
    if (name && up) {
      fill += dt;
      if (fill >= RAISE) { fill = 0; raised = false; onServe(); }
    } else fill = Math.max(0, fill - dt * 1.5);
    if (!name) fill = 0;
    const show = !!name && fill > 0.01;
    ring.style.display = show ? 'block' : 'none';
    if (show) {
      fg.setAttribute('stroke-dasharray', `${Math.min(1, fill / RAISE) * RING} ${RING}`);
      const t = `SERVING ${String(name).toUpperCase()}…`;
      if (ringLabel.textContent !== t) ringLabel.textContent = t;
    }
  }
  return {
    update,
    get on() { return on; },
    /** the latest body pose (15 numbers), or null when the body has not been seen for a moment */
    pose: () => (on && pose && performance.now() - poseSeen < 1200 ? pose : null),
  };
}
