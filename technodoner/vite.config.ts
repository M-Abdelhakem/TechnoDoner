import { defineConfig } from 'vite';

// relative asset URLs, so the same dist/ serves from the Worker, jommi.fi/games/berlin-bears/play or a lab archive copy.
// In dev, /api (the co-op relay) goes to `npm run worker:dev` on 8791.
export default defineConfig({
  base: './',
  // three pages: Berlin Bears (index), TechnoDöner (technodoner); public/original/ is the 1:1 TechnoDoner port, copied as is
  build: { rollupOptions: { input: { main: 'index.html', technodoner: 'technodoner.html' } } },
  server: { proxy: { '/api': { target: 'http://localhost:8791', ws: true } } },
});
