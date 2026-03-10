import { Connection } from 'jsstore';

// Initialize JsStore worker
const getWorkerPath = () => {
  // Standard path for JsStore worker in Vite/Webpack
  return new Worker(new URL('jsstore/dist/jsstore.worker.js', import.meta.url));
};

export const dbConnection = new Connection(getWorkerPath());

export const initDatabase = async () => {
  const tblImages = {
    name: 'Images',
    columns: {
      id: { primaryKey: true, dataType: 'number', notNull: true },
      booruUrl: { dataType: 'string', notNull: true },
      name: { dataType: 'string', notNull: true },
      viewUrl: { dataType: 'string', notNull: true },
      tagIds: { dataType: 'array', notNull: true },
      tags: { dataType: 'array', notNull: true },
      sourceUrls: { dataType: 'array', notNull: true },
      faves: { dataType: 'number', notNull: true },
      size: { dataType: 'number', notNull: true },
      uploaderId: { dataType: 'number', notNull: false },
      description: { dataType: 'string', notNull: true },
      mimeType: { dataType: 'string', notNull: true },
      downvotes: { dataType: 'number', notNull: true },
      upvotes: { dataType: 'number', notNull: true },
      commentCount: { dataType: 'number', notNull: true },
      origSize: { dataType: 'number', notNull: true },
      intensities: { dataType: 'object', notNull: true },
      representations: { dataType: 'object', notNull: true },
      hiddenFromUsers: { dataType: 'number', notNull: true },
      updatedAt: { dataType: 'number', notNull: true },
      createdAt: { dataType: 'number', notNull: true },
      firstSeenAt: { dataType: 'number', notNull: true },
      sha512Hash: { dataType: 'string', notNull: false },
      origSha512Hash: { dataType: 'string', notNull: false },
      thumbnailsGenerated: { dataType: 'number', notNull: true },
      animated: { dataType: 'number', notNull: true },
      aspectRatio: { dataType: 'number', notNull: true },
      duplicateOf: { dataType: 'number', notNull: false },
      deletionReason: { dataType: 'string', notNull: false },
      height: { dataType: 'number', notNull: true },
      width: { dataType: 'number', notNull: true },
      sourceUrl: { dataType: 'string', notNull: true },
      wilsonScore: { dataType: 'number', notNull: true },
    },
  };

  const tblAccounts = {
    name: 'Accounts',
    columns: {
      id: { primaryKey: true, autoIncrement: true, dataType: 'number', notNull: true },
      booruUrl: { dataType: 'string', notNull: true },
      apiKey: { dataType: 'string', notNull: true },
      isActive: { dataType: 'number', notNull: true },
    },
  };

  const tblQueries = {
    name: 'Queries',
    columns: {
      id: { primaryKey: true, dataType: 'string', notNull: true },
      booruUrl: { dataType: 'string', notNull: true },
      imageId: { dataType: 'number', notNull: true },
      query: { dataType: 'string', notNull: true },
      createdAt: { dataType: 'number', notNull: true },
    },
  };

  const tblSettings = {
    name: 'Settings',
    columns: {
      id: { primaryKey: true, dataType: 'number', notNull: true },
      maxItems: { dataType: 'number', notNull: true },
      persistentStorage: { dataType: 'number', notNull: true },
    },
  };

  const tblInteractions = {
    name: 'Interactions',
    columns: {
      id: { primaryKey: true, dataType: 'string', notNull: true },
      booruUrl: { dataType: 'string', notNull: true },
      imageId: { dataType: 'number', notNull: true },
      value: { dataType: 'string', notNull: false },
    },
  };

  const tblTotalImagesCounter = {
    name: 'TotalImagesCounter',
    columns: {
      id: { primaryKey: true, dataType: 'string', notNull: true },
      booruUrl: { dataType: 'string', notNull: true },
      query: { dataType: 'string', notNull: true },
      total: { dataType: 'number', notNull: true },
      updatedAt: { dataType: 'number', notNull: true },
    },
  };

  const database = {
    name: 'PhilomenaMultiBooru',
    version: 2,
    tables: [
      tblImages,
      tblAccounts,
      tblQueries,
      tblSettings,
      tblInteractions,
      tblTotalImagesCounter,
    ],
  };

  await dbConnection.initDb(database);
};
