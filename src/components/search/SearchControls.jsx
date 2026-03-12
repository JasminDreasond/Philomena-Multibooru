/**
 * @param {{ sf: string, sd: string, onSortChange: (sf: string, sd: string) => void, isInfiniteScroll: boolean, onInfiniteScrollChange: (val: boolean) => void }} props
 */
export const SearchControls = ({
  sf,
  sd,
  onSortChange,
  isInfiniteScroll,
  onInfiniteScrollChange,
}) => {
  return (
    <div
      className={`d-flex flex-wrap gap-2 align-items-center px-2 py-2${isInfiniteScroll ? ' mb-5' : ''} rounded shadow-sm border`}
      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
    >
      <span className="fw-bold small ms-2" style={{ color: 'var(--app-text-muted)' }}>
        Sort by:
      </span>
      <select
        className="form-select form-select-sm w-auto fw-semibold"
        value={sf}
        onChange={(e) => onSortChange(e.target.value, sd)}
        style={{
          backgroundColor: 'var(--app-input-bg)',
          color: 'var(--app-input-text)',
          borderColor: 'var(--app-border)',
        }}
      >
        <option value="created_at">Created</option>
        <option value="updated_at">Updated</option>
        <option value="first_seen_at">First Seen</option>
        <option value="wilson_score">Wilson Score</option>
        <option value="score">Score</option>
        <option value="upvotes">Upvotes</option>
        <option value="downvotes">Downvotes</option>
        <option value="faves">Faves</option>
        <option value="comments">Comments</option>
        <option value="size">File Size</option>
        <option value="width">Image Width</option>
        <option value="height">Image Height</option>
      </select>

      <span className="fw-bold small ms-2" style={{ color: 'var(--app-text-muted)' }}>
        Order:
      </span>
      <select
        className="form-select form-select-sm w-auto fw-semibold"
        value={sd}
        onChange={(e) => onSortChange(sf, e.target.value)}
        style={{
          backgroundColor: 'var(--app-input-bg)',
          color: 'var(--app-input-text)',
          borderColor: 'var(--app-border)',
        }}
      >
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>

      {/* Infinite Scroll Switch */}
      <div className="ms-auto d-flex align-items-center me-2 mt-2 mt-sm-0">
        <div className="form-check form-switch m-0 d-flex align-items-center">
          <input
            className="form-check-input mt-0 me-2"
            type="checkbox"
            id="infiniteScrollToggle"
            checked={isInfiniteScroll}
            onChange={(e) => onInfiniteScrollChange(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label
            className="form-check-label small fw-bold"
            htmlFor="infiniteScrollToggle"
            style={{ color: 'var(--app-text-muted)', cursor: 'pointer' }}
          >
            Infinite Scroll
          </label>
        </div>
      </div>
    </div>
  );
};
