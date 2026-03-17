/** @type {ServiceWorkerGlobalScope} */
const sw = self;

/** @type {Map<string, string>} */
const activeScanners = new Map();

/**
 * @returns {Promise<void>}
 */
const cleanGhostScanners = async () => {
  /** @type {readonly WindowClient[]} */
  const clientList = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });

  /** @type {string[]} */
  const activeClientIds = clientList.map((c) => c.id);

  for (const id of activeScanners.keys()) {
    if (!activeClientIds.includes(id)) {
      activeScanners.delete(id);
      console.log(`[ServiceWorker] Removed ghost scanner: ${id}`);
    }
  }
};

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
sw.addEventListener('message', async (event) => {
  /** @type {ExtendableMessageEvent} */
  const ev = event;
  /** @type {any} */
  const data = ev.data;

  /** @type {string} */
  const clientId = ev.source.id;

  if (data?.type === 'REQUEST_START_SCANNER') {
    await cleanGhostScanners();

    /** @type {string} */
    const queryKey = data.queryKey || 'default';

    /** @type {boolean} */
    let isDuplicate = false;

    for (const [id, q] of activeScanners.entries()) {
      if (id !== clientId && q === queryKey) {
        isDuplicate = true;
        break;
      }
    }

    if (isDuplicate) {
      ev.source.postMessage({ type: 'SCANNER_DUPLICATE_QUERY' });
    } else if (activeScanners.size >= 3 && !activeScanners.has(clientId)) {
      ev.source.postMessage({ type: 'SCANNER_LIMIT_REACHED' });
    } else {
      activeScanners.set(clientId, queryKey);
      ev.source.postMessage({ type: 'SCANNER_STARTED' });
    }
  }

  if (data?.type === 'STOP_SCANNER') {
    activeScanners.delete(clientId);
    ev.source.postMessage({ type: 'SCANNER_STOPPED' });
  }

  if (data?.type === 'FAVICON_UPDATE') {
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
