/** @type {ServiceWorkerGlobalScope} */
const sw = self;

sw.addEventListener('fetch', (event) => {
    /** @type {FetchEvent} */
    const ev = event;
    /** @type {Request} */
    const request = ev.request;

    // We only intercept navigation requests (HTML)
    if (request.mode === 'navigate') {
        /** @type {string} */
        const originalUrl = request.url;

        console.log(`[ServiceWorker] Intercepting navigation for: ${originalUrl}`);
        console.log(`[ServiceWorker] Redirecting internal route to: /index.html`);

        ev.respondWith(
            fetch('/index.html').catch((error) => {
                /** @type {Error} */
                const err = error;
                console.error(`[ServiceWorker] Failed to fetch index.html:`, err);
                return Response.error();
            })
        );
    }
});

sw.addEventListener('activate', (event) => {
    /** @type {ExtendableEvent} */
    const ev = event;
    ev.waitUntil(sw.clients.claim());
    console.log('[ServiceWorker] Active and claiming clients.');
});
