import { useEffect } from 'react';
import TinyDomReadyManager from 'tiny-essentials/libs/TinyDomReadyManager';

/** @type {string} */
const SW_VERSION = '1.0.0';

/**
 * @returns {Promise<void>}
 */
const initServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      /** @type {string | null} */
      const savedVersion = localStorage.getItem('app_sw_version');

      if (savedVersion !== SW_VERSION) {
        console.log(
          `[ServiceWorker] Version mismatch: ${savedVersion} -> ${SW_VERSION}. Cleaning up old workers...`,
        );

        /** @type {readonly ServiceWorkerRegistration[]} */
        const registrations = await navigator.serviceWorker.getRegistrations();

        for (const registration of registrations) {
          await registration.unregister();
        }

        localStorage.setItem('app_sw_version', SW_VERSION);

        if (savedVersion !== null) {
          console.log('[ServiceWorker] Old workers removed. Reloading for a fresh start.');
          window.location.reload();
          return;
        }
      }

      await navigator.serviceWorker.register('/sw.js');
      console.log('[ServiceWorker] Registered and up to date.');
    } catch (error) {
      console.error('[ServiceWorker] Registration failed:', error);
    }
  }
};

const readyPage = new TinyDomReadyManager();
readyPage.onReady(initServiceWorker, { once: true });
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
      if (!document.hidden && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'FAVICON_UPDATE', icon: 'default' });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Listen to focus and visibility changes to clear the notification icon
    window.addEventListener('focus', handleVisibilityAndFocus);
    document.addEventListener('visibilitychange', handleVisibilityAndFocus);

    // Run once on mount in case the app is already visible
    handleVisibilityAndFocus();

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      window.removeEventListener('focus', handleVisibilityAndFocus);
      document.removeEventListener('visibilitychange', handleVisibilityAndFocus);
    };
  }, []);
};

export default ServiceWorkerSync;
