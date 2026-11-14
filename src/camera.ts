// @ts-nocheck
// The cashier's body as the dance controller: MediaPipe Pose Landmarker (lite model) on the webcam, turned into the
// 15-number pose (poses.ts poseFromWorld). Nothing leaves the device but those numbers. The WASM comes from jsDelivr at
// the installed version and the model from Google's bucket, so the build stays small; both need the network once.
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { poseFromWorld } from './poses';

const VERSION = '0.10.35'; // keep equal to node_modules/@mediapipe/tasks-vision
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export type Tracker = { latest(): number[] | null; hand(): { x: number; y: number } | null; handUp(): boolean; stop(): void; video: HTMLVideoElement };

export async function startCamera(onStatus = (s: string) => {}): Promise<Tracker> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser has no camera access here.');
  onStatus('Asking for the camera…');
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
  const video = document.createElement('video'); video.playsInline = true; video.muted = true; video.srcObject = stream; await video.play();
  onStatus('Loading the pose model…');
  const files = await FilesetResolver.forVisionTasks(WASM);
  let lm;
  try { lm = await PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' }, runningMode: 'VIDEO', numPoses: 1 }); }
  catch { lm = await PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' }, runningMode: 'VIDEO', numPoses: 1 }); }
  onStatus('');
  let latest = null, seen = 0, lastT = -1, alive = true, hand = null, handSeen = 0, upSeen = 0;
  const tick = () => {
    if (!alive) return;
    if (video.readyState >= 2 && video.currentTime !== lastT) {
      lastT = video.currentTime;
      try {
        const r = lm.detectForVideo(video, performance.now());
        const w = r.worldLandmarks?.[0], img = r.landmarks?.[0];
        // close to a laptop the wrists often leave the frame: keep the last arm then rather than flail
        // ease the pose (a little smoothing hides jitter; one bad frame is ignored because we keep the last good one)
        if (w && img && img[11].visibility > 0.35 && img[12].visibility > 0.35) { const v = poseFromWorld(w); latest = latest ? latest.map((x, i) => x + (v[i] - x) * 0.6) : v; seen = performance.now(); }
        // a hand raised above your own head (either hand): compared with your nose, so it works wherever you sit
        if (img && img[0]) { const top = img[0].y - 0.03; if ([15, 16].some((k) => img[k] && img[k].visibility > 0.3 && img[k].y < top)) upSeen = performance.now(); }
        // the hand that reaches: whichever wrist is higher on screen (and visible), mirrored like a selfie
        if (img) { const a = img[16], b = img[15]; const ok = (p) => p && p.visibility > 0.4; const p = ok(a) && ok(b) ? (a.y < b.y ? a : b) : ok(a) ? a : ok(b) ? b : null; if (p) { hand = { x: 1 - p.x, y: p.y }; handSeen = performance.now(); } }
      } catch {}
    }
    requestAnimationFrame(tick);
  };
  tick();
  return { video, latest: () => (performance.now() - seen < 1200 ? latest : null), hand: () => (performance.now() - handSeen < 600 ? hand : null), handUp: () => performance.now() - upSeen < 300, stop() { alive = false; stream.getTracks().forEach((t) => t.stop()); try { lm.close(); } catch {} } };
}
