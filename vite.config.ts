import { defineConfig } from 'vite';

// relative asset URLs, so the same dist/ serves from the Worker, jommi.fi/games/berlin-bears/play or a lab archive copy.
// In dev, /api (the co-op relay) goes to `npm run worker:dev` on 8791.
export default defineConfig({
  base: './',
  server: { proxy: { '/api': { target: 'http://localhost:8791', ws: true } } },
});
