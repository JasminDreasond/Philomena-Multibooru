/**
 * @typedef {Object} RouteMatch
 * @property {string} path - The matched path.
 * @property {Object} params - The dynamic parameters extracted from the path (e.g., { id: '123' }).
 * @property {URLSearchParams} query - The URL search parameters.
 */

/**
 * @callback RouteCallback
 * @param {RouteMatch} match - The object containing path, params, and query.
 */

/**
 * @typedef {Object} Router
 * @property {RegExp} regex
 * @property {string[]} paramNames
 * @property {RouteCallback} callback
 */

/**
 * A lightweight, framework-agnostic router for managing client-side navigation.
 */
class TinyRouter {
  /** @type {Router[]} */
  #routes = [];
  /** @type {RouteCallback} */
  #onRouteChanged;
  /** @type {boolean} */
  #started = false;

  /**
   * @param {Object} options
   * @param {RouteCallback} [options.onRouteChanged] - Callback executed whenever the route changes.
   */
  constructor(options = {}) {
    this.#onRouteChanged = options.onRouteChanged || (() => {});

    // Bind the popstate event to handle browser back/forward buttons
    window.addEventListener('popstate', () => this.#resolve());
  }

  /**
   * Registers a new route pattern.
   * @param {string} pathPattern - The path pattern (e.g., '/images/:host/:id' or '/search').
   * @param {RouteCallback} callback - Function to execute when this route is matched.
   */
  addRoute(pathPattern, callback) {
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
  }

  /**
   * Navigates to a specific path programmatically.
   * @param {string} path - The target path.
   * @param {Object} [state] - Optional state object to associate with the history entry.
   */
  async navigate(path, state = {}) {
    // Prevent redundant navigation if the path is the same
    if (window.location.pathname + window.location.search === path) return;

    window.history.pushState(state, '', path);
    await this.#resolve();
  }

  /**
   * Triggers the initial route resolution (for deep linking on page load).
   */
  async start() {
    if (this.#started) throw new Error('');
    await this.#resolve();
  }

  /**
   * Internal method to match the current URL against registered routes.
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
        return;
      }
    }

    // If no route matches, you could implement a 404 logic here
    this.#handleNotFound();
  }

  /**
   */
  #handleNotFound() {
    console.warn('TinyRouter: No route matched the current URL.');
  }
}

export default TinyRouter;
