import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Build-time plugin (singlefile mode only): inline the links + digests
// JSON onto the page. The app normally fetches /data/*.json at runtime,
// which fails when the HTML is opened as a standalone file:// document.
function inlineData() {
  return {
    name: 'inline-link-blog-data',
    transformIndexHtml(html) {
      const read = (rel) => {
        try {
          return fs.readFileSync(path.join(rootDir, rel), 'utf-8');
        } catch {
          return 'null';
        }
      };
      // Escape `<` so the JSON can't break out of the <script> tag.
      const esc = (json) => json.replace(/</g, '\\u003c');
      const tag =
        `<script>` +
        `window.__LINKS_DATA__=${esc(read('data/links.json'))};` +
        `window.__DIGESTS_DATA__=${esc(read('data/digests.json'))};` +
        `</script>`;
      return html.replace('</head>', `${tag}\n</head>`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const singlefile = mode === 'singlefile';

  return {
    base: singlefile ? './' : '/',
    plugins: [react(), ...(singlefile ? [inlineData(), viteSingleFile()] : [])],
    publicDir: 'public',
    server: {
      port: 5174, // Use port 5174 instead of default 5173
      headers: {
        'Cache-Control': 'no-store', // Ensure no stale assets
      },
      open: true, // Automatically open the browser on dev server start
      fs: {
        strict: false, // Allow serving files outside root
      },
    },
    build: {
      outDir: singlefile ? 'dist-single' : 'dist',
      sourcemap: !singlefile, // Easier debugging in production
      cssCodeSplit: !singlefile, // Single file needs one inlined stylesheet
      assetsInlineLimit: singlefile ? Infinity : 4096,
      copyPublicDir: !singlefile, // Single file bundles everything; no loose assets
      rollupOptions: singlefile
        ? {}
        : {
            output: {
              manualChunks: {
                vendor: ['react', 'react-dom'], // Code-splitting for vendor files
              },
            },
          },
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.js'],
    },
    resolve: {
      alias: {
        '@': '/src', // Shorten import paths
      },
    },
  };
});
