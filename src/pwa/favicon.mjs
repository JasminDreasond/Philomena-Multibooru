import { tinySw } from './config.mjs';

/** @type {ServiceWorkerGlobalScope} */
const sw = self;

// Favicon Update Logic
tinySw.addMessage('FAVICON_UPDATE', async ({ data, event }) => {
  console.log(`[ServiceWorker] Broadcasting favicon update: ${data.icon}`);

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          type: 'FAVICON_UPDATE',
          icon: data.icon,
        });
      });
    }),
  );
});
