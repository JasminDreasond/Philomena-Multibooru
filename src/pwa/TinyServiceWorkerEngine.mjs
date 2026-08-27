import { segmentExtractorV1 } from 'tiny-essentials/regexp/SegmentExtractor';
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
 * @typedef {Record<any, any>} MessagePayload
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
 * A function that handles the actual postMessage call to a specific Client.
 * @callback MessageReplyTo
 * @param {Client} client - The target client to receive the message.
 * @param {string} type - The type identifier for the reply message.
 * @param {MessagePayload} data - The payload to be sent in the reply.
 */

/**
 * A function that handles the actual postMessage call to the message source.
 * @callback MessageReply
 * @param {string} type - The type identifier for the reply message.
 * @param {MessagePayload} data - The payload to be sent in the reply.
 */

/**
 * An enriched message object containing the event, client information, and utility methods for responding.
 * @typedef {Object} MessageObj
 * @property {ExtendableMessageEvent} event - The original message event.
 * @property {string} clientId - The ID of the client that sent the message.
 * @property {MessagePayload} data - The payload sent within the message.
 * @property {MessageReplyTo} replyTo - A function to send a reply to the message source.
 * @property {MessageReplyTemplate} replyTemplate - A template function to format reply messages.
 * @property {MessageReply} reply - A convenience method to reply to the message source.
 */

/**
 * A callback function executed when a registered message type is received.
 * @callback MessageCallback
 * @param {MessageObj} msg - The enriched message data object.
 */

///////////////////////////////////////////////////////////////////

/**
 * A record of key-value pairs representing URL parameters extracted from a path.
 * @typedef {Record<string, string>} FetchObjParams
 */

/**
 * An enriched data object for fetch plugins.
 * @typedef {Object} FetchObj
 * @property {FetchEvent} event - The original fetch event.
 * @property {Request} request - The intercepted request.
 * @property {URL} url - The parsed URL of the request.
 * @property {FetchObjParams} params - Parameters extracted from the URL (e.g., /:id).
 * @property {boolean} isValidRoute - Whether the route passed the initial router validation.
 * @property {MessageReplyTo} replyTo - A function to send a reply to the message source.
 * @property {MessageReplyTemplate} replyTemplate - A template function to format reply messages.
 * @property {Error} [error] - An error object if the plugin execution failed.
 */

/**
 * Callback function executed when a fetchUrls or fetchRegExp route matches.
 * If it returns a boolean `false`, the interception is considered handled.
 * @callback FetchCallback
 * @param {FetchObj} fetchObj - The enriched request object.
 * @returns {Promise<boolean|void> | boolean | void} A promise or value indicating if the request was handled.
 */

///////////////////////////////////////////////////////////////////

/** @type {ServiceWorkerGlobalScope} */
// @ts-ignore
const sw = self;

/**
 * Manages the lifecycle and execution of modules based on the provided configuration.
 */
class TinyServiceWorkerEngine extends TinyDebugger {
  /**
   * A function used to format a reply message into a standard MessagingData object.
   *
   * @param {string} nType - The type identifier for the reply message.
   * @param {MessagePayload} payload - The payload to be sent in the reply.
   * @returns {MessagingData} The formatted message object.
   * @throws {TypeError} If nType is not a string.
   */
  static replyTemplate = (nType, payload) => {
    if (typeof nType !== 'string') {
      throw new TypeError(
        `[TinyServiceWorkerEngine] replyTemplate: nType must be a string. Received: ${typeof nType}`,
      );
    }
    if (
      typeof payload !== 'undefined' &&
      (Array.isArray(payload) || typeof payload !== 'object' || payload === null)
    ) {
      throw new TypeError('Fetch router configuration must be a non-null object.');
    }
    return { type: nType, data: payload };
  };

  /**
   * A function that handles the actual postMessage call to a specific Client.
   *
   * @param {Client} targetSource - The target client to receive the message.
   * @param {string} nType - The type identifier for the reply message.
   * @param {MessagePayload} payload - The payload to be sent in the reply.
   * @returns {void}
   * @throws {TypeError} If targetSource is invalid or nType is not a string.
   */
  static replyTo = (targetSource, nType, payload) => {
    if (!(targetSource instanceof Client)) {
      throw new TypeError(
        `[TinyServiceWorkerEngine] replyTo: targetSource must be a valid Client with a postMessage method.`,
      );
    }
    targetSource.postMessage(TinyServiceWorkerEngine.replyTemplate(nType, payload));
  };

  /**
   * The internal configuration state of the engine.
   * @type {ServiceWorkerSettings}
   */
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
      allowPingPong: false,
    },
  };

  /**
   * A map containing registered message type listeners.
   * @type {Map<string, MessageCallback>}
   */
  #messages = new Map();

  /**
   * A map containing registered fetch RegExp listeners.
   * @type {Map<string, FetchCallback>}
   */
  #fetchRegExp = new Map();

  /**
   * A map containing registered fetch URL listeners.
   * @type {Map<string, FetchCallback>}
   */
  #fetchUrls = new Map();

  /**
   * Flag indicating if the engine has been initialized.
   * @type {boolean}
   */
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
      id: '[_blue_TinySW-Engine_reset_]',
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
   * @returns {number} The number of registered fetch RegExp.
   */
  get fetchRegExpSize() {
    return this.#fetchRegExp.size;
  }

  /**
   * @param {string} type - The identifier for the fetch type.
   * @param {FetchCallback} callback - The callback function to execute.
   */
  addFetchRegExpListener(type, callback) {
    this.#fetchRegExp.set(type, callback);
  }

  /**
   * @param {string} type - The identifier for the fetch type.
   * @returns {boolean} True if an element in the Map object existed and has been removed, false otherwise.
   */
  removeFetchRegExpListener(type) {
    return this.#fetchRegExp.delete(type);
  }

  /**
   * @param {string} type - The identifier for the fetch type.
   * @returns {FetchCallback|undefined}
   */
  getFetchRegExpListener(type) {
    return this.#fetchRegExp.get(type);
  }

  /**
   * @param {string} type - The identifier for the fetch type.
   * @returns {boolean} True if an element with the specified key exists in the Map, false otherwise.
   */
  hasFetchRegExp(type) {
    return this.#fetchRegExp.has(type);
  }

  /**
   * Clears all registered fetch RegExp listeners.
   */
  clearFetchRegExps() {
    return this.#fetchRegExp.clear();
  }

  /**
   * @returns {number} The number of registered fetch URLs.
   */
  get fetchUrlSize() {
    return this.#fetchUrls.size;
  }

  /**
   * @param {string} type - The identifier for the fetch type.
   * @param {FetchCallback} callback - The callback function to execute.
   */
  addFetchUrlListener(type, callback) {
    this.#fetchUrls.set(type, callback);
  }

  /**
   * @param {string} type - The identifier for the fetch type.
   * @returns {boolean} True if an element in the Map object existed and has been removed, false otherwise.
   */
  removeFetchUrlListener(type) {
    return this.#fetchUrls.delete(type);
  }

  /**
   * @param {string} type - The identifier for the fetch type.
   * @returns {FetchCallback|undefined}
   */
  getFetchUrlListener(type) {
    return this.#fetchUrls.get(type);
  }

  /**
   * @param {string} type - The identifier for the fetch type.
   * @returns {boolean} True if an element with the specified key exists in the Map, false otherwise.
   */
  hasFetchUrl(type) {
    return this.#fetchUrls.has(type);
  }

  /**
   * Clears all registered fetch URL listeners.
   */
  clearFetchUrls() {
    return this.#fetchUrls.clear();
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
  addMessageListener(type, callback) {
    this.#messages.set(type, callback);
  }

  /**
   * @param {string} type - The identifier for the message type.
   * @returns {boolean} True if an element in the Map object existed and has been removed, false otherwise.
   */
  removeMessageListener(type) {
    return this.#messages.delete(type);
  }

  /**
   * @param {string} type - The identifier for the message type.
   * @returns {MessageCallback|undefined}
   */
  getMessageListener(type) {
    return this.#messages.get(type);
  }

  /**
   * @param {string} type - The identifier for the message type.
   * @returns {boolean} True if an element with the specified key exists in the Map, false otherwise.
   */
  hasMessage(type) {
    return this.#messages.has(type);
  }

  /**
   * Clears all registered message listeners.
   */
  clearMessages() {
    return this.#messages.clear();
  }

  /**
   * Performs checks against registered fetchUrls and fetchRegExp to determine if a request should be intercepted.
   *
   * @param {FetchEvent} event - The original fetch event.
   * @param {URL} url - The parsed URL of the request.
   * @param {boolean} isValidRoute - Whether the route passed the initial router validation.
   * @returns {Promise<boolean>} A promise that resolves to true if the request should proceed normally, or false if it was handled by a plugin.
   */
  async #fetchChecker(event, url, isValidRoute) {
    /** @type {Request} */
    const request = event.request;
    let matchedCallback = null;
    /** @type {FetchObjParams} */
    let routeParams = {};

    // 1. Check in fetchUrls (Exact match and Parameterized match)
    for (const [pattern, callback] of this.#fetchUrls.entries()) {
      // Dynamic parameter matching (e.g., /user/:id)
      if (pattern.includes('/:')) {
        // Converts the key pattern into the extraction Regex
        const seg = segmentExtractorV1(pattern);
        const { match, params } = seg.exec(url.pathname);
        routeParams = params;
        if (match) {
          matchedCallback = callback;
        }
        break; // Route type detected, breaking the loop
      }

      // Exact match
      if (url.pathname === pattern) {
        matchedCallback = callback;
        break;
      }
    }

    // 2. Check in fetchRegExp (If no match was found in fetchUrls)
    if (!matchedCallback) {
      for (const [regExpStr, callback] of this.#fetchRegExp.entries()) {
        const regex = new RegExp(regExpStr);
        if (regex.test(url.pathname)) {
          matchedCallback = callback;
          break; // Found via raw Regex, breaking the loop
        }
      }
    }

    // 3. Execute the plugin if a match is found
    if (matchedCallback) {
      /** @type {FetchObj} */
      const fetchObj = {
        event,
        request,
        url,
        params: routeParams,
        replyTemplate: TinyServiceWorkerEngine.replyTemplate,
        replyTo: TinyServiceWorkerEngine.replyTo,
        isValidRoute,
      };
      try {
        this.emit('beforeFetchPlugin', fetchObj);
        const pluginResponse = await matchedCallback(fetchObj);
        this.emit('afterFetchPlugin', fetchObj);

        // If the plugin resolves and returns a boolean, we treat it as handled.
        if (typeof pluginResponse === 'boolean') return pluginResponse;
      } catch (error) {
        fetchObj.error = error instanceof Error ? error : new Error('Unknown Error.');
        this.log('error', `Error executing fetch plugin for "${url.pathname}":`, error);
        this.emit('fetchPluginError', fetchObj);
      }
    }

    return true;
  }

  /**
   * Initializes the Service Worker event listeners.
   * @returns {void}
   * @throws {Error} If the engine has already been started.
   */
  init() {
    if (this.#started) throw new Error('TinyServiceWorkerEngine is already initialized.');

    sw.addEventListener('install', (event) => {
      // Força o novo Service Worker a tornar-se o ativo imediatamente,
      // mesmo que existam clientes usando a versão antiga.
      this.emit('beforeSkipWaiting', { event });
      event.waitUntil(
        sw
          .skipWaiting()
          .then(() => {
            this.emit('afterSkipWaiting', { event });
          })
          .catch((err) =>
            this.emit('installError', {
              event,
              error: err instanceof Error ? err : new Error('Unknown Error'),
            }),
          ),
      );
    });

    // Detect that the Service Worker has been activated.
    sw.addEventListener('activate', (event) => {
      this.emit('beforeActivated', { event });
      event.waitUntil(
        sw.clients
          .claim()
          .then(() => {
            this.log('info', 'Activated and claiming clients.');
            this.emit('afterActivated', { event });
          })
          .catch((err) =>
            this.emit('activateError', {
              event,
              error: err instanceof Error ? err : new Error('Unknown Error'),
            }),
          ),
      );
    });

    // Detect fetch events on the website.
    const fetchCfg = this.#config.fetch;
    if (fetchCfg.enabled) {
      sw.addEventListener('fetch', async (event) => {
        /** @type {Request} */
        const request = event.request;

        // We only intercept navigation requests (HTML)
        if (request.mode !== 'navigate') return;
        const url = new URL(request.url);
        this.emit('fetchRequested', { event, request, url });

        // Handles navigation requests based on the router configuration.
        const routerCfg = fetchCfg.router;
        if (routerCfg.enabled) {
          if (routerCfg.validator(url)) {
            const canContinue = await this.#fetchChecker(event, url, true);
            this.log('info', `Valid route: ${url.pathname}`);
            if (!canContinue) return;
            event.respondWith(
              fetch('/index.html').catch((err) => {
                this.emit('fetchError', { event, request, error: err, url });
                return routerCfg.notFoundHandler();
              }),
            );
          } else {
            const canContinue = await this.#fetchChecker(event, url, false);
            this.log('warn', `404 - Route not found: ${url.pathname}`);
            if (!canContinue) return;
            this.emit('fetchError', { event, request, error: new Error('404 Not Found'), url });
            event.respondWith(routerCfg.notFoundHandler());
          }
        } else await this.#fetchChecker(event, url, true);
      });
    }

    // Registers the message event listener for communication with application pages.
    const msgCfg = this.#config.messaging;
    if (msgCfg.enabled) {
      // Ping/Pong Logic
      if (msgCfg.allowPingPong) {
        this.#messages.set('ping', ({ event }) => {
          if (!(event.source instanceof Client)) {
            this.log('warn', 'Attempted to reply to a non-client source.');
            return;
          }
          TinyServiceWorkerEngine.replyTo(event.source, 'pong', { msg: 'mio! :3' });
        });
      }

      sw.addEventListener('message', (event) => {
        // Validation: Ensure the source is a valid Client
        if (!(event.source instanceof Client)) {
          this.log('error', 'Message received from an invalid source (not a Client).');
          return;
        }

        // Validation: Ensure event.data is a non-null object
        if (Array.isArray(event.data) || typeof event.data !== 'object' || event.data === null) {
          this.log('error', 'Received message with invalid data format (expected object).');
          return;
        }
        if (
          typeof event.data.data !== 'undefined' &&
          (Array.isArray(event.data.data) ||
            typeof event.data.data !== 'object' ||
            event.data.data === null)
        ) {
          this.log('error', 'Received message data with invalid data format (expected object).');
          return;
        }

        // Validation: Ensure 'type' exists and is a string
        if (typeof event.data.type !== 'string') {
          this.log('error', 'Received message with missing or invalid "type" string.');
          return;
        }

        if (event.data.type === 'PREPARE_UPDATE') {
          this.log('info', 'Update signal received. Starting installation...');

          // Força o navegador a buscar a versão mais recente do script do SW
          // e inicia o processo de instalação.
          event.waitUntil(
            sw.registration
              .update()
              .then(() => {
                this.log('info', 'Update successful, waiting for activation.');
              })
              .catch((err) => {
                this.log('error', 'Update failed:', err);
              }),
          );
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

        /** @type {MessageObj} */
        const msgData = {
          event,
          data,
          clientId,
          replyTemplate: TinyServiceWorkerEngine.replyTemplate,
          replyTo: TinyServiceWorkerEngine.replyTo,
          reply: (nType, payload) => {
            if (!(event.source instanceof Client)) {
              this.log('warn', 'Attempted to reply to a non-client source.');
              return;
            }
            TinyServiceWorkerEngine.replyTo(event.source, nType, payload);
          },
        };

        /** @type {Error|null} */
        let err = null;

        // Emit events
        this.emit('beforeMessage', { type, data: msgData });
        const afterData = () => ({ type, error: err, data: msgData });
        if (message) {
          event.waitUntil(
            message(msgData)
              .then(() => this.emit('afterMessage', afterData()))
              .catch((/** @type {Error} */ error) => {
                err = error instanceof Error ? error : new Error('Unknown Error');
                this.log('error', `Error executing handler for message type "${type}":`, error);
                this.emit('messageError', afterData());
              }),
          );
        } else this.emit('afterMessage', afterData());
      });
    }

    this.#started = true;
    this.log('info', 'Initialized with custom configuration.');
  }
}

export default TinyServiceWorkerEngine;
