import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @typedef {Object} TinyVitePwaOptions
 * @property {Record<any, any>} manifest - The Web App Manifest object.
 * @property {string} manifestPath - The URL path where the manifest should be served.
 * @property {string} srcDir - The source directory containing the Service Worker.
 * @property {string} filename - The name of the Service Worker file.
 */

/**
 * Custom PWA Plugin.
 * Resolves Manifest, Dev HMR, and Service Worker bundling.
 * 
 * @param {TinyVitePwaOptions} options - The configuration options for the plugin.
 * @returns {import('vite').Plugin} The Vite plugin object.
 */
const tinyVitePwaPlugin = (options) => {
  // --- Strict Runtime Validation ---
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('The "options" argument must be a non-null object.');
  }

  if (typeof options.manifest !== 'object' || options.manifest === null) {
    throw new TypeError('The "manifest" property must be an object.');
  }

  if (typeof options.manifestPath !== 'string') {
    throw new TypeError('The "manifestPath" property must be a string.');
  }

  if (typeof options.srcDir !== 'string') {
    throw new TypeError('The "srcDir" property must be a string.');
  }

  if (typeof options.filename !== 'string') {
    throw new TypeError('The "filename" property must be a string.');
  }

  const { manifest, manifestPath, srcDir, filename } = options;
  
  const swSourcePath = path.resolve(__dirname, srcDir, filename);
  let viteConfig;

  return {
    name: 'tiny-vite-pwa',

    // Capture Vite configuration to use during build mode
    configResolved(config) {
      viteConfig = config;
    },

    // REQUIREMENTS 1 & 4 (DEV Mode): Serve the manifest and the Service Worker
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Serve manifest.json dynamically
        if (req.url === manifestPath) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(manifest, null, 2));
          return;
        }

        // Serve the Service Worker in Dev mode using Vite's transformer
        if (req.url === `/${filename}`) {
          try {
            const transformed = await server.transformRequest(swSourcePath);
            if (transformed) {
              res.setHeader('Content-Type', 'application/javascript');
              res.end(transformed.code);
              return;
            }
          } catch (e) {
            console.error('Error transforming the SW in dev:', e);
          }
        }
        next();
      });
    },

    // REQUIREMENT 3: Monitor SW changes and notify the frontend
    handleHotUpdate({ file, server }) {
      if (file.startsWith(path.resolve(__dirname, srcDir))) {
        // Send a custom event via Vite's WebSocket
        server.ws.send({
          type: 'custom',
          event: 'pwa:sw-updated',
          data: { message: 'The Service Worker file has been changed.' }
        });
        
        // Return an empty array so Vite does not attempt a full page reload automatically
        return [];
      }
    },

    // REQUIREMENT 1 (PROD Mode): Save the manifest to the dist directory
    generateBundle() {
      // Remove the leading slash from the path to prevent Rollup errors
      const emitPath = manifestPath.replace(/^\//, '');
      this.emitFile({
        type: 'asset',
        fileName: emitPath,
        source: JSON.stringify(manifest, null, 2)
      });
    },

    // REQUIREMENT 4 (PROD Mode): Bundle the Service Worker separately
    async closeBundle() {
      // Only run this during the build command (production)
      if (viteConfig.command === 'build') {
        console.log('\nBundling the Service Worker...');
        await build({
          configFile: false, // Ignore the main vite.config.js to prevent infinite loops
          envFile: false,
          mode: viteConfig.mode,
          build: {
            outDir: viteConfig.build.outDir,
            emptyOutDir: false, // IMPORTANT: Do not delete the React build that was just completed
            lib: {
              entry: swSourcePath,
              name: 'ServiceWorker',
              formats: ['iife'], // IIFE bundles all imports into a single file (classic SW standard)
              fileName: () => filename
            },
            rollupOptions: {
              // Ensures no hashes are added to the SW filename
              output: {
                entryFileNames: filename,
              }
            }
          }
        });
      }
    }
  };
};

export default tinyVitePwaPlugin;