import { ImageGallery } from '../image/ImageGallery';

/** @typedef {import('../../services/api/Images').ImageResult} ImageResult */

/**
 * @param {Object} options
 * @param {ImageResult[]} options.watchedImages
 * @param {boolean} options.showSpecialContent
 * @param {(img: ImageResult) => void} options.handleOpenImage
 * @param {(e: MouseEvent<HTMLAnchorElement, MouseEvent>, query: string, sf: string, sd: string) => void} options.handleQuickLinkClick
 */
export const WatchedImages = ({
  showSpecialContent,
  watchedImages,
  handleOpenImage,
  handleQuickLinkClick,
}) =>
  showSpecialContent &&
  watchedImages.length > 0 && (
    <div className="row mt-5">
      <div className="col-12">
        <div
          className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <h3 className="mb-0">Watched Images</h3>
          <a
            href={`/search?q=my%3Awatched`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-secondary btn-sm fw-bold"
            onClick={(e) => handleQuickLinkClick(e, 'my:watched', 'created_at', 'desc')}
          >
            Browse Watched Images
          </a>
        </div>

        <ImageGallery
          gridClass="row-cols-2 row-cols-md-4 gallery-grid g-2"
          imagesList={watchedImages}
          onOpenImage={handleOpenImage}
        />
      </div>
    </div>
  );
