import TinyServiceWorkerEngine from './TinyServiceWorkerEngine.mjs';
import RegisterGlobCachePlugin from './plugins/GlobCachePlugin.mjs';

/** @type {Partial<import('./TinyServiceWorkerEngine.mjs').PartialServiceWorkerSettings>} */
const MY_CONFIG = {
  fetch: {
    router: {
      enabled: true,
    },
  },
};

export const tinySw = new TinyServiceWorkerEngine(MY_CONFIG, {
  debugMode: import.meta.env.DEV,
  useLogColors: true,
});

RegisterGlobCachePlugin(tinySw, {
  patterns: ['**/*.{js,css,html,ico,jpg,png,svg}'],
  exclude: ['**/sw.js'],
  cacheName: 'static-assets-v1',
}).catch((err) => tinySw.log('error', 'Failed to register GlobCachePlugin:', err));

// Static routes matching
['/', '/notifications', '/settings', '/search'].forEach((path) =>
  tinySw.addFetchUrlListener(path, (f, r) => {
    r.code = 200;
  }),
);

// Dynamic route pattern: /<any.hostname.com>/images/<id> or /<any.hostname.com>/profiles/<id>
// This regex matches a domain-like string in the first segment
tinySw.addFetchRegExpListener(
  '^\\/([a-z0-9.-]+\\.[a-z]{2,})\\/(images|profiles)\\/[^/]+$',
  (f, r) => {
    r.code = 200;
  },
);
