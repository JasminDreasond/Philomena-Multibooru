import { useEffect, useState, useRef } from 'react';
import TinySimpleDice from 'tiny-essentials/libs/TinySimpleDice';
import { shuffleArray } from 'tiny-essentials/basics/array';
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
  randomImage,
} from './services/api';
import { applyThemeFromStorage } from './services/theme';

import { SearchBar } from './components/search/SearchBar';
import { ImageGallery, Image } from './components/image/ImageGallery';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { NotificationsMode } from './components/home/NotificationsMode';
import { ImageViewer } from './components/image/ImageViewer';
import { UserProfile } from './components/user/UserProfile';
import { Welcome } from './components/home/Welcome';
import { Error404 } from './components/errors/404';
import { PaginationBar } from './components/utils/PaginationBar';
import { SearchControls } from './components/search/SearchControls';
import { geString, parseQueryResults } from './queries/globalTags';
import { alert } from './tools/BootstrapDialogs';
import { WatchedImages } from './components/home/WatchedImages';
import { updateEmbedMetadata } from './tools/utils';

/** @typedef {import('./services/api').ImageResult} ImageResult */
/** @typedef {import('./services/api').ImageObj} ImageObj */
/** @typedef {import('./services/api').Account} Account */

/**
 * @typedef {(e: import('react').MouseEvent<HTMLAnchorElement, MouseEvent>, query: string, sf: string, sd: string) => void} HandleQuickLinkClick
 */

const App = () => {
  /** @type {[ImageResult[], import('react').Dispatch<import('react').SetStateAction<ImageResult[]>>]} */
  const [currentImages, setCurrentImages] = useState([]);

  /** @type {[ImageResult[], import('react').Dispatch<import('react').SetStateAction<ImageResult[]>>]} */
  const [trendingImages, setTrendingImages] = useState([]);

  /** @type {[ImageResult[], import('react').Dispatch<import('react').SetStateAction<ImageResult[]>>]} */
  const [watchedImages, setWatchedImages] = useState([]);

  /** @type {[{account: Account, image: ImageResult}|null, import('react').Dispatch<import('react').SetStateAction<{account: Account, image: ImageResult}[]>>]} */
  const [featuredImage, setFeaturedImage] = useState(null);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isDbReady, setIsDbReady] = useState(false);

  /** @type {[Account[]|null, import('react').Dispatch<import('react').SetStateAction<Account[]>>]} */
  const [connectedAccounts, setConnectedAccounts] = useState(null);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [showSettings, setShowSettings] = useState(false);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [showNotifications, setShowNotifications] = useState(false);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isHomepage, setIsHomepage] = useState(true);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [is404, setIs404] = useState(false);

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
  const [isRandomizing, setIsRandomizing] = useState(false);

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

  // --- Infinite Scroll States ---
  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isInfiniteScroll, setIsInfiniteScroll] = useState(() => {
    return localStorage.getItem('app_infiniteScroll') === 'true';
  });
  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [galleryRateLimited, setGalleryRateLimited] = useState(false);

  /** @type {import('react').MutableRefObject<boolean>} */
  const hasInitialized = useRef(false);

  /** @type {import('react').MutableRefObject<boolean>} */
  const hasSynced = useRef(false);

  /** @type {import('react').MutableRefObject<boolean>} */
  const isFirstLoad = useRef(true);

  // Refs for Dropdown, Sync control and Infinite Scroll
  const booruDropdownRef = useRef(null);
  const lastSyncedBoorus = useRef(visibleBoorus);
  const latestVisibleBoorus = useRef(visibleBoorus);

  /** @type {import('react').MutableRefObject<number|null>} */
  const galleryObserverTarget = useRef(null);
  /** @type {import('react').MutableRefObject<number>} */
  const lastGalleryFetchTime = useRef(0);

  // Synchronize Infinite Scroll Setting
  useEffect(() => {
    localStorage.setItem('app_infiniteScroll', isInfiniteScroll.toString());
  }, [isInfiniteScroll]);

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
    } else if (showNotifications) {
      newPath = '/notifications';
    } else if (is404) {
      // Keeps the current broken URL visible so the user sees what went wrong
      return;
    } else if (viewingProfile) {
      const host = new URL(viewingProfile.booruUrl).hostname;
      newPath = `/${host}/profiles/${viewingProfile.id}`;
    } else if (viewingImage) {
      const host = new URL(viewingImage.booruUrl).hostname;
      newPath = `/${host}/images/${viewingImage.id}`;

      // Memory persistence: Safely attach background gallery context to the Image URL
      const searchParams = new URLSearchParams();
      if (searchQuery && searchQuery !== geString) searchParams.set('q', searchQuery);
      if (sortField !== 'created_at') searchParams.set('sf', sortField);
      if (sortDirection !== 'desc') searchParams.set('sd', sortDirection);
      if (currentPage > 1) searchParams.set('page', currentPage.toString());

      const searchStr = searchParams.toString();
      if (searchStr) newSearch = `?${searchStr}`;
    } else if (!isHomepage) {
      newPath = '/search';
      const searchParams = new URLSearchParams();
      if (searchQuery && searchQuery !== geString) searchParams.set('q', searchQuery);
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
    showNotifications,
    viewingProfile,
    viewingImage,
    isHomepage,
    searchQuery,
    isDbReady,
    sortField,
    sortDirection,
    currentPage,
    is404,
  ]);

  // Synchronizes document <title> with the active view
  useEffect(() => {
    const baseTitle = 'Philomena Multi-Booru';
    let description = 'Run philomena multibooru instances in a single page.';
    let img = `${location.origin}/img/repository-open-graph-template.jpg`;

    if (is404) {
      document.title = `Page Not Found - ${baseTitle}`;
      description =
        'The URL you requested does not exist or it belongs to a Booru account that is not currently connected in your settings.';
    } else if (showSettings) {
      document.title = `Settings - ${baseTitle}`;
      description = 'The settings page.';
    } else if (showNotifications) {
      document.title = `Notifications Mode - ${baseTitle}`;
      description = 'The notifications page.';
    } else if (viewingProfile) {
      document.title = `${viewingProfile.username}'s Profile - ${baseTitle}`;
      // if (viewingProfile.avatarUrl) img = viewingProfile.avatarUrl;
    } else if (viewingImage) {
      const tagSnippet =
        viewingImage.tags && viewingImage.tags.length > 0
          ? ` - ${viewingImage.tags.join(', ')}`
          : '';
      document.title = `Image #${viewingImage.id}${tagSnippet} - ${baseTitle}`;
      description = `The image page of ${viewingImage.uploader}.`;
      if (viewingImage.representations.thumb) img = viewingImage.representations.thumb;
    } else if (!isHomepage && searchQuery && searchQuery !== geString) {
      document.title = `Search: ${searchQuery} - ${baseTitle}`;
      description = `The search page.`;
    } else {
      document.title = baseTitle;
    }

    updateEmbedMetadata({
      url: location.href,
      title: document.title,
      description,
      image: img,
    });
  }, [
    showSettings,
    showNotifications,
    viewingProfile,
    viewingImage,
    isHomepage,
    searchQuery,
    is404,
  ]);

  // Handle Forward/Back button navigation internally
  useEffect(() => {
    const handlePopState = async () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);

      // Resets shared pagination states for infinite scroll
      setGalleryRateLimited(false);
      lastGalleryFetchTime.current = 0;

      if (path === '/' || path === '') {
        setIsHomepage(true);
        setShowSettings(false);
        setShowNotifications(false);
        setViewingImage(null);
        setViewingProfile(null);
        setSearchQuery('');
        setSortField('created_at');
        setSortDirection('desc');
        setCurrentPage(1);
        setIs404(false);
        hasSynced.current = false; // Force recharge the main gallery if necessary
      } else if (path.startsWith('/settings')) {
        setShowSettings(true);
        setShowNotifications(false);
        setIs404(false);
      } else if (path.startsWith('/notifications')) {
        setShowNotifications(true);
        setShowSettings(false);
        setIs404(false);
      } else if (path.startsWith('/search')) {
        const q = params.get('q') || geString;
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
        setShowNotifications(false);
        setIs404(false);
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
            setShowNotifications(false);
            setIs404(false);

            if (imgMatch) {
              // Restore memory query variables silently for background gallery contexts
              const q = params.get('q') || geString;
              const sfParam = params.get('sf') || 'created_at';
              const sdParam = params.get('sd') || 'desc';
              const pParam = parseInt(params.get('page') || '1', 10);

              setSearchQuery(q);
              setSortField(sfParam);
              setSortDirection(sdParam);
              setCurrentPage(pParam);

              // Determines correct background display state for when the user closes the image
              setIsHomepage(
                q === geString && sfParam === 'created_at' && sdParam === 'desc' && pParam === 1,
              );

              const imgData = await fetchSingleImage(acc.booruUrl, acc.apiKey, imgMatch[2]);
              if (imgData) {
                setViewingProfile(null);
                setViewingImage(imgData);
              } else {
                setIs404(true);
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
              } else {
                setIs404(true);
              }
            }
          } else {
            setIsHomepage(false);
            setIs404(true);
          }
        } else {
          setIsHomepage(false);
          setIs404(true);
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
    setGalleryRateLimited(false);
    lastGalleryFetchTime.current = 0;
    setCurrentPage(1);
    await clearImageCache(); // Cleans old images
    lastSyncedBoorus.current = newBoorus;

    // Selects a new Featured Image and fixes Link Account if the current one was hidden
    if (connectedAccounts && connectedAccounts.length > 0) {
      const activeAccounts = connectedAccounts.filter((a) => newBoorus.includes(a.booruUrl));

      if (activeAccounts.length > 0) {
        const randomAcc = activeAccounts[TinySimpleDice.rollArrayIndex(activeAccounts)];
        const feat = await getFeaturedImage(randomAcc.booruUrl, randomAcc.apiKey);
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
      query: parseQueryResults(queryToUse),
      limit: limitToUse,
      page: pageToUse,
      allowedBoorus: boorusToUse,
      sd,
      sf,
    });
    setCurrentImages(mainResults);

    /** @type {boolean} */
    const isSpecialSearch = queryToUse.trim() !== '' && queryToUse.trim() !== geString;

    // Only load special content if on Page 1 and no search query
    if (!isSpecialSearch && isHomepage) {
      /** @type {ImageResult[]} */
      const trendingResults = await searchImages({
        query: parseQueryResults('first_seen_at.gt:3 days ago'),
        limit: 20,
        allowedBoorus: boorusToUse,
        sf: 'wilson_score',
        sd: 'desc',
      });

      setTrendingImages(shuffleArray(trendingResults).slice(0, 4));

      /** @type {ImageResult[]} */
      const watchedResults = await searchImages({
        query: parseQueryResults('my:watched'),
        limit: limitToUse,
        allowedBoorus: boorusToUse,
      });
      setWatchedImages(watchedResults);
    }
  };

  /**
   * Infinite scroll specific function: Appends the next page silently
   */
  const loadNextPage = async () => {
    setIsFetchingMore(true);
    lastGalleryFetchTime.current = Date.now();
    const nextPage = currentPage + 1;
    const queryToUse = searchQuery.trim() === '' ? geString : searchQuery;

    try {
      await syncUserGalleryPages({
        query: parseQueryResults(queryToUse),
        page: nextPage,
        allowedBoorus: visibleBoorus,
        sd: sortDirection,
        sf: sortField,
      });

      const newImages = await searchImages({
        query: parseQueryResults(queryToUse),
        limit: pageLimit,
        page: nextPage,
        allowedBoorus: visibleBoorus,
        sd: sortDirection,
        sf: sortField,
      });

      setCurrentImages((prev) => {
        const prevIds = new Set(prev.map((p) => p.id));
        const uniqueNew = newImages.filter((f) => !prevIds.has(f.id));
        return [...prev, ...uniqueNew];
      });

      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Error fetching next page via Infinite Scroll:', err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  /**
   * @param {string[]} boorusToUse
   * @returns {Promise<void>}
   */
  const executeBackgroundSync = async (boorusToUse) => {
    try {
      /** @type {string} */
      const queryToUse = searchQuery.trim() === '' ? geString : searchQuery;
      /** @type {boolean} */
      const isSpecialSearch = queryToUse !== geString;

      // await clearImageCache();
      const syncPromises = [
        syncUserGalleryPages({
          query: parseQueryResults(queryToUse),
          page: currentPage,
          allowedBoorus: boorusToUse,
          sd: sortDirection,
          sf: sortField,
        }),
      ];

      if (!isSpecialSearch && isHomepage) {
        syncPromises.push(
          syncUserGalleryPages({
            query: parseQueryResults('first_seen_at.gt:3 days ago'),
            allowedBoorus: boorusToUse,
            perPage: 20,
            sf: 'wilson_score',
            sd: 'desc',
          }),
        );
        syncPromises.push(
          syncUserGalleryPages({
            query: parseQueryResults('my:watched'),
            allowedBoorus: boorusToUse,
          }),
        );
      }

      const results = await Promise.all(syncPromises);
      const mainSync = results[0];

      if (mainSync) {
        setPageLimit(mainSync.syncLimit);
        setTotalPages(Math.max(1, Math.ceil(mainSync.totalCount / mainSync.syncLimit)));
      }

      await loadLocalData(
        mainSync ? mainSync.syncLimit : 50,
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

    // Failsafe: Ensures we fetch a Featured Image if missing during a soft refresh
    if (!featuredImage && connectedAccounts && connectedAccounts.length > 0) {
      const activeAccounts = connectedAccounts.filter((a) => visibleBoorus.includes(a.booruUrl));
      if (activeAccounts.length > 0) {
        const acc = activeAccounts[TinySimpleDice.rollArrayIndex(activeAccounts)];
        getFeaturedImage(acc.booruUrl, acc.apiKey).then((feat) => {
          setFeaturedImage(feat ? { account: acc, image: feat } : null);
          if (!selectedLinkAccount) setSelectedLinkAccount(acc);
        });
      }
    }

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

      if (!showSettings && !showNotifications && isDbReady && !hasSynced.current) {
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
          let initialQuery = searchQuery.trim() === '' ? geString : searchQuery;
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
              setIs404(false);
            } else if (path.startsWith('/notifications')) {
              setShowNotifications(true);
              isDeepLinkSpecial = true;
              skipMainSync = true;
              setIs404(false);
            } else if (path.startsWith('/search')) {
              const q = params.get('q') || geString;
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
              setIs404(false);
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
                  setIs404(false);

                  if (imgMatch) {
                    // Pre-load memory of search navigation in case user exits image
                    const q = params.get('q') || geString;
                    initialSf = params.get('sf') || 'created_at';
                    initialSd = params.get('sd') || 'desc';
                    initialPage = parseInt(params.get('page') || '1', 10);

                    setSearchQuery(q);
                    setSortField(initialSf);
                    setSortDirection(initialSd);
                    setCurrentPage(initialPage);
                    initialQuery = q;

                    setIsHomepage(
                      q === geString &&
                        initialSf === 'created_at' &&
                        initialSd === 'desc' &&
                        initialPage === 1,
                    );

                    const imgData = await fetchSingleImage(acc.booruUrl, acc.apiKey, imgMatch[2]);
                    if (imgData) setViewingImage(imgData);
                    else {
                      setIs404(true);
                    }
                  } else if (profMatch) {
                    const profileData = await fetchProfile(acc.booruUrl, profMatch[2]);
                    if (profileData) {
                      setViewingProfile({
                        booruUrl: acc.booruUrl,
                        username: profileData.name,
                        id: profileData.id,
                      });
                    } else {
                      setIs404(true);
                    }
                  }
                } else {
                  setIsHomepage(false);
                  setIs404(true);
                  skipMainSync = true;
                  isDeepLinkSpecial = true;
                }
              } else {
                setIsHomepage(false);
                setIs404(true);
                skipMainSync = true;
                isDeepLinkSpecial = true;
              }
            }
          }

          // If we have an active deep link, we skip the massive fetch of the Homepage here!
          if (!skipMainSync) {
            // await clearImageCache();
            const isSpecialSearch = initialQuery !== geString;
            const syncPromises = [
              syncUserGalleryPages({
                query: parseQueryResults(initialQuery),
                page: initialPage,
                allowedBoorus: activeUrls,
                sd: initialSd,
                sf: initialSf,
              }),
            ];

            if (!isSpecialSearch && isHomepage && !isDeepLinkSpecial) {
              syncPromises.push(
                syncUserGalleryPages({
                  query: parseQueryResults('first_seen_at.gt:3 days ago'),
                  allowedBoorus: activeUrls,
                  perPage: 20,
                  sf: 'wilson_score',
                  sd: 'desc',
                }),
              );
              syncPromises.push(
                syncUserGalleryPages({
                  query: parseQueryResults('my:watched'),
                  allowedBoorus: activeUrls,
                }),
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
                const feat = await getFeaturedImage(acc.booruUrl, acc.apiKey);
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
  }, [
    isDbReady,
    showSettings,
    showNotifications,
    currentPage,
    searchQuery,
    isHomepage,
    sortField,
    sortDirection,
    is404,
  ]);

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
          if (!viewingProfile && !viewingImage && !is404 && !showNotifications) refreshHomepage();
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
    is404,
    showNotifications,
  ]);

  // Observer Effect specifically for Infinite Scroll in the Gallery
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          isInfiniteScroll &&
          currentPage < totalPages &&
          !isSearching &&
          !isFetchingMore &&
          !galleryRateLimited
        ) {
          const now = Date.now();
          if (lastGalleryFetchTime.current > 0 && now - lastGalleryFetchTime.current < 2000) {
            console.warn(
              '⚠️ Security Lock: API request spam detected in gallery. Infinite scroll paused.',
            );
            setGalleryRateLimited(true);
            return;
          }
          loadNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (galleryObserverTarget.current) {
      observer.observe(galleryObserverTarget.current);
    }

    return () => observer.disconnect();
  }, [isInfiniteScroll, currentPage, totalPages, isSearching, isFetchingMore, galleryRateLimited]);

  /**
   * Helper function for ImageViewer Quick Navigation.
   * Modifies the viewingImage safely, handling edge pagination cases.
   * @param {'prev'|'next'} direction
   * @returns {Promise<void>}
   */
  const handleNavigateImage = async (direction) => {
    if (!viewingImage) return;

    let sourceArray = currentImages;
    let idx = sourceArray.findIndex((img) => img.id === viewingImage.id);

    // Fallbacks if the user opened an image from the sidebar
    if (idx === -1) {
      sourceArray = trendingImages;
      idx = sourceArray.findIndex((img) => img.id === viewingImage.id);
    }
    if (idx === -1) {
      sourceArray = watchedImages;
      idx = sourceArray.findIndex((img) => img.id === viewingImage.id);
    }

    // New smart fallback: Fetch the background context and continue the pagination flow!
    if (idx === -1) {
      const queryToUse = searchQuery.trim() === '' ? geString : searchQuery;
      try {
        // Ensure we know the limit and pages if they were lost during direct deep link entry
        const syncData = await syncUserGalleryPages({
          query: parseQueryResults(queryToUse),
          limit: pageLimit,
          page: currentPage,
          allowedBoorus: visibleBoorus,
          sd: sortDirection,
          sf: sortField,
        });

        if (syncData) {
          setPageLimit(syncData.syncLimit);
          setTotalPages(Math.max(1, Math.ceil(syncData.totalCount / syncData.syncLimit)));
        }

        const newImages = await searchImages({
          query: parseQueryResults(queryToUse),
          limit: pageLimit,
          page: currentPage,
          allowedBoorus: visibleBoorus,
          sd: sortDirection,
          sf: sortField,
        });

        if (newImages.length > 0) {
          setCurrentImages(newImages);
          sourceArray = newImages;
          idx = sourceArray.findIndex((img) => img.id === viewingImage.id);

          // If the image shifted pages dynamically on the server, just start at 0
          if (idx === -1) {
            handleOpenImage(newImages[0]);
            return;
          }
        } else {
          alert('There are no images in the current query to navigate to.');
          return;
        }
      } catch (e) {
        console.error(e);
        return;
      }
    }

    // Now that sourceArray and idx are cleanly restored, we run the normal robust logic!
    if (direction === 'next') {
      if (idx < sourceArray.length - 1) {
        handleOpenImage(sourceArray[idx + 1]);
      } else if (sourceArray === currentImages && currentPage < totalPages) {
        const nextPage = currentPage + 1;
        const queryToUse = searchQuery.trim() === '' ? geString : searchQuery;
        try {
          await syncUserGalleryPages({
            query: parseQueryResults(queryToUse),
            limit: pageLimit,
            page: nextPage,
            allowedBoorus: visibleBoorus,
            sd: sortDirection,
            sf: sortField,
          });

          const newImages = await searchImages({
            query: parseQueryResults(queryToUse),
            limit: pageLimit,
            page: nextPage,
            allowedBoorus: visibleBoorus,
            sd: sortDirection,
            sf: sortField,
          });

          if (isInfiniteScroll) {
            setCurrentImages((prev) => {
              const prevIds = new Set(prev.map((p) => p.id));
              const uniqueNew = newImages.filter((f) => !prevIds.has(f.id));
              return [...prev, ...uniqueNew];
            });
          } else {
            setCurrentImages(newImages);
          }
          setCurrentPage(nextPage);
          if (newImages.length > 0) {
            handleOpenImage(newImages[0]);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        alert('There are no more images to display in this direction.');
      }
    } else if (direction === 'prev') {
      if (idx > 0) {
        handleOpenImage(sourceArray[idx - 1]);
      } else if (sourceArray === currentImages && currentPage > 1) {
        const prevPage = currentPage - 1;
        const queryToUse = searchQuery.trim() === '' ? geString : searchQuery;
        try {
          await syncUserGalleryPages({
            query: parseQueryResults(queryToUse),
            limit: pageLimit,
            page: prevPage,
            allowedBoorus: visibleBoorus,
            sd: sortDirection,
            sf: sortField,
          });

          const newImages = await searchImages({
            query: parseQueryResults(queryToUse),
            limit: pageLimit,
            page: prevPage,
            allowedBoorus: visibleBoorus,
            sd: sortDirection,
            sf: sortField,
          });

          if (isInfiniteScroll) {
            // If using infinite scroll, scrolling upwards essentially pre-pends to the master list
            setCurrentImages((prev) => {
              const prevIds = new Set(prev.map((p) => p.id));
              const uniqueNew = newImages.filter((f) => !prevIds.has(f.id));
              return [...uniqueNew, ...prev];
            });
          } else {
            setCurrentImages(newImages);
          }
          setCurrentPage(prevPage);
          if (newImages.length > 0) {
            handleOpenImage(newImages[newImages.length - 1]);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        alert('There are no more images to display in this direction.');
      }
    }
  };

  /**
   * @returns {void}
   */
  const handleCloseSettings = () => {
    setShowSettings(false);
    hasSynced.current = false;
  };

  /**
   * @returns {void}
   */
  const handleCloseNotifications = () => {
    setShowNotifications(false);
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
    setShowNotifications(false);
    setIs404(false);
    hasSynced.current = false;
    setGalleryRateLimited(false);
    lastGalleryFetchTime.current = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * @param {number} newPage
   */
  const changePage = (newPage) => {
    setIsHomepage(false);
    setViewingProfile(null);
    setCurrentPage(newPage);
    setIs404(false);
    hasSynced.current = false;
    setGalleryRateLimited(false);
    lastGalleryFetchTime.current = 0;
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
    setIs404(false);
    hasSynced.current = false;
    setGalleryRateLimited(false);
    lastGalleryFetchTime.current = 0;
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
    setIs404(false);
    setGalleryRateLimited(false);
    lastGalleryFetchTime.current = 0;
    handleSearchSubmit(query);
  };

  /**
   * @returns {void}
   */
  const goToHome = () => {
    // Check if React will fire the useEffect naturally
    const willUseEffectTrigger =
      showSettings !== false ||
      showNotifications !== false ||
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
    setShowNotifications(false);
    setIs404(false);
    setGalleryRateLimited(false);
    lastGalleryFetchTime.current = 0;

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
    setShowNotifications(false);
    setIs404(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProfile = (booruUrl, username, id) => {
    setViewingImage(null);
    setViewingProfile({ booruUrl, username, id });
    setShowNotifications(false);
    setIs404(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * @returns {Promise<void>}
   */
  const handleRandomImageClick = async () => {
    if (is404 || !connectedAccounts || connectedAccounts.length === 0) return;

    setIsRandomizing(true);
    try {
      const queryToUse = searchQuery.trim() === '' ? geString : searchQuery;
      const activeAccounts = connectedAccounts.filter((a) => visibleBoorus.includes(a.booruUrl));

      if (activeAccounts.length > 0) {
        const img = await randomImage(activeAccounts, queryToUse);
        if (img) {
          handleOpenImage(img);
        }
      }
    } catch (error) {
      console.error('Error fetching random image:', error);
    } finally {
      setIsRandomizing(false);
    }
  };

  /** @type {boolean} */
  const showSpecialContent =
    (searchQuery.trim() === '' || searchQuery.trim() === geString) && isHomepage;

  const infinityScrollMode = isInfiniteScroll && !isHomepage;

  return (
    <div className="min-vh-100 pb-5" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* Custom styles to allow a flexible and adaptable Grid on large screens */}
      <style>{`
        @media (min-width: 992px) {
          .gallery-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
            gap: 0.5rem !important;
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
            href="/"
            onClick={(e) => {
              e.preventDefault();
              if (is404) return window.open('/', '_self');
              goToHome();
            }}
            className="navbar-brand mb-0 fw-bold d-flex align-items-center text-decoration-none"
            style={{ color: 'var(--app-navbar-text)' }}
          >
            <img src="/icon/512.png" alt="Logo" className="app-logo" />
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
              {!showSettings && !showNotifications && !is404 && (
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
                {/* Random Button */}
                <button
                  className="btn btn-sm btn-outline-info text-nowrap w-100 w-lg-auto me-lg-2 mb-2 mb-lg-0 fw-bold"
                  onClick={handleRandomImageClick}
                  disabled={isRandomizing || isSearching}
                >
                  {isRandomizing ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Rolling...
                    </>
                  ) : (
                    '🎲 Random'
                  )}
                </button>

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
                    data-bs-toggle={!is404 ? 'dropdown' : null}
                    aria-expanded={!is404 ? 'false' : null}
                    data-bs-auto-close={!is404 ? 'outside' : null}
                  >
                    <span className="fw-bold">
                      Boorus ({visibleBoorus.length}/{connectedAccounts?.length || 0})
                    </span>
                    <i className="bi bi-chevron-down"></i>
                  </button>
                  {!is404 && (
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
                        const booruHostname = new URL(acc.booruUrl).hostname;

                        return (
                          <li
                            key={acc.id}
                            className="dropdown-item d-flex align-items-center justify-content-between gap-2 px-3"
                          >
                            {/* Main toggle area for the Booru selection */}
                            <div
                              className="d-flex align-items-center gap-2 flex-grow-1"
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => {
                                e.preventDefault();
                                if (isVisible) {
                                  setVisibleBoorus(
                                    visibleBoorus.filter((url) => url !== acc.booruUrl),
                                  );
                                } else {
                                  setVisibleBoorus([...visibleBoorus, acc.booruUrl]);
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                className="form-check-input m-0"
                                style={{ cursor: 'pointer' }}
                                checked={isVisible}
                                readOnly
                              />
                              <span className="text-truncate">{booruHostname}</span>
                            </div>

                            {/* Direct external link to the Booru instance */}
                            <a
                              href={acc.booruUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted text-decoration-none d-flex align-items-center px-1"
                              title={`Visit ${booruHostname}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <i
                                className="fa-solid fa-up-right-from-square"
                                style={{ fontSize: '0.85rem' }}
                              ></i>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <button
                  className={`btn btn-sm text-nowrap w-100 w-lg-auto me-lg-2 mb-2 mb-lg-0 fw-bold ${showNotifications ? 'btn-warning' : 'btn-outline-warning'}`}
                  onClick={() => {
                    if (is404) return window.open('/notifications', '_self');
                    hasSynced.current = false; // Make sure the gallery forces a refetch!
                    if (!showNotifications) {
                      setShowSettings(false);
                    }
                    setShowNotifications(!showNotifications);
                  }}
                >
                  {showNotifications ? 'Back to Gallery' : '🔔 Notifications'}
                </button>

                <button
                  className="btn btn-sm btn-outline-light text-nowrap w-100 w-lg-auto"
                  data-bs-dismiss="offcanvas"
                  style={{ borderColor: 'var(--app-navbar-text)', color: 'var(--app-navbar-text)' }}
                  onClick={() => {
                    if (is404) return window.open('/settings', '_self');
                    hasSynced.current = false; // Make sure the gallery forces a refetch!
                    if (!showSettings) {
                      setShowNotifications(false);
                    }
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

      {is404 ? (
        <Error404 />
      ) : showNotifications ? (
        <NotificationsMode
          accounts={connectedAccounts || []}
          visibleBoorus={visibleBoorus}
          onClose={handleCloseNotifications}
          onGoHome={goToHome}
        />
      ) : showSettings ? (
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
          onNavigateImage={handleNavigateImage}
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
            <Welcome
              onClick={() => {
                if (!showSettings) hasSynced.current = false;
                setShowSettings(!showSettings);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
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
                        <a
                          href={`/search?q=first_seen_at.gt%3A3+days+ago&sf=wilson_score`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) =>
                            handleQuickLinkClick(
                              e,
                              'first_seen_at.gt:3 days ago',
                              'wilson_score',
                              'desc',
                            )
                          }
                          className="btn btn-link text-white text-decoration-none small p-0 align-baseline"
                        >
                          View all
                        </a>
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
                          href={`/search?sf=score&sd=desc`}
                          onClick={(e) => handleQuickLinkClick(e, geString, 'score', 'desc')}
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
                          href={`/search?q=first_seen_at.gt%3A3+days+ago&sf=comments&sd=desc`}
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
                      isInfiniteScroll={isInfiniteScroll}
                      onInfiniteScrollChange={setIsInfiniteScroll}
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
                      {!infinityScrollMode && (
                        <PaginationBar
                          currentPage={currentPage}
                          totalPages={totalPages}
                          isHomepage={isHomepage}
                          onPageChange={changePage}
                        />
                      )}

                      <ImageGallery
                        gridClass={`row-cols-2 row-cols-md-4 gallery-grid g-2`}
                        imagesList={currentImages}
                        onOpenImage={handleOpenImage}
                      />

                      {/* Infinite Scroll Trigger Element */}
                      {infinityScrollMode && currentImages.length > 0 && (
                        <div ref={galleryObserverTarget} className="text-center py-4 w-100 mt-2">
                          {isFetchingMore ? (
                            <div className="spinner-border text-primary" role="status"></div>
                          ) : galleryRateLimited ? (
                            <div
                              className="alert p-3 mb-0 rounded shadow-sm border-0 mx-auto"
                              style={{
                                maxWidth: '500px',
                                backgroundColor: 'var(--app-surface)',
                                color: 'var(--app-text)',
                                borderLeft: '4px solid #dc3545 !important',
                              }}
                            >
                              <div className="d-flex flex-column text-center">
                                <h6 className="fw-bold text-danger mb-2">
                                  <i className="fa-solid fa-shield-halved me-2"></i>Security Lock
                                </h6>
                                <span className="small fw-semibold text-muted">
                                  Auto-load disabled to prevent API spam. Your screen resolution
                                  triggered the anti-spam protection.
                                </span>
                              </div>
                            </div>
                          ) : currentPage < totalPages ? (
                            <span className="text-muted small fw-semibold">Scroll for more...</span>
                          ) : (
                            <span className="text-muted small fw-semibold">End of results.</span>
                          )}
                        </div>
                      )}

                      {!infinityScrollMode && (
                        <PaginationBar
                          currentPage={currentPage}
                          isHomepage={isHomepage}
                          totalPages={totalPages}
                          onPageChange={changePage}
                        />
                      )}

                      {!isHomepage && (
                        <SearchControls
                          sf={sortField}
                          sd={sortDirection}
                          onSortChange={handleSortChange}
                          isInfiniteScroll={isInfiniteScroll}
                          onInfiniteScrollChange={setIsInfiniteScroll}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Watched Images Bottom Section */}
              {
                <WatchedImages
                  showSpecialContent={showSpecialContent}
                  watchedImages={watchedImages}
                  handleOpenImage={handleOpenImage}
                  handleQuickLinkClick={handleQuickLinkClick}
                />
              }
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
