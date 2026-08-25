import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';
import { createCheckDestroyed } from 'tiny-essentials/libs/utils/tools';

const checkDestroy = createCheckDestroyed('TinyServiceWorker');

/**
 * @typedef {Object} ServiceWorkerMessagePayload
 * @property {string} type - The identifier for the message type.
 * @property {Record<any, any>} [data] - The actual data content of the message.
 */

/**
 * @typedef {Object} BeforeInstallPromptEvent
 * @property {() => void} preventDefault - Prevents the default browser behavior.
 * @property {Promise<{ outcome: 'accepted' | 'dismissed' }>} userChoice - A promise that resolves with the user's choice.
 * @property {() => Promise<void>} prompt - The method to show the native installation prompt.
 * @property {boolean} canShare - Indicates if the event can be shared.
 */

/**
 * @template {string} IdWorker
 * @template {string | URL} SwUrl
 * Manages Service Worker registration, versioning, and messaging.
 */
class TinyServiceWorker extends TinyDebugger {
  /** @type {ServiceWorkerRegistration | null} */
  #registration = null;
  /** @type {IdWorker} */
  #id;
  /** @type {SwUrl} */
  #swUrl;
  /** @type {string} */
  #version;
  /** @type {((event: MessageEvent) => void) | null} */
  #messageHandler = null;
  /** @type {BeforeInstallPromptEvent | null} */
  #deferredPrompt = null;
  /** @type {'twa' | 'standalone' | 'browser'} */
  #displayMode = 'browser';

  /** @type {((evt: MediaQueryListEvent) => void) | null} */
  #displayModeChangeHandler = null;
  /** @type {((e: Event) => void) | null} */
  #beforeInstallPromptHandler = null;
  /** @type {(() => void) | null} */
  #appInstalledHandler = null;

  #isDestroyed = false;

  get isDestroyed() {
    return this.#isDestroyed;
  }

  #noSwControllerWarn() {
    super.emit('noSwControllerWarn');
    this.log('warn', 'No active controller to receive message.');
  }

  get isSwAvailable() {
    checkDestroy(this.#isDestroyed);
    return 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
  }

  /** @returns {IdWorker} */
  get id() {
    checkDestroy(this.#isDestroyed);
    return this.#id;
  }

  /** @returns {SwUrl} */
  get swUrl() {
    checkDestroy(this.#isDestroyed);
    return this.#swUrl;
  }

  /** @returns {string} */
  get version() {
    checkDestroy(this.#isDestroyed);
    return this.#version;
  }

  /** @returns {ServiceWorkerRegistration | null} */
  get registration() {
    checkDestroy(this.#isDestroyed);
    return this.#registration;
  }

  /** @type {string[]} */
  #reservedEvents = [
    'displayModeChanged',
    'beforeInstallPrompt',
    'appInstalled',
    'noSwControllerWarn',
  ];

  /** @type {Set<EventListener>} */
  #eventListeners = new Set();

  /**
   * Retorna uma lista de todos os callbacks de eventos registrados.
   * @returns {EventListener[]}
   */
  get eventListeners() {
    checkDestroy(this.#isDestroyed);
    return Array.from(this.#eventListeners);
  }

  /**
   * Determines the current PWA display mode.
   *
   * @returns {'twa' | 'standalone' | 'browser'}
   */
  get displayMode() {
    checkDestroy(this.#isDestroyed);
    return this.#displayMode;
  }

  /**
   * @param {Object} options - Configuration options for the instance.
   * @param {IdWorker} options.id - The unique identifier for this manager instance.
   * @param {SwUrl} options.swUrl - The path to the service worker file.
   * @param {string} options.version - The current application version.
   * @param {boolean} [options.debugMode=false] - Whether to enable internal debug logging.
   * @param {boolean} [options.useLogColors=false] - Whether to enable log color support.
   * @param {Partial<Console>} [options.logger=console] - A custom logger object (must implement console methods).
   * @throws {TypeError} If parameters are not the correct types or if id is empty.
   */
  constructor({ id, swUrl, version, logger, debugMode, useLogColors }) {
    super({
      id: '[_blue_TinyServiceWorker_reset_] :debug:',
      logger: logger ?? console,
      debugMode: debugMode ?? false,
      useLogColors: useLogColors ?? false,
    });
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TypeError('The "id" parameter must be a non-empty string.');
    }
    if (typeof swUrl !== 'string' && !(swUrl instanceof URL)) {
      throw new TypeError('The "swUrl" parameter must be a string or URL.');
    }
    if (typeof version !== 'string') {
      throw new TypeError('The "version" parameter must be a string.');
    }

    this.#id = id;
    this.#swUrl = swUrl;
    this.#version = version;
    this.#updateDisplayMode();
  }

  /**
   * Valida se um tipo de evento é um nome reservado para o ciclo de vida interno.
   * @param {string} type - O nome do evento para validar.
   * @throws {TypeError} Se o nome do evento estiver na lista de reservados.
   */
  #validateEventType(type) {
    if (this.#reservedEvents.includes(type)) {
      throw new TypeError(
        `The event type "${type}" is reserved for internal PWA lifecycle management and cannot be used for Service Worker messaging.`,
      );
    }
  }

  /**
   * Updates the internal displayMode state and emits an event.
   */
  #updateDisplayMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isTwa = document.referrer.startsWith('android-app://');

    if (isTwa) {
      this.#displayMode = 'twa';
      // @ts-ignore
    } else if (navigator.standalone || isStandalone) {
      this.#displayMode = 'standalone';
    } else {
      this.#displayMode = 'browser';
    }

    super.emit('displayModeChanged', this.#displayMode);
    this.log('info', `DISPLAY_MODE_CHANGED: ${this.#displayMode}`);
  }

  /**
   * Sets up listeners for PWA lifecycle events.
   */
  #setupPwaListeners() {
    // 1. Handle Display Mode Changes
    this.#displayModeChangeHandler = () => this.#updateDisplayMode();
    window
      .matchMedia('(display-mode: standalone)')
      .addEventListener('change', this.#displayModeChangeHandler);

    // 2. Handle Before Install Prompt
    this.#beforeInstallPromptHandler = (e) => {
      // @ts-ignore
      this.#deferredPrompt = e;
      super.emit('beforeInstallPrompt', e);
      this.log('info', 'beforeinstallprompt event fired.');
    };
    window.addEventListener('beforeinstallprompt', this.#beforeInstallPromptHandler);

    // 3. Handle App Installed
    this.#appInstalledHandler = () => {
      this.#deferredPrompt = null;
      super.emit('appInstalled');
      this.log('info', 'PWA was installed');
    };
    window.addEventListener('appinstalled', this.#appInstalledHandler);
  }

  /**
   * Triggers the native PWA installation prompt.
   * @returns {Promise<void>}
   * @throws {Error} If the prompt cannot be shown.
   */
  async promptInstallation() {
    checkDestroy(this.#isDestroyed);
    if (!this.#deferredPrompt) {
      throw new Error('Cannot show installation prompt: beforeinstallprompt event has not fired.');
    }
    this.#deferredPrompt.prompt();
    const { outcome } = await this.#deferredPrompt.userChoice;
    this.log('info', `User installation choice: ${outcome}`);
    this.#deferredPrompt = null;
  }

  /**
   * Registers the service worker and handles version updates.
   * @param {RegistrationOptions} [options]
   * @returns {Promise<void>}
   * @throws {Error} If registration fails.
   */
  async register(options) {
    checkDestroy(this.#isDestroyed);
    if (!('serviceWorker' in navigator)) {
      this.log('warn', 'Service Worker is not supported in this browser.');
      return;
    }

    try {
      const idVersion = `${this.#id}_sw_version`;
      const savedVersion = localStorage.getItem(idVersion);

      if (savedVersion !== this.#version) {
        this.log('warn', `Version mismatch: ${savedVersion} -> ${this.#version}. Cleaning up...`);

        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }

        localStorage.setItem(idVersion, this.#version);

        if (savedVersion !== null) {
          this.log('warn', 'Old workers removed. Reloading...');
          window.location.reload();
          return;
        }
      }

      this.#registration = await navigator.serviceWorker.register(this.#swUrl, options);

      // Existing message handler logic
      this.#messageHandler = (event) => {
        /** @type {ServiceWorkerMessagePayload} */
        const payload = event.data;
        if (!payload || typeof payload !== 'object') return;
        if (typeof payload.type !== 'string') return;
        if (
          typeof payload.data !== 'undefined' &&
          (typeof payload.data !== 'object' || payload.data === null)
        )
          return;
        if (this.#reservedEvents.includes(payload.type)) return;
        super.emit(payload.type, payload.data);
      };

      navigator.serviceWorker.addEventListener('message', this.#messageHandler);

      // Initialize PWA listeners
      this.#setupPwaListeners();

      this.log('info', 'Registered successfully.');
    } catch (error) {
      this.log('error', 'Registration error:', error);
      throw error;
    }
  }

  /**
   * Unregisters the Service Worker from the browser and destroys the manager instance.
   *
   * @returns {Promise<boolean>} A promise that resolves to `true` if the Service Worker
   * was successfully unregistered, or `false` otherwise.
   * @throws {Error} If an unexpected error occurs during the unregistration process.
   */
  async unregister() {
    checkDestroy(this.#isDestroyed);

    if (!this.#registration) {
      this.log('warn', 'No active ServiceWorkerRegistration found to unregister.');
      this.destroy();
      return false;
    }

    try {
      const success = await this.#registration.unregister();

      if (success) {
        this.log('info', 'Service Worker unregistered successfully.');
      } else {
        this.log(
          'warn',
          'The unregister() method returned false (the worker might already be inactive).',
        );
      }

      // Call destroy to clean up event listeners and references
      this.destroy();
      return success;
    } catch (error) {
      this.log('error', 'Error during Service Worker unregistration:', error);
      throw error;
    }
  }

  /**
   * Sends a message to the active Service Worker controller.
   * @param {string} type - The identifier for the message type.
   * @param {Record<any, any>} [data] - The actual data content of the message.
   * @throws {TypeError} If the payload does not match ServiceWorkerMessagePayload structure or uses a reserved type.
   */
  emit(type, data) {
    checkDestroy(this.#isDestroyed);
    if (typeof type !== 'string') {
      throw new TypeError('Payload.type must be a string.');
    }
    if (typeof data !== 'undefined' && (typeof data !== 'object' || data === null)) {
      throw new TypeError('Payload.data must be a non-null object.');
    }

    // Security check: prevent sending messages that collide with internal events
    this.#validateEventType(type);

    if ('serviceWorker' in navigator && !!navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type, data });
      return true;
    } else {
      this.#noSwControllerWarn();
      return false;
    }
  }

  /**
   * Sends a message to the active Service Worker controller.
   * @param {ServiceWorkerMessagePayload} payload - The message payload.
   * @throws {TypeError} If the payload does not match ServiceWorkerMessagePayload structure or uses a reserved type.
   */
  postMessage(payload) {
    checkDestroy(this.#isDestroyed);
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('Payload must be an object.');
    }
    if (typeof payload.type !== 'string') {
      throw new TypeError('Payload.type must be a string.');
    }
    if (
      typeof payload.data !== 'undefined' &&
      (typeof payload.data !== 'object' || payload.data === null)
    ) {
      throw new TypeError('Payload.data must be a non-null object.');
    }

    // Security check: prevent sending messages that collide with internal events
    this.#validateEventType(payload.type);

    if ('serviceWorker' in navigator && !!navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(payload);
    } else this.#noSwControllerWarn();
  }

  /**
   * Adds an event listener for messages from the Service Worker.
   * @param {EventListener} callback - The callback function.
   */
  addEventListener(callback) {
    checkDestroy(this.#isDestroyed);
    if (typeof callback !== 'function') {
      throw new TypeError('The callback must be a function.');
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', callback);
      this.#eventListeners.add(callback);
    } else this.#noSwControllerWarn();
  }

  /**
   * Removes an event listener for messages from the Service Worker.
   * @param {EventListener} callback - The callback function.
   */
  removeEventListener(callback) {
    checkDestroy(this.#isDestroyed);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', callback);
      return this.#eventListeners.delete(callback);
    } else this.#noSwControllerWarn();
    return false;
  }

  /**
   * Cleans up all event listeners and references to prevent memory leaks.
   * @returns {void}
   */
  destroy() {
    if (this.#isDestroyed) return;
    // 1. Remove native Service Worker listener
    if ('serviceWorker' in navigator) {
      if (this.#messageHandler) {
        navigator.serviceWorker.removeEventListener('message', this.#messageHandler);
        this.#messageHandler = null;
      }
      for (const callback of this.#eventListeners) {
        navigator.serviceWorker.removeEventListener('message', callback);
      }
      this.#eventListeners.clear();
    }

    // 2. Remove Window Listeners (Crucial for preventing memory leaks)
    if (this.#displayModeChangeHandler) {
      window
        .matchMedia('(display-mode: standalone)')
        .removeEventListener('change', this.#displayModeChangeHandler);
      this.#displayModeChangeHandler = null;
    }
    if (this.#beforeInstallPromptHandler) {
      window.removeEventListener('beforeinstallprompt', this.#beforeInstallPromptHandler);
      this.#beforeInstallPromptHandler = null;
    }
    if (this.#appInstalledHandler) {
      window.removeEventListener('appinstalled', this.#appInstalledHandler);
      this.#appInstalledHandler = null;
    }

    // 3. Remove EventEmitter listeners
    this.removeAllListeners();

    // 4. Clear references
    this.#registration = null;
    this.#deferredPrompt = null;

    this.#isDestroyed = true;
    this.log('info', `[${this.#id}] Destroyed successfully.`);
  }
}

// Single instance to manage Service Worker
const swManager = new TinyServiceWorker({
  id: 'web-manager',
  swUrl: '/sw.js',
  version: '1.1.0',
  debugMode: import.meta.env.DEV,
  useLogColors: true,
});

if (import.meta.env.DEV) window.swManager = swManager;

export default swManager;
