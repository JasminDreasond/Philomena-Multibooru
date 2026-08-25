import { tinySw } from './config.mjs';

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

// Scanner Logic
tinySw.addMessage('REQUEST_START_SCANNER', async ({ event, clientId, data }) => {
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
    event.source.postMessage({ type: 'SCANNER_DUPLICATE_QUERY' });
  } else if (activeScanners.size >= 3 && !activeScanners.has(clientId)) {
    event.source.postMessage({ type: 'SCANNER_LIMIT_REACHED' });
  } else {
    activeScanners.set(clientId, queryKey);
    event.source.postMessage({ type: 'SCANNER_STARTED' });
  }
});

tinySw.addMessage('STOP_SCANNER', ({ event, clientId }) => {
  activeScanners.delete(clientId);
  event.source.postMessage({ type: 'SCANNER_STOPPED' });
});
