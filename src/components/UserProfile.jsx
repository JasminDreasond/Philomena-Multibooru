import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  fetchProfile,
  fixBooruUrl,
  searchImages,
  fetchComments,
  syncUserGalleryPages,
  getAccountBooru,
} from '../services/api';
import { Image } from './ImageGallery';
import { CommentBody } from './CommentBody';

/**
 * @typedef {import('../services/api').UserProfileData} UserProfileData
 * @typedef {import('../services/api').ImageResult} ImageResult
 * @typedef {import('../services/api').CommentData} CommentData
 */

/**
 * @param {Date|string} date
 * @returns {string}
 */
const timeSince = (date) => {
  const d = new Date(date);
  const seconds = Math.floor((new Date() - d) / 1000);
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
 * @param {{ booruUrl: string, username: string, userId: number, handleSearchSubmit: (query: string) => void, onClose: () => void, onOpenImage: (img: ImageResult) => void }} props
 */
export const UserProfile = ({
  booruUrl,
  userId,
  username,
  onClose,
  onOpenImage,
  handleSearchSubmit,
}) => {
  /** @type {[UserProfileData|null, import('react').Dispatch<import('react').SetStateAction<UserProfileData|null>>]} */
  const [pf, setProfile] = useState(null);

  /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
  const [isLoading, setIsLoading] = useState(true);

  /** @type {[ImageResult[], import('react').Dispatch<import('react').SetStateAction<ImageResult[]>>]} */
  const [recentUploads, setRecentUploads] = useState([]);

  /** @type {[ImageResult[], import('react').Dispatch<import('react').SetStateAction<ImageResult[]>>]} */
  const [recentFaves, setRecentFaves] = useState([]);

  /** @type {[CommentData[], import('react').Dispatch<import('react').SetStateAction<CommentData[]>>]} */
  const [recentComments, setRecentComments] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const userProfile = await fetchProfile(booruUrl, userId);
        if (isMounted) setProfile(userProfile);

        if (userProfile) {
          console.log(userProfile);
          // Fetch secondary data concurrently to populate the profile panels
          const account = await getAccountBooru(booruUrl);
          const uploaderQuery = `uploader_id:${userProfile.id}`;
          const favedQuery = `faved_by_id:${userProfile.id}`;

          await Promise.all([
            syncUserGalleryPages(uploaderQuery, 1, 4, account),
            syncUserGalleryPages(favedQuery, 1, 4, account),
          ]);

          const [uploadsRes, favesRes, commentsRes] = await Promise.all([
            searchImages(uploaderQuery, 4, 1),
            searchImages(favedQuery, 4, 1),
            fetchComments(booruUrl, account.apiKey, `user_id:${userId}`, 1),
          ]);

          if (isMounted) {
            setRecentUploads(uploadsRes);
            setRecentFaves(favesRes);
            setRecentComments(commentsRes.comments.slice(0, 3));
          }
        }
      } catch (err) {
        console.error('Error loading profile data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [booruUrl, userId]);

  if (isLoading) {
    return (
      <div className="text-center py-5 fade-in">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3 fw-bold text-muted">Loading profile data...</p>
      </div>
    );
  }

  if (!pf) {
    return (
      <div className="container mt-5 fade-in">
        <button onClick={onClose} className="btn btn-secondary mb-4">
          &laquo; Back
        </button>
        <div className="alert alert-danger text-center shadow-sm">
          <h4 className="alert-heading">User not found</h4>
          <p>We couldn't retrieve the profile. They might not exist or the API is unavailable.</p>
        </div>
      </div>
    );
  }

  /** @type {UserProfileData} */
  const profile = pf;

  return (
    <div className="fade-in">
      {/* Top Toolbar */}
      <div className="viewer-toolbar d-flex flex-wrap align-items-center px-3 py-1 gap-3 mb-4">
        <button onClick={onClose} className="btn-tool" title="Back">
          &laquo; Back
        </button>
        <div className="ms-auto d-flex flex-wrap gap-1">
          <a
            href={`${fixBooruUrl(booruUrl)}/profiles/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-tool"
          >
            👁 View on Booru
          </a>
        </div>
      </div>

      <div className="container-fluid px-2 px-md-4" style={{ maxWidth: '1400px' }}>
        {/* Profile Header */}
        <div className="d-flex flex-column flex-md-row gap-3 mb-4 align-items-md-end">
          <div
            className="rounded shadow-sm border border-secondary"
            style={{
              width: '120px',
              height: '120px',
              backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : null,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: profile.avatarUrl ? 'transparent' : 'var(--app-primary)',
              flexShrink: 0,
            }}
          ></div>
          <div className="flex-grow-1">
            <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
              {profile.name}'s profile
            </h2>
            <div className="mb-2">
              <span className="badge bg-secondary text-light">{profile.role || 'Member'}</span>
            </div>
            <div className="text-muted small fw-semibold">
              Member since {timeSince(profile.createdAt)}
            </div>
            <div className="text-muted small">{booruUrl}</div>
          </div>
          <div className="d-flex flex-wrap gap-3 text-muted small fw-semibold">
            <div className="d-flex flex-column">
              <a
                href={`${fixBooruUrl(booruUrl)}/conversations/new?recipient=${username}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Send message
              </a>
              <a
                href={`${fixBooruUrl(booruUrl)}/conversations?with=${userId}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Our conversations
              </a>
              <a
                href={`${fixBooruUrl(booruUrl)}/profiles/${username}/reports/new`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Report this user
              </a>
            </div>
            <div className="d-flex flex-column">
              <a
                href={`${fixBooruUrl(booruUrl)}/search?q=uploader_id%3A${userId}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Uploads
              </a>
              <a
                href={`${fixBooruUrl(booruUrl)}/comments?cq=user_id%3A${userId}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Comments
              </a>
              <a
                href={`${fixBooruUrl(booruUrl)}/posts?pq=user_id%3A${userId}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Posts
              </a>
              <a
                href={`${fixBooruUrl(booruUrl)}/reports`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                My reports
              </a>
            </div>
            <div className="d-flex flex-column">
              <a
                href={`${fixBooruUrl(booruUrl)}/search?q=faved_by_id%3A${userId}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Favorites
              </a>
              <a
                href={`${fixBooruUrl(booruUrl)}/profiles/${username}/tag_changes`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Tag changes
              </a>
              <a
                href={`${fixBooruUrl(booruUrl)}/profiles/${username}/source_changes`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Source changes
              </a>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Left Sidebar */}
          <div className="col-12 col-lg-3">
            {/* User Links */}
            {/*
              <div className="philo-panel mb-3">
              <div className="philo-panel-header">User Links</div>
              <div className="philo-panel-body p-2 d-flex flex-column gap-2 text-center">
                {profile.links.length > 0 ? (
                  profile.links.map((link, i) => (
                    <div key={i} className="mb-2">
                      <span className="badge" style={{ backgroundColor: '#4834d4' }}>
                        {link.title || 'Link'}
                      </span>
                      <br />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="small text-truncate d-inline-block w-100"
                        style={{ color: 'var(--app-primary)' }}
                      >
                        {link.url}
                      </a>
                    </div>
                  ))
                ) : (
                  <span className="text-muted small">No links provided.</span>
                )}
              </div>
            </div>
             */}

            {/* Award */}
            <div className="philo-panel mb-3">
              <div className="philo-panel-header">Badges</div>
              <div className="philo-panel-body gap-1">
                <table className="w-100 m-0 py-2">
                  <tbody>
                    {profile.awards.length > 0 ? (
                      profile.awards.map((award, i) => (
                        <tr>
                          <td className="text-center py-2 px-3">
                            <img
                              key={i}
                              src={award.imageUrl}
                              alt={award.title}
                              title={award.title}
                              style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                            />
                            <div className="small">{award.title}</div>
                          </td>
                          <td className="text-center py-2 px-3">{timeSince(award.awardedOn)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-muted small p-2">No awards yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* About Me */}
            <div className="philo-panel mb-4">
              <div className="philo-panel-header">About Me</div>
              <div
                className="philo-panel-body small text-muted p-2"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {profile.description ? (
                  <ReactMarkdown>{profile.description.replace(/\n/g, '  \n')}</ReactMarkdown>
                ) : (
                  <i>User has not written a description.</i>
                )}
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="col-12 col-lg-9">
            {/* Statistics */}
            <div className="philo-panel mb-4">
              <div className="philo-panel-header text-muted fw-normal">
                Statistics (Last 90 Days)
              </div>
              <div className="philo-panel-body p-0">
                <table
                  className="table table-borderless table-sm m-0"
                  style={{ backgroundColor: 'transparent' }}
                >
                  <tbody>
                    {[
                      { label: 'Uploads', val: profile.uploadsCount },
                      { label: 'Comments', val: profile.commentsCount },
                      { label: 'Forum Posts', val: profile.postsCount },
                    ].map((stat, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td className="text-end text-muted pe-4 py-2" style={{ width: '20%' }}>
                          {stat.label}
                        </td>
                        <td className="fw-bold py-2 text-muted" style={{ width: '80%' }}>
                          {stat.val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Creations/Uploads (Reusing Logic) */}
            <div className="philo-panel mb-4">
              <div className="philo-panel-header justify-content-between">
                <span>Recent Uploads</span>
                <button
                  onClick={() => handleSearchSubmit(`uploader:${profile.slug}`)}
                  className="btn btn-link text-white text-decoration-none small p-0 align-baseline"
                >
                  View all
                </button>
              </div>
              <div className="philo-panel-body p-2">
                {recentUploads.length > 0 ? (
                  <div className="row row-cols-2 row-cols-md-4 g-2">
                    {recentUploads.map((img) => (
                      <div className="col" key={img.id}>
                        <Image img={img} onOpenImage={onOpenImage} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-3">No recent uploads.</div>
                )}
              </div>
            </div>

            {/* Recent Favorites */}
            <div className="philo-panel mb-4">
              <div className="philo-panel-header justify-content-between">
                <span>Recent Favorites</span>
                <button
                  onClick={() => handleSearchSubmit(`faved_by:${profile.slug}`)}
                  className="btn btn-link text-white text-decoration-none small p-0 align-baseline"
                >
                  View all
                </button>
              </div>
              <div className="philo-panel-body p-2">
                {recentFaves.length > 0 ? (
                  <div className="row row-cols-2 row-cols-md-4 g-2">
                    {recentFaves.map((img) => (
                      <div className="col" key={img.id}>
                        <Image img={img} onOpenImage={onOpenImage} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-3">No recent favorites.</div>
                )}
              </div>
            </div>

            {/* Recent Comments */}
            <div className="philo-panel mb-4">
              <div className="philo-panel-header justify-content-between">
                <span>Recent Comments</span>
                <a
                  href={`${fixBooruUrl(booruUrl)}/comments?q=author:${profile.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none text-light fw-bold"
                >
                  View all
                </a>
              </div>
              <div className="philo-panel-body">
                {recentComments.length > 0 ? (
                  <div className="d-flex flex-column">
                    {recentComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-3 border-bottom d-flex gap-3"
                        style={{ borderColor: 'var(--app-border)' }}
                      >
                        <div style={{ width: '60px', flexShrink: 0 }}>
                          <div
                            className="bg-secondary rounded"
                            style={{
                              width: '60px',
                              height: '60px',
                              backgroundImage: `url(${comment.avatar})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          ></div>
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-bold mb-1 d-flex justify-content-between">
                            <span style={{ color: 'var(--app-primary)' }}>{comment.author}</span>
                          </div>
                          <div className="text-muted mb-2 small" style={{ fontSize: '0.85rem' }}>
                            <CommentBody
                              body={comment.body}
                              image={{ id: comment.imageId, booruUrl }}
                            />
                          </div>
                          <div className="d-flex justify-content-between small text-muted">
                            <span>Posted {timeSince(comment.createdAt)}</span>
                            <div className="d-flex gap-2">
                              <a
                                href={`${fixBooruUrl(booruUrl)}/images/${comment.imageId}#comment_${comment.id}`}
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
                ) : (
                  <div className="text-center text-muted py-4">No recent comments.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
