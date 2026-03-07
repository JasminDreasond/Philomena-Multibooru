import { useState, useEffect } from 'react';

/**
 * @param {{ onSearchSubmit: (query: string) => void, initialQuery: string, isLoading: boolean }} props
 */
export const SearchBar = ({ onSearchSubmit, initialQuery, isLoading }) => {
  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [inputValue, setInputValue] = useState(initialQuery);

  useEffect(() => {
    setInputValue(initialQuery);
  }, [initialQuery]);

  /**
   * @param {import('react').FormEvent<HTMLFormElement>} event
   */
  const handleFormSubmit = (event) => {
    event.preventDefault();
    onSearchSubmit(inputValue);
  };

  return (
    <form onSubmit={handleFormSubmit} className="d-flex flex-grow-1 mx-lg-4 my-2 my-lg-0">
      <input
        type="search"
        className="form-control form-control-sm me-2 bg-dark text-light border-secondary"
        placeholder="Search tags (e.g., safe, pony)..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={isLoading}
      />
      <button type="submit" className="btn btn-primary btn-sm px-3" disabled={isLoading}>
        Search
      </button>
    </form>
  );
};
