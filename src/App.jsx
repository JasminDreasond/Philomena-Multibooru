import { useEffect, useState, useRef } from 'react';
import { initDatabase } from './db/connection';
import { syncUserGalleryPages, searchImages } from './services/api';

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

  /** @type {[Account[]|null, import('react').Dispatch<import('react').SetStateAction<Account[]>>]} */
  const [connectedAccounts, setConnectedAccounts] = useState(null);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [showSettings, setShowSettings] = useState(false);

  /** @type {[number, import('react').Dispatch<import('react').SetStateAction<number>>]} */
  const [pageLimit, setPageLimit] = useState(50);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isSearching, setIsSearching] = useState(false);

  /** @type {import('react').MutableRefObject<boolean>} */
  const hasInitialized = useRef(false);

  /** @type {import('react').MutableRefObject<boolean>} */
  const hasSyncedOnHome = useRef(false);

  /**
   * @param {number} limitToUse
   * @returns {Promise<ImageObj[]>}
   */
  const loadInitialData = async (limitToUse) => {
    /** @type {ImageObj[]} */
    const allImages = await searchImages('*', limitToUse);
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
        await loadInitialData(pageLimit);
      }

      // Just synchronize if you're not in the settings and you haven't synced yet
      if (!showSettings && isDbReady && !hasSyncedOnHome.current) {
        hasSyncedOnHome.current = true;

        const { accounts, syncLimit } = await syncUserGalleryPages();

        setConnectedAccounts(accounts);
        setPageLimit(syncLimit);

        await loadInitialData(syncLimit);
        console.log(
          `Homepage accounts loaded: ${accounts.length} | Dynamic Page Limit: ${syncLimit}`,
        );
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
      await loadInitialData(pageLimit);
      return;
    }

    setIsSearching(true);

    try {
      // Sync API data first using the search query
      const { syncLimit } = await syncUserGalleryPages(rawQuery, 1);
      setPageLimit(syncLimit);

      // Then query the local database
      /** @type {ImageObj[]} */
      const searchResults = await searchImages(rawQuery, syncLimit);
      setCurrentImages(searchResults);
    } catch (error) {
      console.error('Error during search sync:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-light min-vh-100 pb-5">
      <nav className="navbar navbar-dark bg-dark shadow">
        <div className="container d-flex justify-content-between">
          <span className="navbar-brand mb-0 h1 fs-3">Philomena Multi-Booru</span>
          <div>
            <span className="text-light me-3">
              Active APIs:{' '}
              <span className="badge bg-success">
                {connectedAccounts ? connectedAccounts.length : 0}
              </span>
            </span>
            <button
              className="btn btn-outline-light btn-sm"
              onClick={() => {
                if (!showSettings) hasSyncedOnHome.current = false;
                setShowSettings(!showSettings);
              }}
            >
              {showSettings ? 'Back to Homepage' : 'Settings'}
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
              {connectedAccounts && connectedAccounts.length === 0 && (
                <div className="container mt-3">
                  <div className="alert alert-warning" role="alert">
                    You need to add at least one Philomena API account to start syncing data! Click
                    on "Settings".
                  </div>
                </div>
              )}

              {isSearching ? (
                <div className="container text-center mt-5">
                  <div className="spinner-border text-secondary" role="status">
                    <span className="visually-hidden">Fetching from APIs...</span>
                  </div>
                  <p className="mt-2 text-muted fw-semibold">
                    Fetching latest images from connected boorus...
                  </p>
                </div>
              ) : (
                <ImageGallery imagesList={currentImages} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default App;
