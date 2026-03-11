import { useState } from 'react';

import { updateSystemSettings } from '../../services/api';

/**
 * @param {Object} config
 * @param {boolean} config.isLoading
 * @param {number} config.maxItemsLimit
 * @param {boolean} config.isPersistent
 */
export const AppSettings = ({
  isPersistent,
  setIsPersistent,
  maxItemsLimit,
  setMaxItemsLimit,
  isLoading,
}) => {
  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(
    localStorage.getItem('app_autoRefreshEnabled') === 'true',
  );

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

  return (
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
            <small className="text-muted">Will be ignored if Persistent Storage is enabled.</small>
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
              If enabled, the app will automatically fetch new images when you return to the tab
              after 60 seconds of inactivity.
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
  );
};
