import { useEffect, useState } from 'react';
import { initDatabase, dbConnection } from './db/connection';
import { parseAndSearch } from './services/api';

import { SearchBar } from './components/SearchBar';
import { ImageGallery } from './components/ImageGallery';

/** @typedef {import('./services/api').ImageObj} ImageObj */

const App = () => {
  /** @type {[ImageObj[], import('react').Dispatch<import('react').SetStateAction<ImageObj[]>>]} */
  const [currentImages, setCurrentImages] = useState([]);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isDbReady, setIsDbReady] = useState(false);

  /**
   * @returns {Promise<void>}
   */
  const loadInitialData = async () => {
    /** @type {ImageObj[]} */
    const allImages = await dbConnection.select({ from: 'Images' });
    setCurrentImages(allImages);
  };

  useEffect(() => {
    /**
     * @returns {Promise<void>}
     */
    const setupEnvironment = async () => {
      await initDatabase();
      setIsDbReady(true);
      await loadInitialData();
    };

    setupEnvironment();
  }, []);

  /**
   * @param {string} rawQuery
   * @returns {Promise<void>}
   */
  const handleSearch = async (rawQuery) => {
    if (!isDbReady) return;

    if (rawQuery.trim() === '') {
      await loadInitialData();
      return;
    }

    /** @type {any[]} */
    const searchResults = await parseAndSearch(rawQuery);
    setCurrentImages(searchResults);
  };

  return (
    <div className="bg-light min-vh-100 pb-5">
      <nav className="navbar navbar-dark bg-dark shadow">
        <div className="container">
          <span className="navbar-brand mb-0 h1 fs-3">Philomena Multi-Booru</span>
        </div>
      </nav>

      <SearchBar onSearchSubmit={handleSearch} />

      {!isDbReady ? (
        <div className="container text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading database...</span>
          </div>
        </div>
      ) : (
        <ImageGallery imagesList={currentImages} />
      )}
    </div>
  );
};

export default App;
