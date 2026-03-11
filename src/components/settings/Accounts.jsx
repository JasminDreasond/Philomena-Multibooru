import { useEffect, useState } from 'react';
import { confirm } from '../../tools/BootstrapDialogs';

import {
  getAllAccounts,
  getSystemSettings,
  addAccount,
  deleteAccount,
  deleteAllAccounts,
  fixBooruUrl,
  clearSpecificBooruCache,
} from '../../services/api';

export const Accounts = ({
  setMaxItemsLimit,
  setIsPersistent,
  setActiveTab,
  isLoading,
  setIsLoading,
  loadAccounts,
}) => {
  /** @type {[Account[], import('react').Dispatch<import('react').SetStateAction<Account[]>>]} */
  const [accountsList, setAccountsList] = useState([]);

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [urlInput, setUrlInput] = useState('');

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [keyInput, setKeyInput] = useState('');

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [acceptRisk, setAcceptRisk] = useState(false);

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [errorMessage, setErrorMessage] = useState('');

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [warnRisk, setWarnRisk] = useState(false);

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
    const isConfirmed = await confirm('Are you sure you want to delete all configured accounts?');
    if (isConfirmed) {
      setIsLoading(true);
      await deleteAllAccounts();
      await loadData();
    }
  };

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

  return (
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
            <div className="card-header fw-bold" style={{ backgroundColor: 'var(--app-primary)' }}>
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
              <div className="card-footer text-end" style={{ backgroundColor: 'transparent' }}>
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
  );
};
