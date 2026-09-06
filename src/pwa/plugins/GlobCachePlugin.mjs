import { isJsonObject } from 'tiny-essentials';
import TinyServiceWorkerEngine from '../TinyServiceWorkerEngine.mjs';

/**
 * @typedef {Object} GlobCacheOptions
 * @property {string[]} patterns - Array of glob patterns (e.g., ['\*\*\/\*.js', '\*\*\/\*.{css,html}']).
 * @property {string} cacheName - The name of the CacheStorage bucket to use.
 */

/**
 * Converts a glob pattern into a valid RegExp string.
 * @param {string} glob - The glob pattern string.
 * @returns {string} The regular expression string.
 */
const globToRegex = (glob) => {
  let pattern = glob
    .replace(/\*\*\//g, '.*\\/') // Convert **/ to .*/
    .replace(/\*/g, '[^/]*')    // Convert * to [^/]*
    .replace(/\{([^}]+)\}/g, '($1)') // Convert {a,b} to (a|b)
    .replace(/\./g, '\\.')      // Escape dots
    .replace(/,/g, '|');        // Convert comma in braces to pipe

  // Handle the case where the brace replacement might need adjustment
  // This is a simplified version for the patterns provided
  return `^${pattern}$`;
};

/**
 * A plugin for TinyServiceWorkerEngine that implements runtime caching based on glob patterns.
 * @param {TinyServiceWorkerEngine} engine - The engine instance.
 * @param {GlobCacheOptions} options - The configuration options.
 * @throws {TypeError} If options or patterns are invalid.
 */
const RegisterGlobCachePlugin = async (engine, options) => {
  // 1. Validation
  if (!(engine instanceof TinyServiceWorkerEngine)) {
    throw new TypeError('[GlobCachePlugin] A valid TinyServiceWorkerEngine instance is required.');
  }
  if (!isJsonObject(options)) {
    throw new TypeError('[GlobCachePlugin] Options must be a non-null object.');
  }
  if (!Array.isArray(options.patterns)) {
    throw new TypeError('[GlobCachePlugin] options.patterns must be an array of strings.');
  }
  if (typeof options.cacheName !== 'string') {
    throw new TypeError('[GlobCachePlugin] options.cacheName must be a string.');
  }

  const { patterns, cacheName } = options;

  // 2. Implementation
  for (const pattern of patterns) {
    engine.addFetchRegExpListener(globToRegex(pattern), async (fetchObj, result) => {
      const { request, url } = fetchObj;

      try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
          // Inject the cached response into the result object
          result.customResponse = cachedResponse;
          return;
        }

        // If not in cache, fetch from network
        const networkResponse = await fetch(request);

        // We must clone the response to add it to the cache, 
        // as the body can only be consumed once.
        if (networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }

        result.customResponse = networkResponse;
      } catch (error) {
        // If caching fails, we don't break the flow, 
        // we just let the engine proceed to the next plugin or router.
        console.error(`[GlobCachePlugin] Error during cache operation for ${url.pathname}:`, error);
      }
    });
  }
};

export default RegisterGlobCachePlugin;
