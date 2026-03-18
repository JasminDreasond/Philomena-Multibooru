/**
 * Utility function to validate arrays and their elements in API responses.
 * @param {any[]} item The array to check.
 * @param {string} itemType The expected type of each element.
 * @returns {any[]} The validated array.
 * @private
 */
export const checkArray = (item, itemType) => {
  if (!Array.isArray(item) || !item.every((i) => typeof i === itemType)) {
    throw new Error(`Data Validation Error: Expected an array of type "${itemType}".`);
  }
  return item;
};

/**
 * Utility function to validate primitive items in API responses.
 * @param {any} item The item to check.
 * @param {string} itemType The expected type.
 * @returns {any} The validated item.
 * @private
 */
export const checkItem = (item, itemType) => {
  if (typeof item !== itemType) {
    throw new Error(
      `Data Validation Error: Expected item of type "${itemType}" but received "${typeof item}".`,
    );
  }
  return item;
};

/**
 * Normalizes booru URLs by stripping trailing slashes.
 * @param {string} url The raw URL string.
 * @returns {string} The URL without a trailing slash.
 */
export const fixBooruUrl = (url) => (url.endsWith('/') ? url.substring(0, url.length - 1) : url);
