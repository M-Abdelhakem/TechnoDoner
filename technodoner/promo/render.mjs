#!/usr/bin/env node
// Render the TechnoDöner TikTok promos, deterministically, frame by frame:
//
//   node promo/render.mjs                 both promos -> promo/out/promo-1.mp4, promo-2.mp4
//   node promo/render.mjs --only 2        just one
//   node promo/render.mjs --stills 0.5,3,8 [--only 1]   PNG stills at those seconds -> promo/out/stills/
//
// Starts the promo page on its own Vite (port 5377, root promo/), opens it in headless Chrome (GPU, DevTools over
// Node's WebSocket, no npm deps, as in ~/Games/tools/capture.mjs), asks the page for each frame by index (the
// timeline is driven by the frame number, never the clock), pipes the JPEGs into ffmpeg and muxes the soundtrack
// the page renders offline. 1080x1920, 30 fps, H.264 + AAC.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
const ONLY = opt.only ? [Number(opt.only)] : [1, 2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const { createServer } = await import('vite');
const server = await createServer({ configFile: path.join(HERE, 'vite.config.ts') });
await server.listen();
const url = `http://127.0.0.1:${server.config.server.port}/`;

const work = mkdtempSync(path.join(os.tmpdir(), 'promo-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${work}`, '--window-size=1080,1920', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--use-angle=metal', '--ignore-gpu-blocklist', 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore'] });
let session;
const cleanup = async () => { try { session?.close(); } catch {} chrome.kill(); await server.close(); await sleep(200); rmSync(work, { recursive: true, force: true }); };
try {
  session = await connect(chrome, work);
  await session.send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
  await session.send('Page.enable'); await session.send('Runtime.enable');
  session.on('Runtime.exceptionThrown', (e) => console.error('page error:', e.exceptionDetails?.exception?.description ?? e.exceptionDetails?.text));
  session.on('Runtime.consoleAPICalled', (e) => { if (e.type === 'error' || e.type === 'warning') console.error('page:', e.args.map((a) => a.value ?? a.description).join(' ')); });
  const loaded = session.once('Page.loadEventFired', 60_000); await session.send('Page.navigate', { url }); await loaded;
  const ok = await session.eval('PROMO.ready');
  console.log('page ready, fonts:', JSON.stringify(ok));
  if (!ok?.bungee) console.warn('!! Bungee did not load (offline?): captions will use a fallback font');

  for (const id of ONLY) {
    const info = await session.eval(`PROMO.setup(${id})`);
    if (opt.stills) {
      const dir = path.join(OUT, 'stills'); mkdirSync(dir, { recursive: true });
      for (const s of String(opt.stills).split(',').map(Number)) {
        const f = Math.min(info.frames - 1, Math.round(s * info.fps)); const data = await session.eval(`PROMO.png(${f})`);
        const file = path.join(dir, `p${id}-${s.toFixed(2)}s.png`); writeFileSync(file, Buffer.from(data.split(',')[1], 'base64')); console.log('still', file);
      }
      continue;
    }
    const t0 = Date.now();
    const wav = path.join(work, `promo-${id}.wav`); writeFileSync(wav, Buffer.from(await session.eval('PROMO.audio()'), 'base64'));
    const out = path.join(OUT, `promo-${id}.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(info.fps), '-c:v', 'mjpeg', '-i', '-', '-i', wav,
      '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '6M', '-bufsize', '12M', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(info.fps),
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-t', info.seconds.toFixed(3), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((r) => ff.on('close', r));
    for (let f = 0; f < info.frames; f++) {
      const data = await session.eval(`PROMO.frame(${f})`);
      if (!ff.stdin.write(Buffer.from(data.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
      if (f % 60 === 0) process.stdout.write(`\rpromo-${id}: frame ${f}/${info.frames}`);
    }
    ff.stdin.end(); const code = await done;
    if (code !== 0) throw new Error(`ffmpeg exited ${code}`);
    console.log(`\rpromo-${id}: ${out}  ${info.seconds.toFixed(2)} s, ${(statSync(out).size / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s to render`);
  }
} finally { await cleanup(); }
process.exit(0);

// Chrome writes the port it picked into DevToolsActivePort; the page target's WebSocket is the session.
async function connect(proc, profile) {
  const portFile = path.join(profile, 'DevToolsActivePort'); const deadline = Date.now() + 20_000;
  while (!existsSync(portFile)) { if (Date.now() > deadline || proc.exitCode !== null) throw new Error('Chrome did not start'); await sleep(100); }
  const port = readFileSync(portFile, 'utf8').split('\n')[0]; let target = null;
  while (!target) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} if (!target) { if (Date.now() > deadline) throw new Error('no page in Chrome'); await sleep(100); } }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('DevTools socket failed')); });
  let id = 0; const pending = new Map(), listeners = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (p) m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else for (const fn of listeners.get(m.method) ?? []) fn(m.params); };
  ws.onclose = () => { for (const p of pending.values()) p.reject(new Error('Chrome closed')); pending.clear(); };
  const s = {
    send: (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); }),
    on: (method, fn) => listeners.set(method, [...(listeners.get(method) ?? []), fn]),
    once: (method, ms) => new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error(`${method} did not arrive`)), ms); s.on(method, (p) => { clearTimeout(t); resolve(p); }); }),
    eval: async (expression) => { const r = await s.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result?.value; },
    close: () => { try { ws.close(); } catch {} },
  };
  return s;
}
