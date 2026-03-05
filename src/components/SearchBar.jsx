import { useState } from 'react';

/**
 * @param {{ onSearchSubmit: (query: string) => void }} props
 */
export const SearchBar = ({ onSearchSubmit }) => {
  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [inputValue, setInputValue] = useState('');

  /**
   * @param {import('react').FormEvent<HTMLFormElement>} event
   */
  const handleFormSubmit = (event) => {
    event.preventDefault();
    onSearchSubmit(inputValue);
  };

  return (
    <div className="container mt-4 mb-4">
      <form onSubmit={handleFormSubmit} className="d-flex shadow-sm">
        <input
          type="text"
          className="form-control form-control-lg me-2"
          placeholder="Search tags (e.g., safe, pony, rainbow, -human)..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-lg px-4">
          Search
        </button>
      </form>
    </div>
  );
};
