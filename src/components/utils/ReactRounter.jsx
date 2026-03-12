import { useEffect } from 'react';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(() => {
      console.log('ServiceWorker registered');
    });
  });
}

/**
 * Hook to synchronize and validate routes with the Service Worker
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
        const targetIcon = event.data.icon === 'alert' ? '/icon/512-alert.png' : '/icon/512.png';

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

  useEffect(() => {
    /**
     * @param {MessageEvent} event
     */
    const handleMessage = (event) => {
      /** @type {any} */
      const data = event.data;

      if (data?.type === 'ROUTE_INVALID') {
        console.warn(`[React] Unauthorized or invalid route detected by SW: ${data.path}`);

        // Strategy: Force a reload to let the Service Worker's 'fetch' event
        // take over and serve the actual 404 Response with the correct status code.
        window.location.reload();
      }
    };

    if ('serviceWorker' in navigator) {
      // Listen for messages from the SW
      navigator.serviceWorker.addEventListener('message', handleMessage);

      // Send current route for validation whenever it changes
      if (navigator.serviceWorker.controller) {
        /** @type {string} */
        const currentPath = window.location.pathname;
        /** @type {string} */
        const currentHost = window.location.hostname;

        navigator.serviceWorker.controller.postMessage({
          type: 'VALIDATE_ROUTE',
          path: currentPath,
          hostname: currentHost,
        });
      }
    }

    // Cleanup listener on unmount
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [window.location.pathname]);
};

export default ServiceWorkerSync;
