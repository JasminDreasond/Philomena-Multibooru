import { useState, useEffect, useRef } from 'react';
import { fetchPhilomena } from '../../services/api';

/**
 * @param {{ accounts: import('../../services/api').Account[], visibleBoorus: string[], onClose: () => void, onGoHome: () => void }} props
 */
export const NotificationsMode = ({ accounts, visibleBoorus, onClose, onGoHome }) => {
  /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
  const [permission, setPermission] = useState(Notification.permission);

  /** @type {[number, import('react').Dispatch<import('react').SetStateAction<number>>]} */
  const [intervalMinutes, setIntervalMinutes] = useState(() => {
    const saved = localStorage.getItem('app_notifInterval');
    return saved ? Math.max(30, parseInt(saved, 10)) : 30;
  });

  /** @type {['app' | 'booru', import('react').Dispatch<import('react').SetStateAction<'app' | 'booru'>>]} */
  const [clickAction, setClickAction] = useState(() => {
    return localStorage.getItem('app_notifAction') === 'booru' ? 'booru' : 'app';
  });

  /** @type {['default' | 'watched', import('react').Dispatch<import('react').SetStateAction<'default' | 'watched'>>]} */
  const [searchType, setSearchType] = useState(() => {
    return localStorage.getItem('app_notifSearchType') === 'watched' ? 'watched' : 'default';
  });

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [enableSound, setEnableSound] = useState(() => {
    return localStorage.getItem('app_notifSound') !== 'false';
  });

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isActive, setIsActive] = useState(false);

  /** @type {[Date | null, import('react').Dispatch<import('react').SetStateAction<Date | null>>]} */
  const [lastChecked, setLastChecked] = useState(null);

  /** @type {import('react').MutableRefObject<Record<string, number>>} */
  const lastSeenIds = useRef({});

  useEffect(() => {
    localStorage.setItem('app_notifInterval', intervalMinutes.toString());
  }, [intervalMinutes]);

  useEffect(() => {
    localStorage.setItem('app_notifAction', clickAction);
  }, [clickAction]);

  useEffect(() => {
    localStorage.setItem('app_notifSound', enableSound.toString());
  }, [enableSound]);

  useEffect(() => {
    localStorage.setItem('app_notifSearchType', searchType);
  }, [searchType]);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  /**
   * @param {string} booruUrl
   * @param {string} title
   * @param {string} body
   */
  const sendNotification = (booruUrl, title, body) => {
    if (enableSound) {
      try {
        // REPLACE THIS PATH LATER WITH YOUR ACTUAL AUDIO FILE PATH
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch((err) => console.warn('Audio playback prevented by browser:', err));
      } catch (err) {
        console.error('Failed to play notification sound:', err);
      }
    }

    if (Notification.permission !== 'granted') return;

    const notification = new Notification(title, {
      body,
      icon: '/icon/512.png',
    });

    notification.onclick = (e) => {
      e.preventDefault();
      notification.close();

      if (clickAction === 'booru') {
        window.open(booruUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.focus();
        onGoHome();
      }
    };
  };

  useEffect(() => {
    if (!isActive || permission !== 'granted') return;

    const checkNewImages = async () => {
      if (visibleBoorus.length === 0 || accounts.length === 0) return;

      const activeAccounts = accounts.filter((a) => visibleBoorus.includes(a.booruUrl));
      const query = searchType === 'watched' ? 'my:watched' : '*';

      for (const acc of activeAccounts) {
        try {
          const data = await fetchPhilomena(acc.booruUrl, 'search/images', acc.apiKey, {
            q: query,
            per_page: 1,
            sf: 'created_at',
            sd: 'desc',
          });

          if (data && data.images && data.images.length > 0) {
            const latestImage = data.images[0];
            const trackerKey = `${acc.booruUrl}_${searchType}`;
            const previousId = lastSeenIds.current[trackerKey];

            if (previousId && latestImage.id > previousId) {
              const booruName = new URL(acc.booruUrl).hostname;
              const title =
                searchType === 'watched'
                  ? `New Watched Images on ${booruName}!`
                  : `New Images on ${booruName}!`;

              const body =
                searchType === 'watched'
                  ? `Yaaaaaaay! Fresh new images have just landed in the gallery matching your watched tags!`
                  : `Yay! Fresh new images have just landed in the gallery!`;

              sendNotification(acc.booruUrl, title, body);

              // Tell the Service Worker to broadcast the alert icon to all tabs
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                  type: 'FAVICON_UPDATE',
                  icon: 'alert',
                });
              }
            }

            lastSeenIds.current[trackerKey] = latestImage.id;
          }
        } catch (error) {
          console.error(`Failed to check notifications for ${acc.booruUrl}:`, error);
        }
      }

      setLastChecked(new Date());
    };

    // Check immediately when activated, so we have a baseline ID
    checkNewImages();

    // Set the interval
    const ms = Math.max(30, intervalMinutes) * 60 * 1000;
    const intervalId = setInterval(checkNewImages, ms);

    return () => clearInterval(intervalId);
  }, [isActive, intervalMinutes, permission, visibleBoorus, accounts, searchType]);

  /**
   * @param {import('react').ChangeEvent<HTMLInputElement>} e
   */
  const handleIntervalChange = (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 30;
    setIntervalMinutes(val);
  };

  const enforceMinimum = () => {
    if (intervalMinutes < 30) {
      setIntervalMinutes(30);
    }
  };

  return (
    <div
      className="container-fluid d-flex flex-column justify-content-center align-items-center"
      style={{ minHeight: '80vh', color: 'var(--app-text)' }}
    >
      <div
        className="card shadow-lg border-0 p-5 text-center"
        style={{
          backgroundColor: 'var(--app-surface)',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        <div className="mb-4" style={{ fontSize: '4rem' }}>
          ⏰
        </div>
        <h2 className="fw-bold mb-4">Notifications Mode</h2>

        {permission === 'denied' && (
          <div className="alert alert-danger fw-semibold small mb-4">
            You have denied notification permissions. Please click the padlock icon in your
            browser's URL bar to allow notifications, then reload the page.
          </div>
        )}

        {permission === 'default' && (
          <div className="mb-4">
            <p className="text-muted fw-semibold small mb-2">
              Notifications are currently not enabled. We need your permission to alert you.
            </p>
            <button className="btn btn-primary fw-bold w-100" onClick={requestPermission}>
              Allow Notifications
            </button>
          </div>
        )}

        <div className="mb-3 text-start">
          <label className="form-label fw-bold">Search Type</label>
          <select
            className="form-select fw-semibold"
            style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            disabled={isActive}
          >
            <option value="default">Default Gallery (*)</option>
            <option value="watched">Watched List (my:watched)</option>
          </select>
        </div>

        <div className="mb-3 text-start">
          <label className="form-label fw-bold">Check Interval (Minutes)</label>
          <div className="input-group">
            <input
              type="number"
              className="form-control text-center fw-bold"
              style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
              value={intervalMinutes}
              onChange={handleIntervalChange}
              onBlur={enforceMinimum}
              min="30"
              disabled={isActive}
            />
          </div>
          <div className="form-text small" style={{ color: 'var(--app-text)' }}>
            Minimum allowed is 30 minutes to prevent API bans.
          </div>
        </div>

        <div className="mb-4 text-start">
          <label className="form-label fw-bold">On Notification Click</label>
          <select
            className="form-select fw-semibold"
            style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
            value={clickAction}
            onChange={(e) => setClickAction(e.target.value)}
            disabled={isActive}
          >
            <option value="app">Open in App Homepage</option>
            <option value="booru">Open natively in the Booru</option>
          </select>
        </div>

        <div className="mb-4 text-start">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="enableSoundSwitch"
              checked={enableSound}
              onChange={(e) => setEnableSound(e.target.checked)}
              disabled={isActive}
            />
            <label className="form-check-label fw-bold" htmlFor="enableSoundSwitch">
              Play Sound Alert
            </label>
          </div>
        </div>

        {permission === 'granted' && (
          <button
            className={`btn fw-bold w-100 py-2 ${isActive ? 'btn-danger' : 'btn-success'}`}
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? 'Stop Scanning' : 'Start Scanning'}
          </button>
        )}

        {isActive && lastChecked && (
          <div className="mt-4 text-muted small fw-semibold">
            Running... Last checked at: {lastChecked.toLocaleTimeString()}
          </div>
        )}

        <hr className="my-4" style={{ borderColor: 'var(--app-border)' }} />

        <button className="btn btn-outline-secondary btn-sm fw-bold w-100" onClick={onClose}>
          Close Notifications Mode
        </button>
      </div>
    </div>
  );
};
