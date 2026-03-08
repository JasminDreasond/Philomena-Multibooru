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
 * @param {{ body: string; image: import('../services/api').ImageObj }}
 */
export const CommentBody = ({ body, image }) => (
  <ReactMarkdown
    components={{
      img: () => null, // Remove markdown from traditional images
      p: ({ children }) => <p className="m-0 p-0">{children}</p>,
      a: ({ href, children }) => {
        // Intercepts special image syntax
        if (href?.startsWith('#philo-ref-')) {
          const match = href.match(/#philo-ref-(\d+)-([stp])/);
          if (match) {
            const refId = match[1];
            const sizeType = match[2];

            // If the reference is from the current image itself, it displays the requested thumbnail
            if (parseInt(refId, 10) === image.id) {
              let targetThumb = image.representations.thumb_small;
              if (sizeType === 't') targetThumb = image.representations.small;
              if (sizeType === 'p') targetThumb = image.representations.medium;

              return (
                <a
                  href={`${image.booruUrl}/images/${refId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="d-inline-block mt-2 mb-2"
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

            // If it's from another image, just render a normal link without charging thumbnail
            return (
              <a
                href={`${image.booruUrl}/images/${refId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="fw-bold text-decoration-none"
              >
                &gt;&gt;{refId}
                {sizeType}
              </a>
            );
          }
        }
        // Process normal links
        return (
          <a
            href={`${href.startsWith('/') || href.startsWith('./') || href.startsWith('../') ? `${image.booruUrl}` : ''}${href}`}
            target="_blank"
            rel="noopener noreferrer"
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
