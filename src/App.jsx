import { useEffect, useState, useRef } from 'react';
import { initDatabase, dbConnection } from './db/connection';
import { parseAndSearch, syncUserGalleryPages } from './services/api';

import { SearchBar } from './components/SearchBar';
import { ImageGallery } from './components/ImageGallery';
import { SettingsPanel } from './components/SettingsPanel';

/** @typedef {import('./services/api').ImageObj} ImageObj */
/** @typedef {import('./services/api').Account} Account */

const App = () => {
  /** @type {[ImageObj[], import('react').Dispatch<import('react').SetStateAction<ImageObj[]>>]} */
  const [currentImages, setCurrentImages] = useState([]);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isDbReady, setIsDbReady] = useState(false);

  /** @type {[Account[], import('react').Dispatch<import('react').SetStateAction<Account[]>>]} */
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [showSettings, setShowSettings] = useState(false);

  /** @type {import('react').MutableRefObject<boolean>} */
  const hasInitialized = useRef(false);

  /** @type {import('react').MutableRefObject<boolean>} */
  const hasSyncedOnHome = useRef(false);

  /**
   * @returns {Promise<ImageObj[]>}
   */
  const loadInitialData = async () => {
    /** @type {ImageObj[]} */
    const allImages = await dbConnection.select({ from: 'Images' });
    setCurrentImages(allImages);
    return allImages;
  };

  useEffect(() => {
    /**
     * @returns {Promise<void>}
     */
    const setupEnvironment = async () => {
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        await initDatabase();
        setIsDbReady(true);
        await loadInitialData();
      }

      // Just synchronize if you're not in the settings and you haven't synced yet
      if (!showSettings && isDbReady && !hasSyncedOnHome.current) {
        hasSyncedOnHome.current = true;
        /** @type {Account[]} */
        const accounts = await syncUserGalleryPages();
        setConnectedAccounts(accounts);
        await loadInitialData();
        console.log(`Homepage accounts loaded: ${accounts.length}`);
      }
    };

    setupEnvironment();
  }, [isDbReady, showSettings]);

  /**
   * @returns {void}
   */
  const handleCloseSettings = () => {
    setShowSettings(false);
    // Reseta o ref de sync para forçar a busca na home após fechar as configs
    hasSyncedOnHome.current = false;
  };

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
          <div>
            <span className="text-light me-3">
              Active APIs: <span className="badge bg-success">{connectedAccounts.length}</span>
            </span>
            <button
              className="btn btn-outline-light btn-sm"
              onClick={() => {
                if (!showSettings) hasSyncedOnHome.current = false;
                setShowSettings(!showSettings);
              }}
            >
              {showSettings ? 'Back to Gallery' : 'Settings'}
            </button>
          </div>
        </div>
      </nav>

      {showSettings ? (
        <SettingsPanel onClose={handleCloseSettings} />
      ) : (
        <>
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
                    You need to add at least one Philomena API account to start syncing data! Click
                    on "Settings".
                  </div>
                </div>
              )}
              <ImageGallery imagesList={currentImages} />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default App;
