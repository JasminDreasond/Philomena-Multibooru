import { useEffect } from 'react';
import TinyDomReadyManager from 'tiny-essentials/libs/html/TinyDomReadyManager';
import swManager from './TinyServiceWorker.mjs';

const readyPage = new TinyDomReadyManager();
readyPage.onReady(
  async () => {
    try {
      await swManager.register();
    } catch (err) {
      console.error('Initialization failed', err);
    }
  },
  { once: true },
);
readyPage.init();

/**
 * Hook to synchronize and validate routes with the Service Worker
 * @returns {void}
 */
const ServiceWorkerSync = () => {
  // Global listener for Favicon Sync across tabs
  useEffect(() => {
    /**
     * Handle incoming broadcasts from the Service Worker.
     * @param {MessageEvent} event
     */
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'FAVICON_UPDATE') {
        // Change the URL depending on the requested state.
        // Note: You need a notification version of your icon here!
        /** @type {string} */
        const targetIcon = event.data.icon === 'alert' ? '/icon/512-alert.png' : '/icon/512.png';

        /** @type {HTMLLinkElement | null} */
        let link = document.querySelector("link[rel~='icon']");

        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = targetIcon;
      }
    };

    /**
     * Notify the Service Worker to reset the favicon when the user looks at the app.
     * @returns {void}
     */
    const handleVisibilityAndFocus = () => {
      if (!document.hidden) swManager.postMessage({ type: 'FAVICON_UPDATE', icon: 'default' });
    };

    swManager.addEventListener(handleServiceWorkerMessage);
    // Listen to focus and visibility changes to clear the notification icon
    window.addEventListener('focus', handleVisibilityAndFocus);
    document.addEventListener('visibilitychange', handleVisibilityAndFocus);

    // Run once on mount in case the app is already visible
    handleVisibilityAndFocus();

    return () => {
      swManager.removeEventListener(handleServiceWorkerMessage);
      window.removeEventListener('focus', handleVisibilityAndFocus);
      document.removeEventListener('visibilitychange', handleVisibilityAndFocus);
    };
  }, []);
};

export default ServiceWorkerSync;
