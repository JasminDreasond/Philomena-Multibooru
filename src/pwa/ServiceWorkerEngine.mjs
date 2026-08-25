import { EventEmitter } from 'events';

/**
 * @typedef {Object} FetchOptions
 * @property {boolean} enabled
 * @property {RouterOptions} router
 */

/**
 * @typedef {Object} MessagingOptions
 * @property {boolean} enabled
 * @property {boolean} allowPingPong
 */

/**
 * @typedef {Object} RouterOptions
 * @property {boolean} enabled
 * @property {(url: URL) => boolean} validator
 * @property {() => Response} notFoundHandler
 */

/**
 * @typedef {Object} ServiceWorkerSettings
 * @property {FetchOptions} fetch
 * @property {MessagingOptions} messaging
 */

/**
 * @typedef {Object} MessageData
 * @property {ExtendableMessageEvent} event
 * @property {string} clientId
 * @property {any} data
 */

/**
 * @callback MessageCallback
 * @param {MessageData} msg
 */

/** @type {ServiceWorkerGlobalScope} */
const sw = self;

/**
 * Gerencia o ciclo de vida e a execução de módulos baseados em configuração.
 */
class ServiceWorkerEngine extends EventEmitter {
  /** @type {ServiceWorkerSettings} */
  #config = {
    fetch: {
      enabled: true,
      router: {
        enabled: true,
        // Implementação da sua lógica de rotas
        validator: () => true,
        // Implementação do seu 404
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

  get started() {
    return this.#started;
  }

  /**
   * Validação rigorosa do objeto de configuração.
   * @param {ServiceWorkerSettings} config
   * @throws {TypeError}
   */
  #validateConfig(config) {
    if (typeof config !== 'object' && config !== null) {
      throw new TypeError('Configuration must be a non-null object.');
    }
    if (
      typeof config.fetch !== 'undefined' &&
      typeof config.fetch !== 'object' &&
      config.fetch !== null
    ) {
      throw new TypeError('Fetch configuration must be a non-null object.');
    }
    if (
      typeof config.messaging !== 'undefined' &&
      typeof config.messaging !== 'object' &&
      config.messaging !== null
    ) {
      throw new TypeError('Messaging configuration must be a non-null object.');
    }
  }

  /**
   * @param {Partial<ServiceWorkerSettings>} config - Objeto de configuração validado.
   * @throws {TypeError} Se a configuração não atender aos requisitos mínimos.
   */
  constructor(config = {}) {
    super();
    this.#validateConfig(config);
    this.#config = {
      fetch: config.fetch
        ? {
            ...this.#config.fetch,
            ...config.fetch,
            router: config.fetch
              ? { ...this.#config.fetch.router, ...config.fetch.router }
              : this.#config.fetch.router,
          }
        : this.#config.fetch,
      messaging: config.messaging
        ? { ...this.#config.messaging, ...config.messaging }
        : this.#config.messaging,
    };
    this.#validateConfig(this.#config);
  }

  /**
   * @returns {number}
   */
  get fetchUrlSize() {
    return this.#fetchUrls.size;
  }

  /**
   * @param {string} type
   * @param {MessageCallback} callback
   */
  addFetchUrl(type, callback) {
    this.#fetchUrls.set(type, callback);
  }

  /**
   * @param {string} type
   * @returns {boolean}
   */
  deleteFetchUrl(type) {
    return this.#fetchUrls.delete(type);
  }

  /**
   * @param {string} type
   * @returns {boolean}
   */
  hasFetchUrl(type) {
    return this.#fetchUrls.has(type);
  }

  /**
   * @returns {number}
   */
  get messagesSize() {
    return this.#messages.size;
  }

  /**
   * @param {string} type
   * @param {MessageCallback} callback
   */
  addMessage(type, callback) {
    this.#messages.set(type, callback);
  }

  /**
   * @param {string} type
   * @returns {boolean}
   */
  deleteMessage(type) {
    return this.#messages.delete(type);
  }

  /**
   * @param {string} type
   * @returns {boolean}
   */
  hasMessage(type) {
    return this.#messages.has(type);
  }

  /**
   * Inicializa os listeners do Service Worker.
   * @returns {void}
   */
  init() {
    if (this.#started) throw new Error('');

    // Detectar que o Service Worker foi ativado.
    sw.addEventListener('activate', (event) => {
      /** @type {ExtendableEvent} */
      const ev = event;
      ev.waitUntil(sw.clients.claim());
      console.log('[SW-Engine] Activated and claiming clients.');
    });

    // Detectar eventos do fetch no website.
    const fetchCfg = this.#config.fetch;
    if (fetchCfg.enabled)
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

    this.#registerMessage();
    this.#started = true;
    console.log('[SW-Engine] Initialized with custom configuration.');
  }

  /**
   * Detectar eventos vindo das páginas do aplicativo.
   */
  #registerMessage() {
    const msgCfg = this.#config.messaging;
    if (!msgCfg.enabled) return;

    // Ping/Pong Logic
    if (msgCfg.allowPingPong)
      this.#messages.set('ping', ({ event }) => {
        event.source.postMessage({ type: 'pong' });
      });

    sw.addEventListener('message', async (event) => {
      /** @type {ExtendableMessageEvent} */
      const ev = event;
      /** @type {any} */
      const data = event.data;
      /** @type {string} */
      const clientId = event.source.id;
      /** @type {string|null} */
      const type = data?.type ?? null;
      // Message event
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
   * @param {RouterOptions} routerCfg
   * @param {FetchEvent} event
   * @returns {boolean}
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
