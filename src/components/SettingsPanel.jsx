import { useState, useEffect } from 'react';
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

import { Privacy } from './settings/Privacy';
import { About } from './settings/About';
import { Theme } from './settings/Theme';

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

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  const [inAppProfileViewer, setInAppProfileViewer] = useState(
    localStorage.getItem('app_inAppProfileViewer') === 'true',
  );

  const [inAppViewer, setInAppViewer] = useState(
    localStorage.getItem('app_inAppViewer') === 'true',
  );

  /* Plyr Settings */
  const [plyrAutoplay, setPlyrAutoplay] = useState(
    localStorage.getItem('app_plyrAutoplay') !== 'false',
  );
  const [plyrMuted, setPlyrMuted] = useState(localStorage.getItem('app_plyrMuted') !== 'false');
  const [plyrLoop, setPlyrLoop] = useState(localStorage.getItem('app_plyrLoop') !== 'false');
  const [plyrHideControls, setPlyrHideControls] = useState(
    localStorage.getItem('app_plyrHideControls') !== 'false',
  );
  const [plyrStorage, setPlyrStorage] = useState(
    localStorage.getItem('app_plyrStorage') === 'true',
  );

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

  const handleToggleAutoRefresh = (e) => {
    const isChecked = e.target.checked;
    setAutoRefreshEnabled(isChecked);
    localStorage.setItem('app_autoRefreshEnabled', isChecked ? 'true' : 'false');
  };

  /**
   * @param {string} key
   * @param {import('react').Dispatch<import('react').SetStateAction<boolean>>} setter
   * @param {boolean} value
   */
  const handlePlyrSettingChange = (key, setter, value) => {
    setter(value);
    localStorage.setItem(key, value ? 'true' : 'false');
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
    const savedAutoRefresh = localStorage.getItem('app_autoRefreshEnabled') === 'true';
    setAutoRefreshEnabled(savedAutoRefresh);
  }, []);

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
              { name: 'About & FAQ', value: 'about' },
              { name: 'Privacy & Terms', value: 'privacy' },
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
                <div className="card no-anim h-100">
                  <div
                    className="card-header fw-bold"
                    style={{ backgroundColor: 'var(--app-primary)' }}
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
                      <div className="mb-3">
                        <small className="text-muted">
                          By adding an account, you agree to the app's{' '}
                          <button
                            type="button"
                            className="btn btn-link p-0 small fw-bold align-baseline"
                            onClick={() => setActiveTab('privacy')}
                          >
                            Privacy Policy & Terms of Use
                          </button>
                          .
                        </small>
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
              <div className="pt-3">
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
                <div className="form-check form-switch my-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="autoRefreshToggle"
                    checked={autoRefreshEnabled}
                    onChange={handleToggleAutoRefresh}
                  />
                  <label className="form-check-label fw-bold" htmlFor="autoRefreshToggle">
                    Enable Auto-Refresh on Inactivity
                  </label>
                  <div className="form-text text-muted small">
                    If enabled, the app will automatically fetch new images when you return to the
                    tab after 60 seconds of inactivity.
                  </div>
                </div>
              </div>
            </div>

            <div className="card no-anim mt-4">
              <div className="card-header fw-bold">Video Player (Plyr) Settings</div>
              <div className="card-body">
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="plyrAutoplaySwitch"
                    checked={plyrAutoplay}
                    onChange={(e) =>
                      handlePlyrSettingChange('app_plyrAutoplay', setPlyrAutoplay, e.target.checked)
                    }
                  />
                  <label className="form-check-label fw-semibold" htmlFor="plyrAutoplaySwitch">
                    Autoplay videos
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="plyrMutedSwitch"
                    checked={plyrMuted}
                    onChange={(e) =>
                      handlePlyrSettingChange('app_plyrMuted', setPlyrMuted, e.target.checked)
                    }
                  />
                  <label className="form-check-label fw-semibold" htmlFor="plyrMutedSwitch">
                    Start muted
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="plyrLoopSwitch"
                    checked={plyrLoop}
                    onChange={(e) =>
                      handlePlyrSettingChange('app_plyrLoop', setPlyrLoop, e.target.checked)
                    }
                  />
                  <label className="form-check-label fw-semibold" htmlFor="plyrLoopSwitch">
                    Loop videos
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="plyrHideControlsSwitch"
                    checked={plyrHideControls}
                    onChange={(e) =>
                      handlePlyrSettingChange(
                        'app_plyrHideControls',
                        setPlyrHideControls,
                        e.target.checked,
                      )
                    }
                  />
                  <label className="form-check-label fw-semibold" htmlFor="plyrHideControlsSwitch">
                    Hide controls automatically
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
                    id="plyrStorageSwitch"
                    checked={plyrStorage}
                    onChange={(e) =>
                      handlePlyrSettingChange('app_plyrStorage', setPlyrStorage, e.target.checked)
                    }
                  />
                  <label
                    className="form-check-label fw-semibold text-primary"
                    htmlFor="plyrStorageSwitch"
                  >
                    Enable Plyr Local Storage (Remembers volume and player settings)
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Theme TAB */}
        {activeTab === 'theme' && <Theme isDark={isDark} />}

        {/* ABOUT & FAQ TAB */}
        {activeTab === 'about' && <About />}

        {/* PRIVACY & TERMS TAB */}
        {activeTab === 'privacy' && <Privacy />}

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
