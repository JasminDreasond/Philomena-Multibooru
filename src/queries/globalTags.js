// Video tags
export const videoTags = ['video'];

// Global expression
let globalExpression = ['*'];

// Video mode
if (localStorage.getItem('app_recVideoMode') === 'true') {
  globalExpression.push([...videoTags]);
  globalExpression = globalExpression.filter((v) => v !== '*');
}

const geString = globalExpression.join(', ');

// Welcome warning
console.log(`Your global query is "${geString}".`);

/**
 * @param {string} query
 * @returns {string}
 */
export const parseQueryResults = (query) => {
  if (query === geString || !query) return geString;
  return `${geString}, ${query}`;
};

// Export
export { globalExpression, geString };
