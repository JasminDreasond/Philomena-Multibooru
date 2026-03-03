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
            name: img.name,
            tags: img.tags,
            sourceUrls: img.source_urls,
            faves: img.faves,
            size: img.size,
            uploaderId: img.uploader_id,
            description	: img.description,
            mimeType: img.mime_type	,
            downvotes: img.downvotes,
            upvotes: img.upvotes,
            origSize: img.orig_size,
            representations: img.representations,
            updatedAt: new Date(img.updated_at).valueOf(),
            createdAt: new Date(img.created_at).valueOf(),
            firstSeenAt: new Date(img.first_seen_at).valueOf(),
            sha512Hash: img.sha512_hash,
            thumbnailsGenerated: img.thumbnails_generated,
            height: img.height,
            width: img.width,
            sourceUrl: img.source_url
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