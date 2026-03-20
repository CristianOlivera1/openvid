/**
 * IndexedDB cache for uploaded videos
 * Stores a single uploaded video at a time (replaces previous uploads)
 */

const DB_NAME = "openvid-uploaded-videos";
const DB_VERSION = 1;
const STORE_NAME = "videos";
const SINGLE_VIDEO_KEY = "current-uploaded-video";

export interface CachedUploadedVideo {
    key: string;
    blob: Blob;
    fileName: string;
    fileSize: number;
    duration: number;
    width: number;
    height: number;
    aspectRatio: string;
    uploadedAt: number;
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
                const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
                store.createIndex("uploadedAt", "uploadedAt", { unique: false });
            }
        };
    });
}

/**
 * Calculate aspect ratio from dimensions
 * Always returns "auto" to use the actual video dimensions
 */
function calculateAspectRatio(_width: number, _height: number): string {
    // Always return "auto" so videos use their actual dimensions
    return "auto";
}

/**
 * Get video metadata from file
 */
async function getVideoMetadata(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    aspectRatio: string;
}> {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        
        video.onloadedmetadata = () => {
            const metadata = {
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                aspectRatio: calculateAspectRatio(video.videoWidth, video.videoHeight),
            };
            
            // Cleanup
            URL.revokeObjectURL(video.src);
            resolve(metadata);
        };
        
        video.onerror = () => {
            URL.revokeObjectURL(video.src);
            reject(new Error("Failed to load video metadata"));
        };
        
        video.src = URL.createObjectURL(file);
    });
}

/**
 * Save uploaded video (replaces any existing video)
 */
export async function saveUploadedVideo(file: File): Promise<CachedUploadedVideo> {
    try {
        const db = await openDB();
        
        // Get video metadata
        const metadata = await getVideoMetadata(file);
        
        const data: CachedUploadedVideo = {
            key: SINGLE_VIDEO_KEY,
            blob: file,
            fileName: file.name,
            fileSize: file.size,
            duration: metadata.duration,
            width: metadata.width,
            height: metadata.height,
            aspectRatio: metadata.aspectRatio,
            uploadedAt: Date.now(),
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            
            // Put will replace any existing video with the same key
            const request = store.put(data);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(data);
        });
    } catch (error) {
        console.error("Failed to save uploaded video:", error);
        throw error;
    }
}

/**
 * Get the current uploaded video
 */
export async function getUploadedVideo(): Promise<CachedUploadedVideo | null> {
    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(SINGLE_VIDEO_KEY);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result || null);
            };
        });
    } catch (error) {
        console.warn("Failed to get uploaded video:", error);
        return null;
    }
}

/**
 * Delete the uploaded video
 */
export async function deleteUploadedVideo(): Promise<void> {
    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(SINGLE_VIDEO_KEY);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.warn("Failed to delete uploaded video:", error);
    }
}

/**
 * Check if an uploaded video exists
 */
export async function hasUploadedVideo(): Promise<boolean> {
    const video = await getUploadedVideo();
    return video !== null;
}

/**
 * Get uploaded video info without loading the blob
 */
export async function getUploadedVideoInfo(): Promise<{
    fileName: string;
    fileSize: number;
    duration: number;
    aspectRatio: string;
    uploadedAt: number;
} | null> {
    const video = await getUploadedVideo();
    if (!video) return null;
    
    return {
        fileName: video.fileName,
        fileSize: video.fileSize,
        duration: video.duration,
        aspectRatio: video.aspectRatio,
        uploadedAt: video.uploadedAt,
    };
}
