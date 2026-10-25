import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    cssCodeSplit: false,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        // GSAP is a library, not our code. It gets its own chunk so the
        // content check can tell vendor bytes from the bytes we wrote, and
        // so the browser can cache it on its own.
        manualChunks(id) {
          if (id.includes('node_modules/gsap')) return 'gsap';
          return undefined;
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
});
