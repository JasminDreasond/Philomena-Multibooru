import { dbConnection } from '../db/connection';

// Reusable fetch function for Philomena endpoints
const fetchPhilomena = async (booruUrl, endpoint, apiKey, params = {}) => {
    const queryParams = new URLSearchParams({ ...params, key: apiKey }).toString();
    const url = `${booruUrl}/api/v1/json/${endpoint}?${queryParams}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error fetching from ${booruUrl}: ${response.statusText}`);
    
    return response.json();
};

// Background task to sync pages into JsStore
export const syncGalleryPage = async (booruUrl, apiKey, query = '*', page = 1) => {
    try {
        const data = await fetchPhilomena(booruUrl, 'search/images', apiKey, { q: query, page });
        
        if (data && data.images) {
            const formattedImages = data.images.map(img => ({
                id: img.id,
                booruUrl: booruUrl,
                tags: img.tags,
                representations: img.representations,
                sourceUrl: `${booruUrl}/images/${img.id}`
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

// SQL-like query to find images by tag across all connected boorus
export const searchImagesByTag = async (tagName) => {
    return await dbConnection.select({
        from: 'Images',
        where: {
            tags: { in: [tagName] }
        }
    });
};