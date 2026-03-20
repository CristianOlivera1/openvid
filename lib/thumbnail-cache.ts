/**
 * IndexedDB cache for video thumbnails
 * Prevents regenerating thumbnails for the same video
 */

const DB_NAME = "openvid-thumbnails";
const DB_VERSION = 1;
const STORE_NAME = "thumbnails";

export interface CachedThumbnailSet {
    videoId: string;
    quality: string;
    interval: number;
    thumbnails: { time: number; dataUrl: string }[];
    createdAt: number;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Open IndexedDB connection
 */
async function openDB(): Promise<IDBDatabase> {
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: "cacheKey" });
                store.createIndex("videoId", "videoId", { unique: false });
                store.createIndex("createdAt", "createdAt", { unique: false });
            }
        };
    });
}

/**
 * Get cached thumbnails for a video by videoId
 */
export async function getCachedThumbnails(
    videoId: string,
    quality: string,
    interval: number
): Promise<CachedThumbnailSet | null> {
    try {
        const db = await openDB();
        const cacheKey = `${videoId}-${quality}-${interval}`;

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(cacheKey);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    // Check if cache is not too old (7 days)
                    const maxAge = 7 * 24 * 60 * 60 * 1000;
                    if (Date.now() - result.createdAt < maxAge) {
                        resolve(result);
                    } else {
                        // Cache expired, delete it
                        deleteCachedThumbnails(videoId, quality, interval);
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            };
        });
    } catch (error) {
        console.warn("Failed to get cached thumbnails:", error);
        return null;
    }
}

/**
 * Save thumbnails to cache
 */
export async function saveThumbnailsToCache(
    videoId: string,
    quality: string,
    interval: number,
    thumbnails: { time: number; dataUrl: string }[]
): Promise<void> {
    try {
        const db = await openDB();
        const cacheKey = `${videoId}-${quality}-${interval}`;

        const data: CachedThumbnailSet & { cacheKey: string } = {
            cacheKey,
            videoId,
            quality,
            interval,
            thumbnails,
            createdAt: Date.now(),
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(data);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.warn("Failed to save thumbnails to cache:", error);
    }
}

/**
 * Delete cached thumbnails
 */
export async function deleteCachedThumbnails(
    videoId: string,
    quality: string,
    interval: number
): Promise<void> {
    try {
        const db = await openDB();
        const cacheKey = `${videoId}-${quality}-${interval}`;

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(cacheKey);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.warn("Failed to delete cached thumbnails:", error);
    }
}

/**
 * Clear all cached thumbnails (for cleanup)
 */
export async function clearAllThumbnailCache(): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.warn("Failed to clear thumbnail cache:", error);
    }
}

/**
 * Get cache size info
 */
export async function getThumbnailCacheInfo(): Promise<{ count: number; estimatedSize: string }> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve({
                    count: request.result,
                    estimatedSize: "Unknown", // Would need to iterate to calculate
                });
            };
        });
    } catch {
        return { count: 0, estimatedSize: "0 B" };
    }
}
