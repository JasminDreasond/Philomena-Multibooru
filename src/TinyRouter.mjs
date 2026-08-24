import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';

/**
 * @typedef {Object} AddRouteOptions
 * @property {string} pattern - A human-readable string representation of the route.
 *    Used for identification, debugging, and for the `remove()` method.
 * @property {RegExp} regex - The regular expression used to test the current URL path.
 *    It should include capture groups `()` for any dynamic segments.
 * @property {string[]} paramNames - An array of strings representing the keys for the dynamic parameters.
 *    The order of these names must strictly match the order of the capture groups defined in the `regex`.
 */

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
 * @property {string} pattern - The original path pattern string.
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
  /** @type {EventListenerOrEventListenerObject} */
  #popstateHandler;

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

    // Bind the popstate event and store the reference for later removal
    this.#popstateHandler = this.#resolve.bind(this);
    window.addEventListener('popstate', this.#popstateHandler);
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
   * Returns the current number of registered routes.
   * @returns {number}
   */
  get size() {
    return this.#routes.length;
  }

  /**
   * Returns an array of all registered path patterns.
   * @returns {string[]} An array of path pattern strings.
   */
  get routes() {
    return this.#routes.map((route) => route.pattern);
  }

  /**
   * Registers a new route pattern.
   * @param {string | AddRouteOptions} patternOrOptions -
   *    A path pattern string (e.g., '/user/:id') OR a configuration object for custom regex.
   * @param {RouteCallback} callback - Function to execute when this route is matched.
   * @throws {TypeError} If arguments are invalid.
   * @throws {Error} If the route pattern is already registered.
   */
  add(patternOrOptions, callback) {
    /** @type {string} */
    let pathPattern;
    /** @type {RegExp} */
    let regex;
    /** @type {string[]} */
    let paramNames = [];

    // 1. Handle String Input (Legacy/Simple Mode)
    if (typeof patternOrOptions === 'string') {
      pathPattern = patternOrOptions;

      // Regex to find segments starting with ':' (e.g., ':id)
      const regexPath = pathPattern.replace(/:([^/]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
      });
      regex = new RegExp(`^${regexPath}$`);

      // 2. Handle Object Input (Advanced/Custom Regex Mode)
    } else if (
      typeof patternOrOptions === 'object' &&
      patternOrOptions !== null &&
      'pattern' in patternOrOptions &&
      'regex' in patternOrOptions &&
      'paramNames' in patternOrOptions
    ) {
      pathPattern = patternOrOptions.pattern;
      regex = patternOrOptions.regex;
      paramNames = patternOrOptions.paramNames;

      // Strict runtime validation for the custom configuration object
      if (typeof pathPattern !== 'string') {
        throw new TypeError('The "pattern" property in the options object must be a string.');
      }
      if (!(regex instanceof RegExp)) {
        throw new TypeError(
          'The "regex" property in the options object must be an instance of RegExp.',
        );
      }
      if (!Array.isArray(paramNames) || !paramNames.every((name) => typeof name === 'string')) {
        throw new TypeError('The "paramNames" property must be an array of strings.');
      }
    } else {
      throw new TypeError(
        'The first argument must be a string (e.g., "/user/:id") or an object ' +
          '(e.g., { pattern: "/user/(\\d+)", regex: /^\\/user\\/(\\d+)$/, paramNames: ["id"] }).',
      );
    }

    // 3. Callback Validation
    if (typeof callback !== 'function') {
      throw new TypeError('The callback must be a function.');
    }

    // 4. Prevent duplicate route registration
    if (this.has(pathPattern)) {
      throw new Error(`Route with pattern "${pathPattern}" is already registered.`);
    }

    // 5. Final Registration
    this.#routes.push({
      pattern: pathPattern, // Stored to allow removal by string
      regex,
      paramNames,
      callback,
    });
    this.emit('RouteAdded', pathPattern);
    this.log('info', `New route registered: ${pathPattern}`);
  }

  /**
   * Removes a registered route by its original pattern string.
   * @param {string} pathPattern - The pattern to remove.
   * @throws {TypeError} If pathPattern is not a string.
   */
  remove(pathPattern) {
    if (typeof pathPattern !== 'string') throw new TypeError('pathPattern must be a string.');

    const initialLength = this.#routes.length;
    this.#routes = this.#routes.filter((route) => route.pattern !== pathPattern);

    if (this.#routes.length === initialLength) {
      this.log('warn', `Attempted to remove non-existent route: ${pathPattern}`);
    } else {
      this.emit('RouteRemoved', pathPattern);
      this.log('info', `Route removed: ${pathPattern}`);
    }
  }

  /**
   * Checks if a route pattern is already registered.
   * @param {string} pathPattern - The pattern to check.
   * @returns {boolean} True if the route exists, false otherwise.
   * @throws {TypeError} If pathPattern is not a string.
   */
  has(pathPattern) {
    if (typeof pathPattern !== 'string') throw new TypeError('pathPattern must be a string.');
    return this.#routes.some((route) => route.pattern === pathPattern);
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
    this.emit('RouterStarted');
    this.log('info', 'Router started successfully.');
  }

  /**
   * Cleans up the router, removes event listeners, and stops the router.
   */
  stop() {
    window.removeEventListener('popstate', this.#popstateHandler);
    this.#started = false;
    this.clear();
    this.emit('RouterDestroyed');
    this.log('info', 'Router stopped and event listeners removed.');
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
        this.emit('BeforeRouteChanged', matchResult);
        await route.callback(matchResult);

        // Notify the global listener
        this.#onRouteChanged(matchResult);
        this.emit('AfterRouteChanged', matchResult);
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

  /**
   * Removes all registered routes.
   */
  clear() {
    this.#routes = [];
    this.emit('RoutesCleared');
    this.log('info', 'All routes have been cleared.');
  }
}

export default TinyRouter;
