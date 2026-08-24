import { EventEmitter } from 'events';

/**
 * @typedef {Object} ServiceWorkerMessagePayload
 * @property {string} type - The identifier for the message type.
 * @property {Record<any, any>} [data] - The actual data content of the message.
 */

/**
 * @typedef {Object} BeforeInstallPromptEvent
 * @property {() => Promise<void>} preventDefault
 * @property {() => Promise<void>} userChoice
 * @property {boolean} canShare
 */

/**
 * Manages Service Worker registration, versioning, and messaging.
 */
class ServiceWorkerManager extends EventEmitter {
  /** @type {ServiceWorkerRegistration | null} */
  #registration = null;
  /** @type {string} */
  #id;
  /** @type {string} */
  #swUrl;
  /** @type {string} */
  #version;
  /** @type {((event: MessageEvent) => void) | null} */
  #messageHandler = null;
  /** @type {BeforeInstallPromptEvent | null} */
  #deferredPrompt = null;
  /** @type {string} */
  #displayMode = 'browser';

  /** @type {((evt: MediaQueryListEvent) => void) | null} */
  #displayModeChangeHandler = null;
  /** @type {((e: Event) => void) | null} */
  #beforeInstallPromptHandler = null;
  /** @type {(() => void) | null} */
  #appInstalledHandler = null;

  #noSwControllerWarn() {
    console.warn('[ServiceWorkerManager] No active controller to receive message.');
  }

  get isSwAvailable() {
    return 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
  }

  /** @returns {string} */
  get id() {
    return this.#id;
  }

  /** @returns {string} */
  get swUrl() {
    return this.#swUrl;
  }

  /** @returns {string} */
  get version() {
    return this.#version;
  }

  /** @returns {ServiceWorkerRegistration | null} */
  get registration() {
    return this.#registration;
  }

  /** @type {string[]} */
  #reservedEvents = ['displayModeChanged', 'beforeInstallPrompt', 'appInstalled'];

  /**
   * Determines the current PWA display mode.
   *
   * @returns {'twa' | 'standalone' | 'browser'}
   */
  get displayMode() {
    return this.#displayMode;
  }

  /**
   * @param {string} id - The unique identifier for this manager instance.
   * @param {string} swUrl - The path to the service worker file.
   * @param {string} version - The current application version.
   * @throws {TypeError} If parameters are not the correct types or if id is empty.
   */
  constructor(id, swUrl, version) {
    super();
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TypeError('The "id" parameter must be a non-empty string.');
    }
    if (typeof swUrl !== 'string') {
      throw new TypeError('The "swUrl" parameter must be a string.');
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
   * @private
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
   * @private
   */
  #updateDisplayMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isTwa = document.referrer.startsWith('android-app://');

    if (isTwa) {
      this.#displayMode = 'twa';
    } else if (navigator.standalone || isStandalone) {
      this.#displayMode = 'standalone';
    } else {
      this.#displayMode = 'browser';
    }

    super.emit('displayModeChanged', this.#displayMode);
    console.log(`[PWA] DISPLAY_MODE_CHANGED: ${this.#displayMode}`);
  }

  /**
   * Sets up listeners for PWA lifecycle events.
   * @private
   */
  #setupPwaListeners() {
    // 1. Handle Display Mode Changes
    this.#displayModeChangeHandler = () => this.#updateDisplayMode();
    window
      .matchMedia('(display-mode: standalone)')
      .addEventListener('change', this.#displayModeChangeHandler);

    // 2. Handle Before Install Prompt
    this.#beforeInstallPromptHandler = (e) => {
      this.#deferredPrompt = e;
      super.emit('beforeInstallPrompt', e);
      console.log('[PWA] beforeinstallprompt event fired.');
    };
    window.addEventListener('beforeinstallprompt', this.#beforeInstallPromptHandler);

    // 3. Handle App Installed
    this.#appInstalledHandler = () => {
      this.#deferredPrompt = null;
      super.emit('appInstalled');
      console.log('[PWA] PWA was installed');
    };
    window.addEventListener('appinstalled', this.#appInstalledHandler);
  }

  /**
   * Triggers the native PWA installation prompt.
   * @returns {Promise<void>}
   * @throws {Error} If the prompt cannot be shown.
   */
  async promptInstallation() {
    if (!this.#deferredPrompt) {
      throw new Error('Cannot show installation prompt: beforeinstallprompt event has not fired.');
    }
    this.#deferredPrompt.prompt();
    const { outcome } = await this.#deferredPrompt.userChoice;
    console.log(`[PWA] User installation choice: ${outcome}`);
    this.#deferredPrompt = null;
  }

  /**
   * Registers the service worker and handles version updates.
   * @returns {Promise<void>}
   * @throws {Error} If registration fails.
   */
  async register() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[ServiceWorkerManager] Service Worker is not supported in this browser.');
      return;
    }

    try {
      const idVersion = `${this.#id}_sw_version`;
      const savedVersion = localStorage.getItem(idVersion);

      if (savedVersion !== this.#version) {
        console.log(
          `[ServiceWorkerManager] Version mismatch: ${savedVersion} -> ${this.#version}. Cleaning up...`,
        );

        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }

        localStorage.setItem(idVersion, this.#version);

        if (savedVersion !== null) {
          console.log('[ServiceWorkerManager] Old workers removed. Reloading...');
          window.location.reload();
          return;
        }
      }

      this.#registration = await navigator.serviceWorker.register(this.#swUrl);

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

      console.log('[ServiceWorkerManager] Registered successfully.');
    } catch (error) {
      console.error('[ServiceWorkerManager] Registration error:', error);
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
    if (typeof type !== 'string') {
      throw new TypeError('Payload.type must be a string.');
    }
    if (typeof data !== 'undefined' && (typeof data !== 'object' || data === null)) {
      throw new TypeError('Payload.data must be a non-null object.');
    }

    // Security check: prevent sending messages that collide with internal events
    this.#validateEventType(type);

    if (this.isSwAvailable) {
      navigator.serviceWorker.controller.postMessage({ type, data });
    } else this.#noSwControllerWarn();
  }

  /**
   * Sends a message to the active Service Worker controller.
   * @param {ServiceWorkerMessagePayload} payload - The message payload.
   * @throws {TypeError} If the payload does not match ServiceWorkerMessagePayload structure or uses a reserved type.
   */
  postMessage(payload) {
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

    if (this.isSwAvailable) {
      navigator.serviceWorker.controller.postMessage(payload);
    } else this.#noSwControllerWarn();
  }

  /**
   * Adds an event listener for messages from the Service Worker.
   * @param {EventListenerOrEventListenerObject} callback - The callback function.
   */
  addEventListener(callback) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', callback);
    } else this.#noSwControllerWarn();
  }

  /**
   * Removes an event listener for messages from the Service Worker.
   * @param {EventListenerOrEventListenerObject} callback - The callback function.
   */
  removeEventListener(callback) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', callback);
    } else this.#noSwControllerWarn();
  }

  /**
   * Cleans up all event listeners and references to prevent memory leaks.
   * @returns {void}
   */
  destroy() {
    // 1. Remove native Service Worker listener
    if (this.#messageHandler && 'serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this.#messageHandler);
      this.#messageHandler = null;
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

    console.log(`[ServiceWorkerManager] [${this.#id}] Destroyed successfully.`);
  }
}

// Single instance to manage Service Worker
const swManager = new ServiceWorkerManager('web-manager', '/sw.js', '1.1.0');
export default swManager;
