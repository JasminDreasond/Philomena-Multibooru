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
      id: { primaryKey: true, dataType: 'number' },
      booruUrl: { dataType: 'string' },
      name: { dataType: 'string' },
      tags: { dataType: 'array' },
      sourceUrls: { dataType: 'array' },
      faves: { dataType: 'number' },
      size: { dataType: 'number' },
      uploaderId: { dataType: 'number' },
      description: { dataType: 'string' },
      mimeType: { dataType: 'string' },
      downvotes: { dataType: 'number' },
      upvotes: { dataType: 'number' },
      origSize: { dataType: 'number' },
      representations: { dataType: 'object' },
      updatedAt: { dataType: 'number' },
      createdAt: { dataType: 'number' },
      firstSeenAt: { dataType: 'number' },
      sha512Hash: { dataType: 'string' },
      thumbnailsGenerated: { dataType: 'boolean' },
      height: { dataType: 'number' },
      width: { dataType: 'number' },
      sourceUrl: { dataType: 'string' },
    },
  };

  const tblProfiles = {
    name: 'Profiles',
    columns: {
      id: { primaryKey: true, dataType: 'number' },
      booruUrl: { dataType: 'string' },
      name: { dataType: 'string' },
      slug: { dataType: 'string' },
      role: { dataType: 'string' },
      avatarUrl: { dataType: 'string' },
      description: { dataType: 'string' },
      createdAt: { dataType: 'number' },
    },
  };

  const tblForums = {
    name: 'Forums',
    columns: {
      id: { primaryKey: true, dataType: 'number' },
      booruUrl: { dataType: 'string' },
      name: { dataType: 'string' },
      shortName: { dataType: 'string' },
      description: { dataType: 'string' },
      topicCount: { dataType: 'number' },
      postCount: { dataType: 'number' },
    },
  };

  const tblAccounts = {
    name: 'Accounts',
    columns: {
      id: { primaryKey: true, autoIncrement: true, dataType: 'number' },
      booruUrl: { dataType: 'string' },
      apiKey: { dataType: 'string' },
      isActive: { dataType: 'boolean' },
    },
  };

  const database = {
    name: 'PhilomenaMultiBooru',
    tables: [tblImages, tblProfiles, tblForums, tblAccounts],
  };

  await dbConnection.initDb(database);
};
