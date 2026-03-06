import { dbConnection } from '../db/connection';

/**
 * Reusable fetch function for Philomena endpoints
 * @param {string} booruUrl
 * @param {string} endpoint
 * @param {string} apiKey
 * @param {Record<string, any>} params
 */
export const fetchPhilomena = async (booruUrl, endpoint, apiKey, params = {}) => {
  const queryParams = new URLSearchParams({ ...params, key: apiKey }).toString();
  const url = `${booruUrl}/api/v1/json/${endpoint}?${queryParams}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error fetching from ${booruUrl}: ${response.statusText}`);

  return response.json();
};

/**
 * @typedef {Object} ImageRepresentations
 * @property {string} full
 * @property {string} small
 * @property {string} thumb_tiny
 * @property {string} thumb_small
 * @property {string} thumb
 * @property {string} medium
 * @property {string} large
 * @property {string} tall
 */

/**
 * @typedef {Object} ImageObj
 * @property {number} id
 * @property {string} booruUrl
 * @property {string} name
 * @property {string[]} tags
 * @property {string[]} sourceUrls
 * @property {number} faves
 * @property {number} size
 * @property {number} uploaderId
 * @property {string} description
 * @property {string} mimeType
 * @property {number} downvotes
 * @property {number} upvotes
 * @property {number} origSize
 * @property {ImageRepresentations} representations
 * @property {number} updatedAt
 * @property {number} createdAt
 * @property {number} firstSeenAt
 * @property {string|null} sha512Hash
 * @property {string} uploader
 * @property {string|null} origSha512Hash
 * @property {number} hiddenFromUsers
 * @property {number} spoilered
 * @property {number} processed
 * @property {number} thumbnailsGenerated
 * @property {number} animated
 * @property {number} aspectRatio
 * @property {number|null} duplicateOf
 * @property {string|null} deletionReason
 * @property {number} height
 * @property {number} width
 * @property {string} sourceUrl
 */

/**
 * @param {string} booruUrl
 * @param {string} apiKey
 * @param {string} query
 * @param {number} page
 *
 * @returns {Promise<{ total: number; interactions: any[]; images: any[] }>}
 */
const searchImagesApi = async (booruUrl, apiKey, query, page) => {
  const result = await fetchPhilomena(booruUrl, 'search/images', apiKey, { q: query, page });
  if (typeof result.total !== 'number')
    throw new Error('Invalid philomena api result in "result.total".');
  if (!Array.isArray(result.interactions))
    throw new Error('Invalid philomena api result in "result.interactions".');
  if (!Array.isArray(result.images))
    throw new Error('Invalid philomena api result in "result.images".');
  return result;
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
    const data = await searchImagesApi(booruUrl, apiKey, query, page);

    /**
     * @param {any[]} item
     * @param {string} itemType
     */
    const checkArray = (item, itemType) => {
      if (!Array.isArray(item)) throw new Error('Invalid array item in the sync gallery page!');
      if (!item.every((i) => typeof i === itemType))
        throw new Error('Invalid array item in the sync gallery page!');
      return item;
    };

    /**
     * @param {any} item
     * @param {string} itemType
     */
    const checkItem = (item, itemType) => {
      if (typeof item !== itemType) throw new Error('Invalid item in the sync gallery page!');
      return item;
    };

    /** @type {ImageObj} */
    const formattedImages = data.images.map((img) => ({
      id: img.id,
      booruUrl: booruUrl,
      name: img.name,
      tags: checkArray(img.tags, 'string'),
      tagIds: checkArray(img.tag_ids, 'number'),
      viewUrl: img.view_url,
      sourceUrls: checkArray(img.source_urls, 'string'),
      faves: img.faves,
      size: img.size,
      uploaderId: img.uploader_id,
      uploader: img.uploader,
      description: img.description,
      mimeType: img.mime_type,
      downvotes: img.downvotes,
      upvotes: img.upvotes,
      origSize: img.orig_size,
      commentCount: img.comment_count,
      representations: {
        full: checkItem(img.representations.full, 'string'),
        small: checkItem(img.representations.small, 'string'),
        thumb_tiny: checkItem(img.representations.thumb_tiny, 'string'),
        thumb_small: checkItem(img.representations.thumb_small, 'string'),
        thumb: checkItem(img.representations.thumb, 'string'),
        medium: checkItem(img.representations.medium, 'string'),
        large: checkItem(img.representations.large, 'string'),
        tall: checkItem(img.representations.tall, 'string'),
      },
      updatedAt: new Date(img.updated_at).valueOf(),
      createdAt: new Date(img.created_at).valueOf(),
      firstSeenAt: new Date(img.first_seen_at).valueOf(),
      sha512Hash: img.sha512_hash,
      hiddenFromUsers: img.hidden_from_users,
      origSha512Hash: img.orig_sha512_hash,
      wilsonScore: img.wilson_score,
      thumbnailsGenerated: img.thumbnails_generated ? 1 : 0,
      aspectRatio: img.aspect_ratio,
      deletionReason: img.deletion_reason,
      duplicateOf: img.duplicate_of,
      animated: img.animated ? 1 : 0,
      spoilered: img.spoilered ? 1 : 0,
      processed: img.processed ? 1 : 0,
      height: img.height,
      width: img.width,
      sourceUrl: img.source_url,
    }));

    // Upsert data into JsStore
    await dbConnection.insert({
      into: 'Images',
      values: formattedImages,
      upsert: true,
    });

    console.log(`Synced page ${page} from ${booruUrl}`, data);
    return data;
  } catch (error) {
    console.error('Failed to sync gallery page:', error);
  }
};

/**
 * @param {Object} settings
 * @param {number} [settings.page=1]
 * @param {number} [settings.limit=50]
 * @param {string[]} [settings.includeTags]
 * @param {string[]} [settings.excludeTags]
 * @returns {Promise<ImageObj[]>}
 */
export const searchImages = async ({
  includeTags = [],
  excludeTags = [],
  page = 1,
  limit = 50,
}) => {
  /** @type {number} */
  const skipCount = (page - 1) * limit;

  /** @type {boolean} */
  const hasIncludes = includeTags.length > 0;

  const searchSettings = {
    from: 'Images',
    limit: limit,
    skip: skipCount,
    order: {
      by: 'createdAt',
      type: 'desc',
    },
  };

  if (!hasIncludes) {
    /** @type {ImageObj[]} */
    let allResults = await dbConnection.select(searchSettings);

    if (excludeTags.length > 0) {
      allResults = allResults.filter((img) => excludeTags.every((tag) => !img.tags.includes(tag)));
    }
    return allResults;
  }

  // Step 1: Query the database ONCE for the primary tag to maximize IndexedDB performance
  /** @type {ImageObj[]} */
  let results = await dbConnection.select({
    ...searchSettings,
    where: {
      tags: { in: includeTags },
    },
  });
  console.log(results, includeTags);

  // Step 2: Apply the remaining AND / NOT logical filtering in-memory
  if (includeTags.length > 1 || excludeTags.length > 0) {
    results = results.filter((img) => {
      return excludeTags.every((tag) => !img.tags.includes(tag));
    });
  }

  return results;
};

/**
 * @param {string} rawSearchString
 * @param {number} [limit=50]
 * @returns {Promise<ImageObj[]>}
 */
export const parseAndSearch = async (rawSearchString, limit = 50) => {
  /** @type {string[]} */
  const terms = rawSearchString
    .split(',')
    .map((term) => term.trim())
    .filter((term) => term !== '');

  /** @type {string[]} */
  const includeTags = [];

  /** @type {string[]} */
  const excludeTags = [];

  terms.forEach((term) => {
    if (term.startsWith('-')) {
      excludeTags.push(term.substring(1));
    } else {
      includeTags.push(term);
    }
  });

  return await searchImages({ includeTags, excludeTags, limit });
};

/**
 * @typedef {Object} Account
 * @property {number} id
 * @property {string} booruUrl
 * @property {string} apiKey
 * @property {number} isActive
 */

/**
 * @returns {Promise<Account[]>}
 */
export const getActiveAccounts = async () => {
  return await dbConnection.select({
    from: 'Accounts',
    where: {
      isActive: 1,
    },
  });
};

/**
 * @param {string} booruUrl
 * @param {string} apiKey
 * @returns {Promise<void>}
 */
export const addAccount = async (booruUrl, apiKey) => {
  /** @type {Partial<Account>[]} */
  const accountData = [
    {
      booruUrl: booruUrl,
      apiKey: apiKey,
      isActive: 1,
    },
  ];

  await dbConnection.insert({
    into: 'Accounts',
    values: accountData,
  });
};

/**
 * @param {number} accountId
 * @param {number|boolean} isActive
 * @returns {Promise<void>}
 */
export const toggleAccountStatus = async (accountId, isActive) => {
  await dbConnection.update({
    in: 'Accounts',
    set: {
      isActive: isActive ? 1 : 0,
    },
    where: {
      id: accountId,
    },
  });
};

/**
 * Background task to sync pages into JsStore and get user accounts
 * @param {string} [query='*']
 * @param {number} [page=1]
 */
export const syncUserGalleryPages = async (query = '*', page = 1) => {
  const accounts = await getActiveAccounts();

  // Sync background data for active accounts
  const syncs = [];
  accounts.forEach((account) =>
    syncs.push(syncGalleryPage(account.booruUrl, account.apiKey, query, page)),
  );

  const results = await Promise.all(syncs);
  let combinedLimit = 0;

  results.forEach((data) => {
    if (data && Array.isArray(data.images)) {
      if (data.images.length > combinedLimit) combinedLimit = data.images.length;
    }
  });

  // Fallback to 50 if the sync returned 0 images (e.g., dead end page)
  /** @type {number} */
  const finalLimit = combinedLimit > 0 ? combinedLimit : 50;

  return { accounts, syncLimit: finalLimit };
};

/**
 * @returns {Promise<Account[]>}
 */
export const getAllAccounts = async () => {
  return await dbConnection.select({
    from: 'Accounts',
  });
};

/**
 * @param {number} accountId
 * @returns {Promise<void>}
 */
export const deleteAccount = async (accountId) => {
  await dbConnection.remove({
    from: 'Accounts',
    where: {
      id: accountId,
    },
  });
};

/**
 * @returns {Promise<void>}
 */
export const deleteAllAccounts = async () => {
  await dbConnection.clear('Accounts');
};

/**
 * @returns {Promise<void>}
 */
export const factoryResetDatabase = async () => {
  await dbConnection.dropDb();
};
