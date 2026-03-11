import { useState, useEffect } from 'react';

/**
 * @typedef {import('../../services/api').ImageResult} ImageResult
 * @typedef {import('../../services/api').ImageObj} ImageObj
 */

/**
 * @param {{ img: ImageResult; className?: string; onOpenImage?: (img: ImageResult) => void; onContextMenu?: (e: import('react').MouseEvent, img: ImageResult) => void }} props
 */
export const Image = ({ img, className, onOpenImage, onContextMenu }) => {
  /** @type {[Set<number>, import('react').Dispatch<import('react').SetStateAction<Set<number>>>]} */
  const [unspoileredIds, setUnspoileredIds] = useState(new Set());
  const openImagesInApp = localStorage.getItem('app_inAppViewer') === 'true';

  /**
   * @param {import('react').MouseEvent<HTMLAnchorElement>} event
   * @param {number} imageId
   * @param {boolean} isSpoilered
   */
  const handleImageClick = (event, imageId, isSpoilered) => {
    if (isSpoilered && !unspoileredIds.has(imageId)) {
      event.preventDefault();
      const newSet = new Set(unspoileredIds);
      newSet.add(imageId);
      setUnspoileredIds(newSet);
      return;
    }

    if (openImagesInApp) {
      event.preventDefault();
      onOpenImage(img);
    }
  };

  const targetUrl = `${img.booruUrl}/images/${img.id}`;
  const isVideo = img.mimeType && img.mimeType.startsWith('video/');
  const score = img.upvotes - img.downvotes;
  const isFav = img.interaction === 'faved';
  const isUp = isFav || img.interaction === 'upVote';
  const isDown = !isFav && img.interaction === 'downVote';
  const isProcessing = !img.processed || !img.thumbnailsGenerated ? true : false;
  const isBlurry = img.spoilered && !unspoileredIds.has(img.id) ? true : false;

  const title = `${img.booruUrl} - ${img.tags.join(', ')}`;

  return (
    <div
      className="card h-100 shadow-sm border-0 interaction-card"
      style={{ backgroundColor: 'var(--app-surface)', color: 'var(--app-text)' }}
      onContextMenu={(e) => onContextMenu && onContextMenu(e, img)}
    >
      <a
        href={openImagesInApp ? `/${new URL(img.booruUrl).hostname}/images/${img.id}` : targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-decoration-none d-block h-100"
        onClick={(e) => handleImageClick(e, img.id, img.spoilered)}
      >
        <div
          className={`${className ? className : ''}`}
          style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            backgroundColor: '#000',
            overflow: 'hidden',
          }}
        >
          {isProcessing && (
            <div
              className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-dark bg-opacity-75"
              style={{ zIndex: 10 }}
            >
              <div className="spinner-border text-light mb-2" role="status"></div>
              <span
                className="badge bg-warning text-dark text-wrap px-3 py-2 text-center"
                style={{ fontSize: '0.75rem' }}
              >
                Processing...
              </span>
            </div>
          )}

          {!isProcessing && isBlurry && (
            <div
              className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center p-2"
              style={{ zIndex: 5, pointerEvents: 'none' }}
            >
              <div className="badge bg-danger fs-6 opacity-75 text-wrap p-2 text-center shadow mb-2">
                Spoilered
                <br />
                <small>(Click to reveal)</small>
              </div>
            </div>
          )}

          <div
            style={{
              filter: isBlurry && !isProcessing ? 'blur(20px)' : 'none',
              transition: 'filter 0.3s ease',
              width: '100%',
              height: '100%',
            }}
          >
            {isVideo ? (
              <video
                title={title}
                src={img.representations.full || img.sourceUrl}
                className="w-100 h-100"
                style={{ objectFit: 'contain' }}
                muted
                loop
                autoPlay
                controls={false}
              />
            ) : (
              <img
                title={title}
                src={img.representations.thumb || img.sourceUrl}
                className="w-100 h-100"
                alt={img.tags?.join(', ') || ''}
                style={{ objectFit: 'cover' }}
              />
            )}
          </div>

          <div
            className="position-absolute top-0 w-100 text-white d-flex justify-content-between align-items-end"
            style={{ zIndex: 6 }}
          >
            <table className="interaction-container w-100 shadow-sm text-center">
              <tbody>
                <tr>
                  <td
                    className={`badge-interaction text-end ${isFav ? 'active-fave' : 'badge-inactive'}`}
                  >
                    ★ {img.faves}
                  </td>
                  <td
                    className={`badge-interaction text-end ${isUp ? 'active-up' : 'badge-inactive'}`}
                  >
                    ▲
                  </td>
                  <td
                    className={`badge-interaction ${isUp ? 'active-up' : isDown ? 'active-down' : 'badge-inactive'}`}
                  >
                    {score}
                  </td>
                  <td
                    className={`badge-interaction text-start ${isDown ? 'active-down' : 'badge-inactive'}`}
                  >
                    ▼
                  </td>
                  <td className="badge-interaction text-start badge-inactive">
                    💬 {img.commentCount || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-body py-2 px-3" style={{ zIndex: 6, position: 'relative' }}>
          <small
            className="text-muted d-block text-truncate fw-semibold"
            style={{ fontSize: '0.75rem' }}
          >
            {img.tags?.join(', ') || ''}
          </small>
        </div>
      </a>
    </div>
  );
};

/**
 * Helper component to render a grouped submenu for URLs.
 * @param {{ icon: string, label: string, url: string, openLeft: boolean }} props
 */
const ContextMenuGroup = ({ icon, label, url, openLeft }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = () => navigator.clipboard.writeText(url);
  const handleOpenTab = () => window.open(url, '_blank', 'noopener,noreferrer');
  const handleOpenWindow = () =>
    window.open(url, '_blank', 'width=800,height=600,noopener,noreferrer');

  return (
    <div
      className="position-relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="dropdown-item d-flex justify-content-between align-items-center fw-semibold rounded"
        style={{
          fontSize: '0.85rem',
          padding: '0.4rem 1rem',
          color: 'var(--app-text)',
          cursor: 'default',
        }}
        onClick={(e) => e.preventDefault()}
      >
        <span>
          <i className={`bi ${icon} me-2 text-primary`}></i>
          {label}
        </span>
        <i className="bi bi-chevron-right ms-4 text-muted" style={{ fontSize: '0.7rem' }}></i>
      </button>

      {isOpen && (
        <div
          className="dropdown-menu show shadow position-absolute border p-1"
          style={{
            top: '-5px',
            ...(openLeft
              ? { right: '100%', left: 'auto', marginRight: '2px' }
              : { left: '100%', right: 'auto', marginLeft: '2px' }),
            margin: 0,
            backgroundColor: 'var(--app-surface)',
            minWidth: '170px',
          }}
        >
          <button
            className="dropdown-item fw-semibold rounded py-1"
            style={{ fontSize: '0.85rem', color: 'var(--app-text)' }}
            onClick={handleCopy}
          >
            <i className="bi bi-clipboard me-2"></i> Copy URL
          </button>
          <button
            className="dropdown-item fw-semibold rounded py-1"
            style={{ fontSize: '0.85rem', color: 'var(--app-text)' }}
            onClick={handleOpenTab}
          >
            <i className="bi bi-box-arrow-up-right me-2"></i> New Tab
          </button>
          <button
            className="dropdown-item fw-semibold rounded py-1"
            style={{ fontSize: '0.85rem', color: 'var(--app-text)' }}
            onClick={handleOpenWindow}
          >
            <i className="bi bi-window me-2"></i> New Window
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * @param {{ menuState: { x: number, y: number, img: ImageResult } }} props
 */
const ContextMenu = ({ menuState }) => {
  const { x, y, img } = menuState;

  const appImageUrl = `${window.location.origin}/${new URL(img.booruUrl).hostname}/images/${img.id}`;
  const booruImageUrl = `${img.booruUrl}/images/${img.id}`;
  const fullImageUrl = img.representations?.full;
  const sourceUrl = img.sourceUrl;
  const hasProfile = img.uploaderId ? true : false;

  const appProfileUrl = hasProfile
    ? `${window.location.origin}/${new URL(img.booruUrl).hostname}/profiles/${img.uploaderId || img.uploader}`
    : '';

  const booruProfileUrl = hasProfile
    ? `${img.booruUrl}/profiles/${encodeURIComponent(img.uploader.replace(/ /g, '+'))}`
    : '';

  const groups = [
    { icon: 'bi-image', label: 'App Image URL', url: appImageUrl },
    { icon: 'bi-globe', label: 'Booru Image URL', url: booruImageUrl },
    { icon: 'bi-arrows-fullscreen', label: 'Original Full Image', url: fullImageUrl },
  ];

  if (sourceUrl) {
    groups.push({ icon: 'bi-link-45deg', label: 'Source Link', url: sourceUrl });
  }

  if (hasProfile) {
    groups.push({ icon: 'bi-person-badge', label: 'App Profile', url: appProfileUrl });
    groups.push({ icon: 'bi-person-circle', label: 'Booru Profile', url: booruProfileUrl });
  }

  // Previne que o submenu saia da tela se clicar muito no canto direito
  const openLeft = x > window.innerWidth - 380;

  const safeX = Math.min(x, window.innerWidth - 220);
  const safeY = Math.min(y, window.innerHeight - groups.length * 40);

  return (
    <div
      className="dropdown-menu show shadow p-1"
      style={{
        position: 'fixed',
        top: Math.max(0, safeY),
        left: Math.max(0, safeX),
        zIndex: 1050,
        backgroundColor: 'var(--app-surface)',
        borderColor: 'var(--app-border)',
      }}
    >
      {groups.map((group, idx) => (
        <ContextMenuGroup
          key={idx}
          icon={group.icon}
          label={group.label}
          url={group.url}
          openLeft={openLeft}
        />
      ))}
    </div>
  );
};

/**
 * @param {{ imagesList: ImageResult[], gridClass?: string, onOpenImage?: (img: ImageResult) => void }} props
 */
export const ImageGallery = ({
  imagesList,
  gridClass = 'row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-lg-4 row-cols-xl-4 row-cols-xxl-6 g-2',
  onOpenImage,
}) => {
  /** @type {[{ visible: boolean, x: number, y: number, img: ImageResult | null }, import('react').Dispatch<import('react').SetStateAction<{ visible: boolean, x: number, y: number, img: ImageResult | null }>>]} */
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, img: null });

  useEffect(() => {
    const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, img: null });
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  /**
   * @param {import('react').MouseEvent} e
   * @param {ImageResult} img
   */
  const handleContextMenu = (e, img) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      img,
    });
  };

  const hasImages = imagesList.length > 0;

  if (!hasImages) {
    return (
      <div className="text-center mt-4 w-100">
        <h5 className="text-muted">No images found.</h5>
      </div>
    );
  }

  return (
    <div className="w-100" style={{ position: 'relative' }}>
      <div className={`row ${gridClass}`}>
        {imagesList.map((img) => (
          <div className="col" key={`${img.booruUrl}-${img.id}`}>
            <Image img={img} onOpenImage={onOpenImage} onContextMenu={handleContextMenu} />
          </div>
        ))}
      </div>

      {contextMenu.visible && contextMenu.img && <ContextMenu menuState={contextMenu} />}
    </div>
  );
};
