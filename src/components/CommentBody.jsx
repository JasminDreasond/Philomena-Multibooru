import ReactMarkdown from 'react-markdown';

/**
 * @param {string} text
 * @returns {string}
 */
const preProcessPhilomenaTags = (text) => {
  if (!text) return '';
  let processed = text.replace(/>>(\d+)([stp])/g, '[$1_$2](#philo-ref-$1-$2)');
  processed = processed.replace(/\n/g, '  \n');
  return processed;
};

/**
 * @param {{ body: string, image: import('../services/api').ImageObj, onOpenImageLink?: (imageId: string) => void, onOpenProfileLink?: (slug: string) => void }} props
 */
export const CommentBody = ({ body, image, onOpenImageLink, onOpenProfileLink }) => {
  const openImagesInApp = localStorage.getItem('app_inAppViewer') === 'true';
  const openProfileInApp = localStorage.getItem('app_inAppProfileViewer') === 'true';

  /**
   * @param {string} refId
   */
  const openImageLink = (refId) => {
    // onOpenImageLink(refId);
    console.log('Image', refId);
  };

  /**
   * @param {string} refId
   */
  const openProfileLink = (matchTarget) => {
    // onOpenProfileLink(matchTarget);
    console.log('Profile', matchTarget);
  };

  return (
    <ReactMarkdown
      components={{
        input: () => null,
        img: () => null,
        p: ({ children }) => <p className="m-0 p-0">{children}</p>,
        a: ({ href, children }) => {
          if (href?.startsWith('#philo-ref-')) {
            const match = href.match(/#philo-ref-(\d+)-([stp])/);
            if (match) {
              const refId = match[1];
              const sizeType = match[2];

              const handleRefClick = (e) => {
                if (openImagesInApp && onOpenImageLink) {
                  e.preventDefault();
                  openImageLink(refId);
                }
              };

              if (parseInt(refId, 10) === image.id) {
                let targetThumb = image.representations.thumb_small;
                if (sizeType === 't') targetThumb = image.representations.small;
                if (sizeType === 'p') targetThumb = image.representations.medium;

                return (
                  <a
                    href={`${image.booruUrl}/images/${refId}`}
                    target={openImagesInApp ? '_self' : '_blank'}
                    rel="noopener noreferrer"
                    className="d-inline-block mt-2 mb-2"
                    onClick={handleRefClick}
                  >
                    <img
                      src={targetThumb}
                      alt={`>>${refId}${sizeType}`}
                      className="rounded shadow-sm"
                      style={{ maxWidth: '100%' }}
                    />
                  </a>
                );
              }

              return (
                <a
                  href={`${image.booruUrl}/images/${refId}`}
                  target={openImagesInApp ? '_self' : '_blank'}
                  rel="noopener noreferrer"
                  className="fw-bold text-decoration-none"
                  onClick={handleRefClick}
                >
                  &gt;&gt;{refId}
                  {sizeType}
                </a>
              );
            }
          }

          const isLocal =
            href?.startsWith('/') || href?.startsWith('./') || href?.startsWith('../');
          const safeHref = href || '';

          const fullHref = isLocal
            ? `${image.booruUrl}${safeHref.replace(/^(\.\/|\.\.\/)+/, '/')}`
            : safeHref;

          let isImageLink = false;
          let isProfileLink = false;
          let matchTarget = null;

          if (fullHref.startsWith(`${image.booruUrl}/images/`)) {
            const match = fullHref.match(/\/images\/(\d+)/);
            if (match) {
              isImageLink = true;
              matchTarget = match[1];
            }
          } else if (fullHref.startsWith(`${image.booruUrl}/profiles/`)) {
            const match = fullHref.match(/\/profiles\/([^/]+)/);
            if (match) {
              isProfileLink = true;
              matchTarget = match[1];
            }
          }

          const handleNormalClick = (e) => {
            if (openImagesInApp && isImageLink && onOpenImageLink) {
              e.preventDefault();
              openImageLink(matchTarget);
            } else if (openProfileInApp && isProfileLink && onOpenProfileLink) {
              e.preventDefault();
              openProfileLink(matchTarget);
            }
          };

          return (
            <a
              href={fullHref}
              target={
                (openImagesInApp && isImageLink) || (openProfileInApp && isProfileLink)
                  ? '_self'
                  : '_blank'
              }
              rel="noopener noreferrer"
              onClick={handleNormalClick}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {preProcessPhilomenaTags(body)}
    </ReactMarkdown>
  );
};
