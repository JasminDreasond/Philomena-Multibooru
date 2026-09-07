import TinyServiceWorkerEngine from '../TinyServiceWorkerEngine.mjs';

/**
 * @typedef {Object} ViteFileDetectorOptions
 * @property {(string|RegExp)[]} [paths]
 * @property {string} [srcPath]
 * @property {string} [manifestPath]
 * @property {boolean} [devOnly] - If true, the plugin only executes during development mode (import.meta.env.DEV).
 */

/**
 * Default configuration to maintain backward compatibility.
 * @type {ViteFileDetectorOptions}
 */
const DEFAULT_OPTIONS = {
  paths: ['/@vite', '/@react', '/node_modules'],
  srcPath: '/src',
  manifestPath: '/manifest.json',
  devOnly: true,
};

/**
 * A plugin for TinyServiceWorkerEngine to detect and bypass Vite-specific files.
 *
 * @param {TinyServiceWorkerEngine} engine - The engine instance.
 * @param {ViteFileDetectorOptions} [options] - Configuration options for file detection.
 * @throws {TypeError} If the engine is invalid or if the provided options do not match the required schema.
 */
const ViteFileDetectorPlugin = (engine, options = {}) => {
  // 1. Validate Engine
  if (!(engine instanceof TinyServiceWorkerEngine)) {
    throw new TypeError('The "engine" argument must be an TinyServiceWorkerEngine instance.');
  }

  // 2. Merge and Validate Options
  /** @type {ViteFileDetectorOptions} */
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (typeof config.devOnly !== 'boolean') {
    throw new TypeError('The "devOnly" property in options must be a boolean.');
  }

  if (!Array.isArray(config.paths)) {
    throw new TypeError('The "paths" property in options must be an array.');
  }

  const paths = [...config.paths, config.srcPath, config.manifestPath];

  // Deep validation of the paths array elements
  paths.forEach((pattern, index) => {
    const isValidString = typeof pattern === 'string';
    const isValidRegExp = pattern instanceof RegExp;

    if (!isValidString && !isValidRegExp) {
      throw new TypeError(
        `Invalid type at paths[${index}]: Expected string or RegExp, but received ${typeof pattern}.`,
      );
    }
  });

  // 3. Implementation
  if (config.devOnly && import.meta.env.DEV) {
    engine.addFetchGlobalListener('ViteFileDetectorPlugin', ({ url }, response) => {
      const isBypassed = paths.some((pattern) => {
        if (pattern instanceof RegExp) return pattern.test(url.pathname);
        return url.pathname.startsWith(pattern);
      });

      if (isBypassed) {
        response.continueCheck = false;
        response.needValidation = false;
        response.code = 200;
      }
    });
  }
};

export default ViteFileDetectorPlugin;
