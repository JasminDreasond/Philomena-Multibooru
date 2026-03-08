import { useState, useEffect } from 'react';
import { fetchComments, fixBooruUrl, getAccountBooruApi } from '../services/api';
import { CommentBody } from './CommentBody';

const tags = [
  // Roles
  { prefix: 'artist:', className: 'artist' },
  { prefix: 'prompter:', className: 'prompter' },
  { prefix: 'editor:', className: 'editor' },
  { prefix: 'voice actor:', className: 'voice-actor' },

  // Content Types
  { prefix: 'character:', className: 'character' },
  { prefix: 'series:', className: 'series' },
  { prefix: 'anatomy:', className: 'anatomy' },
  { prefix: 'oc:', className: 'oc' },
  { prefix: 'project:', className: 'project' },
  { prefix: 'comic:', className: 'comic' },
  { prefix: 'spoiler:', className: 'spoiler' },

  // Technical & Status
  { prefix: 'software:', className: 'software' },
  { prefix: 'generator:', className: 'generator' },
  { prefix: 'meta:', className: 'meta' },
  { prefix: 'spoiler:', className: 'spoiler' },
  { prefix: 'warning:', className: 'warning' },
];

/**
 * @typedef {import('../services/api').ImageObj} ImageObj
 * @typedef {import('../services/api').CommentData} CommentData
 */

/**
 * Calculates a relative time string (e.g., "11 years ago")
 * @param {Date} date
 * @returns {string}
 */
const timeSince = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return Math.floor(seconds) + ' seconds ago';
};

/**
 * @param {number} bytes
 * @returns {string}
 */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i];
};

/**
 * @param {{ image: ImageObj|null, onClose: () => void, onSearch: (query: string) => void, onOpenProfile: (booruUrl: string, username: string, id: number) => void }} props
 */
export const ImageViewer = ({ image, onClose, onSearch, onOpenProfile }) => {
  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isZoomed, setIsZoomed] = useState(false);

  /** @type {[CommentData[], import('react').Dispatch<import('react').SetStateAction<CommentData[]>>]} */
  const [comments, setComments] = useState([]);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [showShare, setShowShare] = useState(false);

  /** @type {[number, import('react').Dispatch<import('react').SetStateAction<number>>]} */
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isVideo = image && image.mimeType && image.mimeType.startsWith('video/');
  const imageSrc = image
    ? isZoomed
      ? image.representations.full
      : image.representations.large || image.representations.full
    : '';
  const fileExtension = image
    ? image.format || (image.mimeType ? image.mimeType.split('/')[1] : 'file')
    : '';
  const fileName = image
    ? `${image.id}__${
        image.tags
          ? image.tags
              .slice(0, 3)
              .join('_')
              .replace(/[^a-z0-9_]/gi, '')
          : 'image'
      }.${fileExtension}`
    : '';
  const uploadDate = image ? image.createdAt : new Date();
  const uploaderName = image ? (image.uploader ?? 'Background Pony') : '';

  useEffect(() => {
    let isMounted = true;
    const getComments = async () => {
      setIsLoadingComments(true);
      try {
        const data = await fetchComments(
          image.booruUrl,
          await getAccountBooruApi(image.booruUrl),
          `image_id:${image.id}`,
        );
        if (isMounted) setComments(data.comments || []);
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      } finally {
        if (isMounted) setIsLoadingComments(false);
      }
    };

    if (image) getComments();
    return () => {
      isMounted = false;
    };
  }, [image, refreshTrigger]);

  if (!image) {
    return (
      <div className="container mt-5 fade-in">
        <button onClick={onClose} className="btn btn-secondary mb-4">
          &laquo; Back
        </button>
        <div className="alert alert-danger text-center shadow-sm">
          <h4 className="alert-heading">User not found</h4>
          <p>We couldn't retrieve the image. They might not exist or the API is unavailable.</p>
        </div>
      </div>
    );
  }

  /**
   * @returns {void}
   */
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.representations.full;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * @param {string} text
   * @returns {void}
   */
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  /**
   * @param {string} tag
   * @returns {string}
   */
  const getTagClass = (tag) => {
    const extraTag = tags.find((i) => tag.startsWith(i.prefix));
    return `tag-${tag
      .replace(/[^a-zA-Z\s:]/g, '')
      .replace(/:/g, '-')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .trim()}${extraTag ? ` tag-${extraTag.className}` : ''}`;
  };

  /**
   * @param {MouseEvent} e
   * @param {string} booruUrl
   * @param {number} id
   */
  const handleProfileClick = (e, booruUrl, id) => {
    if (localStorage.getItem('app_inAppProfileViewer') === 'true') {
      e.preventDefault();
      onOpenProfile(booruUrl, id);
    }
  };

  const sources = image.sourceUrls ? image.sourceUrls : image.sourceUrl ? [image.sourceUrl] : [];

  const bbcodeFull = `[img]${image.representations.full}[/img]\n[url=${fixBooruUrl(image.booruUrl)}/images/${image.id}]View on Booru[/url] - [url=${sources[0] || ''}]Original source[/url]`;
  const bbcodeThumb = `[url=${fixBooruUrl(image.booruUrl)}/images/${image.id}][img]${image.representations.thumb}[/img][/url]\n[url=${fixBooruUrl(image.booruUrl)}/images/${image.id}]View on Booru[/url] - [url=${sources[0] || ''}]Original source[/url]`;

  return (
    <div className="fade-in pb-5">
      {/* Top Toolbar */}
      <div className="viewer-toolbar d-flex flex-wrap align-items-center px-3 py-1 gap-3">
        <button onClick={onClose} className="ms-auto btn-tool" title="Back to Gallery">
          &laquo; Back
        </button>
        <div className="d-flex align-items-center gap-3 ms-1 fw-bold">
          <span className="active-fave">★ {image.faves}</span>
          <span className="active-up">↑ {image.upvotes}</span>
          <span>{image.upvotes - image.downvotes}</span>
          <span className="active-down">↓ {image.downvotes}</span>
          <span>💬 {image.commentCount || comments.length}</span>
        </div>

        <div className="me-auto d-flex flex-wrap gap-1">
          <a
            href={`${fixBooruUrl(image.booruUrl)}/${image.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-tool"
          >
            👁 View
          </a>
          <button onClick={handleDownload} className="btn-tool">
            ⬇ Download
          </button>
        </div>
      </div>

      {/* Sub-info bar */}
      <div className="viewer-subinfo border-bottom" style={{ borderColor: 'var(--app-border)' }}>
        Uploaded {timeSince(uploadDate)} by{' '}
        <strong>
          <a
            rel="noopener noreferrer"
            target="_blank"
            className="btn-tool"
            href={`${fixBooruUrl(image.booruUrl)}/profiles/${uploaderName}`}
            onClick={(e) => handleProfileClick(e, image.booruUrl, image.uploaderId)}
          >
            {uploaderName}
          </a>
        </strong>{' '}
        {image.width}x{image.height} {fileExtension.toUpperCase()} {formatBytes(image.size)}
      </div>

      {/* Image Area */}
      <div
        className="d-flex justify-content-center align-items-center bg-black mb-4 mx-auto shadow-sm"
        style={{
          minHeight: '400px',
          cursor: isVideo ? 'default' : isZoomed ? 'zoom-out' : 'zoom-in',
          borderBottom: '1px solid #111',
        }}
        onClick={() => !isVideo && setIsZoomed(!isZoomed)}
      >
        {isVideo ? (
          <video
            src={image.representations.full || image.sourceUrl}
            className="img-fluid"
            style={{ maxHeight: '85vh', objectFit: 'contain' }}
            controls
            autoPlay
            loop
            muted
          />
        ) : (
          <img
            src={imageSrc}
            alt={image.tags?.join(', ')}
            style={{
              maxWidth: '100%',
              maxHeight: isZoomed ? 'none' : '85vh',
              objectFit: 'contain',
              transition: 'max-height 0.2s ease-in-out',
            }}
          />
        )}
      </div>

      {/* Content Area */}
      <div className="container" style={{ maxWidth: '980px' }}>
        {/* Description Panel */}
        <div className="philo-panel">
          <div className="philo-panel-header">📄 Description</div>
          <div className="philo-panel-body text-muted">
            {image.description ? (
              <CommentBody body={image.description} image={image} />
            ) : (
              <i>No description provided.</i>
            )}
          </div>
        </div>

        {/* Tags Panel */}
        <div className="philo-panel">
          <div className="philo-panel-header">
            🏷️ Tags{' '}
            <a
              className="text-muted ms-auto fw-normal text-sm"
              href={`${fixBooruUrl(image.booruUrl)}/images/${image.id}/tag_changes`}
              target="_blank"
              rel="noopener noreferrer"
            >
              History ({image.tags?.length || 0} tags)
            </a>
          </div>
          <div className="philo-panel-body">
            <div className="philo-tag-container">
              {image.tags?.map((tag, idx) => (
                <div
                  key={idx}
                  className={`philo-tag ${getTagClass(tag)}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSearch(tag)}
                  title={`Search for ${tag}`}
                >
                  <span className={'philo-tag-name'}>{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Source Panel */}
        <div className="philo-panel">
          <div className="philo-panel-header">🔗 Sources</div>
          <div className="philo-panel-body">
            {sources.length > 0 ? (
              sources.map((sourceUrl, i) => (
                <a
                  key={i}
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="d-block text-truncate"
                >
                  {sourceUrl}
                </a>
              ))
            ) : (
              <i className="text-muted">No source provided.</i>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex gap-2 mb-4">
          <a
            className="btn btn-sm btn-secondary fw-bold px-3"
            href={`${fixBooruUrl(image.booruUrl)}/images/${image.id}/reports/new`}
            target="_blank"
            rel="noopener noreferrer"
          >
            ⚠️ Report
          </a>
          <button
            className={`btn btn-sm fw-bold px-3 ${showShare ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowShare(!showShare)}
          >
            ➡️ Share
          </button>
        </div>

        {/* Share Panel */}
        {showShare && (
          <div className="philo-panel mb-4 shadow-sm">
            <div className="philo-panel-body">
              <div className="mb-3 d-flex align-items-center">
                <label className="fw-bold me-2" style={{ width: '120px' }}>
                  Small thumbnail
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm me-2 bg-dark text-light border-secondary"
                  value={`>>${image.id}s`}
                  readOnly
                />
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => copyToClipboard(`>>${image.id}s`)}
                >
                  📋 Copy
                </button>
              </div>
              <div className="mb-3 d-flex align-items-center">
                <label className="fw-bold me-2" style={{ width: '120px' }}>
                  Thumbnail
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm me-2 bg-dark text-light border-secondary"
                  value={`>>${image.id}t`}
                  readOnly
                />
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => copyToClipboard(`>>${image.id}t`)}
                >
                  📋 Copy
                </button>
              </div>
              <div
                className="mb-4 d-flex align-items-center border-bottom pb-4"
                style={{ borderColor: '#333' }}
              >
                <label className="fw-bold me-2" style={{ width: '120px' }}>
                  Preview
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm me-2 bg-dark text-light border-secondary"
                  value={`>>${image.id}p`}
                  readOnly
                />
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => copyToClipboard(`>>${image.id}p`)}
                >
                  📋 Copy
                </button>
              </div>

              <h6 className="fw-normal mb-3">BBCode</h6>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <label className="fw-bold fs-6">Full size BBCode</label>
                  <button
                    className="btn btn-sm btn-link text-decoration-none text-muted p-0"
                    onClick={() => copyToClipboard(bbcodeFull)}
                  >
                    📋 Copy
                  </button>
                </div>
                <textarea
                  className="form-control form-control-sm bg-dark text-light border-secondary"
                  rows="3"
                  readOnly
                  value={bbcodeFull}
                ></textarea>
              </div>
              <div className="mb-2">
                <div className="d-flex justify-content-between mb-1">
                  <label className="fw-bold fs-6">Thumbnailed BBCode</label>
                  <button
                    className="btn btn-sm btn-link text-decoration-none text-muted p-0"
                    onClick={() => copyToClipboard(bbcodeThumb)}
                  >
                    📋 Copy
                  </button>
                </div>
                <textarea
                  className="form-control form-control-sm bg-dark text-light border-secondary"
                  rows="3"
                  readOnly
                  value={bbcodeThumb}
                ></textarea>
              </div>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div
          className="d-flex align-items-center mb-3 border-bottom pb-2"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <h5 className="fw-bold mb-0 me-3">{comments.length} comments posted</h5>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
          >
            🔄 Refresh
          </button>
        </div>

        {isLoadingComments ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center">No comments yet.</div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {comments.map((comment) => (
              <div key={comment.id} className="philo-panel mb-0 d-flex flex-column flex-sm-row p-3">
                {/* Avatar Left Box */}
                <div
                  className="me-3 mb-2 mb-sm-0 text-center"
                  style={{ width: '80px', flexShrink: 0 }}
                >
                  <div
                    className="bg-secondary rounded mb-1"
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundImage: `url(${comment.avatar})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  ></div>
                </div>

                {/* Comment Content */}
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between border-bottom pb-1 mb-2">
                    <span className="fw-bold fs-5" style={{ color: 'var(--app-text)' }}>
                      {comment.userId ? (
                        <a
                          rel="noopener noreferrer"
                          target="_blank"
                          href={`${fixBooruUrl(image.booruUrl)}/profiles/${comment.author}`}
                          onClick={(e) => handleProfileClick(e, image.booruUrl, comment.userId)}
                        >
                          {comment.author}
                        </a>
                      ) : (
                        (comment.author ?? 'Anonymous')
                      )}
                    </span>
                  </div>
                  <div className="mb-3" style={{ fontSize: '0.95rem' }}>
                    <CommentBody body={comment.body} image={image} />
                  </div>
                  <div
                    className="d-flex justify-content-between text-muted"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <div>
                      Posted {timeSince(comment.createdAt)}
                      <br />
                      <a
                        href={`${fixBooruUrl(image.booruUrl)}/images/${image.id}/comments/${comment.id}/reports/new`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted text-decoration-none"
                      >
                        ⚑ Report
                      </a>
                    </div>
                    <div className="d-flex align-items-end gap-2">
                      <a
                        href={`${fixBooruUrl(image.booruUrl)}/images/${image.id}#comment_${comment.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted text-decoration-none"
                      >
                        🔗 Link
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
