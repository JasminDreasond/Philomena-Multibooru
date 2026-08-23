/**
 * @template T
 * @typedef {Map<string, {data: T, timestamp: number}>} CacheMap
 */

/**
 * In-memory cache manager to prevent duplicate requests.
 */
class DataCache {
  #cache = new Map();
  #ttl = 300000; // Time-to-live: 5 minutes in milliseconds

  /**
   * Saves an item to the cache.
   * @param {string} key
   * @param {any} data
   */
  set(key, data) {
    this.#cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves an item if it is still valid.
   * @param {string} key
   * @returns {any | null}
   */
  get(key) {
    const cached = this.#cache.get(key);
    if (!cached) return null;

    // Checks if the cache has expired
    if (Date.now() - cached.timestamp > this.#ttl) {
      this.#cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Clears the entire cache.
   */
  clear() {
    this.#cache.clear();
  }
}

// Exporting a single instance (Singleton) to be used throughout the App
export const globalCache = new DataCache();
