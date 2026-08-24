/**
 * @template T
 * @typedef {Object} CacheEntry
 * @property {T} data - The actual data being stored.
 * @property {number} timestamp - The Unix timestamp (ms) when the data was stored.
 */

/**
 * @template T
 * @typedef {Map<string, CacheEntry<T>>} CacheMap
 */

/**
 * @template T
 * @typedef {Object.<string, CacheEntry<T>>} CacheObject
 */

/**
 * @template {any} T
 * In-memory cache manager to prevent duplicate requests.
 */
class TinyMapCache {
  /** @type {CacheMap<T>} */
  #cache = new Map();
  /**
   * Time-to-live: 5 minutes in milliseconds
   * @type {number}
   */
  #ttl = 300000;

  /**
   * Gets the current Time-To-Live (TTL) in milliseconds.
   * @returns {number}
   */
  get ttl() {
    return this.#ttl;
  }

  /**
   * Sets the Time-To-Live (TTL) in milliseconds.
   * @param {number} value - The new TTL value.
   * @throws {TypeError} If the value is not a number.
   * @throws {RangeError} If the value is less than 0.
   */
  set ttl(value) {
    if (typeof value !== 'number') {
      throw new TypeError('The TTL value must be a number.');
    }
    if (value < 0) {
      throw new RangeError('The TTL value cannot be negative.');
    }
    this.#ttl = value;
  }

  /**
   * Returns a deep-cloned plain object representation of the cache.
   * @returns {CacheObject<T>} An object where keys are cache keys and values are deep-cloned entries.
   */
  get cache() {
    /** @type {CacheObject<T>} */
    const cacheObject = {};
    for (const [key, entry] of this.#cache.entries()) {
      // structuredClone ensures a deep copy of the entry and its nested data
      // @ts-ignore
      cacheObject[key] = structuredClone(entry);
    }
    return cacheObject;
  }

  /**
   * Returns the number of items currently stored in the cache.
   * @returns {number}
   */
  get size() {
    return this.#cache.size;
  }

  /**
   * Checks if a specific key exists in the cache.
   *
   * Note: This method triggers a full purge of all expired items in the cache.
   * @param {string} key - The identifier for the data.
   * @returns {boolean} True if the key exists, false otherwise.
   * @throws {TypeError} If the key is not a string.
   */
  has(key) {
    if (typeof key !== 'string') {
      throw new TypeError('The cache key must be a string.');
    }
    this.purgeExpired();
    return this.#cache.has(key);
  }

  /**
   * Removes the item associated with the specified key from the cache.
   *
   * Note: This method triggers a full purge of all expired items in the cache.
   * @param {string} key - The identifier for the data.
   * @returns {boolean} True if an element in the Map existed and has been removed, false otherwise.
   * @throws {TypeError} If the key is not a string.
   */
  delete(key) {
    if (typeof key !== 'string') {
      throw new TypeError('The cache key must be a string.');
    }
    this.purgeExpired();
    return this.#cache.delete(key);
  }

  /**
   * Saves an item to the cache.
   *
   * Note: This method triggers a full purge of all expired items in the cache.
   * @param {string} key - The identifier for the data.
   * @param {T} data - The data to be stored.
   * @throws {TypeError} If the key is not a string.
   */
  set(key, data) {
    if (typeof key !== 'string') {
      throw new TypeError('The cache key must be a string.');
    }
    this.purgeExpired();
    this.#cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves an item if it is still valid.
   *
   * Note: This method triggers a full purge of all expired items in the cache.
   * @param {string} key - The identifier for the data.
   * @returns {T | null} The data if valid, or null if expired/not found.
   * @throws {TypeError} If the key is not a string.
   */
  get(key) {
    if (typeof key !== 'string') {
      throw new TypeError('The cache key must be a string.');
    }
    this.purgeExpired();
    const cached = this.#cache.get(key);
    if (!cached) return null;

    return cached.data;
  }

  /**
   * Iterates through the entire cache and removes all entries that have expired.
   * @returns {void}
   */
  purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this.#cache.entries()) {
      if (now - entry.timestamp > this.#ttl) {
        this.#cache.delete(key);
      }
    }
  }

  /**
   * Removes all items from the cache.
   * @returns {void}
   */
  clear() {
    this.#cache.clear();
  }
}

export default TinyMapCache;
