import { useEffect, useState } from 'react';
import { initDatabase, dbConnection } from './db/connection';
import { parseAndSearch, syncUserGalleryPages } from './services/api';

import { SearchBar } from './components/SearchBar';
import { ImageGallery } from './components/ImageGallery';

/** @typedef {import('./services/api').ImageObj} ImageObj */
/** @typedef {import('./services/api').Account} Account */

const App = () => {
  /** @type {[ImageObj[], import('react').Dispatch<import('react').SetStateAction<ImageObj[]>>]} */
  const [currentImages, setCurrentImages] = useState([]);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isDbReady, setIsDbReady] = useState(false);

  /** @type {[Account[], import('react').Dispatch<import('react').SetStateAction<Account[]>>]} */
  const [connectedAccounts, setConnectedAccounts] = useState([]);

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
      if (isDbReady) return;
      await initDatabase();
      const accounts = await syncUserGalleryPages();
      setConnectedAccounts(accounts);
      setIsDbReady(true);
      await loadInitialData();
    };

    setupEnvironment();
  });

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
        <div className="container d-flex justify-content-between">
          <span className="navbar-brand mb-0 h1 fs-3">Philomena Multi-Booru</span>
          <span className="text-light">
            Active APIs: <span className="badge bg-success">{connectedAccounts.length}</span>
          </span>
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
        <>
          {connectedAccounts.length === 0 && (
            <div className="container mt-3">
              <div className="alert alert-warning" role="alert">
                You need to add at least one Philomena API account to start syncing data!
              </div>
            </div>
          )}
          <ImageGallery imagesList={currentImages} />
        </>
      )}
    </div>
  );
};

export default App;
