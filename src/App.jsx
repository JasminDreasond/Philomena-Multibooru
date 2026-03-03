import { useEffect, useState } from 'react';
import { initDatabase, dbConnection } from './db/connection';
import { syncGalleryPage } from './services/api';

const App = () => {
    const [images, setImages] = useState([]);
    const [accounts, setAccounts] = useState([
        // Example configuration. In a real app, this comes from user settings.
        { url: 'https://derpibooru.org', key: 'USER_API_KEY_HERE' } 
    ]);

    useEffect(() => {
        const setupAndSync = async () => {
            await initDatabase();
            
            // Trigger background sync for the first page of each connected account
            accounts.forEach(account => {
                if (account.key !== 'USER_API_KEY_HERE') {
                    syncGalleryPage(account.url, account.key, '*', 1);
                }
            });

            loadImagesFromDb();
        };

        setupAndSync();
    }, [accounts]);

    const loadImagesFromDb = async () => {
        const dbImages = await dbConnection.select({ from: 'Images' });
        setImages(dbImages);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Philomena Multi-Booru Client</h1>
            <button onClick={loadImagesFromDb}>Refresh View from DB</button>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '20px' }}>
                {images.map(img => (
                    <a 
                        key={`${img.booruUrl}-${img.id}`} 
                        href={img.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                    >
                        <img 
                            src={img.representations.thumb} 
                            alt={img.tags.join(', ')} 
                            style={{ borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                    </a>
                ))}
            </div>
        </div>
    );
};

export default App;