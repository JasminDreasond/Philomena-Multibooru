import { useEffect, useState, useRef } from 'react';
import { initDatabase } from './db/connection';
import { syncUserGalleryPages, searchImages, getFeaturedImage } from './services/api';

import { SearchBar } from './components/SearchBar';
import { ImageGallery } from './components/ImageGallery';
import { SettingsPanel } from './components/SettingsPanel';

/** @typedef {import('./services/api').ImageResult} ImageResult */
/** @typedef {import('./services/api').ImageObj} ImageObj */
/** @typedef {import('./services/api').Account} Account */

const App = () => {
  /** @type {[ImageResult[], import('react').Dispatch<import('react').SetStateAction<ImageResult[]>>]} */
  const [currentImages, setCurrentImages] = useState([]);

  /** @type {[ImageResult[], import('react').Dispatch<import('react').SetStateAction<ImageResult[]>>]} */
  const [trendingImages, setTrendingImages] = useState([]);

  /** @type {[ImageResult[], import('react').Dispatch<import('react').SetStateAction<ImageResult[]>>]} */
  const [watchedImages, setWatchedImages] = useState([]);

  /** @type {[ImageObj|null, import('react').Dispatch<import('react').SetStateAction<ImageObj|null>>]} */
  const [featuredImage, setFeaturedImage] = useState(null);

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
  const loadLocalData = async (limitToUse) => {
    /** @type {ImageResult[]} */
    const mainResults = await searchImages('*', limitToUse);
    setCurrentImages(mainResults);

    /** @type {ImageResult[]} */
    const trendingResults = await searchImages('first_seen_at.gt:3 days ago', 4);
    setTrendingImages(trendingResults);

    /** @type {ImageResult[]} */
    const watchedResults = await searchImages('my:watched', limitToUse);
    setWatchedImages(watchedResults);
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
        await loadLocalData(pageLimit);
      }

      if (!showSettings && isDbReady && !hasSyncedOnHome.current) {
        hasSyncedOnHome.current = true;

        // Run syncs in parallel to save time
        const [mainSync] = await Promise.all([
          syncUserGalleryPages('*', 1),
          syncUserGalleryPages('first_seen_at.gt:3 days ago', 1),
          syncUserGalleryPages('my:watched', 1),
        ]);

        const accounts = mainSync.accounts;
        const syncLimit = mainSync.syncLimit;

        setConnectedAccounts(accounts);
        setPageLimit(syncLimit);

        if (accounts.length > 0) {
          /** @type {ImageObj|null} */
          const featured = await getFeaturedImage(accounts[0].booruUrl);
          setFeaturedImage(featured);
        }

        await loadLocalData(syncLimit);
      }
    };

    setupEnvironment();
  }, [isDbReady, showSettings]);

  /**
   * @returns {void}
   */
  const handleCloseSettings = () => {
    setShowSettings(false);
    hasSyncedOnHome.current = false;
  };

  /**
   * @param {string} rawQuery
   * @returns {Promise<void>}
   */
  const handleSearch = async (rawQuery) => {
    if (!isDbReady) return;

    if (rawQuery.trim() === '') {
      const results = await searchImages('*', pageLimit);
      setCurrentImages(results);
      return;
    }

    setIsSearching(true);

    try {
      // Sync API data first using the search query
      const { syncLimit } = await syncUserGalleryPages(rawQuery, 1);
      setPageLimit(syncLimit);

      // Then query the local database
      /** @type {ImageResult[]} */
      const searchResults = await searchImages(rawQuery, syncLimit);
      setCurrentImages(searchResults);
    } catch (error) {
      console.error('Error during search sync:', error);
    } finally {
      setIsSearching(false);
    }
  };

  /** @type {string} */
  const primaryBooruUrl =
    connectedAccounts && connectedAccounts.length > 0 ? connectedAccounts[0].booruUrl : '';

  return (
    <div className="bg-light min-vh-100 pb-5">
      <nav className="navbar navbar-dark bg-dark shadow-sm">
        <div className="container-fluid px-4 d-flex justify-content-between">
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
        <div className="container-fluid px-4 mt-4">
          {!isDbReady ? (
            <div className="text-center mt-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading database...</span>
              </div>
            </div>
          ) : connectedAccounts && connectedAccounts.length === 0 ? (
            <div className="alert alert-warning mt-3" role="alert">
              You need to add at least one Philomena API account to start syncing data! Click on
              "Settings".
            </div>
          ) : (
            <>
              <div className="row">
                {/* Left Sidebar */}
                <div className="col-lg-3 col-md-4 mb-4">
                  {/* Featured Image */}
                  {featuredImage && (
                    <div className="card shadow-sm border-0 bg-dark text-white mb-4">
                      <div className="card-header bg-secondary text-white fw-bold">
                        Featured Image
                      </div>
                      <a
                        href={`${primaryBooruUrl}/${featuredImage.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={featuredImage.representations.thumb || featuredImage.source_url}
                          className="card-img-bottom"
                          alt="Featured"
                          style={{ objectFit: 'cover', height: '250px', width: '100%' }}
                        />
                      </a>
                    </div>
                  )}

                  {/* Trending Images */}
                  <div className="card shadow-sm border-0 mb-4">
                    <div className="card-header bg-primary text-white fw-bold d-flex justify-content-between align-items-center">
                      <span>Trending Images</span>
                      {primaryBooruUrl && (
                        <a
                          href={`${primaryBooruUrl}/search?q=first_seen_at.gt:3 days ago&sf=wilson_score&sd=desc`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white text-decoration-none small"
                        >
                          View All
                        </a>
                      )}
                    </div>
                    <div className="card-body p-2">
                      <div className="row row-cols-2 g-2">
                        {trendingImages.map((img) => (
                          <div className="col" key={`trend-${img.booruUrl}-${img.id}`}>
                            <a
                              href={`${img.booruUrl}/${img.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={img.representations.thumb_small || img.representations.thumb}
                                className="w-100 rounded"
                                alt="Trending"
                                style={{ objectFit: 'cover', height: '100px' }}
                              />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Links */}
                  {primaryBooruUrl && (
                    <div className="list-group shadow-sm mb-4">
                      <a
                        href={`${primaryBooruUrl}/search?q=*&sf=score&sd=desc`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="list-group-item list-group-item-action fw-semibold"
                      >
                        🌟 All Time Top Scoring
                      </a>
                      <a
                        href={`${primaryBooruUrl}/comments`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="list-group-item list-group-item-action fw-semibold"
                      >
                        💬 Recent Comments
                      </a>
                      <a
                        href={`${primaryBooruUrl}/search?q=first_seen_at.gt:3%20days%20ago&sf=comment_count&sd=desc`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="list-group-item list-group-item-action fw-semibold"
                      >
                        🔥 Most Commented-on Images
                      </a>
                    </div>
                  )}
                </div>

                {/* Main Content Area */}
                <div className="col-lg-9 col-md-8">
                  <SearchBar onSearchSubmit={handleSearch} />

                  {isSearching ? (
                    <div className="text-center mt-5">
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
                </div>
              </div>

              {/* Watched Images Bottom Section */}
              {watchedImages.length > 0 && (
                <div className="row mt-5">
                  <div className="col-12">
                    <h3 className="mb-4 text-secondary border-bottom pb-2">Watched Images</h3>
                    <ImageGallery imagesList={watchedImages} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
