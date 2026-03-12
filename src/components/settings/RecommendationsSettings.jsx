import { useState, useEffect } from 'react';

export const RecommendationsSettings = () => {
  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [enableRecs, setEnableRecs] = useState(() => {
    return localStorage.getItem('app_enableRecs') === 'true';
  });

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [recVideoMode, setRecVideoMode] = useState(() => {
    return localStorage.getItem('app_recVideoMode') === 'true';
  });

  /** @type {[number, import('react').Dispatch<import('react').SetStateAction<number>>]} */
  const [recTagLimit, setRecTagLimit] = useState(() => {
    return parseInt(localStorage.getItem('app_recTagLimit') || '5', 10);
  });

  useEffect(() => {
    localStorage.setItem('app_enableRecs', enableRecs.toString());
  }, [enableRecs]);

  useEffect(() => {
    localStorage.setItem('app_recVideoMode', recVideoMode.toString());
  }, [recVideoMode]);

  useEffect(() => {
    localStorage.setItem('app_recTagLimit', recTagLimit.toString());
  }, [recTagLimit]);

  return (
    <div className="p-3">
      <h4 className="fw-bold mb-4" style={{ color: 'var(--app-text)' }}>
        Recommendations
      </h4>

      <div className="form-check form-switch mb-4">
        <input
          type="checkbox"
          className="form-check-input"
          id="enableRecsCheck"
          checked={enableRecs}
          onChange={(e) => setEnableRecs(e.target.checked)}
        />
        <label
          className="form-check-label fw-bold"
          htmlFor="enableRecsCheck"
          style={{ color: 'var(--app-text)' }}
        >
          Enable Recommendations Sidebar
        </label>
        <div className="form-text" style={{ color: 'var(--app-text)' }}>
          Shows a "Theater Mode" sidebar with similar content when viewing an image.
        </div>
      </div>

      <div className="form-check form-switch mb-4">
        <input
          type="checkbox"
          className="form-check-input"
          id="videoModeCheck"
          checked={recVideoMode}
          disabled={!enableRecs}
          onChange={(e) => setRecVideoMode(e.target.checked)}
        />
        <label
          className="form-check-label fw-bold"
          htmlFor="videoModeCheck"
          style={{ color: 'var(--app-text)' }}
        >
          Video Mode
        </label>
        <div className="form-text" style={{ color: 'var(--app-text)' }}>
          Appends the "video" tag to force video recommendations.
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label fw-bold" style={{ color: 'var(--app-text)' }}>
          Tags to use for random querying (Max 10): {recTagLimit}
        </label>
        <input
          type="range"
          className="form-range"
          min="1"
          max="10"
          disabled={!enableRecs}
          value={recTagLimit}
          onChange={(e) => setRecTagLimit(parseInt(e.target.value, 10))}
        />
      </div>
    </div>
  );
};
