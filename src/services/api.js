import { dbConnection } from '../db/connection';

/**
 * Helper function to throw standardized and coherent API validation errors.
 * @param {string} context
 * @param {string} field
 * @throws {Error}
 */
const throwApiError = (context, field) => {
  throw new Error(
    `Philomena API Error: Invalid or missing field "${field}" in the ${context} response.`,
  );
};

/**
 * Reusable fetch function for Philomena endpoints.
 * @param {string} booruUrl
 * @param {string} endpoint
 * @param {string} apiKey
 * @param {Record<string, any>} params
 */
export const fetchPhilomena = async (booruUrl, endpoint, apiKey, params = {}) => {
  const queryParams = new URLSearchParams({ ...params, key: apiKey }).toString();
  const url = `${booruUrl}/api/v1/json/${endpoint}?${queryParams}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Network Error: Failed to fetch data from ${booruUrl} (${endpoint}). Status: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
};

/**
 * Represents a social or external link attached to a user's profile.
 * @typedef {Object} UserProfileLink
 * @property {string} state
 * @property {Date} createdAt
 * @property {number} userId
 * @property {number} tagId
 */

/**
 * Represents a badge or award given to a user.
 * @typedef {Object} UserProfileAward
 * @property {string} imageUrl
 * @property {Date} awardedOn
 * @property {string} title
 * @property {string|null} label
 * @property {number} id
 */

/**
 * Contains all parsed and formatted information about a booru user's profile.
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
 * Fetches and parses a user's profile data from the specified booru.
 * @param {string} booruUrl
 * @param {number} userId
 * @returns {Promise<UserProfileData|null>}
 */
export const fetchProfile = async (booruUrl, userId) => {
  try {
    const result = await fetchPhilomena(booruUrl, `profiles/${userId}`);
    if (!result) return null;
    const user = result.user;

    const ctx = 'User Profile';
    if (typeof user.id !== 'number') throwApiError(ctx, 'user.id');
    if (typeof user.uploads_count !== 'number') throwApiError(ctx, 'user.uploads_count');
    if (typeof user.comments_count !== 'number') throwApiError(ctx, 'user.comments_count');
    if (typeof user.posts_count !== 'number') throwApiError(ctx, 'user.posts_count');
    if (typeof user.topics_count !== 'number') throwApiError(ctx, 'user.topics_count');
    if (typeof user.name !== 'string') throwApiError(ctx, 'user.name');
    if (typeof user.description !== 'string' && user.description !== null)
      throwApiError(ctx, 'user.description');
    if (typeof user.role !== 'string') throwApiError(ctx, 'user.role');
    if (typeof user.slug !== 'string') throwApiError(ctx, 'user.slug');
    if (typeof user.avatar_url !== 'string' && user.avatar_url !== null)
      throwApiError(ctx, 'user.avatar_url');
    if (typeof user.created_at !== 'string') throwApiError(ctx, 'user.created_at');
    if (!Array.isArray(user.links)) throwApiError(ctx, 'user.links');
    if (!Array.isArray(user.awards)) throwApiError(ctx, 'user.awards');

    user.created_at = new Date(user.created_at);

    user.links.forEach((link) => {
      if (typeof link.state !== 'string') throwApiError(ctx, 'link.state');
      if (typeof link.created_at !== 'string') throwApiError(ctx, 'link.created_at');
      if (typeof link.user_id !== 'number') throwApiError(ctx, 'link.user_id');
      if (typeof link.tag_id !== 'number') throwApiError(ctx, 'link.tag_id');

      link.createdAt = new Date(link.created_at);
      delete link.created_at;
      link.userId = link.user_id;
      delete link.user_id;
      link.tagId = link.tag_id;
      delete link.tag_id;
    });

    user.awards.forEach((award) => {
      if (typeof award.awarded_on !== 'string') throwApiError(ctx, 'award.awarded_on');
      if (typeof award.image_url !== 'string') throwApiError(ctx, 'award.image_url');
      if (typeof award.title !== 'string') throwApiError(ctx, 'award.title');
      if (typeof award.label !== 'string' && award.label !== null)
        throwApiError(ctx, 'award.label');
      if (typeof award.id !== 'number') throwApiError(ctx, 'award.id');

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
 * Represents a single user comment retrieved from the booru.
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
 * A wrapper object containing a paginated list of comments and the total count.
 * @typedef {Object} CommentObj
 * @property {number} total
 * @property {CommentData[]} comments
 */

/**
 * Fetches and parses comments based on a specific query.
 * @param {string} booruUrl
 * @param {string} apiKey
 * @param {string} [query='*']
 * @param {number} [page=1]
 * @returns {Promise<CommentObj>}
 */
export const fetchComments = async (booruUrl, apiKey, query = '*', page = 1) => {
  const result = await fetchPhilomena(booruUrl, 'search/comments', apiKey, { q: query, page });
  const ctx = 'Comments Search';

  if (typeof result.total !== 'number') throwApiError(ctx, 'result.total');
  if (!Array.isArray(result.comments)) throwApiError(ctx, 'result.comments');

  return {
    total: result.total,
    comments: result.comments.map((comment) => {
      if (typeof comment.author !== 'string') throwApiError(ctx, 'comment.author');
      if (typeof comment.avatar !== 'string') throwApiError(ctx, 'comment.avatar');
      if (typeof comment.body !== 'string') throwApiError(ctx, 'comment.body');
      if (typeof comment.created_at !== 'string') throwApiError(ctx, 'comment.created_at');
      if (typeof comment.edit_reason !== 'string' && comment.edit_reason !== null)
        throwApiError(ctx, 'comment.edit_reason');
      if (typeof comment.edited_at !== 'string' && comment.edited_at !== null)
        throwApiError(ctx, 'comment.edited_at');
      if (typeof comment.id !== 'number') throwApiError(ctx, 'comment.id');
      if (typeof comment.image_id !== 'number') throwApiError(ctx, 'comment.image_id');
      if (typeof comment.updated_at !== 'string') throwApiError(ctx, 'comment.updated_at');
      if (typeof comment.user_id !== 'number' && comment.user_id !== null)
        throwApiError(ctx, 'comment.user_id');

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
 * Represents the type of interaction a user had with an image.
 * @typedef {'faved'|'upVote'|'downVote'|null} InteractionValue
 */

/**
 * Represents a user's interaction record for a specific image on a specific booru.
 * @typedef {Object} InteractionObj
 * @property {string} id
 * @property {string} booruUrl
 * @property {number} imageId
 * @property {InteractionValue} value
 */

/**
 * Contains URLs for various sizes and formats of a processed image.
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
 * Represents the color or light intensity values for different quadrants of an image.
 * @typedef {Object} ImageIntensities
 * @property {number} ne
 * @property {number} nw
 * @property {number} se
 * @property {number} sw
 */

/**
 * Represents the comprehensive data of a single image parsed from the API.
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
 * @property {ImageIntensities|null} intensities
 */

/**
 * Extends the ImageObj to include the current user's interaction state with the image.
 * @typedef {ImageObj & { interaction: InteractionValue }} ImageResult
 */

/**
 * Fetches images from the booru API using a search query and automatically applies the user's selected filter.
 * @param {string} booruUrl
 * @param {string} apiKey
 * @param {string} query
 * @param {number} [page]
 * @param {number} [perPage]
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
  const ctx = 'Image Search';

  if (typeof result.total !== 'number') throwApiError(ctx, 'result.total');
  if (!Array.isArray(result.interactions)) throwApiError(ctx, 'result.interactions');
  if (!Array.isArray(result.images)) throwApiError(ctx, 'result.images');

  return result;
};

/**
 * Normalizes a query string by sorting tags alphabetically to ensure consistent caching.
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
 * Represents the global application configuration stored in the local database.
 * @typedef {Object} SystemSettings
 * @property {number} id
 * @property {number} maxItems
 * @property {number} persistentStorage
 */

/**
 * Retrieves the global system settings from the local database.
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
 * Updates the global system settings in the local database.
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
 * Enforces the local storage limit by deleting the oldest images if the max limit is exceeded.
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
 * Represents a cached search query linked to specific images in the database.
 * @typedef {Object} QueryItem
 * @property {string} id
 * @property {number} imageId
 * @property {number} createdAt
 * @property {string} query
 */

/**
 * Utility function to validate arrays and their elements in API responses.
 * @param {any[]} item
 * @param {string} itemType
 */
const checkArray = (item, itemType) => {
  if (!Array.isArray(item) || !item.every((i) => typeof i === itemType)) {
    throw new Error(`Data Validation Error: Expected an array of type "${itemType}".`);
  }
  return item;
};

/**
 * Utility function to validate primitive items in API responses.
 * @param {any} item
 * @param {string} itemType
 */
const checkItem = (item, itemType) => {
  if (typeof item !== itemType) {
    throw new Error(
      `Data Validation Error: Expected item of type "${itemType}" but received "${typeof item}".`,
    );
  }
  return item;
};

/**
 * Parses raw image data from the Philomena API into the format required by the local database.
 * @param {string} booruUrl
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
  intensities: img.intensities
    ? {
        ne: checkItem(img.intensities.ne, 'number'),
        nw: checkItem(img.intensities.nw, 'number'),
        se: checkItem(img.intensities.se, 'number'),
        sw: checkItem(img.intensities.sw, 'number'),
      }
    : null,
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
 * Normalizes an Image object restoring boolean fields.
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
 * @param {{ total: number; interactions: any[]; images: any[] }} data
 * @returns {InteractionObj[]}
 */
const getInteractions = (booruUrl, data) => {
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

  return formattedInteractions;
};

/**
 * Downloads a page of images from the specified booru and inserts it into the local IndexedDB.
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
    const formattedInteractions = getInteractions(booruUrl, data);

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
 * Queries the local IndexedDB for images that match a given search string.
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
 * Returns the total count of images in the database for a specific query.
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
 * Represents a connected booru account and its API credentials.
 * @typedef {Object} Account
 * @property {number} id
 * @property {string} booruUrl
 * @property {string} apiKey
 * @property {number} isActive
 */

/**
 * Fetches all active accounts stored in the local database.
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
 * Adds a new booru account to the local database.
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
 * Toggles the active status of an account in the local database.
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
 * Background task that syncs gallery pages for multiple connected accounts.
 * @param {string} [query='*']
 * @param {number} [page=1]
 * @param {string[]|null} [allowedBoorus=null]
 * @param {number} [perPage]
 * @param {Account} [account]
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
 * Fetches all registered accounts from the database, including inactive ones.
 * @returns {Promise<Account[]>}
 */
export const getAllAccounts = async () => {
  return await dbConnection.select({
    from: 'Accounts',
  });
};

/**
 * Fetches the API key for a specific booru URL.
 * @param {string} booruUrl
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
 * Fetches the complete account details for a specific booru URL.
 * @param {string} booruUrl
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
 * Permanently deletes an account from the local database.
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
 * Clears all registered accounts from the database.
 * @returns {Promise<void>}
 */
export const deleteAllAccounts = async () => {
  await dbConnection.clear('Accounts');
};

/**
 * Completely drops the local IndexedDB database.
 * @returns {Promise<void>}
 */
export const factoryResetDatabase = async () => {
  await dbConnection.dropDb();
};

/**
 * Fetches the featured image payload for the given booru URL.
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
 * Normalizes booru URLs by stripping trailing slashes.
 * @param {string} url
 * @returns {string}
 */
export const fixBooruUrl = (url) => (url.endsWith('/') ? url.substring(0, url.length - 1) : url);

/**
 * Wipes out all cached images, queries, and interaction data.
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
 * Represents a content filter configuration from the Philomena API.
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
 * A wrapper object containing a paginated list of filters and the total count.
 * @typedef {{ filters: FilterItem[]; total: number; }} FilterObj
 */

/**
 * Parses raw JSON responses containing lists of Philomena filters.
 * @param {Record<string, any>} result
 * @returns {FilterObj}
 */
const parseFilterList = (result) => {
  const ctx = 'Filter List';
  if (typeof result.total !== 'number') throwApiError(ctx, 'result.total');
  if (!Array.isArray(result.filters)) throwApiError(ctx, 'result.filters');

  return {
    total: result.total,
    filters: result.filters.map((filter) => {
      if (typeof filter.description !== 'string') throwApiError(ctx, 'filter.description');
      if (typeof filter.hidden_complex !== 'string' && filter.hidden_complex !== null)
        throwApiError(ctx, 'filter.hidden_complex');
      if (typeof filter.spoilered_complex !== 'string' && filter.spoilered_complex !== null)
        throwApiError(ctx, 'filter.spoilered_complex');

      if (
        !Array.isArray(filter.hidden_tag_ids) ||
        !filter.hidden_tag_ids.every((tagId) => typeof tagId === 'number')
      ) {
        throwApiError(ctx, 'filter.hidden_tag_ids');
      }

      if (
        !Array.isArray(filter.spoilered_tag_ids) ||
        !filter.spoilered_tag_ids.every((tagId) => typeof tagId === 'number')
      ) {
        throwApiError(ctx, 'filter.spoilered_tag_ids');
      }

      if (typeof filter.id !== 'number') throwApiError(ctx, 'filter.id');
      if (typeof filter.name !== 'string') throwApiError(ctx, 'filter.name');
      if (typeof filter.public !== 'boolean') throwApiError(ctx, 'filter.public');
      if (typeof filter.system !== 'boolean') throwApiError(ctx, 'filter.system');
      if (typeof filter.user_count !== 'number') throwApiError(ctx, 'filter.user_count');
      if (typeof filter.user_id !== 'number' && filter.user_id !== null)
        throwApiError(ctx, 'filter.user_id');

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
 * Fetches the system-wide filters natively available on the specific booru.
 * @param {string} booruUrl
 * @param {number} [page=1]
 * @returns {Promise<FilterObj>}
 */
export const fetchSystemFilters = async (booruUrl, page = 1) => {
  const data = await fetchPhilomena(booruUrl, 'filters/system', '', { page });
  return parseFilterList(data);
};

/**
 * Fetches the customized filters tied to the given user's API key.
 * @param {string} booruUrl
 * @param {string} apiKey
 * @param {number} [page=1]
 * @returns {Promise<FilterObj>}
 */
export const fetchUserFilters = async (booruUrl, apiKey, page = 1) => {
  const data = await fetchPhilomena(booruUrl, 'filters/user', apiKey, { page });
  return parseFilterList(data);
};

/**
 * Retrieves the currently selected filter ID for the given booru from local storage, auto-assigning one if empty.
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
    /** @type {FilterObj} */
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
 * Saves filter preferences for boorus to local storage and flushes the image cache.
 * @param {Record<string, number>} newFiltersData
 * @returns {Promise<void>}
 */
export const saveBooruFilters = async (newFiltersData) => {
  localStorage.setItem('app_booruFilters', JSON.stringify(newFiltersData));
  await clearImageCache();
};

/**
 * Fetches a single image by its ID, parses it, caches it in the local database, and returns the formatted data.
 * @param {string} booruUrl
 * @param {string} apiKey
 * @param {number|string} imageId
 * @returns {Promise<ImageResult|null>}
 */
export const fetchSingleImage = async (booruUrl, apiKey, imageId) => {
  try {
    const result = await fetchPhilomena(booruUrl, `images/${imageId}`, apiKey);
    const ctx = 'Single Image Fetch';

    if (!result.image) throwApiError(ctx, 'image');

    /** @type {ImageObj} */
    const formattedImage = parseImageData(booruUrl, result.image);
    const formattedInteractions = getInteractions(booruUrl, result);

    /** @type {ImageResult} */
    const imageResult = { ...formattedImage };
    imageResult.interaction = formattedInteractions.value ?? null;

    // Restores boolean fields for the React components
    return fixImageObj(imageResult);
  } catch (error) {
    console.error(`Failed to fetch single image ${imageId} from ${booruUrl}:`, error);
    return null;
  }
};
