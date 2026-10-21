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
        manualChunks: {
          gsap: ['gsap'],
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
