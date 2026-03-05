import { useState, useEffect } from 'react';
import {
  addAccount,
  getAllAccounts,
  deleteAccount,
  deleteAllAccounts,
  factoryResetDatabase,
} from '../services/api';

/**
 * @typedef {import('../services/api').Account} Account
 */

/**
 * @param {{ onClose: () => void }} props
 */
export const SettingsPanel = ({ onClose }) => {
  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [urlInput, setUrlInput] = useState('');

  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [keyInput, setKeyInput] = useState('');

  /** @type {[Account[], import('react').Dispatch<import('react').SetStateAction<Account[]>>]} */
  const [accountsList, setAccountsList] = useState([]);

  /**
   * @returns {Promise<void>}
   */
  const loadAccounts = async () => {
    /** @type {Account[]} */
    const data = await getAllAccounts();
    setAccountsList(data);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  /**
   * @param {import('react').FormEvent<HTMLFormElement>} event
   * @returns {Promise<void>}
   */
  const handleAddAccount = async (event) => {
    event.preventDefault();
    if (urlInput && keyInput) {
      await addAccount(urlInput, keyInput);
      setUrlInput('');
      setKeyInput('');
      await loadAccounts();
    }
  };

  /**
   * @param {number} id
   * @returns {Promise<void>}
   */
  const handleRemoveAccount = async (id) => {
    await deleteAccount(id);
    await loadAccounts();
  };

  /**
   * @returns {Promise<void>}
   */
  const handleClearAllAccounts = async () => {
    /** @type {boolean} */
    const isConfirmed = window.confirm('Are you sure you want to delete all configured accounts?');
    if (isConfirmed) {
      await deleteAllAccounts();
      await loadAccounts();
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

  return (
    <div className="container mt-4 mb-4 p-4 bg-white rounded shadow-sm border">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>System Settings</h2>
        <button className="btn btn-close" onClick={onClose} aria-label="Close"></button>
      </div>

      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card h-100 border-primary">
            <div className="card-header bg-primary text-white">Add New API Account</div>
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
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Save Account
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-header">Connected Accounts</div>
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
                      onClick={() => handleRemoveAccount(acc.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>
            {accountsList.length > 0 && (
              <div className="card-footer bg-white text-end">
                <button className="btn btn-sm btn-danger" onClick={handleClearAllAccounts}>
                  Delete All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <hr className="my-4" />

      <div className="alert alert-danger d-flex justify-content-between align-items-center mb-0">
        <div>
          <strong>Danger Zone:</strong> Factory reset will wipe the entire JsStore database.
        </div>
        <button className="btn btn-danger fw-bold" onClick={handleFactoryReset}>
          FACTORY RESET
        </button>
      </div>
    </div>
  );
};
