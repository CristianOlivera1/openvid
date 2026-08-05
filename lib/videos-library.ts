import { ExtendedVideoForDetection, LibraryVideo, LibraryVideoInfo } from "@/types";

const DB_NAME = "openvid-videos-library";
const DB_VERSION = 3;
const STORE_NAME = "uploaded-videos";

let dbInstance: IDBDatabase | null = null;

async function cleanupOldLibraryEntries(db: IDBDatabase): Promise<void> {
    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - SIXTY_DAYS_MS;
    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index("uploadedAt");
            const range = IDBKeyRange.upperBound(cutoff);
            const request = index.openCursor(range);
            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
                if (cursor) { cursor.delete(); cursor.continue(); }
            };
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
        } catch { resolve(); }
    });
}

function generateVideoId(): string {
    return `uploaded_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function openDB(): Promise<IDBDatabase> {
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            dbInstance = request.result;
            cleanupOldLibraryEntries(dbInstance).catch(() => { });
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
                store.createIndex("uploadedAt", "uploadedAt", { unique: false });
            }
        };
    });
}

export async function findExistingVideo(fileName: string, fileSize: number): Promise<LibraryVideo | null> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();

        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const video = cursor.value as LibraryVideo;
                if (video.fileName === fileName && video.fileSize === fileSize) {
                    resolve(video);
                    return;
                }
                cursor.continue();
            } else {
                resolve(null);
            }
        };
    });
}

async function getVideoMetadata(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    aspectRatio: string;
}> {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        const url = URL.createObjectURL(file);

        const cleanup = () => {
            video.removeAttribute("src");
            video.load();
            URL.revokeObjectURL(url);
        };

        video.onloadedmetadata = () => {
            const metadata = {
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                aspectRatio: "auto",
            };
            cleanup();
            resolve(metadata);
        };

        video.onerror = () => {
            cleanup();
            reject(new Error("Failed to load video metadata"));
        };

        video.src = url;
    });
}

async function generateThumbnail(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        const url = URL.createObjectURL(blob);

        const cleanup = () => {
            video.removeAttribute("src");
            video.load();
            URL.revokeObjectURL(url);
        };

        video.onloadeddata = () => {
            const seekTime = video.duration * 0.1;
            video.currentTime = !isFinite(seekTime) || seekTime < 0 ? 0 : seekTime;
        };

        video.onseeked = () => {
            const canvas = document.createElement("canvas");
            const aspectRatio = video.videoWidth / video.videoHeight;
            canvas.width = 320;
            canvas.height = Math.round(320 / aspectRatio);

            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.9);
                cleanup();
                resolve(thumbnailUrl);
            } else {
                cleanup();
                reject(new Error("Failed to get canvas context"));
            }
        };

        video.onerror = () => {
            cleanup();
            reject(new Error("Failed to load video for thumbnail"));
        };

        video.src = url;
    });
}

export async function addVideoToLibrary(file: File): Promise<LibraryVideo> {
    const db = await openDB();
    const metadata = await getVideoMetadata(file);

    let thumbnailUrl: string | undefined;
    try {
        thumbnailUrl = await generateThumbnail(file);
    } catch (e) {
        console.warn("Failed to generate thumbnail:", e);
    }

    let hasAudio = false;
    try {
        hasAudio = await detectVideoHasAudio(file);
    } catch (e) {
        console.warn("Failed to detect audio:", e);
    }

    const video: LibraryVideo = {
        id: generateVideoId(),
        blob: file,
        fileName: file.name,
        fileSize: file.size,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        aspectRatio: metadata.aspectRatio,
        uploadedAt: Date.now(),
        thumbnailUrl,
        hasAudio,
        originalHasAudio: hasAudio,
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(video);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(video);
    });
}

export interface AddVideoWithMetadataOptions {
    blob: Blob;
    fileName: string;
    duration: number;
    width: number;
    height: number;
    hasAudio?: boolean;
}

export async function addVideoToLibraryWithMetadata(
    options: AddVideoWithMetadataOptions
): Promise<LibraryVideo> {
    const db = await openDB();

    let thumbnailUrl: string | undefined;
    try {
        thumbnailUrl = await generateThumbnail(options.blob);
    } catch (e) {
        console.warn("Failed to generate thumbnail:", e);
    }

    let hasAudio = options.hasAudio;
    if (hasAudio === undefined) {
        try {
            hasAudio = await detectVideoHasAudio(options.blob);
        } catch (e) {
            console.warn("Failed to detect audio:", e);
            hasAudio = false;
        }
    }

    const video: LibraryVideo = {
        id: generateVideoId(),
        blob: options.blob,
        fileName: options.fileName,
        fileSize: options.blob.size,
        duration: options.duration,
        width: options.width,
        height: options.height,
        aspectRatio: "auto",
        uploadedAt: Date.now(),
        thumbnailUrl,
        hasAudio,
        originalHasAudio: hasAudio,
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(video);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(video);
    });
}

export async function getAllLibraryVideos(): Promise<LibraryVideo[]> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("uploadedAt");
        const request = index.openCursor(null, "prev");

        const videos: LibraryVideo[] = [];

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                videos.push(cursor.value);
                cursor.continue();
            } else {
                resolve(videos);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

export async function getLibraryVideoInfoList(): Promise<LibraryVideoInfo[]> {
    const videos = await getAllLibraryVideos();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return videos.map(({ blob: _blob, ...info }) => info);
}

export async function getLibraryVideo(id: string): Promise<LibraryVideo | null> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

export async function detectVideoHasAudio(blob: Blob): Promise<boolean> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(blob);
        const video = document.createElement("video") as ExtendedVideoForDetection;
        video.muted = true;
        video.preload = "metadata";

        let settled = false;
        const cleanup = (result: boolean) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            video.removeAttribute("src");
            video.load();
            URL.revokeObjectURL(url);
            resolve(result);
        };
        
        const timeoutId = setTimeout(() => cleanup(false), 8000);

        video.addEventListener("loadedmetadata", async () => {
            if (video.mozHasAudio !== undefined) {
                return cleanup(Boolean(video.mozHasAudio));
            }

            const MAX_DEEP_SCAN_SIZE = 50 * 1024 * 1024;

            if (blob.size <= MAX_DEEP_SCAN_SIZE) {
                try {
                    const arrayBuffer = await blob.arrayBuffer();
                    const AudioContextClass = window.OfflineAudioContext ||
                        (window as Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
                    if (AudioContextClass) {
                        const audioCtx = new AudioContextClass(1, 1, 44100);
                        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                        if (audioBuffer.numberOfChannels === 0) return cleanup(false);
                        const channelData = audioBuffer.getChannelData(0);
                        for (let i = 0; i < channelData.length; i += 100) {
                            if (Math.abs(channelData[i]) > 0.001) return cleanup(true);
                        }
                        return cleanup(false);
                    }
                } catch {
                }
            }

            if (video.audioTracks !== undefined) {
                if (video.audioTracks.length > 0) return cleanup(true);
            } else {
                const captureMethod = video.captureStream ?? video.mozCaptureStream;
                if (captureMethod) {
                    try {
                        const stream = captureMethod.call(video);
                        if (stream.getAudioTracks().length > 0) return cleanup(true);
                    } catch { }
                }
            }

            return cleanup(blob.size > MAX_DEEP_SCAN_SIZE);
        });

        video.addEventListener("error", () => cleanup(false));
        video.src = url;
    });
}

export async function deleteLibraryVideo(id: string): Promise<void> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function updateVideoAudioState(id: string, hasAudio: boolean): Promise<void> {
    const db = await openDB();
    const video = await getLibraryVideo(id);

    if (!video) {
        throw new Error(`Video with id ${id} not found`);
    }

    const updatedVideo: LibraryVideo = {
        ...video,
        hasAudio,
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(updatedVideo);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function clearLibrary(): Promise<void> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function getLibraryVideoCount(): Promise<number> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.count();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatVideoDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}
