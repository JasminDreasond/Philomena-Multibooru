import { EventEmitter } from 'events';

/**
 * @typedef {Object} ServiceWorkerMessagePayload
 * @property {string} type - The identifier for the message type.
 * @property {Recod<any, any>} [data] - The actual data content of the message.
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

  #noSwControllerWarn() {
    console.warn('[ServiceWorkerManager] No active controller to receive message.');
  }

  get isSwAvailable() {
    return 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
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

      // Store the handler in a private field so it can be removed later
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
        super.emit(payload.type, payload.data);
      };

      navigator.serviceWorker.addEventListener('message', this.#messageHandler);

      console.log('[ServiceWorkerManager] Registered successfully.');
    } catch (error) {
      console.error('[ServiceWorkerManager] Registration error:', error);
      throw error;
    }
  }

  /**
   * Sends a message to the active Service Worker controller.
   * @param {string} type - The identifier for the message type.
   * @param {Recod<any, any>} [data] - The actual data content of the message.
   */
  emit(type, data) {
    if (typeof type !== 'string') {
      throw new TypeError('Payload.type must be a string.');
    }
    if (typeof data !== 'undefined' && (typeof data !== 'object' || data === null)) {
      throw new TypeError('Payload.data must be a non-null object.');
    }

    if (this.isSwAvailable) {
      navigator.serviceWorker.controller.postMessage({ type, data });
    } else this.#noSwControllerWarn();
  }

  /**
   * Sends a message to the active Service Worker controller.
   * @param {ServiceWorkerMessagePayload} payload - The message payload.
   * @throws {TypeError} If the payload does not match ServiceWorkerMessagePayload structure.
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
    // 1. Remove the listener from the native Service Worker API
    if (this.#messageHandler && 'serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this.#messageHandler);
      this.#messageHandler = null;
    }

    // 2. Remove all listeners attached to this EventEmitter instance
    this.removeAllListeners();

    // 3. Clear the registration reference
    this.#registration = null;

    console.log(`[ServiceWorkerManager] [${this.#id}] Destroyed successfully.`);
  }
}

/** @type {string} */
const SW_VERSION = '1.1.0';

// Single instance to manage Service Worker
const swManager = new ServiceWorkerManager('web-manager', '/sw.js', SW_VERSION);
export default swManager;
