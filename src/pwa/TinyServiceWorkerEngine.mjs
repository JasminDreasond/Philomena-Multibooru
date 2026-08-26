import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';

///////////////////////////////////////////////////////////////////

/**
 * @typedef {Object} PartialServiceWorkerSettings
 * @property {PartialFetchOptions} fetch - Partial configuration for fetch event interception.
 * @property {Partial<MessagingOptions>} messaging - Partial configuration for message event handling.
 */

/**
 * @typedef {Object} PartialFetchOptions
 * @property {boolean} [enabled] - Indicates if fetch interception is enabled.
 * @property {Partial<RouterOptions>} router - Partial configuration for the routing logic.
 */

///////////////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////////////

/**
 * @typedef {any} MessagePayload
 * The data payload contained within the message.
 */

/**
 * Represents the structured data format for messages sent via postMessage.
 * @typedef {Object} MessagingData
 * @property {string} type - The identifier for the message type.
 * @property {MessagePayload} data - The actual payload of the message.
 */

/**
 * A function used to format a reply message into a standard MessagingData object.
 * @callback MessageReplyTemplate
 * @param {string} type - The type identifier for the reply message.
 * @param {MessagePayload} data - The payload to be sent in the reply.
 * @returns {MessagingData} The formatted message object.
 */

/**
 * A function that handles the actual postMessage call to a specific Client using a reply template.
 * @callback MessageToReplyTemplate
 * @param {Client} client - The target client to receive the message.
 * @param {string} type - The type identifier for the reply message.
 * @param {MessagePayload} data - The payload to be sent in the reply.
 */

/**
 * An enriched message object containing the event, client information, and utility methods for responding.
 * @typedef {Object} MessageObj
 * @property {ExtendableMessageEvent} event - The original message event.
 * @property {string} clientId - The ID of the client that sent the message.
 * @property {MessagePayload} data - The payload sent within the message.
 * @property {MessageToReplyTemplate} toReply - A function to send a reply to the message source.
 * @property {MessageReplyTemplate} replyTemplate - A template function to format reply messages.
 * @property {(type: string, data: MessagePayload) => void} reply - A convenience method to reply to the message source.
 */

/**
 * A callback function executed when a registered message type is received.
 * @callback MessageCallback
 * @param {MessageObj} msg - The enriched message data object.
 */

///////////////////////////////////////////////////////////////////

/** @type {ServiceWorkerGlobalScope} */
// @ts-ignore
const sw = self;

/**
 * Manages the lifecycle and execution of modules based on the provided configuration.
 */
class TinyServiceWorkerEngine extends TinyDebugger {
  /** @type {ServiceWorkerSettings} */
  #config = {
    fetch: {
      enabled: true,
      router: {
        enabled: false,
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
   * @param {ServiceWorkerSettings | Partial<PartialServiceWorkerSettings>} config - The configuration object to validate.
   * @param {boolean} [strict=false] - If true, ensures all properties defined in the typedef are present.
   * @throws {TypeError} If any property is of the wrong type or is missing when in strict mode.
   */
  #validateConfig(config, strict = false) {
    if (typeof config !== 'object' || config === null) {
      throw new TypeError('Configuration must be a non-null object.');
    }

    /**
     * Helper to validate existence and type.
     * @template {Record<any, any>} T
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
   * @param {Partial<PartialServiceWorkerSettings>} config - The configuration object to apply.
   * @param {Object} [lgConfig] - Configuration options for the instance.
   * @param {boolean} [lgConfig.debugMode=false] - Whether to enable internal debug logging.
   * @param {boolean} [lgConfig.useLogColors=false] - Whether to enable log color support.
   * @param {Partial<Console>} [lgConfig.logger=console] - A custom logger object (must implement console methods).
   * @throws {TypeError} If the configuration does not meet the minimum requirements.
   */
  constructor(config = {}, lgConfig = {}) {
    super({
      id: '[_blue_TinyServiceWorkerEngine_reset_]',
      logger: lgConfig.logger ?? console,
      debugMode: lgConfig.debugMode ?? false,
      useLogColors: lgConfig.useLogColors ?? false,
    });

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
    this.#validateConfig(this.#config, true);
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
    if (this.#started) throw new Error('TinyServiceWorkerEngine is already initialized.');

    // Detect that the Service Worker has been activated.
    sw.addEventListener('activate', (event) => {
      event.waitUntil(sw.clients.claim());
      console.log('[SW-Engine] Activated and claiming clients.');
      this.emit('activated', { event });
    });

    // Detect fetch events on the website.
    const fetchCfg = this.#config.fetch;
    if (fetchCfg.enabled) {
      sw.addEventListener('fetch', async (event) => {
        /** @type {FetchEvent} */
        const ev = event;
        /** @type {Request} */
        const request = ev.request;

        // We only intercept navigation requests (HTML)
        if (request.mode !== 'navigate') return;
        this.emit('fetchRequested', { event, request });

        // Handles navigation requests based on the router configuration.
        const routerCfg = fetchCfg.router;
        if (routerCfg.enabled) {
          const url = new URL(event.request.url);

          if (routerCfg.validator(url)) {
            console.log(`[SW-Engine] Valid route: ${url.pathname}`);
            event.respondWith(
              fetch('/index.html').catch((err) => {
                this.emit('fetchError', { event, request, error: err, url });
                return routerCfg.notFoundHandler();
              }),
            );
          } else {
            console.warn(`[SW-Engine] 404 - Route not found: ${url.pathname}`);
            this.emit('fetchError', { event, request, error: new Error('404 Not Found'), url });
            event.respondWith(routerCfg.notFoundHandler());
          }
        }
      });
    }

    // Registers the message event listener for communication with application pages.
    const msgCfg = this.#config.messaging;
    if (msgCfg.enabled) {
      // Ping/Pong Logic
      if (msgCfg.allowPingPong) {
        this.#messages.set('ping', ({ event }) => {
          event.source.postMessage({ type: 'pong' });
        });
      }

      sw.addEventListener('message', async (event) => {
        // Validation: Ensure the source is a valid Client
        if (!(event.source instanceof Client)) {
          console.error('[SW-Engine] Message received from an invalid source (not a Client).');
          return;
        }

        // Validation: Ensure event.data is a non-null object
        if (typeof event.data !== 'object' || event.data === null) {
          console.error('[SW-Engine] Received message with invalid data format (expected object).');
          return;
        }

        // Validation: Ensure 'type' exists and is a string
        if (typeof event.data.type !== 'string') {
          console.error('[SW-Engine] Received message with missing or invalid "type" string.');
          return;
        }

        /** @type {Client} */
        const source = event.source;
        /** @type {string} */
        const clientId = source.id;
        /** @type {string} */
        const type = event.data.type;
        /** @type {MessagePayload} */
        const data = event.data.data;

        // Get the registered message callback
        const message = this.#messages.get(type);

        /** @type {MessageReplyTemplate} */
        const replyTemplate = (nType, payload) => {
          return { type: nType, data: payload };
        };

        /** @type {MessageToReplyTemplate} */
        const toReply = (targetSource, nType, payload) =>
          targetSource.postMessage(replyTemplate(nType, payload));

        /** @type {MessageObj} */
        const msgData = {
          event,
          data,
          clientId,
          replyTemplate,
          toReply,
          reply: (nType, payload) => {
            if (!(event.source instanceof Client)) {
              console.warn('[SW-Engine] Attempted to reply to a non-client source.');
              return;
            }
            toReply(event.source, nType, payload);
          },
        };

        // Emit events
        this.emit('beforeMessage', type, msgData);
        if (message) {
          try {
            await message(msgData);
          } catch (error) {
            console.error(`[SW-Engine] Error executing handler for message type "${type}":`, error);
            this.emit('messageError', { type, error, msgData });
          }
        }
        this.emit('afterMessage', type, msgData);
      });
    }

    this.#started = true;
    console.log('[SW-Engine] Initialized with custom configuration.');
  }
}

export default TinyServiceWorkerEngine;
