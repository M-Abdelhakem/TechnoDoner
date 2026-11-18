# @jommi/game-platform

One small interface between a browser game and whoever hosts it. The game calls the same
`platform.*` everywhere; the adapter behind it is picked at load from what the host injected:

| Host | Detected by | ready() | saves | leaderboard() | gameOver() |
|---|---|---|---|---|---|
| web (own Worker, jommi.fi, dev server) | default | no-op | localStorage | null (shared games service later) | no-op |
| Wavedash | `window.Wavedash` | `Wavedash.init()` lifts the loading screen | Wavedash cloud files, local copy as cache | Wavedash leaderboards | no-op |
| Remix | `window.RemixSDK` | `RemixSDK.ready()` | localStorage (Remix isolates it per account) | null for now | `game_over` once per run |

Use it from a Vite + TypeScript game:

```json
"dependencies": { "@jommi/game-platform": "file:../tools/platform" }
```

```ts
import { detectPlatform } from '@jommi/game-platform';
const platform = detectPlatform('pave-the-planet');
platform.progress(0.5);           // while loading
await platform.ready();           // before the first interactive screen
const save = await platform.saves.read('save');
platform.leaderboard('fastest', { order: 'asc', display: 'seconds' })?.submit(seconds);
platform.share({ title, text, url });
```

`?platform=web` on the URL forces the plain adapter when a host SDK is present (debugging).
Keep the package tiny: every method must mean the same thing on every host, or stay out.
