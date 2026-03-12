import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * @typedef {import('../../services/api').ImageResult} ImageResult
 * @typedef {import('../../services/api').ImageObj} ImageObj
 */

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
          <i
            className={`${icon} me-2 text-primary`}
            style={{ width: '16px', textAlign: 'center' }}
          ></i>
          {label}
        </span>
        <i className="fa-solid fa-chevron-right ms-4 text-muted" style={{ fontSize: '0.7rem' }}></i>
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
            <i className="fa-solid fa-copy me-2" style={{ width: '16px', textAlign: 'center' }}></i>{' '}
            Copy URL
          </button>
          <button
            className="dropdown-item fw-semibold rounded py-1"
            style={{ fontSize: '0.85rem', color: 'var(--app-text)' }}
            onClick={handleOpenTab}
          >
            <i
              className="fa-solid fa-arrow-up-right-from-square me-2"
              style={{ width: '16px', textAlign: 'center' }}
            ></i>{' '}
            New Tab
          </button>
          <button
            className="dropdown-item fw-semibold rounded py-1"
            style={{ fontSize: '0.85rem', color: 'var(--app-text)' }}
            onClick={handleOpenWindow}
          >
            <i
              className="fa-solid fa-window-restore me-2"
              style={{ width: '16px', textAlign: 'center' }}
            ></i>{' '}
            New Window
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * @param {{ x: number, y: number, img: ImageResult, onClose: () => void }} props
 */
const ContextMenu = ({ x, y, img, onClose }) => {
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
    { icon: 'fa-solid fa-image', label: 'App Image URL', url: appImageUrl },
    { icon: 'fa-solid fa-globe', label: 'Booru Image URL', url: booruImageUrl },
    { icon: 'fa-solid fa-expand', label: 'Original Full Image', url: fullImageUrl },
  ];

  if (sourceUrl) {
    groups.push({ icon: 'fa-solid fa-link', label: 'Source Link', url: sourceUrl });
  }

  if (hasProfile) {
    groups.push({ icon: 'fa-solid fa-id-badge', label: 'App Profile', url: appProfileUrl });
    groups.push({ icon: 'fa-solid fa-user-circle', label: 'Booru Profile', url: booruProfileUrl });
  }

  const openLeft = x > window.innerWidth - 380;
  const safeX = Math.min(x, window.innerWidth - 220);
  const safeY = Math.min(y, window.innerHeight - groups.length * 40);

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1040,
        }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
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
    </>,
    document.body,
  );
};

/**
 * @param {{ img: ImageResult; className?: string; onOpenImage?: (img: ImageResult) => void }} props
 */
export const Image = ({ img, className, onOpenImage }) => {
  /** @type {[Set<number>, import('react').Dispatch<import('react').SetStateAction<Set<number>>>]} */
  const [unspoileredIds, setUnspoileredIds] = useState(new Set());

  /** @type {[{ visible: boolean, x: number, y: number }, import('react').Dispatch<import('react').SetStateAction<{ visible: boolean, x: number, y: number }>>]} */
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  const openImagesInApp = localStorage.getItem('app_inAppViewer') === 'true';

  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0 });
    document.addEventListener('click', handleClickOutside);

    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  /**
   * @param {import('react').MouseEvent} e
   */
  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

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
      onOpenImage && onOpenImage(img);
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
    <>
      <div
        className="card h-100 shadow-sm border-0 interaction-card"
        style={{ backgroundColor: 'var(--app-surface)', color: 'var(--app-text)' }}
        onContextMenu={handleContextMenu}
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

      {contextMenu.visible && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} img={img} onClose={closeContextMenu} />
      )}
    </>
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
  const hasImages = imagesList.length > 0;

  if (!hasImages) {
    return (
      <div className="text-center mt-4 w-100">
        <h5 className="text-muted">No images found.</h5>
      </div>
    );
  }

  return (
    <div className="w-100">
      <div className={`row ${gridClass}`}>
        {imagesList.map((img) => (
          <div className="col" key={`${img.booruUrl}-${img.id}`}>
            <Image img={img} onOpenImage={onOpenImage} />
          </div>
        ))}
      </div>
    </div>
  );
};
