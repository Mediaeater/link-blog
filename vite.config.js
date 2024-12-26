import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/link-blog/',
  publicDir: 'public',
  server: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    middleware: [
      (req, res, next) => {
        if (req.url.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json');
        }
        next();
      }
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})