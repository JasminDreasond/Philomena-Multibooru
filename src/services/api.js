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
 * @typedef {'faved'|'upVote'|'downVote'|null} InteractionValue
 */

/**
 * @typedef {Object} InteractionObj
 * @property {string} id
 * @property {string} booruUrl
 * @property {number} imageId
 * @property {InteractionValue} value
 */

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
 * @typedef {Object} ImageIntensities
 * @property {number} ne
 * @property {number} nw
 * @property {number} se
 * @property {number} sw
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
 * @property {number|null} uploaderId
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
 * @property {string|null} uploader
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
 * @property {ImageIntensities} intensities
 */

/**
 * @typedef {ImageObj & { interaction: InteractionValue }} ImageResult
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
 * @param {string} rawQuery
 * @returns {string}
 */
const normalizeQueryString = (rawQuery) => {
  if (rawQuery === '*' || rawQuery.trim() === '') return '*';
  return rawQuery
    .split(',')
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term !== '')
    .sort()
    .join(', ');
};

/**
 * @typedef {Object} SystemSettings
 * @property {number} id
 * @property {number} maxItems
 * @property {number} persistentStorage
 * @property {number} mixAllBoorus
 */

/**
 * @returns {Promise<SystemSettings>}
 */
export const getSystemSettings = async () => {
  /** @type {SystemSettings[]} */
  const settings = await dbConnection.select({ from: 'Settings', where: { id: 1 } });
  if (settings.length > 0) return settings[0];

  /** @type {SystemSettings} */
  const defaultSettings = { id: 1, maxItems: 10000, persistentStorage: 0, mixAllBoorus: 0 };
  await dbConnection.insert({ into: 'Settings', values: [defaultSettings] });
  return defaultSettings;
};

/**
 * @param {number} maxItems
 * @param {number} persistentStorage
 * @param {number} mixAllBoorus
 * @returns {Promise<void>}
 */
export const updateSystemSettings = async (maxItems, persistentStorage, mixAllBoorus) => {
  await dbConnection.update({
    in: 'Settings',
    set: { maxItems, persistentStorage, mixAllBoorus },
    where: { id: 1 },
  });
};

/**
 * @returns {Promise<void>}
 */
const enforceStorageLimit = async () => {
  /** @type {SystemSettings} */
  const settings = await getSystemSettings();
  if (settings.persistentStorage === 1) return;

  /** @type {number} */
  const totalImages = await dbConnection.count({ from: 'Images' });

  if (totalImages > settings.maxItems) {
    /** @type {number} */
    const excess = totalImages - settings.maxItems;

    /** @type {any[]} */
    const oldestImages = await dbConnection.select({
      from: 'Images',
      order: { by: 'createdAt', type: 'asc' },
      limit: excess,
    });

    /** @type {number[]} */
    const idsToDelete = oldestImages.map((img) => img.id);

    await dbConnection.remove({
      from: 'Queries',
      where: { imageId: { in: idsToDelete } },
    });

    await dbConnection.remove({
      from: 'Interactions',
      where: { imageId: { in: idsToDelete } },
    });

    await dbConnection.remove({
      from: 'Images',
      where: { id: { in: idsToDelete } },
    });
  }
};

/**
 * @typedef {Object} QueryItem
 * @property {string} id
 * @property {number} imageId
 * @property {number} createdAt
 * @property {string} query
 */

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

/**
 * @param {Record<string, any>} img
 */
export const parseImageData = (booruUrl, img) => ({
  id: img.id,
  booruUrl,
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
  intensities: {
    ne: checkItem(img.intensities.ne, 'number'),
    nw: checkItem(img.intensities.nw, 'number'),
    se: checkItem(img.intensities.se, 'number'),
    sw: checkItem(img.intensities.sw, 'number'),
  },
  updatedAt: new Date(img.updated_at).valueOf(),
  createdAt: new Date(img.created_at).valueOf(),
  firstSeenAt: new Date(img.first_seen_at).valueOf(),
  sha512Hash: img.sha512_hash,
  hiddenFromUsers: img.hidden_from_users ? 1 : 0,
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
});

/**
 * @param {Record<string, any>} img
 */
export const fixImageObj = (img) => {
  img.animated = img.animated ? true : false;
  img.hiddenFromUsers = img.hiddenFromUsers ? true : false;
  img.processed = img.processed ? true : false;
  img.spoilered = img.spoilered ? true : false;
  img.thumbnailsGenerated = img.thumbnailsGenerated ? true : false;
  return img;
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
    /** @type {string} */
    const normalizedQuery = normalizeQueryString(query);

    /** @type {ImageObj} */
    const formattedImages = data.images.map((img) => parseImageData(booruUrl, img));

    /** @type {InteractionObj[]} */
    const formattedInteractions = [];

    /** @type {InteractionObj[]} */
    data.interactions.forEach((int) => {
      const value =
        int.interaction_type === 'faved'
          ? 'faved'
          : int.interaction_type === 'voted'
            ? int.value === 'up'
              ? 'upVote'
              : int.value === 'down'
                ? 'downVote'
                : null
            : null;

      const id = `${booruUrl}_${int.image_id}`;
      const oldInteraction = formattedInteractions.find((int2) => int2.id === id);
      if (oldInteraction) {
        if (value === 'faved') oldInteraction.value = value;
        return;
      }

      formattedInteractions.push({
        id,
        booruUrl,
        imageId: int.image_id,
        value,
      });
    });

    await dbConnection.insert({ into: 'Images', values: formattedImages, upsert: true });
    await dbConnection.insert({
      into: 'Interactions',
      values: formattedInteractions,
      upsert: true,
    });

    if (normalizedQuery !== '*') {
      /** @type {QueryItem[]} */
      const queryEntries = formattedImages.map((img) => ({
        id: `${booruUrl}_${img.id}_${normalizedQuery}`,
        imageId: img.id,
        createdAt: img.createdAt,
        query: normalizedQuery,
      }));
      await dbConnection.insert({ into: 'Queries', values: queryEntries, upsert: true });
    }

    await enforceStorageLimit();

    console.log(`Synced page ${page} from ${booruUrl}`);
    return data;
  } catch (error) {
    console.error('Failed to sync gallery page:', error);
  }
};

/**
 * @param {string} rawSearchString
 * @param {number} [limit=50]
 * @param {number} [page=1]
 * @returns {Promise<ImageResult[]>}
 */
export const searchImages = async (rawSearchString = '*', limit = 50, page = 1) => {
  /** @type {number} */
  const skipCount = (page - 1) * limit;

  /** @type {string} */
  const normalizedQuery = normalizeQueryString(rawSearchString);

  /** @type {ImageObj[]} */
  let results = [];

  if (normalizedQuery === '*') {
    results = await dbConnection.select({
      from: 'Images',
      limit: limit > 1000 ? 1000 : limit,
      skip: skipCount,
      order: { by: 'createdAt', type: 'desc' },
    });
  } else {
    results = await dbConnection.select({
      from: 'Queries',
      where: { query: normalizedQuery },
      join: {
        with: 'Images',
        on: 'Queries.imageId = Images.id',
        as: { id: 'imageId', createdAt: 'imgCreatedAt' },
        type: 'inner',
      },
      limit: limit > 1000 ? 1000 : limit,
      skip: skipCount,
      order: { by: 'Images.createdAt', type: 'desc' },
    });

    // Fix the results
    results = results.map((item) => {
      item.id = item.imageId;
      delete item.imageId;
      delete item.imgCreatedAt;
      delete item.query;
      fixImageObj(item);
      return item;
    });
  }

  if (results.length > 0) {
    /** @type {number[]} */
    const imageIds = results.map((img) => img.id);

    /** @type {InteractionObj[]} */
    const interactions = await dbConnection.select({
      from: 'Interactions',
      where: { imageId: { in: imageIds } },
    });

    results = results.map((item) => {
      item.interaction =
        {
          ...interactions.find(
            (int) =>
              int.imageId === item.id && fixBooruUrl(int.booruUrl) === fixBooruUrl(item.booruUrl),
          ),
        }.value ?? null;
      return item;
    });
  }

  return results;
};

/**
 * @param {string} rawSearchString
 * @returns {Promise<number>}
 */
export const countImages = async (rawSearchString = '*') => {
  /** @type {string} */
  const normalizedQuery = normalizeQueryString(rawSearchString);

  if (normalizedQuery === '*') {
    return await dbConnection.count({
      from: 'Images',
    });
  }

  return await dbConnection.count({
    from: 'Queries',
    where: { query: normalizedQuery },
  });
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
    syncs.push(syncGalleryPage(fixBooruUrl(account.booruUrl), account.apiKey, query, page)),
  );

  const results = await Promise.all(syncs);

  /** @type {number} */
  let combinedLimit = 0;

  /** @type {number} */
  let combinedTotal = 0;

  results.forEach((data) => {
    if (data && Array.isArray(data.images)) {
      if (data.images.length > combinedLimit) combinedLimit = data.images.length;
      if (typeof data.total === 'number') combinedTotal += data.total;
    }
  });

  // Fallback to 50 if the sync returned 0 images (e.g., dead end page)
  /** @type {number} */
  const finalLimit = combinedLimit > 0 ? combinedLimit : 50;

  return { accounts, syncLimit: finalLimit, totalCount: combinedTotal };
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

/**
 * @param {string} booruUrl
 * @returns {Promise<ImageObj | null>}
 */
export const getFeaturedImage = async (booruUrl) => {
  try {
    const response = await fetch(`${fixBooruUrl(booruUrl)}/api/v1/json/images/featured`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.image ? parseImageData(booruUrl, fixImageObj(data.image)) : null;
  } catch (error) {
    console.error('Failed to fetch featured image:', error);
    return null;
  }
};

/**
 * @param {string} url
 * @returns {string}
 */
export const fixBooruUrl = (url) => (url.endsWith('/') ? url.substring(0, url.length - 1) : url);
