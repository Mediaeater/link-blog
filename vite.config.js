import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cache-Control': 'no-store', // Ensure no stale assets
    },
    open: true, // Automatically open the browser on dev server start
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // Easier debugging in production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'], // Code-splitting for vendor files
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src', // Shorten import paths
    },
  },
});
