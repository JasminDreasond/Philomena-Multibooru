import { useEffect, useState, useRef } from 'react';
import { initDatabase } from './db/connection';
import {
  syncUserGalleryPages,
  searchImages,
  getFeaturedImage,
  getSystemSettings,
} from './services/api';

import { SearchBar } from './components/SearchBar';
import { ImageGallery } from './components/ImageGallery';
import { SettingsPanel } from './components/SettingsPanel';

/** @typedef {import('./services/api').ImageResult} ImageResult */
/** @typedef {import('./services/api').ImageObj} ImageObj */
/** @typedef {import('./services/api').Account} Account */

/**
 * @param {{ currentPage: number, totalPages: number, onPageChange: (page: number) => void }} props
 */
const PaginationBar = ({ currentPage, totalPages, onPageChange }) => {
  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [jumpValue, setJumpValue] = useState(currentPage.toString());

  useEffect(() => {
    setJumpValue(currentPage.toString());
  }, [currentPage]);

  /**
   * @param {number} total
   * @param {number} current
   * @returns {(number|string)[]}
   */
  const getPageNumbers = (total, current) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const handleJump = () => {
    /** @type {number} */
    const val = parseInt(jumpValue, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      onPageChange(val);
    } else {
      setJumpValue(currentPage.toString());
    }
  };

  /** @type {(number|string)[]} */
  const pages = getPageNumbers(totalPages, currentPage);

  if (totalPages <= 1) return null;

  return (
    <div className="d-flex flex-column flex-md-row justify-content-center align-items-center my-4">
      <ul className="pagination mb-0 me-md-3 shadow-sm">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous"
          >
            <span aria-hidden="true">&laquo;</span>
          </button>
        </li>

        {pages.map((num, idx) => (
          <li
            key={idx}
            className={`page-item ${num === currentPage ? 'active' : ''} ${num === '...' ? 'disabled' : ''}`}
          >
            <button
              className="page-link"
              onClick={() => typeof num === 'number' && onPageChange(num)}
              disabled={num === '...'}
            >
              {num}
            </button>
          </li>
        ))}

        <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next"
          >
            <span aria-hidden="true">&raquo;</span>
          </button>
        </li>
      </ul>

      <div className="d-flex align-items-center mt-3 mt-md-0 bg-white p-1 rounded shadow-sm border">
        <span className="text-muted mx-2 small fw-semibold">Page:</span>
        <input
          type="number"
          className="form-control form-control-sm text-center border-secondary"
          style={{ width: '70px' }}
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJump()}
        />
        <span className="text-muted mx-2 small fw-semibold">/ {totalPages}</span>
        <button className="btn btn-sm btn-secondary me-1" onClick={handleJump}>
          Go
        </button>
      </div>
    </div>
  );
};

const App = () => {
  /** @type {[ImageResult[], import('react').Dispatch<import('react').SetStateAction<ImageResult[]>>]} */
  const [currentImages, setCurrentImages] = useState([]);

  /** @type {[ImageResult[], import('react').Dispatch<import('react').SetStateAction<ImageResult[]>>]} */
  const [trendingImages, setTrendingImages] = useState([]);

  /** @type {[ImageResult[], import('react').Dispatch<import('react').SetStateAction<ImageResult[]>>]} */
  const [watchedImages, setWatchedImages] = useState([]);

  /** @type {[{account: Account, image: ImageObj}[], import('react').Dispatch<import('react').SetStateAction<{account: Account, image: ImageObj}[]>>]} */
  const [featuredImagesList, setFeaturedImagesList] = useState([]);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isDbReady, setIsDbReady] = useState(false);

  /** @type {[Account[]|null, import('react').Dispatch<import('react').SetStateAction<Account[]>>]} */
  const [connectedAccounts, setConnectedAccounts] = useState(null);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [showSettings, setShowSettings] = useState(false);

  /** @type {[number, import('react').Dispatch<import('react').SetStateAction<number>>]} */
  const [pageLimit, setPageLimit] = useState(50);

  /** @type {[number, import('react').Dispatch<import('react').SetStateAction<number>>]} */
  const [currentPage, setCurrentPage] = useState(1);

  /** @type {[number, import('react').Dispatch<import('react').SetStateAction<number>>]} */
  const [totalPages, setTotalPages] = useState(1);

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [searchQuery, setSearchQuery] = useState('');

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isSearching, setIsSearching] = useState(false);

  /** @type {import('react').MutableRefObject<boolean>} */
  const hasInitialized = useRef(false);

  /** @type {import('react').MutableRefObject<boolean>} */
  const hasSynced = useRef(false);

  /**
   * @param {number} limitToUse
   * @param {number} pageToUse
   * @param {string} queryToUse
   * @returns {Promise<void>}
   */
  const loadLocalData = async (limitToUse, pageToUse, queryToUse) => {
    /** @type {ImageResult[]} */
    const mainResults = await searchImages(queryToUse, limitToUse, pageToUse);
    setCurrentImages(mainResults);

    /** @type {boolean} */
    const isSpecialSearch = queryToUse.trim() !== '' && queryToUse.trim() !== '*';

    // Only load special content if on Page 1 and no search query
    if (!isSpecialSearch && pageToUse === 1) {
      /** @type {ImageResult[]} */
      const trendingResults = await searchImages('first_seen_at.gt:3 days ago', 4, 1);
      setTrendingImages(trendingResults);

      /** @type {ImageResult[]} */
      const watchedResults = await searchImages('my:watched', limitToUse, 1);
      setWatchedImages(watchedResults);
    }
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
        await loadLocalData(pageLimit, currentPage, searchQuery);
      }

      if (!showSettings && isDbReady && !hasSynced.current) {
        hasSynced.current = true;
        setIsSearching(true);

        try {
          /** @type {string} */
          const queryToUse = searchQuery.trim() === '' ? '*' : searchQuery;
          /** @type {boolean} */
          const isSpecialSearch = queryToUse !== '*';

          const sysSettings = await getSystemSettings();
          const syncPromises = [syncUserGalleryPages(queryToUse, currentPage)];

          if (!isSpecialSearch && currentPage === 1) {
            syncPromises.push(syncUserGalleryPages('first_seen_at.gt:3 days ago', 1));
            syncPromises.push(syncUserGalleryPages('my:watched', 1));
          }

          const results = await Promise.all(syncPromises);
          const mainSync = results[0];

          const accounts = mainSync.accounts;
          const syncLimit = mainSync.syncLimit;
          const totalCount = mainSync.totalCount;

          setConnectedAccounts(accounts);
          setPageLimit(syncLimit);
          setTotalPages(Math.max(1, Math.ceil(totalCount / syncLimit)));

          if (!isSpecialSearch && currentPage === 1 && accounts.length > 0) {
            /** @type {Account[]} */
            const targetAccounts = sysSettings.mixAllBoorus === 1 ? accounts : [accounts[0]];
            /** @type {{account: Account, image: ImageObj}[]} */
            const fetchedFeatures = [];

            for (const acc of targetAccounts) {
              const feat = await getFeaturedImage(acc.booruUrl);
              if (feat) fetchedFeatures.push({ account: acc, image: feat });
            }
            setFeaturedImagesList(fetchedFeatures);
          }

          await loadLocalData(syncLimit, currentPage, queryToUse);
        } finally {
          setIsSearching(false);
        }
      }
    };

    setupEnvironment();
  }, [isDbReady, showSettings, currentPage, searchQuery]);

  /**
   * @returns {void}
   */
  const handleCloseSettings = () => {
    setShowSettings(false);
    hasSynced.current = false;
  };

  /**
   * @param {string} newQuery
   */
  const handleSearchSubmit = (newQuery) => {
    setSearchQuery(newQuery);
    setCurrentPage(1);
    hasSynced.current = false;
  };

  /**
   * @param {number} newPage
   */
  const changePage = (newPage) => {
    setCurrentPage(newPage);
    hasSynced.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * @returns {void}
   */
  const goToHome = () => {
    setSearchQuery('');
    setCurrentPage(1);
    hasSynced.current = false;
  };

  /** @type {boolean} */
  const showSpecialContent =
    (searchQuery.trim() === '' || searchQuery.trim() === '*') && currentPage === 1;

  /** @type {Account[]} */
  const activeSidebarAccounts = connectedAccounts ? featuredImagesList.map((f) => f.account) : [];

  return (
    <div className="bg-light min-vh-100 pb-5">
      <nav className="navbar navbar-dark bg-dark shadow-sm sticky-top">
        <div className="container-fluid px-4 d-flex align-items-center">
          <span className="navbar-brand mb-0 h1 fs-3">Philomena Multi-Booru</span>

          <button
            className="btn btn-outline-info btn-sm text-nowrap me-3 d-none d-md-inline"
            onClick={goToHome}
          >
            Home
          </button>

          {!showSettings && (
            <SearchBar
              onSearchSubmit={handleSearchSubmit}
              initialQuery={searchQuery}
              isLoading={isSearching}
            />
          )}

          <div className="ms-auto d-flex align-items-center">
            <span className="text-light me-3 d-none d-lg-inline">
              Active APIs:{' '}
              <span className="badge bg-success">
                {connectedAccounts ? connectedAccounts.length : 0}
              </span>
            </span>
            <button
              className="btn btn-outline-light btn-sm text-nowrap"
              onClick={() => {
                if (!showSettings) hasSynced.current = false;
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
                {/* Left Sidebar - Hidden during active searches or pagination */}
                {showSpecialContent && (
                  <div className="col-lg-3 col-md-4 mb-4">
                    {/* Featured Images */}
                    {featuredImagesList.map((feature, idx) => (
                      <div
                        key={`feat-${feature.account.id}-${idx}`}
                        className="card shadow-sm border-0 bg-dark text-white mb-4"
                      >
                        <div className="card-header bg-secondary text-white fw-bold d-flex justify-content-between">
                          <span>Featured Image</span>
                          <small className="text-light opacity-75" title={feature.account.booruUrl}>
                            Booru {idx + 1}
                          </small>
                        </div>
                        <a
                          href={`${feature.account.booruUrl}/${feature.image.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={feature.image.representations.thumb || feature.image.source_url}
                            className="card-img-bottom"
                            alt="Featured"
                            style={{ objectFit: 'cover', height: '250px', width: '100%' }}
                          />
                        </a>
                      </div>
                    ))}

                    {/* Trending Images */}
                    <div className="card shadow-sm border-0 mb-4">
                      <div className="card-header bg-primary text-white fw-bold d-flex justify-content-between align-items-center">
                        <span>Trending Images</span>
                        {activeSidebarAccounts.length > 0 && (
                          <button
                            onClick={() => handleSearchSubmit('first_seen_at.gt:3 days ago')}
                            className="btn btn-link text-white text-decoration-none small p-0 align-baseline"
                          >
                            View All
                          </button>
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
                    {activeSidebarAccounts.map((acc, idx) => (
                      <div key={`links-${acc.id}-${idx}`} className="list-group shadow-sm mb-4">
                        <div className="list-group-item bg-light text-muted fw-bold small text-truncate">
                          Links: {acc.booruUrl}
                        </div>
                        <a
                          href={`${acc.booruUrl}/search?q=*&sf=score&sd=desc`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="list-group-item list-group-item-action fw-semibold"
                        >
                          🌟 All Time Top Scoring
                        </a>
                        <a
                          href={`${acc.booruUrl}/comments`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="list-group-item list-group-item-action fw-semibold"
                        >
                          💬 Recent Comments
                        </a>
                        <a
                          href={`${acc.booruUrl}/search?q=first_seen_at.gt:3%20days%20ago&sf=comment_count&sd=desc`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="list-group-item list-group-item-action fw-semibold"
                        >
                          🔥 Most Commented-on
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Main Content Area */}
                <div
                  className={showSpecialContent ? 'col-lg-9 col-md-8' : 'col-12'}
                  style={{ minHeight: '80vh' }}
                >
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
                    <>
                      <PaginationBar
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={changePage}
                      />

                      <ImageGallery imagesList={currentImages} />

                      <PaginationBar
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={changePage}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Watched Images Bottom Section */}
              {showSpecialContent && watchedImages.length > 0 && (
                <div className="row mt-5">
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                      <h3 className="mb-0 text-secondary">Watched Images</h3>
                      <button
                        className="btn btn-outline-secondary btn-sm fw-bold"
                        onClick={() => handleSearchSubmit('my:watched')}
                      >
                        Browse Watched Images
                      </button>
                    </div>

                    <PaginationBar
                      currentPage={1}
                      totalPages={Math.ceil(watchedImages.length / pageLimit) || 1}
                      onPageChange={() => handleSearchSubmit('my:watched')}
                    />
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
