import ServiceWorkerEngine from './ServiceWorkerEngine.mjs';

/** @type {import('./ServiceWorkerEngine.mjs').ServiceWorkerSettings} */
const MY_CONFIG = {
  fetch: {
    router: {
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
};

export const tinySw = new ServiceWorkerEngine(MY_CONFIG);
