import TinyServiceWorkerEngine from '../TinyServiceWorkerEngine.mjs';

/**
 * @param {TinyServiceWorkerEngine} engine - The engine instance.
 * @throws {TypeError} If options or patterns are invalid.
 */
const ViteFileDetectorPlugin = (engine) => {
  if (import.meta.env.DEV)
    engine.addFetchGlobalListener('ViteEngine', (f, r) => {
      if (
        f.isSameOrigin &&
        (f.url.pathname.startsWith('/@vite') ||
          f.url.pathname.startsWith('/@react') ||
          f.url.pathname.startsWith('/src') ||
          f.url.pathname.startsWith('/manifest.json') ||
          f.url.pathname.startsWith('/node_modules'))
      ) {
        r.continueCheck = false;
        r.needValidation = false;
        r.code = 200;
      }
    });
};

export default ViteFileDetectorPlugin;
