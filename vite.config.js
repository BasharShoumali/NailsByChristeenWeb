import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
// `npm run dev` forwards /api to the server on port 3000 (run `npm run dev:server` alongside it).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { target: 'es2019' },
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
