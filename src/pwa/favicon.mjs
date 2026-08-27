import { tinySw } from './config.mjs';

/** @type {ServiceWorkerGlobalScope} */
// @ts-ignore
const sw = self;

// Favicon Update Logic
tinySw.addMessageListener('FAVICON_UPDATE', async ({ data, event, replyTo }) => {
  if (typeof data !== 'object' || data === null) {
    console.error(
      '[ServiceWorker] FAVICON_UPDATE error: Payload "data" is missing or not an object.',
    );
    return;
  }

  if (typeof data.icon !== 'string') {
    console.error(
      '[ServiceWorker] FAVICON_UPDATE error: Property "data.icon" is missing or not a string.',
    );
    return;
  }

  console.log(`[ServiceWorker] Broadcasting favicon update: ${data.icon}`);

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        replyTo(client, 'FAVICON_UPDATE', { icon: data.icon });
      });
    }),
  );
});
