import { EventEmitter } from 'events';

/**
 * @typedef {Object} FetchOptions
 * @property {boolean} enabled - Indicates if fetch interception is enabled.
 * @property {RouterOptions} router - Configuration for the routing logic.
 */

/**
 * @typedef {Object} MessagingOptions
 * @property {boolean} enabled - Indicates if message communication is enabled.
 * @property {boolean} allowPingPong - If true, the engine will respond to 'ping' messages with 'pong'.
 */

/**
 * @typedef {Object} RouterOptions
 * @property {boolean} enabled - Indicates if the router is active.
 * @property {(url: URL) => boolean} validator - A function that receives a URL and returns true if the route is valid.
 * @property {() => Promise<Response> | Response} notFoundHandler - A function that returns a 404 response when no route matches.
 */

/**
 * @typedef {Object} ServiceWorkerSettings
 * @property {FetchOptions} fetch - Configuration for fetch event interception.
 * @property {MessagingOptions} messaging - Configuration for message event handling.
 */

/**
 * @typedef {Object} MessageData
 * @property {ExtendableMessageEvent} event - The original message event.
 * @property {string} clientId - The ID of the client that sent the message.
 * @property {any} data - The payload sent within the message.
 */

/**
 * @callback MessageCallback
 * @param {MessageData} msg - The message data object.
 */

/** @type {ServiceWorkerGlobalScope} */
const sw = self;

/**
 * Manages the lifecycle and execution of modules based on the provided configuration.
 */
class ServiceWorkerEngine extends EventEmitter {
  /** @type {ServiceWorkerSettings} */
  #config = {
    fetch: {
      enabled: true,
      router: {
        enabled: true,
        // Implementation of your routing logic
        validator: () => true,
        // Implementation of your 404 handler
        notFoundHandler: async () => {
          // Simulating Apache2 ErrorDocument 404 behavior by serving index.html with a 404 status
          try {
            const res = await fetch('/index.html');
            return new Response(res.body, {
              status: 404,
              statusText: 'Not Found',
              headers: res.headers,
            });
          } catch {
            return new Response('Not Found', { status: 404 });
          }
        },
      },
    },
    messaging: {
      enabled: true,
      allowPingPong: true,
    },
  };

  /**
   * @type {Map<string, MessageCallback>}
   */
  #messages = new Map();

  /**
   * @type {Map<string, MessageCallback>}
   */
  #fetchUrls = new Map();

  #started = false;

  /**
   * @returns {boolean} True if the engine has been initialized.
   */
  get started() {
    return this.#started;
  }

  /**
   * Performs rigorous deep validation of the configuration object.
   *
   * @param {ServiceWorkerSettings | Partial<ServiceWorkerSettings>} config - The configuration object to validate.
   * @param {boolean} [strict=false] - If true, ensures all properties defined in the typedef are present.
   * @throws {TypeError} If any property is of the wrong type or is missing when in strict mode.
   */
  #validateConfig(config, strict = false) {
    if (typeof config !== 'object' || config === null) {
      throw new TypeError('Configuration must be a non-null object.');
    }

    /**
     * Helper to validate existence and type.
     * @template {Record<any, any>}
     * @param {T} obj - The object containing the property.
     * @param {string} key - The property name.
     * @param {string} type - The expected typeof result.
     * @param {string} context - Context for the error message.
     */
    const validateField = (obj, key, type, context) => {
      const value = obj[key];
      if (strict && value === undefined) {
        throw new TypeError(`Missing required property: "${context}.${key}"`);
      }
      if (value !== undefined && typeof value !== type) {
        throw new TypeError(
          `Invalid type for "${context}.${key}": expected ${type}, got ${typeof value}`,
        );
      }
    };

    // Deep validation for 'fetch' configuration
    if (config.fetch !== undefined) {
      if (typeof config.fetch !== 'object' || config.fetch === null) {
        throw new TypeError('Fetch configuration must be a non-null object.');
      }
      validateField(config.fetch, 'enabled', 'boolean', 'fetch');

      if (config.fetch.router !== undefined) {
        if (typeof config.fetch.router !== 'object' || config.fetch.router === null) {
          throw new TypeError('Fetch router configuration must be a non-null object.');
        }
        validateField(config.fetch.router, 'enabled', 'boolean', 'fetch.router');
        validateField(config.fetch.router, 'validator', 'function', 'fetch.router');
        validateField(config.fetch.router, 'notFoundHandler', 'function', 'fetch.router');
      } else if (strict) {
        throw new TypeError('Missing required property: "fetch.router"');
      }
    } else if (strict) {
      throw new TypeError('Missing required property: "fetch"');
    }

    // Deep validation for 'messaging' configuration
    if (config.messaging !== undefined) {
      if (typeof config.messaging !== 'object' || config.messaging === null) {
        throw new TypeError('Messaging configuration must be a non-null object.');
      }
      validateField(config.messaging, 'enabled', 'boolean', 'messaging');
      validateField(config.messaging, 'allowPingPong', 'boolean', 'messaging');
    } else if (strict) {
      throw new TypeError('Missing required property: "messaging"');
    }
  }

  /**
   * @param {Partial<ServiceWorkerSettings>} config - The configuration object to apply.
   * @throws {TypeError} If the configuration does not meet the minimum requirements.
   */
  constructor(config = {}) {
    super();
    this.#validateConfig(config, false);
    this.#config = {
      fetch: config.fetch
        ? {
            ...this.#config.fetch,
            ...config.fetch,
            router: config.fetch.router
              ? { ...this.#config.fetch.router, ...config.fetch.router }
              : this.#config.fetch.router,
          }
        : this.#config.fetch,
      messaging: config.messaging
        ? { ...this.#config.messaging, ...config.messaging }
        : this.#config.messaging,
    };
    this.#validateConfig(config, true);
  }

  /**
   * @returns {number} The number of registered fetch URLs.
   */
  get fetchUrlSize() {
    return this.#fetchUrls.size;
  }

  /**
   * @param {string} type - The identifier for the fetch type.
   * @param {MessageCallback} callback - The callback function to execute.
   */
  addFetchUrl(type, callback) {
    this.#fetchUrls.set(type, callback);
  }

  /**
   * @param {string} type - The identifier for the fetch type.
   * @returns {boolean} True if an element in the Map object existed and has been removed, false otherwise.
   */
  deleteFetchUrl(type) {
    return this.#fetchUrls.delete(type);
  }

  /**
   * @param {string} type - The identifier for the fetch type.
   * @returns {boolean} True if an element with the specified key exists in the Map, false otherwise.
   */
  hasFetchUrl(type) {
    return this.#fetchUrls.has(type);
  }

  /**
   * @returns {number} The number of registered messages.
   */
  get messagesSize() {
    return this.#messages.size;
  }

  /**
   * @param {string} type - The identifier for the message type.
   * @param {MessageCallback} callback - The callback function to execute.
   */
  addMessage(type, callback) {
    this.#messages.set(type, callback);
  }

  /**
   * @param {string} type - The identifier for the message type.
   * @returns {boolean} True if an element in the Map object existed and has been removed, false otherwise.
   */
  deleteMessage(type) {
    return this.#messages.delete(type);
  }

  /**
   * @param {string} type - The identifier for the message type.
   * @returns {boolean} True if an element with the specified key exists in the Map, false otherwise.
   */
  hasMessage(type) {
    return this.#messages.has(type);
  }

  /**
   * Initializes the Service Worker event listeners.
   * @returns {void}
   * @throws {Error} If the engine has already been started.
   */
  init() {
    if (this.#started) throw new Error('ServiceWorkerEngine is already initialized.');

    // Detect that the Service Worker has been activated.
    sw.addEventListener('activate', (event) => {
      /** @type {ExtendableEvent} */
      const ev = event;
      ev.waitUntil(sw.clients.claim());
      console.log('[SW-Engine] Activated and claiming clients.');
    });

    // Detect fetch events on the website.
    const fetchCfg = this.#config.fetch;
    if (fetchCfg.enabled) {
      sw.addEventListener('fetch', (event) => {
        /** @type {FetchEvent} */
        const ev = event;
        /** @type {Request} */
        const request = ev.request;

        // We only intercept navigation requests (HTML)
        if (request.mode !== 'navigate') return;

        const routerCfg = fetchCfg.router;
        if (routerCfg.enabled) {
          if (!this.#handleNavigation(routerCfg, ev)) return;
        }
      });
    }

    this.#registerMessage();
    this.#started = true;
    console.log('[SW-Engine] Initialized with custom configuration.');
  }

  /**
   * Registers the message event listener for communication with application pages.
   */
  #registerMessage() {
    const msgCfg = this.#config.messaging;
    if (!msgCfg.enabled) return;

    // Ping/Pong Logic
    if (msgCfg.allowPingPong) {
      this.#messages.set('ping', ({ event }) => {
        event.source.postMessage({ type: 'pong' });
      });
    }

    sw.addEventListener('message', async (event) => {
      /** @type {ExtendableMessageEvent} */
      const ev = event;
      /** @type {any} */
      const data = event.data;
      /** @type {string} */
      const clientId = event.source.id;
      /** @type {string|null} */
      const type = data?.type ?? null;

      // Get the registered message callback
      const message = this.#messages.get(type ?? '');

      /** @type {MessageData} */
      const msgData = { event: ev, data, clientId };

      // Emit events
      this.emit('beforeMessage', type, msgData);
      if (message) await message(msgData);
      this.emit('afterMessage', type, msgData);
    });
  }

  /**
   * Handles navigation requests based on the router configuration.
   * @param {RouterOptions} routerCfg - The router configuration.
   * @param {FetchEvent} event - The fetch event.
   * @returns {Promise<boolean>} A promise that resolves to true if the route was valid and handled, false otherwise.
   */
  async #handleNavigation(routerCfg, event) {
    const url = new URL(event.request.url);

    if (routerCfg.validator(url)) {
      console.log(`[SW-Engine] Valid route: ${url.pathname}`);
      event.respondWith(fetch('/index.html').catch(() => routerCfg.notFoundHandler()));
      return true;
    }

    console.warn(`[SW-Engine] 404 - Route not found: ${url.pathname}`);
    event.respondWith(routerCfg.notFoundHandler());
    return false;
  }
}

export default ServiceWorkerEngine;
