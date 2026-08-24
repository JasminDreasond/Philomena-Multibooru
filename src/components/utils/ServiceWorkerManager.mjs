/**
 * Manages Service Worker registration, versioning, and messaging.
 */
class ServiceWorkerManager {
  /** @type {ServiceWorkerRegistration | null} */
  #registration = null;
  /** @type {string} */
  #id;
  /** @type {string} */
  #swUrl;
  /** @type {string} */
  #version;

  #noSwControllerWarn() {
    console.warn('[ServiceWorkerManager] No active controller to receive message.');
  }

  get isSwAvailable() {
    return 'serviceWorker' in navigator && navigator.serviceWorker.controller ? true : false;
  }

  /**
   * @param {string} id - The id to the service worker file.
   * @param {string} swUrl - The path to the service worker file.
   * @param {string} version - The current application version.
   * @throws {TypeError} If swUrl or version are not strings.
   */
  constructor(id, swUrl, version) {
    if (typeof id !== 'string' || id.trim() !== '') {
      throw new TypeError('The "id" parameter must be a non-empty string.');
    }
    if (typeof swUrl !== 'string') {
      throw new TypeError('The "swUrl" parameter must be a string.');
    }
    if (typeof version !== 'string') {
      throw new TypeError('The "version" parameter must be a string.');
    }

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
      console.warn('');
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
      console.log('[ServiceWorkerManager] Registered successfully.');
    } catch (error) {
      console.error('[ServiceWorkerManager] Registration error:', error);
      throw error;
    }
  }

  /**
   * Sends a message to the active Service Worker controller.
   * @param {Record<any, any>} payload - The message payload.
   * @throws {TypeError} If the payload does not match ServiceWorkerMessage structure.
   */
  postMessage(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('Payload must be an object.');
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
}

/** @type {string} */
const SW_VERSION = '1.1.0';

// Single instance to manage Service Worker
const swManager = new ServiceWorkerManager('web-manager', '/sw.js', SW_VERSION);
export default swManager;
