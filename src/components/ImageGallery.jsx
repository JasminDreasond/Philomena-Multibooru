/**
 * @typedef {import('../services/api').ImageObj} ImageObj
 */

/**
 * @param {{ imagesList: ImageObj[] }} props
 */
export const ImageGallery = ({ imagesList }) => {
  /** @type {boolean} */
  const hasImages = imagesList.length > 0;

  if (!hasImages) {
    return (
      <div className="container text-center mt-5">
        <h4 className="text-muted">No images found. Try a different search!</h4>
      </div>
    );
  }

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

          return (
            <div className="col" key={`${img.booruUrl}-${img.id}`}>
              <div className="card h-100 shadow-sm border-0 bg-dark text-white">
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none"
                >
                  <div style={{ position: 'relative', height: '250px', backgroundColor: '#000' }}>
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

                    <div
                      className="position-absolute bottom-0 w-100 p-2 text-white"
                      style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="badge bg-primary">♥ {img.faves}</span>
                        <span className={`badge ${score >= 0 ? 'bg-success' : 'bg-danger'}`}>
                          {score >= 0 ? '▲' : '▼'} {score}
                        </span>
                        <span className="badge bg-secondary">💬 {img.commentCount || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="card-body py-2 bg-light text-dark">
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
