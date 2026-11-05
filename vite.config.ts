import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the build works on GitHub Pages under /Portfolio/ or at any root.
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      // two pages: the full 3D portfolio and the one-page version at /short/
      input: {
        main: resolve(__dirname, 'index.html'),
        short: resolve(__dirname, 'short/index.html'),
      },
    },
  },
});
