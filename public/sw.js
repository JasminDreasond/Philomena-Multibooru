/** @type {ServiceWorkerGlobalScope} */
const sw = self;

/**
 * @param {URL} url
 * @returns {boolean}
 */
const isValidRoute = (url) => {
  /** @type {string} */
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
};

/**
 * @returns {Response}
 */
const index404 = () => {
  /** @type {string} */
  const body = 'Not Found';
  /** @type {number} */
  const status = 404;

  return new Response(body, { status });
};

sw.addEventListener('fetch', (event) => {
  /** @type {FetchEvent} */
  const ev = event;
  /** @type {Request} */
  const request = ev.request;

  // We only intercept navigation requests (HTML)
  if (request.mode === 'navigate') {
    /** @type {URL} */
    const url = new URL(request.url);

    if (isValidRoute(url)) {
      console.log(`[ServiceWorker] Valid route: ${url.pathname}.`);
      ev.respondWith(fetch('/index.html').catch(index404));
    } else {
      console.warn(`[ServiceWorker] 404 - Route not found: ${url.pathname}`);

      // Simulating Apache2 ErrorDocument 404 behavior by serving index.html with a 404 status
      ev.respondWith(
        fetch('/index.html')
          .then((response) => {
            /** @type {Response} */
            const res = response;

            return new Response(res.body, {
              status: 404,
              statusText: 'Not Found',
              headers: res.headers,
            });
          })
          .catch(index404),
      );
    }
  }
});

sw.addEventListener('activate', (event) => {
  /** @type {ExtendableEvent} */
  const ev = event;
  ev.waitUntil(sw.clients.claim());
  console.log('[ServiceWorker] Active and claiming clients.');
});

// Broadcast messages across all open tabs of our application
sw.addEventListener('message', (event) => {
  /** @type {ExtendableMessageEvent} */
  const ev = event;
  const data = ev.data;

  if (data && data.type === 'FAVICON_UPDATE') {
    console.log(`[ServiceWorker] Broadcasting favicon update: ${data.icon}`);

    ev.waitUntil(
      sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'FAVICON_UPDATE',
            icon: data.icon,
          });
        });
      }),
    );
  }
});

sw.addEventListener('message', (event) => {
  /** @type {ExtendableMessageEvent} */
  const ev = event;
  /** @type {any} */
  const data = ev.data;

  if (data?.type === 'VALIDATE_ROUTE') {
    /** @type {URL} */
    const mockUrl = new URL(data.path, `https://${data.hostname}`);

    if (!isValidRoute(mockUrl)) {
      console.error(`[ServiceWorker] Internal route is invalid: ${data.path}`);

      // You can notify the client back to show a UI error
      ev.source.postMessage({
        type: 'ROUTE_INVALID',
        path: data.path,
      });
    }
  }
});
