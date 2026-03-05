/** @typedef {import('../services/api').ImageObj} ImageObj */

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
        {imagesList.map((img) => (
          <div className="col" key={`${img.booruUrl}-${img.id}`}>
            <div className="card h-100 shadow-sm border-0">
              <a
                href={img.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none"
              >
                <img
                  src={img.representations.thumb}
                  className="card-img-top"
                  alt={img.tags.join(', ')}
                  style={{ objectFit: 'cover', height: '250px' }}
                />
                <div className="card-body py-2">
                  <small className="text-muted d-block text-truncate">{img.tags.join(', ')}</small>
                </div>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
