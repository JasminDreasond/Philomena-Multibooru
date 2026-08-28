import { segmentExtractorV1 } from 'tiny-essentials/regexp/SegmentExtractor';
import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';

///////////////////////////////////////////////////////////////////

/**
 * @typedef {Object} PartialServiceWorkerSettings
 * @property {boolean} [spaMode]
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
 */

/**
 * @typedef {Object} RouterOptions
 * @property {boolean} enabled - Indicates if the router is active.
 * @property {(url: URL) => boolean} validator - A function that receives a URL and returns true if the route is valid.
 * @property {Map<number, RouterCodeConfig>} codes
 */

/**
 * @typedef {Object} ServiceWorkerSettings
 * @property {boolean} spaMode
 * @property {FetchOptions} fetch - Configuration for fetch event interception.
 * @property {MessagingOptions} messaging - Configuration for message event handling.
 */

///////////////////////////////////////////////////////////////////

/**
 * @typedef {(path: string) => string} PathGetter
 */

/**
 * @typedef {Object} DefaultCodeData
 * @property {PathGetter} pathGetter
 * @property {RouterCodeConfig} data
 */

/**
 * @typedef {Object} FnOptions
 * @property {FetchEvent} event
 * @property {Request} request
 * @property {URL} url
 * @property {HttpResponseType} resType
 * @property {number} code
 */

/**
 * @typedef {Object} RouterCodeConfig
 * @property {(ops: FnOptions) => Promise<Response> | Response} fn
 * @property {string} msg
 * @property {string} logMsg
 */

/**
 * @typedef {Object} FetchCheckerValues
 * @property {number} code
 */

/**
 * @typedef {FetchCheckerValues & { [id:string]:any}} FetchCheckerResult
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
 * @property {MessagePayload} [data] - The actual payload of the message.
 */

/**
 * A function used to format a reply message into a standard MessagingData object.
 * @callback MessageReplyTemplate
 * @param {string} type - The type identifier for the reply message.
 * @param {MessagePayload} [data] - The payload to be sent in the reply.
 * @returns {MessagingData} The formatted message object.
 */

/**
 * A function that handles the actual postMessage call to a specific Client.
 * @callback MessageReplyTo
 * @param {Client} client - The target client to receive the message.
 * @param {string} type - The type identifier for the reply message.
 * @param {MessagePayload} [data] - The payload to be sent in the reply.
 */

/**
 * @typedef {Object} MessageReplyToAllOptions
 * @property {string} type - The type identifier for the reply message.
 * @property {MessagePayload} [data] - The payload to be sent in the reply.
 * @property {ClientQueryOptions} [options]
 */

/**
 * @typedef {Promise<void | readonly (Client | WindowClient)[]>} MessageReplyToAllResponse
 */

/**
 * A function that handles the actual postMessage call to a specific Client.
 * @callback MessageReplyToAll
 * @param {MessageReplyToAllOptions} options
 * @returns {MessageReplyToAllResponse}
 */

/**
 * A function that handles the actual postMessage call to the message source.
 * @callback MessageReply
 * @param {string} type - The type identifier for the reply message.
 * @param {MessagePayload} [data] - The payload to be sent in the reply.
 */

/**
 * An enriched message object containing the event, client information, and utility methods for responding.
 * @typedef {Object} MessageObj
 * @property {ExtendableMessageEvent} event - The original message event.
 * @property {string} clientId - The ID of the client that sent the message.
 * @property {MessagePayload} [data] - The payload sent within the message.
 * @property {MessageReplyTo} replyTo - A function to send a reply to the message source.
 * @property {MessageReplyToAll} replyToAll - A function to send a reply to all clients.
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
 * @property {MessageReplyTo} replyTo - A function to send a reply to the message source.
 * @property {MessageReplyToAll} replyToAll - A function to send a reply to all clients.
 * @property {MessageReplyTemplate} replyTemplate - A template function to format reply messages.
 * @property {Error} [error] - An error object if the plugin execution failed.
 */

/**
 * Callback function executed when a fetchUrls or fetchRegExp route matches.
 * If it returns a boolean `false`, the interception is considered handled.
 * @callback FetchCallback
 * @param {FetchObj} fetchObj - The enriched request object.
 * @param {FetchCheckerResult} result
 * @returns {Promise<void>|void} A promise or value indicating if the request was handled.
 */

///////////////////////////////////////////////////////////////////

/** @type {ServiceWorkerGlobalScope} */
// @ts-ignore
const sw = self;

/**
 * @param {any} err
 * @param {ExtendableEvent} event
 */
const errorMaker = (err, event) => ({
  event,
  error: err instanceof Error ? err : new Error('Unknown Error'),
});

/**
 * @typedef {'info'|'success'|'redirect'|'client-error'|'server-error'|'unknown'} HttpResponseType
 */

/**
 * @param {number} code
 * @returns {HttpResponseType}
 */
const getResType = (code) => {
  // Informational responses
  if (code >= 100 && code <= 199) return 'info';
  // Successful responses
  if (code >= 200 && code <= 299) return 'success';
  // Redirection messages
  if (code >= 300 && code <= 399) return 'redirect';
  // Client error responses
  if (code >= 400 && code <= 499) return 'client-error';
  // Server error responses
  if (code >= 500 && code <= 599) return 'server-error';
  // Unknown error
  return 'unknown';
};

/**
 * Manages the lifecycle and execution of modules based on the provided configuration.
 */
class TinyServiceWorkerEngine extends TinyDebugger {
  /**
   * Valida se um tipo de evento é um nome reservado para o ciclo de vida interno.
   * @param {string} type - O nome do evento para validar.
   * @throws {TypeError} Se o nome do evento estiver na lista de reservados.
   */
  static #validateEventType(type) {
    if (type.startsWith('sw:')) {
      throw new TypeError(
        `The event type "${type}" is reserved for internal PWA lifecycle management and cannot be used for Service Worker messaging.`,
      );
    }
  }

  /**
   * A function used to format a reply message into a standard MessagingData object.
   *
   * @param {string} type - The type identifier for the reply message.
   * @param {MessagePayload} [payload] - The payload to be sent in the reply.
   * @returns {MessagingData} The formatted message object.
   * @throws {TypeError} If type is not a string.
   */
  static #replyTemplate(type, payload, strict = false) {
    if (typeof type !== 'string') {
      throw new TypeError(
        `[TinyServiceWorkerEngine] replyTemplate: type must be a string. Received: ${typeof type}`,
      );
    }
    if (
      typeof payload !== 'undefined' &&
      (Array.isArray(payload) || typeof payload !== 'object' || payload === null)
    ) {
      throw new TypeError('Fetch router configuration must be a non-null object.');
    }
    if (strict) TinyServiceWorkerEngine.#validateEventType(type);
    return { type, data: payload };
  }

  /**
   * A function used to format a reply message into a standard MessagingData object.
   *
   * @param {string} type - The type identifier for the reply message.
   * @param {MessagePayload} [payload] - The payload to be sent in the reply.
   * @returns {MessagingData} The formatted message object.
   * @throws {TypeError} If type is not a string.
   */
  static replyTemplate(type, payload) {
    return TinyServiceWorkerEngine.#replyTemplate(type, payload, true);
  }

  /**
   * A function that handles the actual postMessage call to a specific Client.
   *
   * @param {Client} targetSource - The target client to receive the message.
   * @param {string} type - The type identifier for the reply message.
   * @param {MessagePayload} [payload] - The payload to be sent in the reply.
   * @returns {void}
   * @throws {TypeError} If targetSource is invalid or type is not a string.
   */
  static #replyTo(targetSource, type, payload, strict = false) {
    if (!(targetSource instanceof Client)) {
      throw new TypeError(
        `[TinyServiceWorkerEngine] replyTo: targetSource must be a valid Client with a postMessage method.`,
      );
    }
    targetSource.postMessage(TinyServiceWorkerEngine.#replyTemplate(type, payload, strict));
  }

  /**
   * A function that handles the actual postMessage call to a specific Client.
   *
   * @param {Client} targetSource - The target client to receive the message.
   * @param {string} type - The type identifier for the reply message.
   * @param {MessagePayload} [payload] - The payload to be sent in the reply.
   * @returns {void}
   * @throws {TypeError} If targetSource is invalid or type is not a string.
   */
  static replyTo(targetSource, type, payload) {
    return TinyServiceWorkerEngine.#replyTo(targetSource, type, payload, true);
  }

  /**
   * A function that handles the actual postMessage call to all Clients.
   *
   * @param {MessageReplyToAllOptions} ops
   * @returns {MessageReplyToAllResponse}
   */
  static async #replyToAll(ops, strict = false) {
    const { type, data, options = { type: 'window', includeUncontrolled: true } } = ops;
    return sw.clients.matchAll(options).then((clientList) =>
      clientList.forEach((client) => {
        TinyServiceWorkerEngine.#replyTo(client, type, data, strict);
      }),
    );
  }

  /**
   * A function that handles the actual postMessage call to all Clients.
   *
   * @param {MessageReplyToAllOptions} ops
   * @returns {MessageReplyToAllResponse}
   */
  static async replyToAll(ops) {
    return TinyServiceWorkerEngine.#replyToAll(ops, true);
  }

  /**
   * @param {number} c
   * @returns {RouterCodeConfig}
   */
  getCodeCfg(c) {
    if (typeof c !== 'number') throw new TypeError('');
    /** @type {RouterCodeConfig} */
    let routerCodeCfg;

    routerCodeCfg = this.#config.fetch.router.codes.get(c);
    if (!routerCodeCfg) {
      for (const code in this.#defaultCode) {
        routerCodeCfg = this.#defaultCode[code].data;
        if (routerCodeCfg) break;
      }
    }

    if (!routerCodeCfg) {
      routerCodeCfg = this.createFetchRes({
        isError: true,
        msg: this.#globalMsgCode.unknown.msg,
        logMsg: this.#globalMsgCode.unknown.logMsg,
        pathGetter: () => this.globalPathGetter(this.#globalMsgCode.unknown.path),
      });
    }

    return { ...routerCodeCfg };
  }

  set spaMode(value) {
    if (typeof value !== 'boolean') {
      throw new TypeError(`Invalid type for "spaMode": expected boolean, got ${typeof value}`);
    }
    this.#config.spaMode = value;
  }

  get spaMode() {
    return this.#config.spaMode;
  }

  /** @type {PathGetter} */
  globalPathGetter(path) {
    return !this.#config.spaMode ? path : this.#globalMsgCode.spaPath;
  }

  #globalMsgCode = {
    spaPath: '/index.html',
    unknown: {
      path: '/500.html',
      msg: 'Unknown',
      logMsg: 'Unknown route error',
    },
    200: {
      path: null,
      msg: 'Success',
      logMsg: 'Valid route',
    },
    404: {
      path: '/404.html',
      msg: 'Not Found',
      logMsg: 'Route not found',
    },
    500: {
      path: '/500.html',
      msg: 'Internal Server Error',
      logMsg: 'Route server error',
    },
  };

  /** @type {{ 200: DefaultCodeData, 404: DefaultCodeData, 500: DefaultCodeData }} */
  #defaultCode = {
    200: {
      pathGetter: (path) => this.globalPathGetter(path),
      data: {
        fn: (ops) =>
          this.fetchFn(
            this.#globalMsgCode[200].msg,
            this.#globalMsgCode[200].logMsg,
            this.#defaultCode[200].pathGetter,
            ops,
          ),
        msg: this.#globalMsgCode[200].msg,
        logMsg: this.#globalMsgCode[200].logMsg,
      },
    },
    404: {
      pathGetter: () => this.globalPathGetter(this.#globalMsgCode[404].path),
      data: {
        fn: (ops) =>
          this.fetchErrorFn(
            this.#globalMsgCode[404].msg,
            this.#globalMsgCode[404].logMsg,
            this.#defaultCode[404].pathGetter,
            ops,
          ),
        msg: this.#globalMsgCode[404].msg,
        logMsg: this.#globalMsgCode[404].logMsg,
      },
    },
    500: {
      pathGetter: () => this.globalPathGetter(this.#globalMsgCode[500].path),
      data: {
        fn: (ops) =>
          this.fetchErrorFn(
            this.#globalMsgCode[500].msg,
            this.#globalMsgCode[500].logMsg,
            this.#defaultCode[500].pathGetter,
            ops,
          ),
        msg: this.#globalMsgCode[500].msg,
        logMsg: this.#globalMsgCode[500].logMsg,
      },
    },
  };

  /**
   * @param {string} msg
   * @param {string} logMsg
   * @param {string|PathGetter} pathGetter
   * @param {FnOptions} options
   * @returns {Promise<Response>}
   */
  async fetchFn(msg, logMsg, pathGetter, options) {
    const { url, code, request } = options;
    const path = typeof pathGetter === 'string' ? pathGetter : pathGetter(url.toString());
    this.log('info', `${code} - ${logMsg}: ${url.pathname}`);
    try {
      const res = await fetch(path === url.toString() ? request : path);
      return res;
    } catch (err) {
      return this.getCodeCfg(500).fn(options);
    }
  }

  /**
   * @param {string} msg
   * @param {string} logMsg
   * @param {string|PathGetter} pathGetter
   * @param {FnOptions} options
   * @returns {Promise<Response>}
   */
  async fetchErrorFn(msg, logMsg, pathGetter, options) {
    const { url, code, event, request, resType } = options;
    const path = typeof pathGetter === 'string' ? pathGetter : pathGetter(url.toString());
    this.log('warn', `${code} - ${logMsg}: ${url.pathname}`);
    this.emit('fetchError', {
      event,
      request,
      error: new Error(`${code} ${msg}`),
      url,
      resType,
    });

    // Simulating Apache2 ErrorDocument behavior by serving path.html with a status
    try {
      const res = await fetch(path);
      return new Response(res.body, {
        status: code,
        statusText: msg,
        headers: res.headers,
      });
    } catch {
      return new Response(this.#globalMsgCode[500].msg, { status: 500 });
    }
  }

  /**
   * @param {Object} ops
   * @param {boolean} ops.isError
   * @param {string} ops.msg
   * @param {string} ops.logMsg
   * @param {string|PathGetter} ops.pathGetter
   * @returns {RouterCodeConfig}
   */
  createFetchRes({ isError, msg, logMsg, pathGetter }) {
    return {
      fn: (ops) =>
        isError
          ? this.fetchErrorFn(msg, logMsg, pathGetter, ops)
          : this.fetchFn(msg, logMsg, pathGetter, ops),
      msg,
      logMsg,
    };
  }

  /**
   * The internal configuration state of the engine.
   * @type {ServiceWorkerSettings}
   */
  #config = {
    spaMode: false,
    fetch: {
      enabled: true,
      router: {
        enabled: false,
        // Implementation of your routing logic
        validator: () => true,
        // Implementation of your codes handler
        codes: new Map(),
      },
    },
    messaging: {
      enabled: true,
    },
  };

  /** @param {ServiceWorkerSettings} config */
  set config(config) {
    this.#updateConfig(config, true);
  }

  /** @returns {ServiceWorkerSettings} */
  get config() {
    return structuredClone(this.#config);
  }

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

    validateField(config, 'spaMode', 'boolean', 'root');

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
    } else if (strict) {
      throw new TypeError('Missing required property: "messaging"');
    }
  }

  /**
   * @param {Partial<PartialServiceWorkerSettings>} config
   * @param {boolean} [forceFullValidation=false]
   */
  #updateConfig(config, forceFullValidation = false) {
    this.#validateConfig(config, forceFullValidation);
    this.#config = {
      spaMode: config.spaMode ?? this.#config.spaMode,
      fetch: config.fetch
        ? {
            ...this.#config.fetch,
            ...config.fetch,
            router: config.fetch.router
              ? {
                  ...this.#config.fetch.router,
                  ...config.fetch.router,
                }
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
    this.#updateConfig(config);
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
   * @returns {Promise<FetchCheckerResult>} A promise that resolves to true if the request should proceed normally, or false if it was handled by a plugin.
   */
  async #fetchChecker(event, url) {
    /** @type {Request} */
    const request = event.request;
    /** @type {FetchCallback|null} */
    let matchedCallback = null;
    /** @type {FetchObjParams} */
    let routeParams = {};

    /** @type {FetchCheckerResult} */
    const result = { code: 200 };

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
        replyToAll: TinyServiceWorkerEngine.replyToAll,
      };
      try {
        this.emit('beforeFetchPlugin', fetchObj);
        await matchedCallback(fetchObj, result);
        this.emit('afterFetchPlugin', fetchObj);
      } catch (error) {
        result.code = 500;
        fetchObj.error = error instanceof Error ? error : new Error('Unknown Error.');
        this.log('error', `Error executing fetch plugin for "${url.pathname}":`, error);
        this.emit('fetchPluginError', fetchObj);
      }
    }

    return result;
  }

  /**
   * Initializes the Service Worker event listeners.
   * @returns {void}
   * @throws {Error} If the engine has already been started.
   */
  init() {
    if (this.#started) throw new Error('TinyServiceWorkerEngine is already initialized.');

    // Force the new Service Worker to become active immediately after installation
    sw.addEventListener('install', (event) => {
      this.emit('beforeSkipWaiting', { event });
      event.waitUntil(
        sw
          .skipWaiting()
          .then(() => {
            this.emit('afterSkipWaiting', { event });
          })
          .catch((err) => this.emit('installError', errorMaker(err, event))),
      );
    });

    // Ensure the new Service Worker takes control of all open clients immediately
    sw.addEventListener('activate', (event) => {
      this.emit('beforeActivated', { event });
      event.waitUntil(
        sw.clients
          .claim()
          .then(() => {
            this.emit('afterActivated', { event });
            this.log('info', 'Activated and claiming clients.');
          })
          .catch((err) => this.emit('activateError', errorMaker(err, event))),
      );
    });

    // Detect fetch events on the website.
    const fetchCfg = this.#config.fetch;
    if (fetchCfg.enabled) {
      sw.addEventListener('fetch', (event) => {
        /** @type {Request} */
        const request = event.request;

        // We only intercept navigation requests (HTML)
        if (request.mode !== 'navigate') return;
        const url = new URL(request.url);
        this.emit('fetchRequested', { event, request, url });

        // Handles navigation requests based on the router configuration.
        const routerCfg = fetchCfg.router;
        event.respondWith(
          (async () => {
            const fetchResult = await this.#fetchChecker(event, url);
            const code = fetchResult.code;

            const resType = getResType(code);
            const codeCfg = this.getCodeCfg(code);
            if (routerCfg.enabled) return codeCfg.fn({ code, resType, url, request, event });
            return fetch(request);
          })(),
        );
      });
    }

    // Registers the message event listener for communication with application pages.
    const msgCfg = this.#config.messaging;
    if (msgCfg.enabled) {
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

        if (event.data.type === 'sw:PrepareUpdate') {
          this.log('info', 'Update signal received. Starting installation...');

          // Force the browser to fetch the latest version of the SW script
          this.emit('beforeUpdated', { event });
          event.waitUntil(
            sw.registration
              .update()
              .then(() => {
                this.emit('afterUpdated', { event });
                TinyServiceWorkerEngine.#replyToAll({ type: 'sw:Updated' });
                this.log('info', 'Update successful, waiting for activation.');
              })
              .catch((error) => {
                const err = error instanceof Error ? error : new Error('Unknown Error.');
                this.emit('updateError', errorMaker(err, event));
                TinyServiceWorkerEngine.#replyToAll({
                  type: 'sw:UpdateError',
                  data: { message: err.message, name: err.name, stack: err.stack },
                });
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
        /** @type {MessagePayload|undefined} */
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
          replyToAll: TinyServiceWorkerEngine.replyToAll,
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
        this.emit('beforeMessage', { event, type, data: msgData });
        const afterData = () => ({ event, type, error: err, data: msgData });
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
