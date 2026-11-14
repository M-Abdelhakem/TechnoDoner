# TechnoDöner (repo and Worker still named berlin-bears)

Two-device co-op: a döner window outside a Berlin techno club, too loud to talk. Read `~/Games/AGENTS.md` first for
publishing and the lab; this file covers this game. Design: `docs/GDD.md`.

## Three versions, one Worker

| Address | Version | Code |
|---|---|---|
| `/` | **TechnoDöner · Regulars**: regulars dance their usual, the chef has the book (camera or keys) | `index.html`, `src/*.ts` |
| `/technodoner` | **TechnoDöner · Rule Book**: TechnoDoner's traits + rule book + turning around, on this engine (PS2 look, body-pose signing, rooms, bots) | `technodoner.html`, `src/mix/` |
| `/original/` | **TechnoDöner · Original** (1:1): m-abdelhakem's game as written, its Node server ported to a Durable Object (`OriginalGame`, `?room=` for separate games) | `public/original/`, `worker/original.js` |

Each menu shows a QR code of its own address. Quick play keeps one Lobby per version (`?lobby=`), and room states carry
a version tag (`bb: 1` or `2`), so versions never pair. Credits: `docs/CREDITS.md`.

## Layout

- `src/main.ts` app flow (menu, playtests vs a bot, kitchens by Quick play / code / link `?k=CODE` / QR, keys). Dev
  handles on `window.__bb` (`playtest('cashier'|'chef'|'both')`, `host`, `join`, `quick`, `views`, `bots`).
- `src/views.ts` the two seats. **Cashier** (Bärbel) owns the game state and sends it with her pose at about 20 Hz;
  **Chef** (Bruno) sends his hatch and signs. Both render three.js at 480x270, pixel-crisp, with a 2D UI canvas on top.
- `src/poses.ts` the dance language: a pose is 15 numbers in screen space (two-bone arms, head yaw/roll, lean).
  `poseFromWorld` turns MediaPipe world landmarks into it, mirrored like a selfie. `REGULARS` is the chef's book.
- `src/camera.ts` MediaPipe Pose Landmarker (lite). WASM from jsDelivr at the installed version (keep `VERSION` equal to
  `node_modules/@mediapipe/tasks-vision`), model from Google's bucket. Nothing but the 15 numbers leaves the device.
- `src/net.ts` `wsEndpoint(code, role)` over `worker/index.js` (Durable Object `Room` per code, `Lobby` for Quick play);
  `loopPair()` for playtests on one page.
- `src/bots.ts` BotChef decodes the real pose stream against the book; BotCashier copies on the beat.
- `prototypes/` the earlier claude.ai artifact versions (2D, roles, first 3D, trailer). Not built.

## Run

- `npm test` pose and dance tests. `npm run build` then `npm run worker:dev` serves the build and the relay on 8791.
  `npm run dev` (5291) proxies `/api` to it for hot reload.
- Several tabs in one browser can play each other through the local Worker. A browser pane that is hidden pauses
  `requestAnimationFrame`; the game keeps stepping from a timer only while `document.hidden` is true.

## Rules that bite

- The camera only works on https or localhost, and the first model load takes several seconds (about 17 s uncached).
- The Room keeps no history: a peer that joins gets every current state, then live updates. Max 4 sockets per code.
- Release later: add the `jommi.fi/games/berlin-bears/play*` route and prefix stripping in the Worker (Termination's
  `src/worker.js`); the `/api/` paths are already relative to the page, so they follow the prefix.
- Source files carry `// @ts-nocheck` (ported quickly from the artifact prototypes); type them as they change.
