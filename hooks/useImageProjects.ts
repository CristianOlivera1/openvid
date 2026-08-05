"use client";

import { useState, useCallback, useEffect } from "react";
import type { ImageProject, ImageProjectPreview } from "@/types/image-project.types";
import {
    saveImageProject,
    updateImageProject,
    getImageProject,
    getAllImageProjects,
    deleteImageProject,
    setCurrentProjectId,
    getCurrentProjectId,
} from "@/lib/image-projects-cache";
import type { BackgroundTab, BackgroundColorConfig, AspectRatio, CropArea } from "@/types";
import type { CanvasElement } from "@/types/canvas-elements.types";
import type { MockupConfig } from "@/types/mockup.types";
import type { Preview3DConfig, ImageMaskConfig } from "@/types/photo.types";
import { DEFAULT_MOCKUP_CONFIG } from "@/types/mockup.types";
import { DEFAULT_MASK_CONFIG, PREVIEW_CONFIGS } from "@/types/photo.types";

interface ImageProjectState {
    backgroundTab: BackgroundTab;
    selectedWallpaper: number;
    backgroundBlur: number;
    selectedImageUrl: string;
    backgroundColorConfig: BackgroundColorConfig | null;
    padding: number;
    roundedCorners: number;
    shadows: number;
    aspectRatio: AspectRatio;
    customDimensions: { width: number; height: number } | null;
    cropArea: CropArea | undefined;
    mockupId: string;
    mockupConfig: MockupConfig;
    canvasElements: CanvasElement[];
    imageTransform: {
        rotation: number;
        translateX: number;
        translateY: number;
    };
    imagePreview3D: Preview3DConfig;
    apply3DToBackground: boolean;
    imageMaskConfig: ImageMaskConfig;
    // ── Motion / 3D device mockup state (image mode) ──────────────────────
    imagePhoneActive: boolean;
    imagePhoneX: number;
    imagePhoneY: number;
    imagePhoneScale: number;
    imagePhoneRotX: number;
    imagePhoneRotY: number;
    imagePhoneRotZ: number;
    imagePhonePerspective: number;
    imagePhoneDevice: 'phone' | 'iphone' | 'iphone-13-pro-max' | 'iphone-17-pro-max' | 'double_iphone_13_pro' | 'laptop' | 'ipad_mini_6_2021';
    imagePhonePresetId: string;
    imagePhoneOpening: number;
    imagePhoneShadow: number;
    imagePhoneShadowColor: string;
    imagePhoneRefWidth: number;
    imageZoomScale: number;
}

const DEFAULT_PROJECT_STATE: ImageProjectState = {
    backgroundTab: "wallpaper",
    selectedWallpaper: 0,
    backgroundBlur: 0,
    selectedImageUrl: "",
    backgroundColorConfig: null,
    padding: 10,
    roundedCorners: 10,
    shadows: 10,
    aspectRatio: "auto",
    customDimensions: null,
    cropArea: undefined,
    mockupId: "none",
    mockupConfig: DEFAULT_MOCKUP_CONFIG,
    canvasElements: [],
    imageTransform: {
        rotation: 0,
        translateX: 0,
        translateY: 0,
    },
    imagePreview3D: PREVIEW_CONFIGS[0],
    apply3DToBackground: false,
    imageMaskConfig: DEFAULT_MASK_CONFIG,
    // ── Motion / 3D device mockup state defaults (match MotionContext) ───
    imagePhoneActive: false,
    imagePhoneX: 0,
    imagePhoneY: 0,
    imagePhoneScale: 1,
    imagePhoneRotX: 0,
    imagePhoneRotY: 0,
    imagePhoneRotZ: 0,
    imagePhonePerspective: 600,
    imagePhoneDevice: 'phone',
    imagePhonePresetId: 'front',
    imagePhoneOpening: 1,
    imagePhoneShadow: 0.6,
    imagePhoneShadowColor: "#000000",
    imagePhoneRefWidth: 0,
    imageZoomScale: 1,
};

export function useImageProjects() {
    const [projects, setProjects] = useState<ImageProjectPreview[]>([]);
    const [currentProject, setCurrentProject] = useState<ImageProject | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadProjects = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setIsLoading(true);
        }
        try {
            const allProjects = await getAllImageProjects();
            setProjects(allProjects);
        } catch (error) {
            console.error("Error loading projects:", error);
        } finally {
            if (showLoading) {
                setIsLoading(false);
            }
        }
    }, []);

    const loadProject = useCallback(async (id: string): Promise<ImageProject | null> => {
        setIsLoading(true);
        try {
            const project = await getImageProject(id);
            if (project) {
                setCurrentProject(project);
                setCurrentProjectId(id);
            }
            return project;
        } catch (error) {
            console.error("Error loading project:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        queueMicrotask(() => {
            if (!cancelled) {
                loadProjects();
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            const currentId = getCurrentProjectId();
            if (currentId && !currentProject) {
                loadProject(currentId);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const createProject = useCallback(async (
        imageBlob: Blob,
        imageName: string,
        imageWidth: number,
        imageHeight: number,
        state: Partial<ImageProjectState> = {}
    ): Promise<ImageProject | null> => {
        setIsSaving(true);
        try {
            const fullState = { ...DEFAULT_PROJECT_STATE, ...state };
            const project = await saveImageProject({
                imageBlob,
                imageName,
                imageWidth,
                imageHeight,
                ...fullState,
            });

            setCurrentProject(project);
            setCurrentProjectId(project.id);
            await loadProjects(false);
            return project;
        } catch (error) {
            console.error("Error creating project:", error);
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [loadProjects]);

    const saveCurrentProject = useCallback(async (
        updates: Partial<Omit<ImageProject, "id" | "createdAt">>
    ): Promise<ImageProject | null> => {
        if (!currentProject) {
            console.warn("No current project to save");
            return null;
        }

        setIsSaving(true);
        try {
            const existing = await getImageProject(currentProject.id);
            if (!existing) {
                console.warn(`Project ${currentProject.id} no longer exists, skipping save`);
                setCurrentProject(null);
                return null;
            }

            const updated = await updateImageProject(currentProject.id, updates);
            setCurrentProject(updated);
            await loadProjects(false);
            return updated;
        } catch (error) {
            console.error("Error saving project:", error);
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [currentProject, loadProjects]);

    const switchToProject = useCallback(async (id: string): Promise<ImageProject | null> => {

        const project = await loadProject(id);
        return project;
    }, [loadProject]);

    const removeProject = useCallback(async (id: string): Promise<void> => {
        try {
            await deleteImageProject(id);

            if (currentProject?.id === id) {
                setCurrentProject(null);
                setCurrentProjectId(null);
            }

            await loadProjects(false);
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    }, [currentProject, loadProjects]);

    const clearCurrentProject = useCallback(() => {
        setCurrentProject(null);
        setCurrentProjectId(null);
    }, []);

    return {
        projects,
        currentProject,
        isLoading,
        isSaving,

        loadProjects,
        loadProject,
        createProject,
        saveCurrentProject,
        switchToProject,
        removeProject,
        clearCurrentProject,
    };
}

export type UseImageProjectsReturn = ReturnType<typeof useImageProjects>;
