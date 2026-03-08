import ReactMarkdown from 'react-markdown';
import { fixBooruUrl } from '../services/api';

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
    <ReactMarkdown components={{
  img: () => null, // Remove markdown from traditional images
  p: ({ children }) => <p className="m-0 p-0">{children}</p>,
  a: ({ href, children }) => {
    return (
      <a
        href={`${href.startsWith('/') || href.startsWith('./') || href.startsWith('../') ? `${fixBooruUrl(image.booruUrl)}` : ''}${href}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--app-primary)' }}
      >
        {children}
      </a>
    );
  },
}}>{preProcessPhilomenaTags(body)}</ReactMarkdown>
  );
