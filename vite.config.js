import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5174,
  },
  base: '/',
  build: {
    assetsDir: 'assets',
  },
  plugins: [react(), copyIndexTo404()],
});
