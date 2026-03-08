import { useState, useEffect, useRef } from 'react';
import {
  addAccount,
  getAllAccounts,
  deleteAccount,
  deleteAllAccounts,
  factoryResetDatabase,
  getSystemSettings,
  updateSystemSettings,
  fixBooruUrl,
  clearSpecificBooruCache,
  getActiveAccounts,
  fetchSystemFilters,
  fetchUserFilters,
  saveBooruFilters,
} from '../services/api';

/**
 * @typedef {import('../services/api').Account} Account
 */

/**
 * @typedef {Object} FilterObj
 * @property {number} id
 * @property {string} name
 * @property {string} description
 */

/**
 * @param {{ isDark: boolean; onClose: () => void; }} props
 */
export const SettingsPanel = ({ isDark }) => {
  /** @type {import('react').MutableRefObject<HTMLInputElement | null>} */
  const fileInputRef = useRef(null);

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [urlInput, setUrlInput] = useState('');

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [keyInput, setKeyInput] = useState('');

  /** @type {[Account[], import('react').Dispatch<import('react').SetStateAction<Account[]>>]} */
  const [accountsList, setAccountsList] = useState([]);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [acceptRisk, setAcceptRisk] = useState(false);

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [errorMessage, setErrorMessage] = useState('');

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isLoading, setIsLoading] = useState(true);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [warnRisk, setWarnRisk] = useState(false);

  /** @type {[number, import('react').Dispatch<import('react').SetStateAction<number>>]} */
  const [maxItemsLimit, setMaxItemsLimit] = useState(10000);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isPersistent, setIsPersistent] = useState(false);

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [themeMode, setThemeMode] = useState(localStorage.getItem('app_themeMode') || 'system');

  const [inAppProfileViewer, setInAppProfileViewer] = useState(
    localStorage.getItem('app_inAppProfileViewer') === 'true',
  );

  const [inAppViewer, setInAppViewer] = useState(
    localStorage.getItem('app_inAppViewer') === 'true',
  );

  /* Global Colors */
  const [customPrimary, setCustomPrimary] = useState(localStorage.getItem('app_primary') || '');
  const [customBg, setCustomBg] = useState(localStorage.getItem('app_bg') || '');
  const [customNavbar, setCustomNavbar] = useState(localStorage.getItem('app_navbar') || '');
  const [customDanger, setCustomDanger] = useState(localStorage.getItem('app_danger') || '');

  /* Textos, Inputs, Spinners and Badges */
  const [customText, setCustomText] = useState(localStorage.getItem('app_text') || '');
  const [customTextMuted, setCustomTextMuted] = useState(
    localStorage.getItem('app_text_muted') || '',
  );
  const [customInputBg, setCustomInputBg] = useState(localStorage.getItem('app_input_bg') || '');
  const [customInputText, setCustomInputText] = useState(
    localStorage.getItem('app_input_text') || '',
  );
  const [customBadgeBg, setCustomBadgeBg] = useState(localStorage.getItem('app_badge_bg') || '');
  const [customBadgeText, setCustomBadgeText] = useState(
    localStorage.getItem('app_badge_text') || '',
  );
  const [customSpinner, setCustomSpinner] = useState(localStorage.getItem('app_spinner') || '');

  /* Alerts */
  const [alertWarningBg, setAlertWarningBg] = useState(
    localStorage.getItem('alert_warning_bg') || '',
  );
  const [alertWarningText, setAlertWarningText] = useState(
    localStorage.getItem('alert_warning_text') || '',
  );
  const [alertInfoBg, setAlertInfoBg] = useState(localStorage.getItem('alert_info_bg') || '');
  const [alertInfoText, setAlertInfoText] = useState(localStorage.getItem('alert_info_text') || '');
  const [alertDangerBg, setAlertDangerBg] = useState(localStorage.getItem('alert_danger_bg') || '');
  const [alertDangerText, setAlertDangerText] = useState(
    localStorage.getItem('alert_danger_text') || '',
  );

  /* Interactions */
  const [customFave, setCustomFave] = useState(localStorage.getItem('app_fave') || '');
  const [customUpvote, setCustomUpvote] = useState(localStorage.getItem('app_upvote') || '');
  const [customDownvote, setCustomDownvote] = useState(localStorage.getItem('app_downvote') || '');

  /* More Stuff */
  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [activeTab, setActiveTab] = useState('accounts');

  /** @type {[Account[], import('react').Dispatch<import('react').SetStateAction<Account[]>>]} */
  const [accounts, setAccounts] = useState([]);

  // --- Filters State ---
  /** @type {[Account|null, import('react').Dispatch<import('react').SetStateAction<Account|null>>]} */
  const [selectedFilterAccount, setSelectedFilterAccount] = useState(null);

  /** @type {[FilterObj[], import('react').Dispatch<import('react').SetStateAction<FilterObj[]>>]} */
  const [systemFilters, setSystemFilters] = useState([]);
  /** @type {[FilterObj[], import('react').Dispatch<import('react').SetStateAction<FilterObj[]>>]} */
  const [userFilters, setUserFilters] = useState([]);

  /** @type {[number, import('react').Dispatch<import('react').SetStateAction<number>>]} */
  const [sysPage, setSysPage] = useState(1);
  /** @type {[number, import('react').Dispatch<import('react').SetStateAction<number>>]} */
  const [userPage, setUserPage] = useState(1);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  /** @type {[Record<string, number>, import('react').Dispatch<import('react').SetStateAction<Record<string, number>>>]} */
  const [pendingFilters, setPendingFilters] = useState({});

  /** @type {[Record<string, number>, import('react').Dispatch<import('react').SetStateAction<Record<string, number>>>]} */
  const [savedFilters, setSavedFilters] = useState({});

  const loadData = async () => {
    setIsLoading(true);
    try {
      /** @type {Account[]} */
      const accData = await getAllAccounts();
      setAccountsList(accData);

      const sysData = await getSystemSettings();
      setMaxItemsLimit(sysData.maxItems);
      setIsPersistent(sysData.persistentStorage === 1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * @param {import('react').FormEvent<HTMLFormElement>} event
   * @returns {Promise<void>}
   */
  const handleAddAccount = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (urlInput && keyInput) {
      /** @type {string} */
      const normalizedUrl = fixBooruUrl(urlInput.trim().replace(/\/$/, ''));

      /** @type {boolean} */
      const urlExists = accountsList.some(
        (acc) => acc.booruUrl.replace(/\/$/, '') === normalizedUrl,
      );

      if (urlExists && !acceptRisk) {
        setErrorMessage(
          'This URL is already registered. Adding multiple accounts for the same website can result in an IP ban. Check the box below if you accept the risk.',
        );
        setWarnRisk(true);
        return;
      }

      setIsLoading(true);
      await addAccount(normalizedUrl, keyInput);

      setUrlInput('');
      setKeyInput('');
      setAcceptRisk(false);
      setErrorMessage('');

      await loadAccounts();
      await loadData();
    }
  };

  /**
   * @param {number} accountId
   * @param {string} booruUrl
   */
  const handleRemoveAccount = async (accountId, booruUrl) => {
    setIsLoading(true);
    await deleteAccount(accountId);
    await clearSpecificBooruCache([booruUrl]);

    /** @type {Record<string, number>} */
    const storedFilters = JSON.parse(localStorage.getItem('app_booruFilters') || '{}');
    if (storedFilters[booruUrl]) {
      delete storedFilters[booruUrl];
      localStorage.setItem('app_booruFilters', JSON.stringify(storedFilters));
    }
    await loadData();
  };

  /**
   * @returns {Promise<void>}
   */
  const handleClearAllAccounts = async () => {
    /** @type {boolean} */
    const isConfirmed = window.confirm('Are you sure you want to delete all configured accounts?');
    if (isConfirmed) {
      setIsLoading(true);
      await deleteAllAccounts();
      await loadData();
    }
  };

  /**
   * @returns {Promise<void>}
   */
  const handleFactoryReset = async () => {
    /** @type {boolean} */
    const firstWarning = window.confirm(
      'WARNING: This will delete ALL data, including cached images, tags, and accounts. Do you want to proceed?',
    );
    if (!firstWarning) return;

    /** @type {boolean} */
    const secondWarning = window.confirm(
      'FINAL WARNING: This action is completely irreversible. Are you absolutely sure you want to factory reset the database?',
    );
    if (secondWarning) {
      await factoryResetDatabase();
      window.location.reload();
    }
  };

  /**
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   */
  const handleSettingsChange = async (event) => {
    /** @type {boolean} */
    const isChecked = event.target.checked;
    setIsPersistent(isChecked);

    if (isChecked && navigator.storage && navigator.storage.persist) {
      /** @type {boolean} */
      const granted = await navigator.storage.persist();
      if (!granted) {
        alert('The browser denied persistent storage permission.');
        setIsPersistent(false);
        await updateSystemSettings(maxItemsLimit, 0);
        return;
      }
    }

    await updateSystemSettings(maxItemsLimit, isChecked ? 1 : 0);
  };

  /**
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   */
  const handleLimitChange = async (event) => {
    /** @type {number} */
    const val = parseInt(event.target.value, 10);
    setMaxItemsLimit(val);
    await updateSystemSettings(val, isPersistent ? 1 : 0);
  };

  /**
   * @param {string} mode
   */
  const handleThemeModeChange = (mode) => {
    setThemeMode(mode);
    localStorage.setItem('app_themeMode', mode);
    window.dispatchEvent(new Event('themeChanged'));
  };

  /**
   * @param {string} key
   * @param {string} value
   * @param {import('react').Dispatch<import('react').SetStateAction<string>>} setter
   */
  const handleColorChange = (key, value, setter) => {
    localStorage.setItem(key, value);
    setter(value);
    window.dispatchEvent(new Event('themeChanged'));
  };

  const resetColors = () => {
    const keysToReset = [
      'app_primary',
      'app_bg',
      'app_navbar',
      'app_danger',
      'app_text',
      'app_text_muted',
      'app_input_bg',
      'app_input_text',
      'app_badge_bg',
      'app_badge_text',
      'app_spinner',
      'alert_warning_bg',
      'alert_warning_text',
      'alert_info_bg',
      'alert_info_text',
      'alert_danger_bg',
      'alert_danger_text',
      'app_fave',
      'app_upvote',
      'app_downvote',
    ];

    keysToReset.forEach((key) => localStorage.removeItem(key));

    setCustomPrimary('');
    setCustomBg('');
    setCustomNavbar('');
    setCustomDanger('');
    setCustomText('');
    setCustomTextMuted('');
    setCustomInputBg('');
    setCustomInputText('');
    setCustomBadgeBg('');
    setCustomBadgeText('');
    setCustomSpinner('');
    setAlertWarningBg('');
    setAlertWarningText('');
    setAlertInfoBg('');
    setAlertInfoText('');
    setAlertDangerBg('');
    setAlertDangerText('');
    setCustomFave('');
    setCustomUpvote('');
    setCustomDownvote('');

    window.dispatchEvent(new Event('themeChanged'));
  };

  /**
   * @returns {void}
   */
  const handleExportTheme = () => {
    const keys = [
      'app_primary',
      'app_bg',
      'app_navbar',
      'app_danger',
      'app_text',
      'app_text_muted',
      'app_input_bg',
      'app_input_text',
      'app_badge_bg',
      'app_badge_text',
      'app_spinner',
      'alert_warning_bg',
      'alert_warning_text',
      'alert_info_bg',
      'alert_info_text',
      'alert_danger_bg',
      'alert_danger_text',
      'app_fave',
      'app_upvote',
      'app_downvote',
    ];

    const themeData = {};
    keys.forEach((k) => {
      const val = localStorage.getItem(k);
      if (val) themeData[k] = val;
    });

    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'philomena-theme.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   * @returns {void}
   */
  const handleImportTheme = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        const validKeys = [
          'app_primary',
          'app_bg',
          'app_navbar',
          'app_danger',
          'app_text',
          'app_text_muted',
          'app_input_bg',
          'app_input_text',
          'app_badge_bg',
          'app_badge_text',
          'app_spinner',
          'alert_warning_bg',
          'alert_warning_text',
          'alert_info_bg',
          'alert_info_text',
          'alert_danger_bg',
          'alert_danger_text',
          'app_fave',
          'app_upvote',
          'app_downvote',
        ];

        let importedCount = 0;
        for (const key of Object.keys(json)) {
          if (
            validKeys.includes(key) &&
            typeof json[key] === 'string' &&
            hexRegex.test(json[key])
          ) {
            localStorage.setItem(key, json[key]);
            importedCount++;
          }
        }

        if (importedCount > 0) {
          alert('Theme imported successfully! Reloading to apply all colors.');
          window.location.reload();
        } else {
          alert('No valid colors found in the file.');
        }
      } catch (err) {
        console.error(err);
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  useEffect(() => {
    loadAccounts();
    const currentSavedFilters = JSON.parse(localStorage.getItem('app_booruFilters') || '{}');
    setSavedFilters(currentSavedFilters);
    setPendingFilters(currentSavedFilters);
  }, []);

  useEffect(() => {
    if (activeTab === 'filters' && accounts.length > 0 && !selectedFilterAccount) {
      setSelectedFilterAccount(accounts[0]);
    }
  }, [activeTab, accounts, selectedFilterAccount]);

  useEffect(() => {
    if (selectedFilterAccount) {
      loadFiltersData(selectedFilterAccount, sysPage, userPage);
    }
  }, [selectedFilterAccount, sysPage, userPage]);

  /**
   * @returns {Promise<void>}
   */
  const loadAccounts = async () => {
    const accs = await getActiveAccounts();
    setAccounts(accs);
  };

  /**
   * @param {Account} account
   * @param {number} sPage
   * @param {number} uPage
   * @returns {Promise<void>}
   */
  const loadFiltersData = async (account, sPage, uPage) => {
    setIsLoadingFilters(true);
    try {
      const fixedUrl = fixBooruUrl(account.booruUrl);
      const [sysRes, userRes] = await Promise.all([
        fetchSystemFilters(fixedUrl, sPage).catch(() => ({ filters: [] })),
        fetchUserFilters(fixedUrl, account.apiKey, uPage).catch(() => ({ filters: [] })),
      ]);

      setSystemFilters(sysRes.filters || []);
      setUserFilters(userRes.filters || []);
    } catch (err) {
      console.error('Failed to load filters', err);
    } finally {
      setIsLoadingFilters(false);
    }
  };

  /**
   * @param {string} booruUrl
   * @param {number} filterId
   */
  const handleSelectFilter = (booruUrl, filterId) => {
    const fixedUrl = fixBooruUrl(booruUrl);
    setPendingFilters((prev) => ({ ...prev, [fixedUrl]: filterId }));
  };

  /**
   * @returns {Promise<void>}
   */
  const handleSaveFilters = async () => {
    try {
      await saveBooruFilters(pendingFilters);
      setSavedFilters(pendingFilters);
      alert('Filters saved successfully! Image cache has been cleared to apply new filters.');
    } catch (err) {
      console.error('Failed to save filters', err);
      alert('Error saving filters.');
    }
  };

  const hasUnsavedChanges = JSON.stringify(pendingFilters) !== JSON.stringify(savedFilters);

  return (
    <div
      className="container mt-4 mb-4 p-4 rounded shadow-sm border"
      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0" style={{ color: 'var(--app-text)' }}>
          Settings
        </h2>
      </div>

      <div
        className="border-0"
        style={{ backgroundColor: 'var(--app-surface)', color: 'var(--app-text)' }}
      >
        {/* MENU */}
        <div
          className="card-header border-bottom-0 pt-3 pb-0"
          style={{ backgroundColor: 'transparent' }}
        >
          <ul className="nav nav-tabs border-bottom" style={{ borderColor: 'var(--app-border)' }}>
            {[
              { name: 'Accounts', value: 'accounts' },
              { name: 'Filters', value: 'filters' },
              { name: 'App & Storage', value: 'app' },
              { name: 'Theme', value: 'theme' },
            ].map((menu, key) => (
              <li key={key} className="nav-item">
                <button
                  className={`nav-link fw-bold ${activeTab === menu.value ? 'active bg-transparent' : 'text-muted border-transparent'}`}
                  style={{
                    color: activeTab === menu.value ? 'var(--app-primary)' : 'inherit',
                    borderBottomColor:
                      activeTab === menu.value ? 'var(--app-surface)' : 'transparent',
                  }}
                  onClick={() => setActiveTab(menu.value)}
                >
                  {menu.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ACCOUNTS TAB */}
        {activeTab === 'accounts' && (
          <div className="fade-in">
            {isLoading && (
              <div className="alert alert-info text-center">
                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                Processing database...
              </div>
            )}

            <div
              className="row pt-3"
              style={{ opacity: isLoading ? 0.6 : 1, pointerEvents: isLoading ? 'none' : 'auto' }}
            >
              <div className="col-md-6 mb-4">
                <div className="card no-anim h-100 border-primary">
                  <div
                    className="card-header fw-bold"
                    style={{ backgroundColor: 'var(--app-primary)', color: '#ffffff' }}
                  >
                    Add New API Account
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddAccount}>
                      <div className="mb-3">
                        <label className="form-label">Booru URL</label>
                        <input
                          type="url"
                          className="form-control"
                          placeholder="https://derpibooru.org"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">API Key</label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Your Philomena API Key"
                          value={keyInput}
                          onChange={(e) => setKeyInput(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      {errorMessage && (
                        <div className="alert alert-danger py-2 px-3 text-sm" role="alert">
                          {errorMessage}
                        </div>
                      )}
                      {warnRisk && (
                        <div className="form-check mb-3">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="acceptRiskCheckbox"
                            checked={acceptRisk}
                            onChange={(e) => setAcceptRisk(e.target.checked)}
                            disabled={isLoading}
                          />
                          <label
                            className="form-check-label text-danger fw-semibold"
                            htmlFor="acceptRiskCheckbox"
                          >
                            I accept the risk of IP ban for multiple accounts on the same URL.
                          </label>
                        </div>
                      )}
                      <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                        Save Account
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              <div className="col-md-6 mb-4">
                <div className="card no-anim h-100">
                  <div className="card-header fw-bold">Connected Accounts</div>
                  <ul
                    className="list-group list-group-flush"
                    style={{ maxHeight: '250px', overflowY: 'auto' }}
                  >
                    {accountsList.length === 0 ? (
                      <li className="list-group-item text-muted text-center py-4">
                        No accounts configured yet.
                      </li>
                    ) : (
                      accountsList.map((acc) => (
                        <li
                          key={acc.id}
                          className="list-group-item d-flex justify-content-between align-items-center"
                        >
                          <div className="text-truncate" style={{ maxWidth: '70%' }}>
                            <strong>{acc.booruUrl}</strong>
                          </div>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRemoveAccount(acc.id, acc.booruUrl)}
                            disabled={isLoading}
                          >
                            Remove
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                  {accountsList.length > 0 && (
                    <div
                      className="card-footer text-end"
                      style={{ backgroundColor: 'transparent' }}
                    >
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={handleClearAllAccounts}
                        disabled={isLoading}
                      >
                        Delete All
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FILTERS TAB */}
        {activeTab === 'filters' && (
          <div className="fade-in">
            <div
              className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 pb-3 border-bottom"
              style={{ borderColor: 'var(--app-border)' }}
            >
              <div className='pt-3'>
                <h5 className="fw-bold mb-1">Global Content Filters</h5>
                <p className="text-muted small m-0">
                  Select the active filter for each connected booru. This applies to all searches.
                </p>
              </div>

              <div className="d-flex align-items-center gap-3 mt-3 mt-md-0">
                {hasUnsavedChanges && (
                  <span className="badge bg-warning text-dark px-3 py-2 fw-bold animate-pulse">
                    ⚠️ You have unsaved changes!
                  </span>
                )}
                <button
                  className={`btn fw-bold px-4 ${hasUnsavedChanges ? 'btn-success shadow' : 'btn-secondary'}`}
                  onClick={handleSaveFilters}
                  disabled={!hasUnsavedChanges}
                >
                  Save Changes
                </button>
              </div>
            </div>

            {accounts.length === 0 ? (
              <div className="alert alert-info">
                Please connect a Booru account first to manage its filters.
              </div>
            ) : (
              <div className="row g-4">
                <div className="col-12 col-lg-3">
                  <h6 className="fw-bold text-muted mb-3">Select Booru</h6>
                  <div className="list-group shadow-sm">
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        className={`list-group-item list-group-item-action fw-semibold ${selectedFilterAccount?.id === acc.id ? 'active' : ''}`}
                        style={
                          selectedFilterAccount?.id === acc.id
                            ? {}
                            : {
                                backgroundColor: 'var(--app-bg)',
                                color: 'var(--app-text)',
                                borderColor: 'var(--app-border)',
                              }
                        }
                        onClick={() => {
                          setSelectedFilterAccount(acc);
                          setSysPage(1);
                          setUserPage(1);
                        }}
                      >
                        {new URL(acc.booruUrl).hostname}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-12 col-lg-9">
                  {isLoadingFilters && systemFilters.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                    </div>
                  ) : selectedFilterAccount ? (
                    <div className="row g-4">
                      {/* SYSTEM FILTERS */}
                      <div className="col-12 col-md-6">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="fw-bold m-0 text-primary">System Filters</h6>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-secondary"
                              disabled={sysPage <= 1}
                              onClick={() => setSysPage((p) => p - 1)}
                            >
                              Prev
                            </button>
                            <button
                              className="btn btn-outline-secondary"
                              disabled={systemFilters.length < 50}
                              onClick={() => setSysPage((p) => p + 1)}
                            >
                              Next
                            </button>
                          </div>
                        </div>

                        <div
                          className="list-group shadow-sm border"
                          style={{ borderColor: 'var(--app-border)' }}
                        >
                          {systemFilters.length === 0 ? (
                            <div
                              className="list-group-item text-muted text-center py-3"
                              style={{ backgroundColor: 'var(--app-bg)' }}
                            >
                              No system filters found.
                            </div>
                          ) : (
                            systemFilters.map((filter) => {
                              const isSelected =
                                pendingFilters[fixBooruUrl(selectedFilterAccount.booruUrl)] ===
                                filter.id;
                              return (
                                <label
                                  key={`sys-${filter.id}`}
                                  className="list-group-item d-flex gap-3 align-items-center cursor-pointer"
                                  style={{
                                    backgroundColor: isSelected
                                      ? 'var(--app-surface)'
                                      : 'var(--app-bg)',
                                    color: 'var(--app-text)',
                                    borderColor: 'var(--app-border)',
                                  }}
                                >
                                  <input
                                    className="form-check-input flex-shrink-0 m-0"
                                    type="radio"
                                    name={`filter-${selectedFilterAccount.id}`}
                                    checked={isSelected}
                                    onChange={() =>
                                      handleSelectFilter(selectedFilterAccount.booruUrl, filter.id)
                                    }
                                  />
                                  <div>
                                    <div className="fw-bold">{filter.name}</div>
                                    <small
                                      className="text-muted d-block text-truncate"
                                      style={{ maxWidth: '250px' }}
                                    >
                                      {filter.description || 'No description'}
                                    </small>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* USER FILTERS */}
                      <div className="col-12 col-md-6">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="fw-bold m-0 text-success">
                            User Filters (Requires API Key)
                          </h6>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-secondary"
                              disabled={userPage <= 1}
                              onClick={() => setUserPage((p) => p - 1)}
                            >
                              Prev
                            </button>
                            <button
                              className="btn btn-outline-secondary"
                              disabled={userFilters.length < 50}
                              onClick={() => setUserPage((p) => p + 1)}
                            >
                              Next
                            </button>
                          </div>
                        </div>

                        <div
                          className="list-group shadow-sm border"
                          style={{ borderColor: 'var(--app-border)' }}
                        >
                          {userFilters.length === 0 ? (
                            <div
                              className="list-group-item text-muted text-center py-3"
                              style={{ backgroundColor: 'var(--app-bg)' }}
                            >
                              {!selectedFilterAccount.apiKey
                                ? 'Add an API Key to view your custom filters.'
                                : 'No custom filters found.'}
                            </div>
                          ) : (
                            userFilters.map((filter) => {
                              const isSelected =
                                pendingFilters[fixBooruUrl(selectedFilterAccount.booruUrl)] ===
                                filter.id;
                              return (
                                <label
                                  key={`user-${filter.id}`}
                                  className="list-group-item d-flex gap-3 align-items-center cursor-pointer"
                                  style={{
                                    backgroundColor: isSelected
                                      ? 'var(--app-surface)'
                                      : 'var(--app-bg)',
                                    color: 'var(--app-text)',
                                    borderColor: 'var(--app-border)',
                                  }}
                                >
                                  <input
                                    className="form-check-input flex-shrink-0 m-0"
                                    type="radio"
                                    name={`filter-${selectedFilterAccount.id}`}
                                    checked={isSelected}
                                    onChange={() =>
                                      handleSelectFilter(selectedFilterAccount.booruUrl, filter.id)
                                    }
                                  />
                                  <div>
                                    <div className="fw-bold">{filter.name}</div>
                                    <small
                                      className="text-muted d-block text-truncate"
                                      style={{ maxWidth: '250px' }}
                                    >
                                      {filter.description || 'No description'}
                                    </small>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}

        {/* APP TAB */}
        {activeTab === 'app' && (
          <div className="fade-in pt-3">
            <div className="card no-anim">
              <div className="card-header fw-bold">App & Storage Settings</div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Maximum Cached Items</label>
                  <input
                    type="number"
                    className="form-control"
                    value={maxItemsLimit}
                    onChange={handleLimitChange}
                    disabled={isLoading || isPersistent}
                    step="1000"
                  />
                  <small className="text-muted">
                    Will be ignored if Persistent Storage is enabled.
                  </small>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="persistSwitch"
                    checked={isPersistent}
                    onChange={handleSettingsChange}
                    disabled={isLoading}
                  />
                  <label className="form-check-label" htmlFor="persistSwitch">
                    Enable Persistent Storage (Requires Browser Permission)
                  </label>
                </div>
                <div
                  className="form-check form-switch mt-3 pt-3 border-top"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="inAppViewerSwitch"
                    checked={inAppViewer}
                    onChange={(e) => {
                      setInAppViewer(e.target.checked);
                      localStorage.setItem('app_inAppViewer', e.target.checked);
                    }}
                    disabled={isLoading}
                  />
                  <label
                    className="form-check-label fw-semibold text-primary"
                    htmlFor="inAppViewerSwitch"
                  >
                    Enable In-App Image Viewer (Opens images within the app instead of new tabs)
                  </label>
                </div>
                <div className="form-check form-switch mt-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="inAppProfileViewerSwitch"
                    checked={inAppProfileViewer}
                    onChange={(e) => {
                      setInAppProfileViewer(e.target.checked);
                      localStorage.setItem('app_inAppProfileViewer', e.target.checked);
                    }}
                    disabled={isLoading}
                  />
                  <label
                    className="form-check-label fw-semibold text-primary"
                    htmlFor="inAppProfileViewerSwitch"
                  >
                    Enable In-App Profile Viewer (Opens user profiles within the app)
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Theme TAB */}
        {activeTab === 'theme' && (
          <div className="fade-in pt-3">
            <div className="card no-anim">
              <div
                className="card-header fw-bold d-flex justify-content-between align-items-center"
                style={{ backgroundColor: 'var(--app-primary)', color: '#ffffff' }}
              >
                <span>Theme & Colors Editor (Beta)</span>
                <div>
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleImportTheme}
                  />
                  <button
                    className={`btn btn-sm btn-outline-${isDark ? 'light' : 'dark'} me-2`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Import Theme
                  </button>
                  <button
                    className={`btn btn-sm btn-outline-${isDark ? 'light' : 'dark'}`}
                    onClick={handleExportTheme}
                  >
                    Export Theme
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <label className="form-label fw-semibold">Appearance Mode</label>
                  <select
                    className="form-select bg-transparent"
                    style={{ borderColor: 'var(--app-border)', color: 'var(--app-text)' }}
                    value={themeMode}
                    onChange={(e) => handleThemeModeChange(e.target.value)}
                  >
                    <option value="system" style={{ color: '#000' }}>
                      System Default
                    </option>
                    <option value="light" style={{ color: '#000' }}>
                      Light Mode
                    </option>
                    <option value="dark" style={{ color: '#000' }}>
                      Dark Mode
                    </option>
                  </select>
                </div>

                <h6 className="fw-bold mb-3 mt-4 border-bottom pb-2">Global Colors</h6>
                <div className="row mb-3">
                  <div className="col-md-3 mb-2">
                    <label className="form-label small fw-semibold">Primary Color</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customPrimary || '#4f46e5'}
                      onChange={(e) =>
                        handleColorChange('app_primary', e.target.value, setCustomPrimary)
                      }
                    />
                  </div>
                  <div className="col-md-3 mb-2">
                    <label className="form-label small fw-semibold">Danger Color</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customDanger || '#ef4444'}
                      onChange={(e) =>
                        handleColorChange('app_danger', e.target.value, setCustomDanger)
                      }
                    />
                  </div>
                  <div className="col-md-3 mb-2">
                    <label className="form-label small fw-semibold">App Background</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customBg || '#f8fafc'}
                      onChange={(e) => handleColorChange('app_bg', e.target.value, setCustomBg)}
                    />
                  </div>
                  <div className="col-md-3 mb-2">
                    <label className="form-label small fw-semibold">Navbar Background</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customNavbar || '#0f172a'}
                      onChange={(e) =>
                        handleColorChange('app_navbar', e.target.value, setCustomNavbar)
                      }
                    />
                  </div>
                </div>

                <h6 className="fw-bold mb-3 mt-4 border-bottom pb-2">Inputs, Badges & Loaders</h6>
                <div className="row mb-3">
                  <div className="col-md-2 col-6 mb-2">
                    <label className="form-label small fw-semibold">Input BG</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customInputBg || '#ffffff'}
                      onChange={(e) =>
                        handleColorChange('app_input_bg', e.target.value, setCustomInputBg)
                      }
                    />
                  </div>
                  <div className="col-md-2 col-6 mb-2">
                    <label className="form-label small fw-semibold">Input Text</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customInputText || '#334155'}
                      onChange={(e) =>
                        handleColorChange('app_input_text', e.target.value, setCustomInputText)
                      }
                    />
                  </div>
                  <div className="col-md-2 col-6 mb-2">
                    <label className="form-label small fw-semibold">Badge BG</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customBadgeBg || '#10b981'}
                      onChange={(e) =>
                        handleColorChange('app_badge_bg', e.target.value, setCustomBadgeBg)
                      }
                    />
                  </div>
                  <div className="col-md-2 col-6 mb-2">
                    <label className="form-label small fw-semibold">Badge Text</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customBadgeText || '#ffffff'}
                      onChange={(e) =>
                        handleColorChange('app_badge_text', e.target.value, setCustomBadgeText)
                      }
                    />
                  </div>
                  <div className="col-md-4 col-12 mb-2">
                    <label className="form-label small fw-semibold text-primary">
                      Spinner Loader
                    </label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customSpinner || '#4f46e5'}
                      onChange={(e) =>
                        handleColorChange('app_spinner', e.target.value, setCustomSpinner)
                      }
                    />
                  </div>
                </div>

                <h6 className="fw-bold mb-3 mt-4 border-bottom pb-2">Text Colors</h6>
                <div className="row mb-3">
                  <div className="col-md-6 mb-2">
                    <label className="form-label small fw-semibold">Main Text</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customText || '#334155'}
                      onChange={(e) => handleColorChange('app_text', e.target.value, setCustomText)}
                    />
                  </div>
                  <div className="col-md-6 mb-2">
                    <label className="form-label small fw-semibold text-muted">Muted Text</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customTextMuted || '#64748b'}
                      onChange={(e) =>
                        handleColorChange('app_text_muted', e.target.value, setCustomTextMuted)
                      }
                    />
                  </div>
                </div>

                <h6 className="fw-bold mb-3 mt-4 border-bottom pb-2">Alert Colors</h6>
                <div className="row mb-3">
                  <div className="col-md-6 col-lg-3 mb-2">
                    <label className="form-label small fw-semibold text-warning">Warning BG</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={alertWarningBg || '#fef3c7'}
                      onChange={(e) =>
                        handleColorChange('alert_warning_bg', e.target.value, setAlertWarningBg)
                      }
                    />
                  </div>
                  <div className="col-md-6 col-lg-3 mb-2">
                    <label className="form-label small fw-semibold text-warning">
                      Warning Text
                    </label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={alertWarningText || '#92400e'}
                      onChange={(e) =>
                        handleColorChange('alert_warning_text', e.target.value, setAlertWarningText)
                      }
                    />
                  </div>
                  <div className="col-md-6 col-lg-3 mb-2">
                    <label className="form-label small fw-semibold text-info">Info BG</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={alertInfoBg || '#e0f2fe'}
                      onChange={(e) =>
                        handleColorChange('alert_info_bg', e.target.value, setAlertInfoBg)
                      }
                    />
                  </div>
                  <div className="col-md-6 col-lg-3 mb-2">
                    <label className="form-label small fw-semibold text-info">Info Text</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={alertInfoText || '#075985'}
                      onChange={(e) =>
                        handleColorChange('alert_info_text', e.target.value, setAlertInfoText)
                      }
                    />
                  </div>
                  <div className="col-md-6 col-lg-3 mb-2">
                    <label className="form-label small fw-semibold text-danger">Danger BG</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={alertDangerBg || '#fee2e2'}
                      onChange={(e) =>
                        handleColorChange('alert_danger_bg', e.target.value, setAlertDangerBg)
                      }
                    />
                  </div>
                  <div className="col-md-6 col-lg-3 mb-2">
                    <label className="form-label small fw-semibold text-danger">Danger Text</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={alertDangerText || '#991b1b'}
                      onChange={(e) =>
                        handleColorChange('alert_danger_text', e.target.value, setAlertDangerText)
                      }
                    />
                  </div>
                </div>

                <h6 className="fw-bold mb-3 mt-4 border-bottom pb-2">Interaction Symbols</h6>
                <div className="row mb-4">
                  <div className="col-md-4 mb-2">
                    <label className="form-label small fw-semibold text-warning">
                      Favorite Symbol
                    </label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customFave || '#f59e0b'}
                      onChange={(e) => handleColorChange('app_fave', e.target.value, setCustomFave)}
                    />
                  </div>
                  <div className="col-md-4 mb-2">
                    <label className="form-label small fw-semibold text-success">
                      Upvote Symbol
                    </label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customUpvote || '#10b981'}
                      onChange={(e) =>
                        handleColorChange('app_upvote', e.target.value, setCustomUpvote)
                      }
                    />
                  </div>
                  <div className="col-md-4 mb-2">
                    <label className="form-label small fw-semibold text-danger">
                      Downvote Symbol
                    </label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={customDownvote || '#ef4444'}
                      onChange={(e) =>
                        handleColorChange('app_downvote', e.target.value, setCustomDownvote)
                      }
                    />
                  </div>
                </div>

                <button className="btn btn-outline-danger btn-sm" onClick={resetColors}>
                  Reset All Colors to Default
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="alert alert-danger d-flex flex-column flex-md-row justify-content-between align-items-center mb-0 mt-2 shadow-sm">
          <div className="mb-2 mb-md-0">
            <strong>Danger Zone:</strong> Factory reset will wipe the entire JsStore database.
          </div>
          <button
            className="btn btn-danger fw-bold"
            onClick={handleFactoryReset}
            disabled={isLoading}
          >
            FACTORY RESET
          </button>
        </div>
      </div>
    </div>
  );
};
