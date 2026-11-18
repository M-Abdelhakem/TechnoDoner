# TechnoDöner 🐻🥙

A camera version of TechnoDoner, made at the same Berlin hackathon.

Two bears run a döner window outside a techno club, and it's too loud to talk. Every regular orders by dancing their usual moves. **Bärbel, the cashier**, copies each dance with her own body on camera. **Bruno, the chef**, only sees her in the hatch: he looks the dance up in his book of regulars and cooks what that regular always orders.

**Play:** https://berlin-bears.joakim-isoaho.workers.dev on two devices, one per bear (a laptop and a phone work). Each menu shows a QR code for joining.

| Address | Version |
|---|---|
| `/` | **Regulars**: the döner window, with the street outside the club |
| `/technodoner` | **Club**: the same game inside the club, with a dance floor, a DJ booth and lasers |
| `/original/` | **Original**: the same loop in TechnoDoner's own look and code, with `server.js` ported to a Durable Object |

The camera runs MediaPipe Pose in the browser. Only 15 numbers per frame (arms, head and lean) are sent, never video. Without a camera, keys 1–6 do the moves.

## Run locally

Requires Node.js 18+.

```bash
cd technodoner
npm install
npm test            # pose and dance tests
npm run build
npm run worker:dev  # game and relay at http://localhost:8791
```

`npm run dev` (port 5291) gives hot reload and forwards `/api` to the Worker.

## Stack

TypeScript, Three.js, Vite, MediaPipe Tasks Vision, and Cloudflare Workers with Durable Objects (one room per kitchen code, one lobby for Quick play). `vendor/game-platform` is a small local helper the game imports for hosting sites.

## More

- `AGENTS.md`: map of the code
- `docs/GDD.md`: design
- `docs/DEVLOG.md`: the jam day step by step, with screenshots
- `docs/CREDITS.md`: credits
