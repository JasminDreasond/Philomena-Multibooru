import { useState, useEffect } from 'react';
import {
  addAccount,
  getAllAccounts,
  deleteAccount,
  deleteAllAccounts,
  getSystemSettings,
  fixBooruUrl,
  clearSpecificBooruCache,
  getActiveAccounts,
} from '../services/api';

import { Privacy } from './settings/Privacy';
import { About } from './settings/About';
import { ThemeSettings } from './settings/Theme';
import { AppSettings } from './settings/AppSettings';
import { FactoryReset } from './settings/FactoryReset';
import { Filters } from './settings/Filters';

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

  /* More Stuff */
  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [activeTab, setActiveTab] = useState('accounts');

  /** @type {[Account[], import('react').Dispatch<import('react').SetStateAction<Account[]>>]} */
  const [accounts, setAccounts] = useState([]);

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
  const loadAccounts = async () => {
    const accs = await getActiveAccounts();
    setAccounts(accs);
  };

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
          <Filters loadAccounts={loadAccounts} accounts={accounts} activeTab={activeTab} />
        )}

        {/* APP TAB */}
        {activeTab === 'app' && (
          <AppSettings
            isPersistent={isPersistent}
            setIsPersistent={setIsPersistent}
            maxItemsLimit={maxItemsLimit}
            setMaxItemsLimit={setMaxItemsLimit}
            isLoading={isLoading}
          />
        )}

        {/* Theme TAB */}
        {activeTab === 'theme' && <ThemeSettings isDark={isDark} />}

        {/* ABOUT & FAQ TAB */}
        {activeTab === 'about' && <About />}

        {/* PRIVACY & TERMS TAB */}
        {activeTab === 'privacy' && <Privacy />}

        <FactoryReset isLoading={isLoading} />
      </div>
    </div>
  );
};
