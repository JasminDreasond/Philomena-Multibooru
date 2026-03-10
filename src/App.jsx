import { useEffect, useState, useRef } from 'react';
import TinySimpleDice from 'tiny-essentials/libs/TinySimpleDice';
import { shuffleArray } from 'tiny-essentials/basics';
import { initDatabase } from './db/connection';
import {
  syncUserGalleryPages,
  searchImages,
  getFeaturedImage,
  fixImageObj,
  getActiveAccounts,
  clearImageCache,
  fetchSingleImage,
  fetchProfile,
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
 * @typedef {(e: MouseEvent<HTMLAnchorElement, MouseEvent>, query: string, sf: string, sd: string) => void} HandleQuickLinkClick
 */

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

/**
 * @param {{ sf: string, sd: string, onSortChange: (sf: string, sd: string) => void }} props
 */
const SearchControls = ({ sf, sd, onSortChange }) => {
  return (
    <div
      className="d-flex flex-wrap gap-2 align-items-center px-2 rounded shadow-sm border"
      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
    >
      <span className="fw-bold small ms-2" style={{ color: 'var(--app-text-muted)' }}>
        Sort by:
      </span>
      <select
        className="form-select form-select-sm w-auto fw-semibold"
        value={sf}
        onChange={(e) => onSortChange(e.target.value, sd)}
        style={{
          backgroundColor: 'var(--app-input-bg)',
          color: 'var(--app-input-text)',
          borderColor: 'var(--app-border)',
        }}
      >
        <option value="created_at">Created</option>
        <option value="updated_at">Updated</option>
        <option value="first_seen_at">First Seen</option>
        <option value="score">Score</option>
        <option value="upvotes">Upvotes</option>
        <option value="downvotes">Downvotes</option>
        <option value="faves">Faves</option>
        <option value="comments">Comments</option>
        <option value="size">File Size</option>
        <option value="width">Image Width</option>
        <option value="height">Image Height</option>
      </select>

      <span className="fw-bold small ms-2" style={{ color: 'var(--app-text-muted)' }}>
        Order:
      </span>
      <select
        className="form-select form-select-sm w-auto fw-semibold"
        value={sd}
        onChange={(e) => onSortChange(sf, e.target.value)}
        style={{
          backgroundColor: 'var(--app-input-bg)',
          color: 'var(--app-input-text)',
          borderColor: 'var(--app-border)',
        }}
      >
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
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

  /** @type {[{ booruUrl: string, username: string, id: number }|null, import('react').Dispatch<import('react').SetStateAction<{ booruUrl: string, username: string, id: number }|null>>]} */
  const [viewingProfile, setViewingProfile] = useState(null);

  /** @type {[string[], import('react').Dispatch<import('react').SetStateAction<string[]>>]} */
  const [visibleBoorus, setVisibleBoorus] = useState(() => {
    const saved = localStorage.getItem('app_visibleBoorus');
    return saved ? JSON.parse(saved) : [];
  });

  /** @type {[Account|null, import('react').Dispatch<import('react').SetStateAction<Account|null>>]} */
  const [selectedLinkAccount, setSelectedLinkAccount] = useState(null);

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [sortField, setSortField] = useState('created_at');

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [sortDirection, setSortDirection] = useState('desc');

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

  // Synchronizes internal App State outbound to the URL bar
  useEffect(() => {
    // The isFirstLoad.current lock ensures that the application does not delete the URL
    // original user before processing the deep link!
    if (!isDbReady || isFirstLoad.current) return;

    let newPath = '/';
    let newSearch = '';

    if (showSettings) {
      newPath = '/settings';
      if (window.location.search.includes('tab=')) newSearch = window.location.search;
    } else if (viewingProfile) {
      const host = new URL(viewingProfile.booruUrl).hostname;
      newPath = `/${host}/profiles/${viewingProfile.id}`;
    } else if (viewingImage) {
      const host = new URL(viewingImage.booruUrl).hostname;
      newPath = `/${host}/images/${viewingImage.id}`;
    } else if (!isHomepage) {
      newPath = '/search';
      const searchParams = new URLSearchParams();
      if (searchQuery && searchQuery !== '*') searchParams.set('q', searchQuery);
      if (sortField !== 'created_at') searchParams.set('sf', sortField);
      if (sortDirection !== 'desc') searchParams.set('sd', sortDirection);
      if (currentPage > 1) searchParams.set('page', currentPage.toString());

      const searchStr = searchParams.toString();
      if (searchStr) newSearch = `?${searchStr}`;
    }

    const targetUrl = newPath + newSearch;
    const currentUrl = window.location.pathname + window.location.search;

    // Push state only if it differs from the current active route
    if (currentUrl !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  }, [
    showSettings,
    viewingProfile,
    viewingImage,
    isHomepage,
    searchQuery,
    isDbReady,
    sortField,
    sortDirection,
    currentPage,
  ]);

  // Synchronizes document <title> with the active view
  useEffect(() => {
    const baseTitle = 'Philomena Multi-Booru';

    if (showSettings) {
      document.title = `Settings - ${baseTitle}`;
    } else if (viewingProfile) {
      document.title = `${viewingProfile.username}'s Profile - ${baseTitle}`;
    } else if (viewingImage) {
      const tagSnippet =
        viewingImage.tags && viewingImage.tags.length > 0
          ? ` - ${viewingImage.tags.join(', ')}`
          : '';
      document.title = `Image #${viewingImage.id}${tagSnippet} - ${baseTitle}`;
    } else if (!isHomepage && searchQuery && searchQuery !== '*') {
      document.title = `Search: ${searchQuery} - ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [showSettings, viewingProfile, viewingImage, isHomepage, searchQuery]);

  // Handle Forward/Back button navigation internally
  useEffect(() => {
    const handlePopState = async () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);

      if (path === '/' || path === '') {
        setIsHomepage(true);
        setShowSettings(false);
        setViewingImage(null);
        setViewingProfile(null);
        setSearchQuery('');
        setSortField('created_at');
        setSortDirection('desc');
        setCurrentPage(1);
        hasSynced.current = false; // Force recharge the main gallery if necessary
      } else if (path.startsWith('/settings')) {
        setShowSettings(true);
      } else if (path.startsWith('/search')) {
        const q = params.get('q') || '*';
        const sfParam = params.get('sf') || 'created_at';
        const sdParam = params.get('sd') || 'desc';
        const pParam = parseInt(params.get('page') || '1', 10);

        setSearchQuery(q);
        setSortField(sfParam);
        setSortDirection(sdParam);
        setCurrentPage(pParam);
        setIsHomepage(false);
        setViewingImage(null);
        setViewingProfile(null);
        setShowSettings(false);
        hasSynced.current = false; // Force reload the search
      } else {
        const imgMatch = path.match(/^\/([^/]+)\/images\/(\d+)/);
        const profMatch = path.match(/^\/([^/]+)\/profiles\/([^/]+)/);

        if (imgMatch || profMatch) {
          const accounts = await getActiveAccounts();
          const host = (imgMatch || profMatch)[1];
          const acc = accounts.find((a) => new URL(a.booruUrl).hostname === host);

          if (acc) {
            setIsHomepage(false);
            setShowSettings(false);

            if (imgMatch) {
              const imgData = await fetchSingleImage(acc.booruUrl, acc.apiKey, imgMatch[2]);
              if (imgData) {
                setViewingProfile(null);
                setViewingImage(imgData);
              }
            } else if (profMatch) {
              const profileData = await fetchProfile(acc.booruUrl, profMatch[2]);
              if (profileData) {
                setViewingImage(null);
                setViewingProfile({
                  booruUrl: acc.booruUrl,
                  username: profileData.name,
                  id: profileData.id,
                });
              }
            }
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
   * @param {string} sd
   * @param {string} sf
   * @returns {Promise<void>}
   */
  const loadLocalData = async (limitToUse, pageToUse, queryToUse, boorusToUse, sd, sf) => {
    /** @type {ImageResult[]} */
    const mainResults = await searchImages({
      query: queryToUse,
      limit: limitToUse,
      page: pageToUse,
      allowedBoorus: boorusToUse,
      sd,
      sf,
    });
    setCurrentImages(mainResults);

    /** @type {boolean} */
    const isSpecialSearch = queryToUse.trim() !== '' && queryToUse.trim() !== '*';

    // Only load special content if on Page 1 and no search query
    if (!isSpecialSearch && isHomepage) {
      /** @type {ImageResult[]} */
      const trendingResults = await searchImages({
        query: 'first_seen_at.gt:3 days ago',
        limit: 20,
        allowedBoorus: boorusToUse,
        sf: 'score',
        sd: 'desc',
      });

      setTrendingImages(shuffleArray(trendingResults).slice(0, 4));

      /** @type {ImageResult[]} */
      const watchedResults = await searchImages({
        query: 'my:watched',
        limit: limitToUse,
        allowedBoorus: boorusToUse,
      });
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

      await clearImageCache();
      const syncPromises = [
        syncUserGalleryPages({
          query: queryToUse,
          page: currentPage,
          allowedBoorus: boorusToUse,
          sd: sortDirection,
          sf: sortField,
        }),
      ];

      if (!isSpecialSearch && isHomepage) {
        syncPromises.push(
          syncUserGalleryPages({
            query: 'first_seen_at.gt:3 days ago',
            allowedBoorus: boorusToUse,
            perPage: 20,
            sf: 'score',
            sd: 'desc',
          }),
        );
        syncPromises.push(
          syncUserGalleryPages({ query: 'my:watched', allowedBoorus: boorusToUse }),
        );
      }

      const results = await Promise.all(syncPromises);
      const mainSync = results[0];

      setPageLimit(mainSync.syncLimit);
      setTotalPages(Math.max(1, Math.ceil(mainSync.totalCount / mainSync.syncLimit)));

      await loadLocalData(
        mainSync.syncLimit,
        currentPage,
        queryToUse,
        boorusToUse,
        sortDirection,
        sortField,
      );
    } catch (err) {
      console.error('Error on background sync:', err);
    }
  };

  const refreshHomepage = () => {
    setIsSearching(true);
    executeBackgroundSync(visibleBoorus).finally(() => setIsSearching(false));
  };

  useEffect(() => {
    /**
     * @returns {Promise<void>}
     */
    const setupEnvironment = async () => {
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        await initDatabase();
        await clearImageCache(); // Clean cache at startup!
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

          // === DEEP LINK PARSING ON INITIAL LOAD ===
          const path = window.location.pathname;
          const params = new URLSearchParams(window.location.search);
          let initialQuery = searchQuery.trim() === '' ? '*' : searchQuery;
          let isDeepLinkSpecial = false;
          let skipMainSync = false; // Lock to prevent unnecessary API calls at boot

          let initialSf = sortField;
          let initialSd = sortDirection;
          let initialPage = currentPage;

          if (isFirstLoad.current) {
            if (path.startsWith('/settings')) {
              setShowSettings(true);
              isDeepLinkSpecial = true;
              skipMainSync = true;
            } else if (path.startsWith('/search')) {
              const q = params.get('q') || '*';
              initialSf = params.get('sf') || 'created_at';
              initialSd = params.get('sd') || 'desc';
              initialPage = parseInt(params.get('page') || '1', 10);

              setSearchQuery(q);
              setSortField(initialSf);
              setSortDirection(initialSd);
              setCurrentPage(initialPage);
              initialQuery = q;
              setIsHomepage(false);
              isDeepLinkSpecial = true;
            } else if (path !== '/' && path !== '') {
              const imgMatch = path.match(/^\/([^/]+)\/images\/(\d+)/);
              const profMatch = path.match(/^\/([^/]+)\/profiles\/([^/]+)/);

              if (imgMatch || profMatch) {
                const host = (imgMatch || profMatch)[1];
                const acc = accounts.find((a) => new URL(a.booruUrl).hostname === host);

                if (acc) {
                  setIsHomepage(false);
                  isDeepLinkSpecial = true;
                  skipMainSync = true;

                  if (imgMatch) {
                    const imgData = await fetchSingleImage(acc.booruUrl, acc.apiKey, imgMatch[2]);
                    if (imgData) setViewingImage(imgData);
                  } else if (profMatch) {
                    const profileData = await fetchProfile(acc.booruUrl, profMatch[2]);
                    if (profileData) {
                      setViewingProfile({
                        booruUrl: acc.booruUrl,
                        username: profileData.name,
                        id: profileData.id,
                      });
                    }
                  }
                }
              }
            }
          }

          // If we have an active deep link, we skip the massive fetch of the Homepage here!
          if (!skipMainSync) {
            await clearImageCache();
            const isSpecialSearch = initialQuery !== '*';
            const syncPromises = [
              syncUserGalleryPages({
                query: initialQuery,
                page: initialPage,
                allowedBoorus: activeUrls,
                sd: initialSd,
                sf: initialSf,
              }),
            ];

            if (!isSpecialSearch && isHomepage && !isDeepLinkSpecial) {
              syncPromises.push(
                syncUserGalleryPages({
                  query: 'first_seen_at.gt:3 days ago',
                  allowedBoorus: activeUrls,
                  perPage: 20,
                  sf: 'score',
                  sd: 'desc',
                }),
              );
              syncPromises.push(
                syncUserGalleryPages({ query: 'my:watched', allowedBoorus: activeUrls }),
              );
            }

            const results = await Promise.all(syncPromises);
            const mainSync = results[0];

            if (mainSync) {
              setPageLimit(mainSync.syncLimit);
              setTotalPages(Math.max(1, Math.ceil(mainSync.totalCount / mainSync.syncLimit)));
            }

            if (!isSpecialSearch && isHomepage && !isDeepLinkSpecial && activeUrls.length > 0) {
              /** @type {Account[]} */
              const filteredAccounts = accounts.filter((a) => activeUrls.includes(a.booruUrl));
              if (filteredAccounts.length > 0) {
                const acc = filteredAccounts[TinySimpleDice.rollArrayIndex(filteredAccounts)];
                const feat = await getFeaturedImage(acc.booruUrl);
                setFeaturedImage(feat ? { account: acc, image: feat } : null);

                if (!selectedLinkAccount) setSelectedLinkAccount(acc);
              }
            }

            await loadLocalData(
              mainSync ? mainSync.syncLimit : 50,
              initialPage,
              initialQuery,
              activeUrls,
              initialSd,
              initialSf,
            );
          }

          lastSyncedBoorus.current = activeUrls;
          latestVisibleBoorus.current = activeUrls;
          isFirstLoad.current = false;
        } finally {
          setIsSearching(false);
        }
      }
    };

    setupEnvironment();
  }, [isDbReady, showSettings, currentPage, searchQuery, isHomepage, sortField, sortDirection]);

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
        const autoRefreshEnabled = localStorage.getItem('app_autoRefreshEnabled') === 'true';

        if (autoRefreshEnabled && hiddenTimestamp && Date.now() - hiddenTimestamp > 60000) {
          // 60s

          // Dispatches a global event that ImageViewer and UserProfile can listen to
          window.dispatchEvent(new CustomEvent('appFocusRefresh'));

          // Dispatches a global event that ImageViewer and UserProfile can listen to
          if (!viewingProfile && !viewingImage) refreshHomepage();
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
    sortField,
    sortDirection,
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
   * @param {string} newSf
   * @param {string} newSd
   */
  const handleSortChange = (newSf, newSd) => {
    setSortField(newSf);
    setSortDirection(newSd);
    setCurrentPage(1);
    hasSynced.current = false;
  };

  /**
   * Opens the link search query inside the application, unless it's a middle/ctrl click.
   * @param {import('react').MouseEvent<HTMLAnchorElement, MouseEvent>} e
   * @param {string} query
   * @param {string} sf
   * @param {string} sd
   */
  const handleQuickLinkClick = (e, query, sf, sd) => {
    if (e.ctrlKey || e.metaKey || e.button === 1) return;

    e.preventDefault();
    setSortField(sf);
    setSortDirection(sd);
    setCurrentPage(1);
    handleSearchSubmit(query);
  };

  /**
   * @returns {void}
   */
  const goToHome = () => {
    // Check if React will fire the useEffect naturally
    const willUseEffectTrigger =
      showSettings !== false ||
      currentPage !== 1 ||
      searchQuery !== '' ||
      isHomepage !== true ||
      sortField !== 'created_at' ||
      sortDirection !== 'desc';

    setIsHomepage(true);
    setSearchQuery('');
    setSortField('created_at');
    setSortDirection('desc');
    setCurrentPage(1);
    setViewingImage(null);
    setViewingProfile(null);
    setShowSettings(false);

    if (willUseEffectTrigger) {
      hasSynced.current = false;
    } else {
      refreshHomepage();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      {/* Custom styles to allow a flexible and adaptable Grid on large screens */}
      <style>{`
        @media (min-width: 992px) {
          .gallery-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
            gap: 0.5rem !important; /* equivale ao g-2 do Bootstrap */
            margin-right: 0 !important;
            margin-left: 0 !important;
          }
          .gallery-grid > * {
            padding-right: 0 !important;
            padding-left: 0 !important;
            margin-top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <nav className="navbar navbar-expand-lg custom-navbar sticky-top shadow-sm">
        <div className="container-fluid px-4 d-flex align-items-center">
          <a
            href="./"
            onClick={(e) => {
              e.preventDefault();
              goToHome();
            }}
            className="navbar-brand mb-0 fw-bold d-flex align-items-center text-decoration-none"
            style={{ color: 'var(--app-navbar-text)' }}
          >
            <img src="./icon/512.png" alt="Logo" className="app-logo" />
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
                          applyBooruChanges(allAccounts);
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
                          applyBooruChanges([]);
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
          handleQuickLinkClick={handleQuickLinkClick}
        />
      ) : viewingImage ? (
        <ImageViewer
          image={viewingImage}
          onClose={() => {
            setViewingImage(null);
            refreshHomepage();
          }}
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
                          urlBack="./"
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
                        <a
                          href={`./search?q=first_seen_at.gt%3A3+days+ago&sf=score`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) =>
                            handleQuickLinkClick(e, 'first_seen_at.gt:3 days ago', 'score', 'desc')
                          }
                          className="btn btn-link text-white text-decoration-none small p-0 align-baseline"
                        >
                          View all
                        </a>
                      </div>
                      <div className="card-body p-3">
                        <ImageGallery
                          urlBack="./"
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
                          href={`./search?sf=score&sd=desc`}
                          onClick={(e) => handleQuickLinkClick(e, '*', 'score', 'desc')}
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
                          href={`./search?q=first_seen_at.gt%3A3+days+ago&sf=comments&sd=desc`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) =>
                            handleQuickLinkClick(
                              e,
                              'first_seen_at.gt:3 days ago',
                              'comments',
                              'desc',
                            )
                          }
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
                  {!isHomepage && (
                    <SearchControls
                      sf={sortField}
                      sd={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  )}

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
                        urlBack="./"
                        gridClass={`row-cols-2 row-cols-md-4 gallery-grid g-2`}
                        imagesList={currentImages}
                        onOpenImage={handleOpenImage}
                      />

                      <PaginationBar
                        currentPage={currentPage}
                        isHomepage={isHomepage}
                        totalPages={totalPages}
                        onPageChange={changePage}
                      />

                      {!isHomepage && (
                        <SearchControls
                          sf={sortField}
                          sd={sortDirection}
                          onSortChange={handleSortChange}
                        />
                      )}
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
                      <a
                        href={`./search?q=my%3Awatched`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-secondary btn-sm fw-bold"
                        onClick={(e) => handleQuickLinkClick(e, 'my:watched', 'created_at', 'desc')}
                      >
                        Browse Watched Images
                      </a>
                    </div>

                    <ImageGallery
                      urlBack="./"
                      gridClass="row-cols-2 row-cols-md-4 gallery-grid g-2"
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
