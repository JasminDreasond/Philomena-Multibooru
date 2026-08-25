import { tinySw } from './config.mjs';

/** @type {ServiceWorkerGlobalScope} */
// @ts-ignore
const sw = self;

// Favicon Update Logic
tinySw.addMessage('FAVICON_UPDATE', async ({ data, event, toReply }) => {
  console.log(`[ServiceWorker] Broadcasting favicon update: ${data.icon}`);

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        toReply(client, 'FAVICON_UPDATE', { icon: data.icon });
      });
    }),
  );
});
