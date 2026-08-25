import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import tinyVitePwaPlugin from './TinyVitePwa.mjs';

// Resolving __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Custom plugin to copy index.html to 404.html for GitHub Pages compatibility.
 * @returns {import('vite').Plugin}
 */
const copyIndexTo404 = () => {
  return {
    name: 'copy-index-to-404',
    /** @type {function} */
    closeBundle: () => {
      const distPath = path.resolve(__dirname, 'dist');
      const indexPath = path.resolve(distPath, 'index.html');
      const targetPath = path.resolve(distPath, '404.html');

      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, targetPath);
      }
    },
  };
};

const manifest = {
  id: 'philomena_multibooru',
  name: 'Philomena Multi-Booru',
  short_name: 'Multi-Booru',
  description: 'An advanced, customizable gallery viewer for Philomena-based boorus.',
  start_url: '/',
  display: 'standalone',
  background_color: '#f8fafc',
  theme_color: '#4f46e5',
  orientation: 'any',
  categories: ['entertainment', 'photo', 'utilities', 'philomena'],
  icons: [
    { src: '/icon/16.png', type: 'image/png', sizes: '16x16', purpose: 'any maskable' },
    { src: '/icon/48.png', type: 'image/png', sizes: '48x48', purpose: 'any maskable' },
    { src: '/icon/72.png', type: 'image/png', sizes: '72x72', purpose: 'any maskable' },
    { src: '/icon/96.png', type: 'image/png', sizes: '96x96', purpose: 'any maskable' },
    { src: '/icon/144.png', type: 'image/png', sizes: '144x144', purpose: 'any maskable' },
    { src: '/icon/168.png', type: 'image/png', sizes: '168x168', purpose: 'any maskable' },
    { src: '/icon/192.png', type: 'image/png', sizes: '192x192', purpose: 'any maskable' },
    { src: '/icon/512.png', type: 'image/png', sizes: '512x512', purpose: 'any maskable' },
  ],
};

export default defineConfig({
  server: {
    port: 5174,
  },
  base: '/',
  build: {
    assetsDir: 'assets',
  },
  plugins: [
    react(),
    copyIndexTo404(),
    nodePolyfills({ include: ['events'] }),
    tinyVitePwaPlugin({
      manifest: manifest,
      manifestPath: '/manifest.json',
      srcDir: 'src/pwa',
      filename: 'sw.js',
    }),
  ],
});
