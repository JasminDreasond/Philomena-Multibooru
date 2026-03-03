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
            tags: { dataType: 'array' },
            representations: { dataType: 'object' },
            sourceUrl: { dataType: 'string' }
        }
    };

    const database = {
        name: 'PhilomenaMultiBooru',
        tables: [tblImages]
    };

    await dbConnection.initDb(database);
};