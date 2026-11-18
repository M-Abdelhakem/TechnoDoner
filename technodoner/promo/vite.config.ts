// The promo page: its own Vite root, importing ../src (read-only) for the game's art kit.
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root: here,
  logLevel: 'warn',
  server: { port: 5377, strictPort: true, host: '127.0.0.1', fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
});
