/**
 * Helper function to throw standardized and coherent API validation errors.
 * @param {string} context The area or entity where the error occurred.
 * @param {string} field The specific field that failed validation.
 * @throws {Error} Throws a formatted Philomena API error.
 * @private
 */
export const throwApiError = (context, field) => {
  throw new Error(
    `Philomena API Error: Invalid or missing field "${field}" in the ${context} response.`,
  );
};

/**
 * Reusable fetch function for Philomena endpoints.
 * @param {string} booruUrl The base URL of the booru instance.
 * @param {string} endpoint The specific API endpoint to call.
 * @param {string} apiKey The user's authentication key.
 * @param {Record<string, any>} params Additional query parameters for the request.
 * @param {AbortSignal} [signal]
 * @returns {Promise<any>} The parsed JSON response from the server.
 */
export const fetchPhilomena = async (
  booruUrl,
  endpoint,
  apiKey,
  params = {},
  signal = undefined,
) => {
  const queryParams = new URLSearchParams(apiKey ? { ...params, key: apiKey } : params).toString();
  const url = `${booruUrl}/api/v1/json/${endpoint}?${queryParams}`;

  const response = await fetch(url, signal ? { signal } : {});
  if (!response.ok) {
    throw new Error(
      `Network Error: Failed to fetch data from ${booruUrl} (${endpoint}). Status: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
};
