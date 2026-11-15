import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 43111,
    proxy: { '/api': 'http://127.0.0.1:43110' },
  },
  plugins: [react()],
  build: { outDir: 'public', emptyOutDir: true },
});
