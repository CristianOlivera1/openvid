import type { ImageProject, ImageProjectPreview } from "@/types/image-project.types";

const DB_NAME = "openvid-image-projects";
const DB_VERSION = 1;
const STORE_NAME = "projects";
const CURRENT_PROJECT_KEY = "current-active-project";

let dbInstance: IDBDatabase | null = null;

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
                const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
                store.createIndex("createdAt", "createdAt", { unique: false });
            }
        };
    });
}

async function generateThumbnail(blob: Blob, maxSize = 200): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error("Failed to get canvas context"));
                return;
            }

            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image"));
        };

        img.src = url;
    });
}

async function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export async function saveImageProject(project: Omit<ImageProject, "id" | "imageDataUrl" | "thumbnailDataUrl" | "createdAt" | "updatedAt">): Promise<ImageProject> {
    try {
        const db = await openDB();
        const [thumbnail, imageDataUrl] = await Promise.all([
            generateThumbnail(project.imageBlob),
            blobToDataURL(project.imageBlob)
        ]);

        const fullProject: ImageProject = {
            ...project,
            id: crypto.randomUUID(),
            imageDataUrl,
            sourceImageDataUrl: project.sourceImageDataUrl ?? imageDataUrl,
            thumbnailDataUrl: thumbnail,
            createdAt: Date.now()
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(fullProject);

            request.onsuccess = () => resolve(fullProject);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error saving image project:", error);
        throw error;
    }
}

export async function updateImageProject(id: string, updates: Partial<Omit<ImageProject, "id" | "createdAt">>): Promise<ImageProject> {
    try {
        const db = await openDB();
        const existing = await getImageProject(id);

        if (!existing) {
            throw new Error(`Project with id ${id} not found`);
        }

        let thumbnail = existing.thumbnailDataUrl;
        let imageDataUrl = existing.imageDataUrl;

        if (updates.imageBlob) {
            [thumbnail, imageDataUrl] = await Promise.all([
                generateThumbnail(updates.imageBlob),
                blobToDataURL(updates.imageBlob)
            ]);
        }

        const updated: ImageProject = {
            ...existing,
            ...updates,
            sourceImageDataUrl: updates.sourceImageDataUrl ?? existing.sourceImageDataUrl,
            imageDataUrl,
            thumbnailDataUrl: thumbnail
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(updated);

            request.onsuccess = () => resolve(updated);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error updating image project:", error);
        throw error;
    }
}

export async function getImageProject(id: string): Promise<ImageProject | null> {
    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting image project:", error);
        return null;
    }
}

export async function getAllImageProjects(): Promise<ImageProjectPreview[]> {
    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index("createdAt");
            const request = index.openCursor(null, "prev");

            const projects: ImageProjectPreview[] = [];

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    const project = cursor.value as ImageProject;
                    projects.push({
                        id: project.id,
                        imageName: project.imageName,
                        thumbnailDataUrl: project.thumbnailDataUrl,
                        createdAt: project.createdAt
                    });
                    cursor.continue();
                } else {
                    resolve(projects);
                }
            };

            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting all image projects:", error);
        return [];
    }
}

export async function deleteImageProject(id: string): Promise<void> {
    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error deleting image project:", error);
        throw error;
    }
}

export function setCurrentProjectId(id: string | null): void {
    if (id) {
        localStorage.setItem(CURRENT_PROJECT_KEY, id);
    } else {
        localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
}

export function getCurrentProjectId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CURRENT_PROJECT_KEY);
}

export function createProjectImageUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
}

export async function getProjectCount(): Promise<number> {
    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error getting project count:", error);
        return 0;
    }
}
