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
 * @returns {void}
 */
const applyThemeFromStorage = () => {
  const root = document.documentElement;
  const mode = localStorage.getItem('app_themeMode') || 'system';

  let isDark = false;
  if (mode === 'dark') isDark = true;
  else if (
    mode === 'system' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    isDark = true;
  }

  root.setAttribute('data-theme', isDark ? 'dark' : 'light');

  /**
   * @param {string} color
   * @param {number} percent
   * @returns {string}
   */
  const shadeHexColor = (color, percent) => {
    let f = parseInt(color.slice(1), 16),
      t = percent < 0 ? 0 : 255,
      p = percent < 0 ? percent * -1 : percent,
      R = f >> 16,
      G = (f >> 8) & 0x00ff,
      B = f & 0x0000ff;
    return (
      '#' +
      (
        0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
      )
        .toString(16)
        .slice(1)
    );
  };

  /**
   * @param {string} key
   * @param {string} cssVar
   */
  const applyColor = (key, cssVar) => {
    const val = localStorage.getItem(key);
    if (val) root.style.setProperty(cssVar, val);
    else root.style.removeProperty(cssVar);
  };

  const customPrimary = localStorage.getItem('app_primary');
  if (customPrimary) {
    root.style.setProperty('--app-primary', customPrimary);
    root.style.setProperty(
      '--app-primary-hover',
      shadeHexColor(customPrimary, isDark ? 0.15 : -0.15),
    );
  } else {
    root.style.removeProperty('--app-primary');
    root.style.removeProperty('--app-primary-hover');
  }

  const customBg = localStorage.getItem('app_bg');
  if (customBg) {
    root.style.setProperty('--app-bg', customBg);
    root.style.setProperty('--app-surface', shadeHexColor(customBg, isDark ? 0.05 : 0.08));
    root.style.setProperty('--app-border', shadeHexColor(customBg, isDark ? 0.15 : -0.1));
  } else {
    root.style.removeProperty('--app-bg');
    root.style.removeProperty('--app-surface');
    root.style.removeProperty('--app-border');
  }

  applyColor('app_navbar', '--app-navbar-bg');
  applyColor('app_text', '--app-text');
  applyColor('app_text_muted', '--app-text-muted');

  applyColor('alert_warning_bg', '--alert-warning-bg');
  applyColor('alert_warning_text', '--alert-warning-text');
  applyColor('alert_info_bg', '--alert-info-bg');
  applyColor('alert_info_text', '--alert-info-text');
  applyColor('alert_danger_bg', '--alert-danger-bg');
  applyColor('alert_danger_text', '--alert-danger-text');

  applyColor('app_fave', '--fave-color');
  applyColor('app_upvote', '--upvote-color');
  applyColor('app_downvote', '--downvote-color');
};

/**
 * @param {{ currentPage: number, isHomepage: boolean, totalPages: number, onPageChange: (page: number) => void }} props
 */
const PaginationBar = ({ currentPage, isHomepage, totalPages, onPageChange }) => {
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
      <ul className="pagination mb-0 me-md-3">
        <li className={`page-item ${isHomepage ? 'disabled' : ''}`}>
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

      <div
        className="d-flex align-items-center mt-3 mt-md-0 p-1 rounded border"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        <span className="text-muted mx-2 small fw-semibold">Page:</span>
        <input
          type="number"
          className="form-control form-control-sm text-center page-jump-input"
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

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isHomepage, setIsHomepage] = useState(true);

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
    if (!isSpecialSearch && isHomepage) {
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

          if (!isSpecialSearch && isHomepage) {
            syncPromises.push(syncUserGalleryPages('first_seen_at.gt:3 days ago', 1));
            syncPromises.push(syncUserGalleryPages('my:watched', 1));
          }

          const results = await Promise.all(syncPromises);
          const mainSync = results[0];

          const accounts = mainSync.accounts;
          const syncLimit = mainSync.syncLimit;
          const totalCount = mainSync.totalCount;
          console.log(totalCount, syncLimit, Math.ceil(totalCount / syncLimit));

          setConnectedAccounts(accounts);
          setPageLimit(syncLimit);
          setTotalPages(Math.max(1, Math.ceil(totalCount / syncLimit)));

          if (!isSpecialSearch && isHomepage && accounts.length > 0) {
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

  useEffect(() => {
    applyThemeFromStorage();

    const handleThemeEvent = () => applyThemeFromStorage();
    window.addEventListener('themeChanged', handleThemeEvent);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if ((localStorage.getItem('app_themeMode') || 'system') === 'system') {
        applyThemeFromStorage();
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      window.removeEventListener('themeChanged', handleThemeEvent);
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

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
    setIsHomepage(false);
    setSearchQuery(newQuery);
    setCurrentPage(1);
    hasSynced.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * @param {number} newPage
   */
  const changePage = (newPage) => {
    setIsHomepage(false);
    setCurrentPage(newPage);
    hasSynced.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * @returns {void}
   */
  const goToHome = () => {
    setIsHomepage(true);
    setSearchQuery('');
    setCurrentPage(1);
    hasSynced.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleCloseSettings();
  };

  /** @type {boolean} */
  const showSpecialContent =
    (searchQuery.trim() === '' || searchQuery.trim() === '*') && isHomepage;

  /** @type {Account[]} */
  const activeSidebarAccounts = connectedAccounts ? featuredImagesList.map((f) => f.account) : [];

  return (
    <div className="min-vh-100 pb-5" style={{ backgroundColor: 'var(--app-bg)' }}>
      <nav className="navbar custom-navbar sticky-top py-1">
        <div className="container-fluid px-4 d-flex align-items-center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              goToHome();
            }}
            className="navbar-brand mb-0 fs-5 fw-bold d-flex align-items-center text-decoration-none"
            style={{ color: 'var(--app-navbar-text)' }}
          >
            <img
              src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              alt="Logo"
              className="app-logo bg-primary"
            />
            Philomena Multi-Booru
          </a>

          {!showSettings && (
            <div className="mx-3 flex-grow-1" style={{ maxWidth: '600px' }}>
              <SearchBar
                onSearchSubmit={handleSearchSubmit}
                initialQuery={searchQuery}
                isLoading={isSearching}
              />
            </div>
          )}

          <div className="ms-auto d-flex align-items-center">
            <span
              className="me-3 d-none d-lg-inline small fw-semibold"
              style={{ color: 'var(--app-navbar-text)' }}
            >
              Active APIs:{' '}
              <span className="badge bg-success ms-1">
                {connectedAccounts ? connectedAccounts.length : 0}
              </span>
            </span>
            <button
              className="btn btn-sm btn-outline-light text-nowrap"
              style={{ borderColor: 'var(--app-navbar-text)', color: 'var(--app-navbar-text)' }}
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
                        className="card shadow-sm border-0 mb-4"
                      >
                        <div
                          className="card-header fw-bold d-flex justify-content-between"
                          style={{ borderColor: 'var(--app-border)' }}
                        >
                          <span>Featured Image</span>
                          <small className="opacity-75" title={feature.account.booruUrl}>
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
                      <div
                        className="card-header fw-bold d-flex justify-content-between align-items-center"
                        style={{
                          backgroundColor: 'var(--app-primary)',
                          color: '#ffffff',
                          borderColor: 'var(--app-border)',
                        }}
                      >
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
                        <div
                          className="list-group-item fw-bold small text-truncate"
                          style={{
                            backgroundColor: 'var(--app-surface)',
                            borderColor: 'var(--app-border)',
                            borderBottomWidth: '2px',
                          }}
                        >
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
                      <div className="spinner-border text-primary" role="status">
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
                        isHomepage={isHomepage}
                        onPageChange={changePage}
                      />

                      <ImageGallery imagesList={currentImages} />

                      <PaginationBar
                        currentPage={currentPage}
                        isHomepage={isHomepage}
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
                    <div
                      className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2"
                      style={{ borderColor: 'var(--app-border)' }}
                    >
                      <h3 className="mb-0">Watched Images</h3>
                      <button
                        className="btn btn-secondary btn-sm fw-bold"
                        onClick={() => handleSearchSubmit('my:watched')}
                      >
                        Browse Watched Images
                      </button>
                    </div>

                    <PaginationBar
                      currentPage={1}
                      isHomepage={isHomepage}
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
