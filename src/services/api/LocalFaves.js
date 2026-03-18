import { dbConnection } from '../../db/connection';
import { fixImageObj } from './Images';

/**
 * @param {ImageObj|ImageResult} img
 * @returns {ImageObj}
 */
const formatLocalFaveData = (img) => {
  /** @type {Record<string, any>} */
  const faveData = { ...img };

  faveData.animated = faveData.animated ? 1 : 0;
  faveData.hiddenFromUsers = faveData.hiddenFromUsers ? 1 : 0;
  faveData.processed = faveData.processed ? 1 : 0;
  faveData.spoilered = faveData.spoilered ? 1 : 0;
  faveData.thumbnailsGenerated = faveData.thumbnailsGenerated ? 1 : 0;

  delete faveData.interaction;

  return faveData;
};

/**
 * @param {ImageObj|ImageResult} img
 * @returns {Promise<void>}
 */
export const updateLocalFave = async (img) => {
  await dbConnection.update({
    in: 'LocalFaves',
    set: formatLocalFaveData(img),
    where: { id: img.id, booruUrl: img.booruUrl },
  });
};

/**
 * @param {number} imageId
 * @param {string} booruUrl
 * @returns {Promise<boolean>}
 */
export const checkLocalFave = async (imageId, booruUrl) => {
  /** @type {any[]} */
  const results = await dbConnection.select({
    from: 'LocalFaves',
    where: { id: imageId, booruUrl: booruUrl },
  });
  return results.length > 0;
};

/**
 * @param {ImageObj|ImageResult} img
 * @returns {Promise<boolean>}
 */
export const toggleLocalFave = async (img) => {
  /** @type {boolean} */
  const isFaved = await checkLocalFave(img.id, img.booruUrl);

  if (isFaved) {
    await dbConnection.remove({
      from: 'LocalFaves',
      where: { id: img.id, booruUrl: img.booruUrl },
    });
    return false;
  }

  await dbConnection.insert({
    into: 'LocalFaves',
    values: [formatLocalFaveData(img)],
  });
  return true;
};

/**
 * Returns the total count of favorited images in the database for a specific query.
 * @param {string} [query='*'] Search query to count.
 * @param {string[]|null} [allowedBoorus=null] Optional booru whitelist.
 * @returns {Promise<number>} Total items count.
 */
export const countLocalFaves = async (query = '*', allowedBoorus = null) => {
  const whereClause =
    Array.isArray(allowedBoorus) && allowedBoorus.length > 0
      ? { booruUrl: { in: allowedBoorus } }
      : undefined;

  if (query === '*' || query.trim() === '') {
    return await dbConnection.count({
      where: whereClause,
      from: 'LocalFaves',
    });
  }

  // If there are specific tags, we have to fetch to filter accurately,
  // but we only process exactly what matches.
  const queryTags = query
    .toLowerCase()
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t !== '');

  /** @type {any[]} */
  const allFaves = await dbConnection.select({
    from: 'LocalFaves',
    where: whereClause,
  });

  const matched = allFaves.filter((img) => {
    const imgTags = img.tags.map((t) => t.toLowerCase());
    return queryTags.every((qt) => imgTags.includes(qt));
  });

  return matched.length;
};

/**
 * Searches the local database for favorited images, applying optimized pagination and tag filtering.
 * @param {Object} config
 * @param {string} [config.query='*']
 * @param {number} [config.limit=50]
 * @param {number} [config.page=1]
 * @param {string[]} [config.boorusToUse]
 * @param {string} [config.sd='desc']
 * @param {string} [config.sf='createdAt']
 * @returns {Promise<{images: ImageObj[], total: number}>}
 */
export const searchLocalFaves = async ({
  query = '*',
  limit = 50,
  page = 1,
  boorusToUse,
  sd = 'desc',
  sf = 'createdAt',
}) => {
  /** @type {number} */
  const skipCount = (page - 1) * limit;

  /** @type {string} */
  let sortField = 'createdAt';
  switch (sf) {
    case 'updated_at':
      sortField = 'updatedAt';
      break;
    case 'first_seen_at':
      sortField = 'firstSeenAt';
      break;
    case 'score':
    case 'wilson_score':
      sortField = 'wilsonScore';
      break;
    case 'upvotes':
      sortField = 'upvotes';
      break;
    case 'downvotes':
      sortField = 'downvotes';
      break;
    case 'faves':
      sortField = 'faves';
      break;
    case 'comments':
    case 'comment_count':
      sortField = 'commentCount';
      break;
    case 'size':
      sortField = 'size';
      break;
    case 'width':
      sortField = 'width';
      break;
    case 'height':
      sortField = 'height';
      break;
    default:
      sortField = 'createdAt';
      break;
  }

  /** @type {string} */
  const sortType = sd && sd.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const whereClause =
    Array.isArray(boorusToUse) && boorusToUse.length > 0
      ? { booruUrl: { in: boorusToUse } }
      : undefined;

  /** @type {number} */
  const total = await countLocalFaves(query, boorusToUse);

  /** @type {ImageObj[]} */
  let results = [];

  if (query === '*' || query.trim() === '') {
    /** @type {any[]} */
    const dbResults = await dbConnection.select({
      from: 'LocalFaves',
      where: whereClause,
      limit: limit,
      skip: skipCount,
      order: { by: sortField, type: sortType },
    });

    results = dbResults.map((item) => fixImageObj(item));
  } else {
    // Memory-safe batching loop when dealing with JS array intersection
    const queryTags = query
      .toLowerCase()
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '');

    const gatheredResults = [];
    let currentDbSkip = 0;
    const batchSize = Math.max(limit * 2, 100); // Fetch a safe buffer
    let itemsToSkip = skipCount;

    while (gatheredResults.length < limit) {
      /** @type {any[]} */
      const batch = await dbConnection.select({
        from: 'LocalFaves',
        where: whereClause,
        order: { by: sortField, type: sortType },
        limit: batchSize,
        skip: currentDbSkip,
      });

      if (batch.length === 0) break; // Reached the end of the DB

      currentDbSkip += batch.length;

      const filteredBatch = batch.filter((img) => {
        const imgTags = img.tags.map((t) => t.toLowerCase());
        return queryTags.every((qt) => imgTags.includes(qt));
      });

      for (const item of filteredBatch) {
        if (itemsToSkip > 0) {
          itemsToSkip--;
        } else if (gatheredResults.length < limit) {
          gatheredResults.push(fixImageObj(item));
        }
      }
    }

    results = gatheredResults;
  }

  return { images: results, total };
};

/**
 * @returns {Promise<void>}
 */
export const clearLocalFaves = async () => {
  await dbConnection.clear('LocalFaves');
};

/**
 * @returns {Promise<any[]>}
 */
export const exportLocalFaves = async () => {
  return await dbConnection.select({
    from: 'LocalFaves',
  });
};

/**
 * @param {any[]} favesList
 * @returns {Promise<number>}
 */
export const importLocalFaves = async (favesList) => {
  if (!Array.isArray(favesList) || favesList.length === 0) return 0;

  const result = await dbConnection.insert({
    into: 'LocalFaves',
    values: favesList,
    upsert: true,
  });

  return result;
};
