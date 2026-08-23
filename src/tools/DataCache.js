/**
 * @template T
 * @typedef {Map<string, {data: T, timestamp: number}>} CacheMap
 */

/**
 * Gerenciador de cache em memória para evitar requisições duplicadas.
 */
class DataCache {
  #cache = new Map();
  #ttl = 300000; // Time-to-live: 5 minutos em milissegundos

  /**
   * Salva um item no cache.
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
   * Recupera um item se ele ainda for válido.
   * @param {string} key
   * @returns {any | null}
   */
  get(key) {
    const cached = this.#cache.get(key);
    if (!cached) return null;

    // Verifica se o cache expirou
    if (Date.now() - cached.timestamp > this.#ttl) {
      this.#cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Limpa todo o cache.
   */
  clear() {
    this.#cache.clear();
  }
}

// Exportamos uma única instância (Singleton) para ser usada em todo o App
export const globalCache = new DataCache();
