import { dbConnection } from '../db/connection';

/**
 * Reusable fetch function for Philomena endpoints
 * @param {string} booruUrl
 * @param {string} endpoint
 * @param {string} apiKey
 * @param {Record<string, any>} params
 * 
 */
export const fetchPhilomena = async (booruUrl, endpoint, apiKey, params = {}) => {
    const queryParams = new URLSearchParams({ ...params, key: apiKey }).toString();
    const url = `${booruUrl}/api/v1/json/${endpoint}?${queryParams}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error fetching from ${booruUrl}: ${response.statusText}`);
    
    return response.json();
};

/**
 * Background task to sync pages into JsStore
 * @param {string} booruUrl
 * @param {string} apiKey
 * @param {string} [query='*']
 * @param {number} [page=1]
 */
export const syncGalleryPage = async (booruUrl, apiKey, query = '*', page = 1) => {
    try {
        const data = await fetchPhilomena(booruUrl, 'search/images', apiKey, { q: query, page });
        
        if (data && data.images) {
            const formattedImages = data.images.map(img => ({
            id: img.id,
            booruUrl: booruUrl,
            name: img.name,
            tags: img.tags,
            sourceUrls: img.source_urls,
            faves: img.faves,
            size: img.size,
            uploaderId: img.uploader_id,
            description	: img.description,
            mimeType: img.mime_type	,
            downvotes: img.downvotes,
            upvotes: img.upvotes,
            origSize: img.orig_size,
            representations: img.representations,
            updatedAt: new Date(img.updated_at).valueOf(),
            createdAt: new Date(img.created_at).valueOf(),
            firstSeenAt: new Date(img.first_seen_at).valueOf(),
            sha512Hash: img.sha512_hash,
            thumbnailsGenerated: img.thumbnails_generated,
            height: img.height,
            width: img.width,
            sourceUrl: img.source_url
            }));

            // Upsert data into JsStore
            await dbConnection.insert({
                into: 'Images',
                values: formattedImages,
                upsert: true
            });
            
            console.log(`Synced page ${page} from ${booruUrl}`);
        }
    } catch (error) {
        console.error('Failed to sync gallery page:', error);
    }
};

/**
 * SQL-like query to find images by tag across all connected boorus
 * @param {string} tagName
 */
export const searchImagesByTag = async (tagName) => {
    return await dbConnection.select({
        from: 'Images',
        where: {
            tags: { in: [tagName] }
        }
    });
};

/**
 * @param {string[]} includeTags
 * @param {string[]} excludeTags
 * @param {string[]} anyTags
 * @returns {Promise<any[]>}
 */
export const searchImagesAdvanced = async (includeTags = [], excludeTags = [], anyTags = []) => {
  /** @type {any[]} */
  let results = [];

  /** @type {boolean} */
  const hasIncludes = includeTags.length > 0;

  /** @type {boolean} */
  const hasAny = anyTags.length > 0;

  if (!hasIncludes && !hasAny) {
    return await dbConnection.select({ from: 'Images' });
  }

  /** @type {string} */
  const primarySearchTag = hasIncludes ? includeTags[0] : anyTags[0];

  // Step 1: Query the database for the primary tag to minimize memory load
  results = await dbConnection.select({
    from: 'Images',
    where: {
      tags: { in: [primarySearchTag] },
    },
  });

  // Step 2: Apply advanced logical filtering (AND, OR, NOT) in-memory for the filtered batch
  if (includeTags.length > 1 || excludeTags.length > 0 || (hasIncludes && hasAny)) {
    /** @type {string[]} */
    const remainingIncludes = includeTags.slice(1);

    results = results.filter((img) => {
      /** @type {boolean} */
      const matchIncludes = remainingIncludes.every((tag) => img.tags.includes(tag));

      /** @type {boolean} */
      const matchExcludes = excludeTags.every((tag) => !img.tags.includes(tag));

      /** @type {boolean} */
      const matchAny = !hasAny || anyTags.some((tag) => img.tags.includes(tag));

      return matchIncludes && matchExcludes && matchAny;
    });
  }

  return results;
};

/**
 * @param {string} rawSearchString
 * @returns {Promise<any[]>}
 */
export const parseAndSearch = async (rawSearchString) => {
  /** @type {string[]} */
  const terms = rawSearchString
    .split(',')
    .map((term) => term.trim())
    .filter((term) => term !== '');

  /** @type {string[]} */
  const includeTags = [];

  /** @type {string[]} */
  const excludeTags = [];

  /** @type {string[]} */
  const anyTags = [];

  terms.forEach((term) => {
    if (term.startsWith('-')) {
      excludeTags.push(term.substring(1));
    } else if (term.startsWith('~')) {
      anyTags.push(term.substring(1));
    } else {
      includeTags.push(term);
    }
  });

  return await searchImagesAdvanced(includeTags, excludeTags, anyTags);
};
