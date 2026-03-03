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
            description	: { dataType: 'string' },
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
            sourceUrl: { dataType: 'string' }
        }
    };

    const database = {
        name: 'PhilomenaMultiBooru',
        tables: [tblImages]
    };

    await dbConnection.initDb(database);
};