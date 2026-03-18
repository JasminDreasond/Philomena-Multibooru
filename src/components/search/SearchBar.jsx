import { useState, useEffect } from 'react';

/**
 * @param {{ onSearchSubmit: (query: string, mode: string) => void, initialQuery: string, initialMode: string, isLoading: boolean }} props
 */
export const SearchBar = ({ onSearchSubmit, initialQuery, initialMode, isLoading }) => {
  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [inputValue, setInputValue] = useState(initialQuery);

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [mode, setMode] = useState(initialMode || 'api');

  useEffect(() => {
    setInputValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setMode(initialMode || 'api');
  }, [initialMode]);

  /**
   * @param {import('react').FormEvent<HTMLFormElement>} event
   */
  const handleFormSubmit = (event) => {
    event.preventDefault();
    onSearchSubmit(inputValue, mode);
  };

  return (
    <div className="d-flex flex-column flex-grow-1 mx-lg-4 my-2 my-lg-0">
      <form onSubmit={handleFormSubmit} className="d-flex w-100">
        <select
          className="form-select form-select-sm bg-dark text-light border-secondary me-2 fw-semibold"
          style={{ width: 'auto', minWidth: '130px' }}
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          disabled={isLoading}
        >
          <option value="api">Philomena API</option>
          <option value="local_fav">Local Faves</option>
        </select>

        <input
          type="search"
          className="form-control form-control-sm me-2 bg-dark text-light border-secondary"
          placeholder="Search tags (e.g., safe, pony)..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
        />

        <button type="submit" className="btn btn-primary btn-sm px-3 fw-bold" disabled={isLoading}>
          Search
        </button>
      </form>

      {mode === 'local_fav' && (
        <small className="text-warning mt-1 fw-semibold" style={{ fontSize: '0.75rem' }}>
          * Philomena's complex query syntax (like AND/OR/NOT) may not work identically in the local
          database search.
        </small>
      )}
    </div>
  );
};
