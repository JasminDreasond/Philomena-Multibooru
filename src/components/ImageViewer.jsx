import { useState, useEffect } from 'react';
import { fixBooruUrl } from '../services/api';

/**
 * @typedef {import('../services/api').ImageObj} ImageObj
 */

/**
 * Calculates a relative time string (e.g., "11 years ago")
 * @param {string} dateString
 * @returns {string}
 */
const timeSince = (dateString) => {
  const date = new Date(dateString);
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
 * @param {{ image: ImageObj, onClose: () => void }} props
 */
export const ImageViewer = ({ image, onClose }) => {
  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isZoomed, setIsZoomed] = useState(false);

  /** @type {[any[], import('react').Dispatch<import('react').SetStateAction<any[]>>]} */
  const [comments, setComments] = useState([]);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  const isVideo = image.mimeType && image.mimeType.startsWith('video/');
  const imageSrc = isZoomed
    ? image.representations.full
    : image.representations.large || image.representations.full;
  const fileExtension = image.format || (image.mimeType ? image.mimeType.split('/')[1] : 'file');
  const fileName = `${image.id}__${
    image.tags
      ? image.tags
          .slice(0, 3)
          .join('_')
          .replace(/[^a-z0-9_]/gi, '')
      : 'image'
  }.${fileExtension}`;
  const uploadDate = image.created_at || image.createdAt;
  const uploaderName = image.uploader || 'Background Pony #XXXX';

  useEffect(() => {
    let isMounted = true;
    const fetchComments = async () => {
      setIsLoadingComments(true);
      try {
        const url = `${fixBooruUrl(image.booruUrl)}/api/v1/json/images/${image.id}/comments`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setComments(data.comments || []);
        }
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      } finally {
        if (isMounted) setIsLoadingComments(false);
      }
    };

    fetchComments();
    return () => {
      isMounted = false;
    };
  }, [image]);

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
   * Helper to style specific Philomena tags accurately
   * @param {string} tag
   * @returns {string}
   */
  const getTagClass = (tag) => {
    return `tag-${tag
      .replace(/[^a-zA-Z\s:]/g, '')
      .replace(/:/g, '-')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .trim()}${tag.startsWith('artist:') ? ' tag-artist' : ''}${tag.startsWith('prompter:') ? ' tag-prompter' : ''}${tag.startsWith('editor:') ? ' tag-editor' : ''}`;
  };

  const sources = (image.sourceUrls ?? image.sourceUrls) ? [image.sourceUrl] : [];

  return (
    <div className="fade-in pb-5">
      {/* Top Toolbar (Replicating the dark action bar) */}
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
        Uploaded {timeSince(uploadDate)} by <strong>{uploaderName}</strong> {image.width}x
        {image.height} {fileExtension.toUpperCase()} {formatBytes(image.size)}
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

      {/* Content Area (Constrained width for readability, like the screenshot) */}
      <div className="container" style={{ maxWidth: '980px' }}>
        {/* Description Panel */}
        <div className="philo-panel">
          <div className="philo-panel-header">📄 Description</div>
          <div className="philo-panel-body text-muted">
            {image.description ? (
              <div dangerouslySetInnerHTML={{ __html: image.description }} />
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
            >
              History ({image.tags?.length || 0} tags)
            </a>
          </div>
          <div className="philo-panel-body">
            <div className="philo-tag-container">
              {image.tags?.map((tag, idx) => (
                <div key={idx} className="philo-tag">
                  <span className={`philo-tag-name ${getTagClass(tag)}`}>{tag}</span>
                  {/* Mocking the count block for visual accuracy to Philomena */}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Source Panel */}
        <div className="philo-panel">
          <div className="philo-panel-header">🔗 Source</div>
          <div className="philo-panel-body">
            {sources.length > 0 ? (
              sources.map((sourceUrl) => (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className='d-block'
                  style={{ color: 'var(--app-primary)' }}
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
          >
            ⚠️ Report
          </a>
          <button className="btn btn-sm btn-secondary fw-bold px-3">➡️ Share</button>
        </div>

        {/* Comments Section */}
        <h5
          className="fw-bold mb-3 border-bottom pb-2"
          style={{ borderColor: 'var(--app-border)' }}
        >
          Comments
        </h5>

        {isLoadingComments ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="alert alert-secondary text-center">No comments yet.</div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {comments.map((comment) => (
              <div key={comment.id} className="philo-panel mb-0">
                <div className="philo-panel-header justify-content-between">
                  <span className="fw-bold" style={{ color: 'var(--app-primary)' }}>
                    {comment.author || 'Anonymous'}
                  </span>
                  <span className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>
                    {timeSince(comment.created_at)}
                  </span>
                </div>
                <div
                  className="philo-panel-body"
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: comment.body }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
