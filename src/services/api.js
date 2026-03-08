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
 * @typedef {Object} UserProfileLink
 * @property {string} state
 * @property {Date} createdAt
 * @property {number} userId
 * @property {number} tagId
 */

/**
 * @typedef {Object} UserProfileAward
 * @property {string} imageUrl
 * @property {Date} awardedOn
 * @property {string} title
 * @property {string|null} label
 * @property {number} id
 */

/**
 * @typedef {Object} UserProfileData
 * @property {number} id
 * @property {number} uploadsCount
 * @property {number} commentsCount
 * @property {number} postsCount
 * @property {number} topicsCount
 * @property {string} name
 * @property {string|null} description
 * @property {string} role
 * @property {string} slug
 * @property {string|null} avatarUrl
 * @property {Date} createdAt
 * @property {UserProfileLink[]} links
 * @property {UserProfileAward[]} awards
 */

/**
 * @param {string} booruUrl
 * @param {number} userId
 * @returns {Promise<UserProfileData|null>}
 */
export const fetchProfile = async (booruUrl, userId) => {
  try {
    const result = await fetchPhilomena(booruUrl, `profiles/${userId}`);
    if (!result) return null;
    const user = result.user;

    if (typeof user.id !== 'number') throw new Error('Invalid philomena api user in "user.id".');

    if (typeof user.uploads_count !== 'number')
      throw new Error('Invalid philomena api user in "user.uploads_count".');
    if (typeof user.comments_count !== 'number')
      throw new Error('Invalid philomena api user in "user.comments_count".');
    if (typeof user.posts_count !== 'number')
      throw new Error('Invalid philomena api user in "user.posts_count".');
    if (typeof user.topics_count !== 'number')
      throw new Error('Invalid philomena api user in "user.topics_count".');

    if (typeof user.name !== 'string')
      throw new Error('Invalid philomena api user in "user.name".');
    if (typeof user.description !== 'string' && user.description !== null)
      throw new Error('Invalid philomena api user in "user.description".');
    if (typeof user.role !== 'string')
      throw new Error('Invalid philomena api user in "user.role".');
    if (typeof user.slug !== 'string')
      throw new Error('Invalid philomena api user in "user.slug".');
    if (typeof user.avatar_url !== 'string' && user.avatar_url !== null)
      throw new Error('Invalid philomena api user in "user.avatar_url".');

    if (typeof user.created_at !== 'string')
      throw new Error('Invalid philomena api user in "user.created_at".');

    if (!Array.isArray(user.links)) throw new Error('Invalid philomena api user in "user.links".');
    if (!Array.isArray(user.awards))
      throw new Error('Invalid philomena api user in "user.awards".');
    user.created_at = new Date(user.created_at);

    user.links.forEach((link) => {
      if (typeof link.state !== 'string')
        throw new Error('Invalid philomena api user in "link.state".');
      if (typeof link.created_at !== 'string')
        throw new Error('Invalid philomena api user in "link.created_at	".');
      if (typeof link.user_id !== 'number')
        throw new Error('Invalid philomena api user in "link.user_id".');
      if (typeof link.tag_id !== 'number')
        throw new Error('Invalid philomena api user in "link.tag_id".');
      link.createdAt = new Date(link.created_at);
      delete link.created_at;
      link.userId = link.user_id;
      delete link.user_id;
      link.tagId = link.tag_id;
      delete link.tag_id;
    });

    user.awards.forEach((award) => {
      if (typeof award.awarded_on !== 'string')
        throw new Error('Invalid philomena api user in "award.awarded_on".');
      if (typeof award.image_url !== 'string')
        throw new Error('Invalid philomena api user in "award.image_url".');
      if (typeof award.title !== 'string')
        throw new Error('Invalid philomena api user in "award.title".');
      if (typeof award.label !== 'string' && award.label !== null)
        throw new Error('Invalid philomena api user in "award.label".');
      if (typeof award.id !== 'number')
        throw new Error('Invalid philomena api user in "award.id".');
      award.awardedOn = new Date(award.awarded_on);
      delete award.awarded_on;
      award.imageUrl = award.image_url;
      delete award.image_url;
    });

    return {
      id: user.id,
      uploadsCount: user.uploads_count,
      commentsCount: user.comments_count,
      postsCount: user.posts_count,
      topicsCount: user.topics_count,
      name: user.name,
      description: user.description,
      role: user.role,
      slug: user.slug,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      links: user.links,
      awards: user.awards,
    };
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
};

/**
 * @typedef {Object} CommentData
 * @property {string} author
 * @property {string} avatar
 * @property {string} body
 * @property {Date} createdAt
 * @property {string|null} editReason
 * @property {Date|null} editedAt
 * @property {number} id
 * @property {number} imageId
 * @property {Date} updatedAt
 * @property {number|null} userId
 */

/**
 * @typedef {Object} CommentObj
 * @property {number} total
 * @property {CommentData[]} comments
 */

/**
 * @param {string} booruUrl
 * @param {string} apiKey
 * @param {string} [query='*']
 * @param {number} [page=1]
 *
 * @returns {Promise<CommentObj>}
 */
export const fetchComments = async (booruUrl, apiKey, query = '*', page = 1) => {
  const result = await fetchPhilomena(booruUrl, 'search/comments', apiKey, { q: query, page });
  if (typeof result.total !== 'number')
    throw new Error('Invalid philomena api result in "result.total".');
  if (!Array.isArray(result.comments))
    throw new Error('Invalid philomena api result in "result.comments".');
  return {
    total: result.total,
    comments: result.comments.map((comment) => {
      if (typeof comment.author !== 'string')
        throw new Error('Invalid philomena api result in "comment.author".');
      if (typeof comment.avatar !== 'string')
        throw new Error('Invalid philomena api result in "comment.avatar".');
      if (typeof comment.body !== 'string')
        throw new Error('Invalid philomena api result in "comment.body".');
      if (typeof comment.created_at !== 'string')
        throw new Error('Invalid philomena api result in "comment.created_at".');
      if (typeof comment.edit_reason !== 'string' && comment.edit_reason !== null)
        throw new Error('Invalid philomena api result in "comment.edit_reason".');
      if (typeof comment.edited_at !== 'string' && comment.edited_at !== null)
        throw new Error('Invalid philomena api result in "comment.edited_at".');
      if (typeof comment.id !== 'number')
        throw new Error('Invalid philomena api result in "comment.id".');
      if (typeof comment.image_id !== 'number')
        throw new Error('Invalid philomena api result in "comment.image_id".');
      if (typeof comment.updated_at !== 'string')
        throw new Error('Invalid philomena api result in "comment.updated_at".');
      if (typeof comment.user_id !== 'number' && comment.user_id !== null)
        throw new Error('Invalid philomena api result in "comment.user_id".');

      return {
        author: comment.author,
        avatar: comment.avatar,
        body: comment.body,
        createdAt: new Date(comment.created_at),
        editReason: comment.edit_reason,
        editedAt: comment.edited_at ? new Date(comment.edited_at) : null,
        id: comment.id,
        imageId: comment.image_id,
        updatedAt: new Date(comment.updated_at),
        userId: comment.user_id,
      };
    }),
  };
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
 * @param {number} [page]
 * @param {number} [perPage]
 *
 * @returns {Promise<{ total: number; interactions: any[]; images: any[] }>}
 */
const searchImagesApi = async (booruUrl, apiKey, query, page, perPage) => {
  /** @type {Record<string, any>} */
  const data = { q: query };
  if (typeof page === 'number') data.page = page;
  if (typeof perPage === 'number') data.per_page = perPage;

  const filterId = await getBooruFilterId(booruUrl);
  if (filterId) {
    data.filter_id = filterId;
  }

  const result = await fetchPhilomena(booruUrl, 'search/images', apiKey, data);
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
 */

/**
 * @returns {Promise<SystemSettings>}
 */
export const getSystemSettings = async () => {
  /** @type {SystemSettings[]} */
  const settings = await dbConnection.select({ from: 'Settings', where: { id: 1 } });
  if (settings.length > 0) return settings[0];

  /** @type {SystemSettings} */
  const defaultSettings = { id: 1, maxItems: 10000, persistentStorage: 0 };
  await dbConnection.insert({ into: 'Settings', values: [defaultSettings] });
  return defaultSettings;
};

/**
 * @param {number} maxItems
 * @param {number} persistentStorage
 * @returns {Promise<void>}
 */
export const updateSystemSettings = async (maxItems, persistentStorage) => {
  await dbConnection.update({
    in: 'Settings',
    set: { maxItems, persistentStorage },
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

/** @type {Record<string, number>} */
const syncTimes = {};

/**
 * Background task to sync pages into JsStore
 * @param {string} booruUrl
 * @param {string} apiKey
 * @param {string} [query='*']
 * @param {number} [page=1]
 * @param {number} [perPage]
 */
export const syncGalleryPage = async (
  booruUrl,
  apiKey,
  query = '*',
  page = 1,
  perPage = undefined,
) => {
  if (typeof syncTimes[booruUrl] !== 'number') syncTimes[booruUrl] = 0;
  syncTimes[booruUrl]++;
  const time = syncTimes[booruUrl];
  try {
    const data = await searchImagesApi(booruUrl, apiKey, query, page, perPage);
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
        booruUrl,
        createdAt: img.createdAt,
        query: normalizedQuery,
      }));
      await dbConnection.insert({ into: 'Queries', values: queryEntries, upsert: true });
    }

    await enforceStorageLimit();

    console.log(`Synced page ${page} from ${booruUrl} (${time})`);
    return data;
  } catch (error) {
    console.error('Failed to sync gallery page:', error);
  }
};

/**
 * @param {string} rawSearchString
 * @param {number} [limit=50]
 * @param {number} [page=1]
 * @param {string[]|null} [allowedBoorus=null]
 * @returns {Promise<ImageResult[]>}
 */
export const searchImages = async (
  rawSearchString = '*',
  limit = 50,
  page = 1,
  allowedBoorus = null,
) => {
  if (allowedBoorus && allowedBoorus.length === 0) return [];

  /** @type {number} */
  const fixedLimit = limit > 1000 ? 1000 : limit;
  /** @type {string} */
  const normalizedQuery = normalizeQueryString(rawSearchString);
  /** @type {number} */
  const skipCount = (page - 1) * fixedLimit;

  /** @type {ImageObj[]} */
  let results = [];

  if (normalizedQuery === '*') {
    /** @type {object|undefined} */
    const whereClause = allowedBoorus ? { booruUrl: { in: allowedBoorus } } : undefined;

    results = await dbConnection.select({
      from: 'Images',
      where: whereClause,
      limit: fixedLimit,
      skip: skipCount,
      order: { by: 'createdAt', type: 'desc' },
    });
  } else {
    /** @type {ImageObj[]} */
    const gatheredResults = [];
    /** @type {number} */
    let currentSkip = skipCount;
    /** @type {number} */
    const batchSize = fixedLimit;

    // Loop to keep fetching until we fill the requested limit or run out of data
    while (gatheredResults.length < fixedLimit) {
      /** @type {any[]} */
      const batch = await dbConnection.select({
        from: 'Queries',
        where: { query: normalizedQuery },
        join: {
          with: 'Images',
          on: 'Queries.imageId = Images.id',
          as: { id: 'imageId', createdAt: 'imgCreatedAt', booruUrl: 'imgBooruUrl' },
          type: 'inner',
        },
        limit: batchSize,
        skip: currentSkip,
        order: { by: 'Images.createdAt', type: 'desc' },
      });

      // Stop if the database has no more records for this query
      if (batch.length === 0) break;

      /** @type {any[]} */
      let filteredBatch = batch;
      if (allowedBoorus) {
        filteredBatch = batch.filter((item) => allowedBoorus.includes(item.imgBooruUrl));
      }

      gatheredResults.push(...filteredBatch);
      /** @type {number} */
      currentSkip += batch.length;

      // If the DB returned less than the batch size, we reached the end of the records
      if (batch.length < batchSize) break;
    }

    // Process and clean the results to match the expected format
    results = gatheredResults.slice(0, fixedLimit).map((item) => {
      item.id = item.imageId;
      item.booruUrl = item.imgBooruUrl;
      delete item.imageId;
      delete item.imgCreatedAt;
      delete item.imgBooruUrl;
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
          ...interactions.find((int) => int.imageId === item.id && int.booruUrl === item.booruUrl),
        }.value ?? null;
      return item;
    });
  }

  return results;
};

/**
 * @param {string} rawSearchString
 * @param {string[]|null} [allowedBoorus=null]
 * @returns {Promise<number>}
 */
export const countImages = async (rawSearchString = '*', allowedBoorus = null) => {
  /** @type {string} */
  const normalizedQuery = normalizeQueryString(rawSearchString);
  const whereClause = allowedBoorus ? { booruUrl: { in: allowedBoorus } } : undefined;

  if (normalizedQuery === '*') {
    return await dbConnection.count({
      where: whereClause,
      from: 'Images',
    });
  }

  return await dbConnection.count({
    from: 'Queries',
    where: { query: normalizedQuery, ...whereClause },
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
 * Background task to sync pages into JsStore filtering by allowed Boorus
 * @param {string} [query='*']
 * @param {number} [page=1]
 * @param {string[]|null} [allowedBoorus=null]
 * @param {number} [perPage]
 * @param {Account} [apiKey]
 */
export const syncUserGalleryPages = async (
  query = '*',
  page = 1,
  allowedBoorus = null,
  perPage = undefined,
  account = undefined,
) => {
  const allAccounts = !account ? await getActiveAccounts() : [account];

  // Hard filters the accounts to prevent unnecessary API requests
  const accounts = allowedBoorus
    ? allAccounts.filter((acc) => allowedBoorus.includes(acc.booruUrl))
    : allAccounts;

  if (accounts.length === 0) return { accounts: [], syncLimit: 50, totalCount: 0 };

  const syncs = accounts.map((account) =>
    syncGalleryPage(account.booruUrl, account.apiKey, query, page, perPage),
  );

  const results = await Promise.all(syncs);

  let combinedLimit = 0;
  let combinedTotal = 0;

  results.forEach((data) => {
    if (data && Array.isArray(data.images)) {
      if (data.images.length > combinedLimit) combinedLimit = data.images.length;
      if (typeof data.total === 'number') combinedTotal += data.total;
    }
  });

  // Fallback to 50 if the sync returned 0 images (e.g., dead end page)
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
 * @returns {Promise<string|null>}
 */
export const getAccountBooruApi = async (booruUrl) => {
  const accounts = await dbConnection.select({
    from: 'Accounts',
    where: {
      booruUrl,
    },
  });
  return accounts[0]?.apiKey ?? null;
};

/**
 * @returns {Promise<Account|null>}
 */
export const getAccountBooru = async (booruUrl) => {
  const accounts = await dbConnection.select({
    from: 'Accounts',
    where: {
      booruUrl,
    },
  });
  return accounts[0] ?? null;
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
    const response = await fetch(`${booruUrl}/api/v1/json/images/featured`);
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

/**
 * @returns {Promise<void>}
 */
export const clearImageCache = async () => {
  try {
    await dbConnection.clear('Queries');
    await dbConnection.clear('Interactions');
    await dbConnection.clear('Images');

    // Note: You might want to clear 'Interactions' as well
    // if they are strictly tied to the cached images.

    console.log('Image and Query cache cleared successfully.');
  } catch (error) {
    console.error('Failed to clear image cache:', error);
  }
};

/**
 * Clears cache for specific booru URLs from Images, Queries, and Interactions tables.
 * @param {string[]} booruUrls
 * @returns {Promise<void>}
 */
export const clearSpecificBooruCache = async (booruUrls) => {
  if (!Array.isArray(booruUrls) || booruUrls.length === 0) return;

  /** @type {string[]} */
  const normalizedUrls = booruUrls.map((url) => url);

  try {
    /** @type {object} */
    const whereClause = {
      booruUrl: { in: normalizedUrls },
    };

    // Deleting from all related tables to maintain data integrity
    await dbConnection.remove({ from: 'Queries', where: whereClause });
    await dbConnection.remove({ from: 'Interactions', where: whereClause });
    await dbConnection.remove({ from: 'Images', where: whereClause });

    console.log(`Cache cleared for: ${normalizedUrls.join(', ')}`);
  } catch (error) {
    console.error('Failed to clear specific booru cache:', error);
  }
};

/**
 * @typedef {Object} FilterItem
 * @property {string} description
 * @property {string|null} hiddenComplex
 * @property {number[]} hiddenTagIds
 * @property {number} id
 * @property {string} name
 * @property {boolean} public
 * @property {string|null} spoileredComplex
 * @property {number[]} spoileredTagIds
 * @property {boolean} system
 * @property {number} userCount
 * @property {number|null} userId
 */

/**
 * @typedef {{ filters: FilterItem[]; total: number; }} FilterObj
 */

/**
 * @param {Record<string, any>} result
 * @returns {FilterObj}
 */
const parseFilterList = (result) => {
  if (typeof result.total !== 'number')
    throw new Error('Invalid philomena api result in "result.total".');
  if (!Array.isArray(result.filters))
    throw new Error('Invalid philomena api result in "result.filters".');
  return {
    total: result.total,
    filters: result.filters.map((filter) => {
      if (typeof filter.description !== 'string')
        throw new Error('Invalid philomena api result in "filter.description".');
      if (typeof filter.hidden_complex !== 'string' && filter.hidden_complex !== null)
        throw new Error('Invalid philomena api result in "filter.hidden_complex".');
      if (typeof filter.spoilered_complex !== 'string' && filter.spoilered_complex !== null)
        throw new Error('Invalid philomena api result in "filter.spoilered_complex".');
      if (
        !Array.isArray(filter.hidden_tag_ids) ||
        !filter.hidden_tag_ids.every((tagId) => typeof tagId === 'number')
      )
        throw new Error('Invalid philomena api result in "filter.hidden_tag_ids".');
      if (
        !Array.isArray(filter.spoilered_tag_ids) ||
        !filter.spoilered_tag_ids.every((tagId) => typeof tagId === 'number')
      )
        throw new Error('Invalid philomena api result in "filter.spoilered_tag_ids".');
      if (typeof filter.id !== 'number')
        throw new Error('Invalid philomena api result in "filter.id".');
      if (typeof filter.name !== 'string')
        throw new Error('Invalid philomena api result in "filter.name".');
      if (typeof filter.public !== 'boolean')
        throw new Error('Invalid philomena api result in "filter.public".');
      if (typeof filter.system !== 'boolean')
        throw new Error('Invalid philomena api result in "filter.system".');
      if (typeof filter.user_count !== 'number')
        throw new Error('Invalid philomena api result in "filter.user_count".');
      if (typeof filter.user_id !== 'number' && filter.user_id !== null)
        throw new Error('Invalid philomena api result in "filter.user_id".');

      return {
        description: filter.description,
        hiddenComplex: filter.hidden_complex,
        hiddenTagIds: filter.hidden_tag_ids,
        id: filter.id,
        name: filter.name,
        public: filter.public,
        spoileredComplex: filter.spoilered_complex,
        spoileredTagIds: filter.spoilered_tag_ids,
        system: filter.system,
        userCount: filter.user_count,
        userId: filter.user_id,
      };
    }),
  };
};

/**
 * @param {string} booruUrl
 * @param {number} [page=1]
 */
export const fetchSystemFilters = async (booruUrl, page = 1) => {
  const data = await fetchPhilomena(booruUrl, 'filters/system', '', { page });
  return parseFilterList(data);
};

/**
 * @param {string} booruUrl
 * @param {string} apiKey
 * @param {number} [page=1]
 */
export const fetchUserFilters = async (booruUrl, apiKey, page = 1) => {
  const data = await fetchPhilomena(booruUrl, 'filters/user', apiKey, { page });
  return parseFilterList(data);
};

/**
 * @param {string} booruUrl
 * @returns {Promise<number|null>}
 */
export const getBooruFilterId = async (booruUrl) => {
  /** @type {Record<string, number>} */
  const storedFilters = JSON.parse(localStorage.getItem('app_booruFilters') || '{}');

  if (storedFilters[booruUrl]) {
    return storedFilters[booruUrl];
  }

  // Auto-defines default system filter if none is set
  try {
    /** @type {any} */
    const result = await fetchSystemFilters(booruUrl, 1);

    if (result && Array.isArray(result.filters) && result.filters.length > 0) {
      /** @type {number} */
      const defaultFilterId = result.filters[0].id;
      storedFilters[booruUrl] = defaultFilterId;
      localStorage.setItem('app_booruFilters', JSON.stringify(storedFilters));
      await clearImageCache();
      return defaultFilterId;
    }
  } catch (error) {
    console.error(`Failed to fetch default filter for ${booruUrl}:`, error);
  }

  return null;
};

/**
 * Call this function when the user clicks "Save" in your new Filter Tab
 * @param {Record<string, number>} newFiltersData
 * @returns {Promise<void>}
 */
export const saveBooruFilters = async (newFiltersData) => {
  localStorage.setItem('app_booruFilters', JSON.stringify(newFiltersData));
  await clearImageCache();
};
