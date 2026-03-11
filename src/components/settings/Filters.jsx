import { useEffect, useState } from 'react';
import { alert } from '../../tools/BootstrapDialogs';

import {
  fixBooruUrl,
  fetchSystemFilters,
  fetchUserFilters,
  saveBooruFilters,
} from '../../services/api';

export const Filters = ({ loadAccounts, accounts, activeTab }) => {
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

  // --- Filters State ---
  /** @type {[Account|null, import('react').Dispatch<import('react').SetStateAction<Account|null>>]} */
  const [selectedFilterAccount, setSelectedFilterAccount] = useState(null);

  useEffect(() => {
    loadAccounts();
    const currentSavedFilters = JSON.parse(localStorage.getItem('app_booruFilters') || '{}');
    setSavedFilters(currentSavedFilters);
    setPendingFilters(currentSavedFilters);
  }, []);

  useEffect(() => {
    if (accounts.length > 0 && !selectedFilterAccount) {
      setSelectedFilterAccount(accounts[0]);
    }
  }, [activeTab, accounts, selectedFilterAccount]);

  useEffect(() => {
    if (selectedFilterAccount) {
      loadFiltersData(selectedFilterAccount, sysPage, userPage);
    }
  }, [selectedFilterAccount, sysPage, userPage]);

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
                          pendingFilters[fixBooruUrl(selectedFilterAccount.booruUrl)] === filter.id;
                        return (
                          <label
                            key={`sys-${filter.id}`}
                            className="list-group-item d-flex gap-3 align-items-center cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? 'var(--app-surface)' : 'var(--app-bg)',
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
                    <h6 className="fw-bold m-0 text-success">User Filters (Requires API Key)</h6>
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
                          pendingFilters[fixBooruUrl(selectedFilterAccount.booruUrl)] === filter.id;
                        return (
                          <label
                            key={`user-${filter.id}`}
                            className="list-group-item d-flex gap-3 align-items-center cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? 'var(--app-surface)' : 'var(--app-bg)',
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
  );
};
