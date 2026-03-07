import { useState } from 'react';

/**
 * @typedef {import('../services/api').ImageResult} ImageResult
 * @typedef {import('../services/api').ImageObj} ImageObj
 */

/**
 * @param {{ img: ImageResult }} props
 */
export const Image = ({ img }) => {
  /** @type {[Set<number>, import('react').Dispatch<import('react').SetStateAction<Set<number>>>]} */
  const [unspoileredIds, setUnspoileredIds] = useState(new Set());

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
    }
  };

  const targetUrl = `${img.booruUrl}${!img.booruUrl.endsWith('/') ? '/' : ''}${img.id}`;
  const isVideo = img.mimeType && img.mimeType.startsWith('video/');
  const score = img.upvotes - img.downvotes;
  const isFav = img.interaction === 'faved';
  const isUp = isFav || img.interaction === 'upVote';
  const isDown = !isFav && img.interaction === 'downVote';
  const isProcessing = !img.processed || !img.thumbnailsGenerated ? true : false;
  const isBlurry = img.spoilered && !unspoileredIds.has(img.id) ? true : false;

  return (
    <div
      className="card h-100 shadow-sm border-0"
      style={{ backgroundColor: 'var(--app-surface)', color: 'var(--app-text)' }}
    >
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-decoration-none d-block h-100"
        onClick={(e) => handleImageClick(e, img.id, img.spoilered)}
      >
        <div
          style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            backgroundColor: '#000',
            overflow: 'hidden',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
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
                src={img.representations.thumb || img.sourceUrl}
                className="w-100 h-100"
                alt={img.tags?.join(', ') || ''}
                style={{ objectFit: 'cover' }}
              />
            )}
          </div>

          <div
            className="position-absolute bottom-0 w-100 text-white d-flex justify-content-between align-items-end"
            style={{ zIndex: 6 }}
          >
            <div className="interaction-container d-flex gap-1 align-items-center w-100 justify-content-between shadow-sm px-2">
              <span className={`badge-interaction ${isFav ? 'active-fave' : 'badge-inactive'}`}>
                ★ {img.faves}
              </span>
              <span className={`badge-interaction ${isUp ? 'active-up' : 'badge-inactive'}`}>
                ▲
              </span>
              <span className={`badge-interaction badge-inactive`}>{score}</span>
              <span className={`badge-interaction ${isDown ? 'active-down' : 'badge-inactive'}`}>
                ▼
              </span>
              <span className="badge-interaction badge-inactive">💬 {img.commentCount || 0}</span>
            </div>
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
 * @param {{ imagesList: ImageResult[], gridClass?: string }} props
 */
export const ImageGallery = ({
  imagesList,
  gridClass = 'row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-4 row-cols-xxl-6 g-3',
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
            <Image img={img} />
          </div>
        ))}
      </div>
    </div>
  );
};
