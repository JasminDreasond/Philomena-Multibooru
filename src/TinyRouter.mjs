import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';

/**
 * @typedef {Object} RouteMatch
 * @property {string} path - The matched URL path.
 * @property {Record<string, string>} params - The dynamic parameters extracted from the path.
 * @property {URLSearchParams} query - The URL search parameters.
 */

/**
 * @typedef {Object} RouteNotFoundData
 * @property {string} path - The path that failed to match.
 * @property {URLSearchParams} query - The URL search parameters.
 */

/**
 * @callback RouteCallback
 * @param {RouteMatch} match - The object containing path, params, and query.
 * @returns {Promise<void>|void}
 */

/**
 * @callback RouteNotFoundCallback
 * @param {RouteNotFoundData} match - The object containing path and query.
 * @returns {void}
 */

/**
 * @typedef {Object} RouterOptions
 * @property {boolean} [debugMode=false] - Whether to enable internal debug logging.
 * @property {boolean} [useLogColors=false] - Whether to enable log color support.
 * @property {Partial<Console>} [logger=console] - A custom logger object (must implement console methods).
 * @property {RouteCallback} [onRouteChanged] - Callback executed whenever the route changes.
 * @property {RouteNotFoundCallback} [onRouteNotFound] - Callback executed when no route matches.
 */

/**
 * @typedef {Object} RouteDefinition
 * @property {RegExp} regex - The regular expression used for matching the path.
 * @property {string[]} paramNames - The names of the dynamic parameters.
 * @property {RouteCallback} callback - The function to execute on match.
 */

/**
 * A lightweight, framework-agnostic router for managing client-side navigation.
 */
class TinyRouter extends TinyDebugger {
  /** @type {RouteDefinition[]} */
  #routes = [];
  /** @type {RouteCallback} */
  #onRouteChanged;
  /** @type {RouteNotFoundCallback} */
  #onRouteNotFound;
  /** @type {boolean} */
  #started = false;

  /**
   * @param {RouterOptions} [options={}] - Configuration options for the router.
   * @throws {TypeError} If options is not an object or if the logger lacks required methods.
   */
  constructor(options = {}) {
    if (typeof options !== 'object' || options === null) {
      throw new TypeError('Options must be a non-null object.');
    }
    if (
      typeof options.onRouteChanged !== 'undefined' &&
      typeof options.onRouteChanged !== 'function'
    )
      throw new TypeError('onRouteChanged must be a function.');
    if (
      typeof options.onRouteNotFound !== 'undefined' &&
      typeof options.onRouteNotFound !== 'function'
    )
      throw new TypeError('onRouteNotFound must be a function.');

    super({
      id: '[_blue_TinyRouter_reset_] :debug:',
      logger: options.logger ?? console,
      debugMode: options.debugMode ?? false,
      useLogColors: options.useLogColors ?? false,
    });

    this.#onRouteChanged = options.onRouteChanged || (() => {});
    this.#onRouteNotFound = options.onRouteNotFound || (() => {});

    // Bind the popstate event to handle browser back/forward buttons
    window.addEventListener('popstate', () => this.#resolve());
  }

  /** @returns {RouteCallback} */
  get onRouteChanged() {
    return this.#onRouteChanged;
  }

  /** @param {RouteCallback} value */
  set onRouteChanged(value) {
    if (typeof value !== 'function') throw new TypeError('onRouteChanged must be a function.');
    this.#onRouteChanged = value;
  }

  /** @returns {RouteNotFoundCallback} */
  get onRouteNotFound() {
    return this.#onRouteNotFound;
  }

  /** @param {RouteNotFoundCallback} value */
  set onRouteNotFound(value) {
    if (typeof value !== 'function') throw new TypeError('onRouteNotFound must be a function.');
    this.#onRouteNotFound = value;
  }

  /** @returns {boolean} */
  get started() {
    return this.#started;
  }

  /**
   * Registers a new route pattern.
   * @param {string} pathPattern - The path pattern (e.g., '/images/:host/:id').
   * @param {RouteCallback} callback - Function to execute when this route is matched.
   * @throws {TypeError} If pathPattern is not a string or callback is not a function.
   */
  add(pathPattern, callback) {
    if (typeof pathPattern !== 'string') throw new TypeError('pathPattern must be a string.');
    if (typeof callback !== 'function') throw new TypeError('callback must be a function.');

    /** @type {string[]} */
    const paramNames = [];
    // Regex to find segments starting with ':' (e.g., ':id)
    const regexPath = pathPattern.replace(/:([^/]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    this.#routes.push({
      regex: new RegExp(`^${regexPath}$`),
      paramNames,
      callback,
    });
    this.log('info', 'New route registered: ' + pathPattern);
  }

  /**
   * Navigates to a specific path programmatically.
   * @param {string | URL | null | undefined} path - The target path.
   * @param {any} [state={}] - Optional state object to associate with history.
   * @returns {Promise<void>}
   * @throws {TypeError} If path is not a string or state is not an object.
   */
  async navigate(path, state = {}) {
    // Prevent redundant navigation if the path is the same
    if (window.location.pathname + window.location.search === path) return;

    window.history.pushState(state, '', path);
    await this.#resolve();
    this.log('info', `Navigated to: ${path}`);
  }

  /**
   * Triggers the initial route resolution (for deep linking on page load).
   * @returns {Promise<void>}
   * @throws {Error} If the router has already been started.
   */
  async start() {
    if (this.#started) throw new Error('Router has already been started.');
    this.#started = true;
    await this.#resolve();
    this.log('info', 'Router started successfully.');
  }

  /**
   * Internal method to match the current URL against registered routes.
   * @returns {Promise<void>}
   */
  async #resolve() {
    const path = window.location.pathname;
    const search = window.location.search;
    const query = new URLSearchParams(search);

    for (const route of this.#routes) {
      const match = path.match(route.regex);

      if (match) {
        /** @type {Record<string, string>} */
        const params = {};
        // Extract dynamic parameters based on the order they were found in the regex
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });

        const matchResult = { path, params, query };

        // Execute the route's specific callback
        await route.callback(matchResult);

        // Notify the global listener
        this.#onRouteChanged(matchResult);
        this.emit('RouteChanged', matchResult);
        this.log('info', `Route matched: ${path}`);
        return;
      }
    }

    // If no route matches, you could implement a 404 logic here
    const matchResult = { path, query };
    this.#onRouteNotFound(matchResult);
    this.emit('RouteNotFound', matchResult);
    this.log('warn', `No route matched the current URL: ${path}`);
  }
}

export default TinyRouter;
