import { useEffect, useState, useRef } from 'react';
import TinySimpleDice from 'tiny-essentials/libs/TinySimpleDice';
import { initDatabase } from './db/connection';
import {
  syncUserGalleryPages,
  searchImages,
  getFeaturedImage,
  fixImageObj,
  getActiveAccounts,
  clearImageCache,
} from './services/api';

import { SearchBar } from './components/SearchBar';
import { ImageGallery, Image } from './components/ImageGallery';
import { SettingsPanel } from './components/SettingsPanel';
import { ImageViewer } from './components/ImageViewer';
import { UserProfile } from './components/UserProfile';

/** @typedef {import('./services/api').ImageResult} ImageResult */
/** @typedef {import('./services/api').ImageObj} ImageObj */
/** @typedef {import('./services/api').Account} Account */

/**
 * @returns {{ isDark: boolean, mode: string }}
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

  const customDanger = localStorage.getItem('app_danger');
  if (customDanger) {
    root.style.setProperty('--app-danger', customDanger);
    root.style.setProperty(
      '--app-danger-hover',
      shadeHexColor(customDanger, isDark ? 0.15 : -0.15),
    );
  } else {
    root.style.removeProperty('--app-danger');
    root.style.removeProperty('--app-danger-hover');
  }

  applyColor('app_navbar', '--app-navbar-bg');
  applyColor('app_text', '--app-text');
  applyColor('app_text_muted', '--app-text-muted');

  applyColor('app_input_bg', '--app-input-bg');
  applyColor('app_input_text', '--app-input-text');
  applyColor('app_badge_bg', '--app-badge-bg');
  applyColor('app_badge_text', '--app-badge-text');
  applyColor('app_spinner', '--app-spinner-color');

  applyColor('alert_warning_bg', '--alert-warning-bg');
  applyColor('alert_warning_text', '--alert-warning-text');
  applyColor('alert_info_bg', '--alert-info-bg');
  applyColor('alert_info_text', '--alert-info-text');
  applyColor('alert_danger_bg', '--alert-danger-bg');
  applyColor('alert_danger_text', '--alert-danger-text');

  applyColor('app_fave', '--fave-color');
  applyColor('app_upvote', '--upvote-color');
  applyColor('app_downvote', '--downvote-color');

  return { isDark, mode };
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
          style={{ width: '70px', padding: '0.25rem' }}
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

  /** @type {[{account: Account, image: ImageObj}|null, import('react').Dispatch<import('react').SetStateAction<{account: Account, image: ImageObj}[]>>]} */
  const [featuredImage, setFeaturedImage] = useState(null);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isDbReady, setIsDbReady] = useState(false);

  /** @type {[Account[]|null, import('react').Dispatch<import('react').SetStateAction<Account[]>>]} */
  const [connectedAccounts, setConnectedAccounts] = useState(null);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [showSettings, setShowSettings] = useState(false);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isHomepage, setIsHomepage] = useState(true);

  /** @type {[ImageResult|null, import('react').Dispatch<import('react').SetStateAction<ImageResult|null>>]} */
  const [viewingImage, setViewingImage] = useState(null);

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

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isDark, setIsDark] = useState(false);

  /** @type {[{ booruUrl: string, username: string, id: number }|null, import('react').Dispatch<import('react').SetStateAction<{ booruUrl: string, username: string }|null>>]} */
  const [viewingProfile, setViewingProfile] = useState(null);

  /** @type {[string[], import('react').Dispatch<import('react').SetStateAction<string[]>>]} */
  const [visibleBoorus, setVisibleBoorus] = useState(() => {
    const saved = localStorage.getItem('app_visibleBoorus');
    return saved ? JSON.parse(saved) : [];
  });

  /** @type {[Account|null, import('react').Dispatch<import('react').SetStateAction<Account|null>>]} */
  const [selectedLinkAccount, setSelectedLinkAccount] = useState(null);

  /** @type {import('react').MutableRefObject<boolean>} */
  const hasInitialized = useRef(false);

  /** @type {import('react').MutableRefObject<boolean>} */
  const hasSynced = useRef(false);

  /** @type {import('react').MutableRefObject<boolean>} */
  const isFirstLoad = useRef(true);

  // Refs for Dropdown and Sync control Smart
  const booruDropdownRef = useRef(null);
  const lastSyncedBoorus = useRef(visibleBoorus);
  const latestVisibleBoorus = useRef(visibleBoorus);

  // Updates references and localStorage visual without causing immediate side-effects
  useEffect(() => {
    latestVisibleBoorus.current = visibleBoorus;
    localStorage.setItem('app_visibleBoorus', JSON.stringify(visibleBoorus));
  }, [visibleBoorus]);

  /**
   * Shoot refresh of the boorus if there was a real change
   * @param {string[]} newBoorus
   */
  const applyBooruChanges = async (newBoorus) => {
    const oldSet = new Set(lastSyncedBoorus.current);
    const newSet = new Set(newBoorus);
    const isSame = oldSet.size === newSet.size && [...oldSet].every((x) => newSet.has(x));

    if (isSame) return; // Just gives refresh if you really changed something

    setIsSearching(true);
    await clearImageCache(); // Cleans old images
    lastSyncedBoorus.current = newBoorus;

    // Selects a new Featured Image and fixes Link Account if the current one was hidden
    if (connectedAccounts && connectedAccounts.length > 0) {
      const activeAccounts = connectedAccounts.filter((a) => newBoorus.includes(a.booruUrl));

      if (activeAccounts.length > 0) {
        const randomAcc = activeAccounts[TinySimpleDice.rollArrayIndex(activeAccounts)];
        const feat = await getFeaturedImage(randomAcc.booruUrl);
        setFeaturedImage(feat ? { account: randomAcc, image: feat } : null);

        if (!selectedLinkAccount || !newBoorus.includes(selectedLinkAccount.booruUrl)) {
          setSelectedLinkAccount(randomAcc);
        }
      } else {
        setFeaturedImage(null);
        setSelectedLinkAccount(null);
      }
    }

    await executeBackgroundSync(newBoorus);
    setIsSearching(false);
  };

  // Bootstrap native listener to capture the exact moment that dropdown closes
  useEffect(() => {
    const el = booruDropdownRef.current;
    if (!el) return;

    const handleHidden = () => {
      window.dispatchEvent(new CustomEvent('boorusDropdownClosed'));
    };

    el.addEventListener('hidden.bs.dropdown', handleHidden);
    return () => el.removeEventListener('hidden.bs.dropdown', handleHidden);
  }, []);

  // Engages sync with the most current state variables
  useEffect(() => {
    const onDropdownClosed = () => applyBooruChanges(latestVisibleBoorus.current);
    window.addEventListener('boorusDropdownClosed', onDropdownClosed);
    return () => window.removeEventListener('boorusDropdownClosed', onDropdownClosed);
  });

  /**
   * @param {number} limitToUse
   * @param {number} pageToUse
   * @param {string} queryToUse
   * @param {string[]} boorusToUse
   * @returns {Promise<void>}
   */
  const loadLocalData = async (limitToUse, pageToUse, queryToUse, boorusToUse) => {
    /** @type {ImageResult[]} */
    const mainResults = await searchImages(queryToUse, limitToUse, pageToUse, boorusToUse);
    setCurrentImages(mainResults);

    /** @type {boolean} */
    const isSpecialSearch = queryToUse.trim() !== '' && queryToUse.trim() !== '*';

    // Only load special content if on Page 1 and no search query
    if (!isSpecialSearch && isHomepage) {
      /** @type {ImageResult[]} */
      const trendingResults = await searchImages('first_seen_at.gt:3 days ago', 4, 1, boorusToUse);
      setTrendingImages(trendingResults);

      /** @type {ImageResult[]} */
      const watchedResults = await searchImages('my:watched', limitToUse, 1, boorusToUse);
      setWatchedImages(watchedResults);
    }
  };

  /**
   * @param {string[]} boorusToUse
   * @returns {Promise<void>}
   */
  const executeBackgroundSync = async (boorusToUse) => {
    try {
      /** @type {string} */
      const queryToUse = searchQuery.trim() === '' ? '*' : searchQuery;
      /** @type {boolean} */
      const isSpecialSearch = queryToUse !== '*';

      const syncPromises = [syncUserGalleryPages(queryToUse, currentPage, boorusToUse)];

      if (!isSpecialSearch && isHomepage) {
        syncPromises.push(syncUserGalleryPages('first_seen_at.gt:3 days ago', 1, boorusToUse, 4));
        syncPromises.push(syncUserGalleryPages('my:watched', 1, boorusToUse));
      }

      const results = await Promise.all(syncPromises);
      const mainSync = results[0];

      setPageLimit(mainSync.syncLimit);
      setTotalPages(Math.max(1, Math.ceil(mainSync.totalCount / mainSync.syncLimit)));

      await loadLocalData(mainSync.syncLimit, currentPage, queryToUse, boorusToUse);
    } catch (err) {
      console.error('Error on background sync:', err);
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
      }

      if (!showSettings && isDbReady && !hasSynced.current) {
        hasSynced.current = true;
        setIsSearching(true);

        try {
          const accounts = await getActiveAccounts();
          setConnectedAccounts(accounts);

          let activeUrls = visibleBoorus;
          // Automatically check all boorus if none are saved or available
          if (activeUrls.length === 0 && accounts.length > 0) {
            activeUrls = accounts.map((a) => a.booruUrl);
            setVisibleBoorus(activeUrls);
          }

          /** @type {string} */
          const queryToUse = searchQuery.trim() === '' ? '*' : searchQuery;
          /** @type {boolean} */
          const isSpecialSearch = queryToUse !== '*';

          const syncPromises = [syncUserGalleryPages(queryToUse, currentPage, activeUrls)];

          if (!isSpecialSearch && isHomepage) {
            syncPromises.push(
              syncUserGalleryPages('first_seen_at.gt:3 days ago', 1, activeUrls, 4),
            );
            syncPromises.push(syncUserGalleryPages('my:watched', 1, activeUrls));
          }

          const results = await Promise.all(syncPromises);
          const mainSync = results[0];

          setPageLimit(mainSync.syncLimit);
          setTotalPages(Math.max(1, Math.ceil(mainSync.totalCount / mainSync.syncLimit)));

          if (!isSpecialSearch && isHomepage && activeUrls.length > 0) {
            /** @type {Account[]} */
            const filteredAccounts = accounts.filter((a) => activeUrls.includes(a.booruUrl));
            if (filteredAccounts.length > 0) {
              const acc = filteredAccounts[TinySimpleDice.rollArrayIndex(filteredAccounts)];
              const feat = await getFeaturedImage(acc.booruUrl);
              setFeaturedImage(feat ? { account: acc, image: feat } : null);

              if (!selectedLinkAccount) setSelectedLinkAccount(acc);
            }
          }

          lastSyncedBoorus.current = activeUrls; // Register initial sync
          latestVisibleBoorus.current = activeUrls;

          await loadLocalData(mainSync.syncLimit, currentPage, queryToUse, activeUrls);
          isFirstLoad.current = false;
        } finally {
          setIsSearching(false);
        }
      }
    };

    setupEnvironment();
  }, [isDbReady, showSettings, currentPage, searchQuery]);

  useEffect(() => {
    const applyThemeScript = () => {
      const { isDark } = applyThemeFromStorage();
      setIsDark(isDark);
    };
    applyThemeScript();

    const handleThemeEvent = () => applyThemeScript();
    window.addEventListener('themeChanged', handleThemeEvent);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if ((localStorage.getItem('app_themeMode') || 'system') === 'system') {
        applyThemeScript();
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      window.removeEventListener('themeChanged', handleThemeEvent);
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Smart Inactive Auto-Refresh detector
  useEffect(() => {
    let hiddenTimestamp = 0;

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenTimestamp = Date.now();
      } else {
        if (hiddenTimestamp && Date.now() - hiddenTimestamp > 60000) {
          // 60s

          // Dispatches a global event that ImageViewer and UserProfile can listen to
          window.dispatchEvent(new CustomEvent('appFocusRefresh'));

          // Only syncs the main feed if we are not actively looking at a modal component
          if (!viewingProfile && !viewingImage) {
            setIsSearching(true);
            executeBackgroundSync(visibleBoorus).finally(() => setIsSearching(false));
          }
        }
        hiddenTimestamp = 0;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [
    searchQuery,
    currentPage,
    pageLimit,
    isHomepage,
    viewingProfile,
    viewingImage,
    visibleBoorus,
  ]);

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
    setViewingProfile(null);
    setSearchQuery(newQuery);
    setCurrentPage(1);
    setViewingImage(null);
    hasSynced.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * @param {number} newPage
   */
  const changePage = (newPage) => {
    setIsHomepage(false);
    setViewingProfile(null);
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
    setViewingImage(null);
    setViewingProfile(null);
    hasSynced.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleCloseSettings();
  };

  /**
   * @param {ImageResult} img
   */
  const handleOpenImage = (img) => {
    setViewingProfile(null);
    setViewingImage(img);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProfile = (booruUrl, username, id) => {
    setViewingImage(null);
    setViewingProfile({ booruUrl, username, id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** @type {boolean} */
  const showSpecialContent =
    (searchQuery.trim() === '' || searchQuery.trim() === '*') && isHomepage;

  return (
    <div className="min-vh-100 pb-5" style={{ backgroundColor: 'var(--app-bg)' }}>
      <nav className="navbar navbar-expand-lg custom-navbar sticky-top shadow-sm">
        <div className="container-fluid px-4 d-flex align-items-center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              goToHome();
            }}
            className="navbar-brand mb-0 fw-bold d-flex align-items-center text-decoration-none"
            style={{ color: 'var(--app-navbar-text)' }}
          >
            <img
              src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              alt="Logo"
              className="app-logo bg-primary"
            />
            Philomena Multi-Booru
          </a>

          <button
            className="navbar-toggler border-0 ms-auto"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#mobileMenu"
            aria-controls="mobileMenu"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="mobileMenu"
            style={{ backgroundColor: 'var(--app-navbar-bg)' }}
          >
            <div
              className="offcanvas-header border-bottom"
              style={{ borderColor: 'var(--app-border)' }}
            >
              <h5 className="offcanvas-title fw-bold" style={{ color: 'var(--app-navbar-text)' }}>
                Menu
              </h5>
              <button
                type="button"
                className="btn-close"
                style={{ filter: 'invert(1)' }}
                data-bs-dismiss="offcanvas"
                aria-label="Close"
              ></button>
            </div>

            <div className="offcanvas-body align-items-lg-center">
              {!showSettings && (
                <div className="mx-lg-3 my-3 my-lg-0 flex-grow-1" style={{ maxWidth: '600px' }}>
                  <SearchBar
                    onSearchSubmit={(q) => {
                      handleSearchSubmit(q);
                      // Trigger visual close for manual DOM if you need it, but Bootstrap already manages well
                      const offcanvasElement = document.getElementById('mobileMenu');
                      if (offcanvasElement && offcanvasElement.classList.contains('show')) {
                        const closeBtn = offcanvasElement.querySelector('.btn-close');
                        if (closeBtn) closeBtn.click();
                      }
                    }}
                    initialQuery={searchQuery}
                    isLoading={isSearching}
                  />
                </div>
              )}

              <div className="ms-lg-auto d-flex flex-column flex-lg-row align-items-start align-items-lg-center gap-3 gap-lg-0 mt-2 mt-lg-0">
                {/* Booru Instance Filter Dropdown */}
                <div className="dropdown me-lg-3 w-100 w-lg-auto" ref={booruDropdownRef}>
                  <button
                    className="btn btn-sm text-nowrap w-100 d-flex justify-content-between align-items-center gap-2"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      color: 'var(--app-text)',
                      border: '1px solid var(--app-border)',
                    }}
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    data-bs-auto-close="outside"
                  >
                    <span className="fw-bold">
                      Boorus ({visibleBoorus.length}/{connectedAccounts?.length || 0})
                    </span>
                    <i className="bi bi-chevron-down"></i>
                  </button>
                  <ul
                    className="dropdown-menu dropdown-menu-end shadow-sm"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <li>
                      <button
                        className="dropdown-item fw-bold text-success"
                        onClick={() => {
                          const allAccounts = connectedAccounts.map((a) => a.booruUrl);
                          setVisibleBoorus(allAccounts);
                          applyBooruChanges(allAccounts); // Apply immediately!
                        }}
                      >
                        Select All
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item fw-bold text-danger"
                        onClick={() => {
                          setVisibleBoorus([]);
                          applyBooruChanges([]); // Apply immediately!
                        }}
                      >
                        Deselect All
                      </button>
                    </li>
                    <li>
                      <hr
                        className="dropdown-divider"
                        style={{ borderColor: 'var(--app-border)' }}
                      />
                    </li>
                    {connectedAccounts?.map((acc) => {
                      const isVisible = visibleBoorus.includes(acc.booruUrl);
                      return (
                        <li key={acc.id}>
                          <button
                            className="dropdown-item d-flex align-items-center gap-2"
                            onClick={(e) => {
                              e.preventDefault();
                              if (isVisible)
                                setVisibleBoorus(
                                  visibleBoorus.filter((url) => url !== acc.booruUrl),
                                );
                              else setVisibleBoorus([...visibleBoorus, acc.booruUrl]);
                            }}
                            style={{ color: 'var(--app-text)' }}
                          >
                            <input
                              type="checkbox"
                              className="form-check-input m-0"
                              checked={isVisible}
                              readOnly
                            />
                            {new URL(acc.booruUrl).hostname}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <button
                  className="btn btn-sm btn-outline-light text-nowrap w-100 w-lg-auto"
                  data-bs-dismiss="offcanvas"
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
          </div>
        </div>
      </nav>

      {showSettings ? (
        <SettingsPanel isDark={isDark} onClose={handleCloseSettings} />
      ) : viewingProfile ? (
        <UserProfile
          booruUrl={viewingProfile.booruUrl}
          userId={viewingProfile.id}
          username={viewingProfile.username}
          onClose={() => setViewingProfile(null)}
          onOpenImage={handleOpenImage}
          onOpenProfile={handleOpenProfile}
          handleSearchSubmit={handleSearchSubmit}
        />
      ) : viewingImage ? (
        <ImageViewer
          image={viewingImage}
          onClose={() => setViewingImage(null)}
          onSearch={handleSearchSubmit}
          onOpenProfile={handleOpenProfile}
          onOpenImage={handleOpenImage}
        />
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
              <div className="row g-4">
                {/* Left Sidebar - Hidden during active searches or pagination */}
                {showSpecialContent && (
                  <div className="col-12 col-lg-auto sidebar-container">
                    {/* Featured Images */}
                    {featuredImage && visibleBoorus.includes(featuredImage.account.booruUrl) && (
                      <div className="card shadow-sm border-0 mb-4 featured-images">
                        <div
                          className="card-header fw-bold d-flex justify-content-between"
                          style={{ borderColor: 'var(--app-border)' }}
                        >
                          <span>Featured Image</span>
                        </div>
                        <Image
                          className="rounded-0"
                          img={fixImageObj(featuredImage.image)}
                          onOpenImage={handleOpenImage}
                        />
                      </div>
                    )}

                    {/* Trending Images */}
                    <div className="card shadow-sm border-0 mb-4">
                      <div className="card-header fw-bold d-flex justify-content-between align-items-center">
                        <span>Trending Images</span>
                        <button
                          onClick={() => handleSearchSubmit('first_seen_at.gt:3 days ago')}
                          className="btn btn-link text-white text-decoration-none small p-0 align-baseline"
                        >
                          View All
                        </button>
                      </div>
                      <div className="card-body p-3">
                        <ImageGallery
                          imagesList={trendingImages}
                          gridClass="row-cols-2 g-2"
                          onOpenImage={handleOpenImage}
                        />
                      </div>
                    </div>

                    {/* Quick Links with Configurable Account */}
                    {selectedLinkAccount && visibleBoorus.length > 0 && (
                      <div className="list-group shadow-sm mb-4">
                        <div
                          className="list-group-item fw-bold small d-flex flex-column flex-sm-row justify-content-between align-items-sm-center py-2"
                          style={{
                            backgroundColor: 'var(--app-surface)',
                            borderColor: 'var(--app-border)',
                            borderBottomWidth: '2px',
                          }}
                        >
                          <span className="mb-2 mb-sm-0">Links:</span>
                          <select
                            className="form-select form-select-sm w-auto py-0"
                            style={{
                              fontSize: '0.8rem',
                              backgroundColor: 'var(--app-bg)',
                              color: 'var(--app-text)',
                              borderColor: 'var(--app-border)',
                            }}
                            value={selectedLinkAccount.booruUrl}
                            onChange={(e) =>
                              setSelectedLinkAccount(
                                connectedAccounts.find((a) => a.booruUrl === e.target.value),
                              )
                            }
                          >
                            {connectedAccounts
                              .filter((a) => visibleBoorus.includes(a.booruUrl))
                              .map((acc) => (
                                <option key={acc.id} value={acc.booruUrl}>
                                  {new URL(acc.booruUrl).hostname}
                                </option>
                              ))}
                          </select>
                        </div>
                        <a
                          href={`${selectedLinkAccount.booruUrl}/search?q=*&sf=score&sd=desc`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="list-group-item list-group-item-action fw-semibold"
                        >
                          🌟 All Time Top Scoring
                        </a>
                        <a
                          href={`${selectedLinkAccount.booruUrl}/comments`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="list-group-item list-group-item-action fw-semibold"
                        >
                          💬 Recent Comments
                        </a>
                        <a
                          href={`${selectedLinkAccount.booruUrl}/search?q=first_seen_at.gt:3%20days%20ago&sf=comment_count&sd=desc`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="list-group-item list-group-item-action fw-semibold"
                        >
                          🔥 Most Commented-on
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Content Area */}
                <div className="col-12 col-lg" style={{ minWidth: 0, minHeight: '80vh' }}>
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

                      <ImageGallery
                        gridClass={`row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-lg-4 row-cols-xl-6 g-2`}
                        imagesList={currentImages}
                        onOpenImage={handleOpenImage}
                      />

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
                        className="btn btn-outline-secondary btn-sm fw-bold"
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
                    <ImageGallery
                      gridClass="row-cols-1 row-cols-sm-2 row-cols-md-6 row-cols-lg-7 g-2"
                      imagesList={watchedImages}
                      onOpenImage={handleOpenImage}
                    />
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
