import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_TARGET = process.env.VITE_DEV_API_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    // Same-origin in development: the refresh cookie and sockets just work.
    proxy: {
      '/api': API_TARGET,
      '/uploads': API_TARGET,
      '/socket.io': { target: API_TARGET, ws: true },
    },
  },
  // Pre-bundle heavy lazily-loaded deps up front so dev never serves a stale optimised chunk.
  optimizeDeps: { include: ['maplibre-gl', 'react-map-gl/maplibre', 'recharts', '@dnd-kit/core'] },
  worker: { format: 'es' },
  build: {
    // MapLibre alone is ~1 MB; it's split into its own chunk and only loaded on map pages.
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl') || id.includes('react-map-gl')) return 'map';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
        },
      },
    },
  },
});
