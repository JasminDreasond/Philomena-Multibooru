import { useState } from 'react';

/**
 * @typedef {import('../services/api').ImageResult} ImageResult
 */

/**
 * @param {{ imagesList: ImageResult[] }} props
 */
export const ImageGallery = ({ imagesList }) => {
  /** @type {[Set<number>, import('react').Dispatch<import('react').SetStateAction<Set<number>>>]} */
  const [unspoileredIds, setUnspoileredIds] = useState(new Set());

  /** @type {boolean} */
  const hasImages = imagesList.length > 0;

  if (!hasImages) {
    return (
      <div className="container text-center mt-5">
        <h4 className="text-muted">No images found. Try a different search!</h4>
      </div>
    );
  }

  /**
   * @param {import('react').MouseEvent<HTMLAnchorElement>} event
   * @param {number} imageId
   * @param {boolean} isSpoilered
   */
  const handleImageClick = (event, imageId, isSpoilered) => {
    if (isSpoilered && !unspoileredIds.has(imageId)) {
      event.preventDefault();

      /** @type {Set<number>} */
      const newSet = new Set(unspoileredIds);
      newSet.add(imageId);
      setUnspoileredIds(newSet);
    }
  };

  return (
    <div className="container">
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
        {imagesList.map((img) => {
          /** @type {string} */
          const targetUrl = `${img.booruUrl}${!img.booruUrl.endsWith('/') ? '/' : ''}${img.id}`;

          /** @type {boolean} */
          const isVideo = img.mimeType && img.mimeType.startsWith('video/');

          /** @type {number} */
          const score = img.upvotes - img.downvotes;

          /** @type {boolean} */
          const isFav = img.interaction === 'faved';

          /** @type {boolean} */
          const isUp = isFav || img.interaction === 'upVote';

          /** @type {boolean} */
          const isDown = !isFav && img.interaction === 'downVote';

          /** @type {boolean} */
          const isProcessing = !img.processed || !img.thumbnailsGenerated;

          /** @type {boolean} */
          const isBlurry = img.spoilered && !unspoileredIds.has(img.id);

          return (
            <div className="col" key={`${img.booruUrl}-${img.id}`}>
              <div className="card h-100 shadow-sm border-0 bg-dark text-white">
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none"
                  onClick={(e) => handleImageClick(e, img.id, img.spoilered)}
                >
                  <div
                    style={{
                      position: 'relative',
                      height: '250px',
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
                        <span className="badge bg-warning text-dark text-wrap px-3 py-2 text-center">
                          Image is still processing or thumbnails are generating...
                        </span>
                      </div>
                    )}

                    {!isProcessing && isBlurry && (
                      <div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center p-2"
                        style={{ zIndex: 5, pointerEvents: 'none' }}
                      >
                        <div className="badge bg-danger fs-6 opacity-75 text-wrap p-2 text-center shadow mb-2">
                          Spoilered Content
                          <br />
                          <small>(Click to reveal)</small>
                        </div>

                        {img.spoilerReasons && img.spoilerReasons.length > 0 && (
                          <div
                            className="badge bg-dark text-light opacity-75 shadow-sm text-truncate w-100 px-2 py-1"
                            style={{ maxWidth: '90%' }}
                            title={img.spoilerReasons.join(', ')}
                          >
                            {img.spoilerReasons.join(', ')}
                          </div>
                        )}
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
                          alt={img.tags.join(', ')}
                          style={{ objectFit: 'cover' }}
                        />
                      )}
                    </div>

                    <div
                      className="position-absolute bottom-0 w-100 p-2 text-white"
                      style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                        zIndex: 6,
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span className={`badge ${isFav ? 'bg-warning' : 'bg-secondary'}`}>
                          ♥ {img.faves}
                        </span>
                        <span
                          className={`badge ${isUp ? 'bg-success' : isDown ? 'bg-danger' : 'bg-secondary'}`}
                        >
                          {score >= 0 ? '▲' : '▼'} {score}
                        </span>
                        <span className="badge bg-secondary">💬 {img.commentCount || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="card-body py-2 bg-light text-dark"
                    style={{ zIndex: 6, position: 'relative' }}
                  >
                    <small className="text-muted d-block text-truncate">
                      {img.tags.join(', ')}
                    </small>
                  </div>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
