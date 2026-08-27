import TinyServiceWorkerEngine from './TinyServiceWorkerEngine.mjs';

/** @type {Partial<import('./TinyServiceWorkerEngine.mjs').PartialServiceWorkerSettings>} */
const MY_CONFIG = {
  fetch: {
    router: {
      enabled: true,
      // Implementação da sua lógica de rotas
      validator: (url) => {
        const pathname = url.pathname;

        // Static routes matching
        /** @type {string[]} */
        const staticRoutes = ['/', '/notifications', '/settings', '/search'];
        if (staticRoutes.includes(pathname)) return true;

        // Dynamic route pattern: /<any.hostname.com>/images/<id> or /<any.hostname.com>/profiles/<id>
        // This regex matches a domain-like string in the first segment
        /** @type {RegExp} */
        const dynamicRoutePattern = /^\/([a-z0-9.-]+\.[a-z]{2,})\/(images|profiles)\/[^/]+$/i;

        return dynamicRoutePattern.test(pathname);
      },
    },
  },
  messaging: {
    allowPingPong: import.meta.env.DEV,
  },
};

export const tinySw = new TinyServiceWorkerEngine(MY_CONFIG, {
  debugMode: import.meta.env.DEV,
  useLogColors: true,
});
