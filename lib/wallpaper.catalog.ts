export type WallpaperCategoryId =
    | 'pattern'
    | 'gradient'
    | 'desktop'
    | 'minimal';

export interface WallpaperItem {
    index: number;
    filename: string;
    fullUrl: string;
    previewUrl: string;
}

export interface WallpaperCategory {
    id: WallpaperCategoryId;
    label: string;
    icon: string;
    /** Si true, se muestra por defecto en el panel. Si false, se oculta tras "Mostrar más" */
    primary: boolean;
    items: WallpaperItem[];
}

interface CategoryConfig {
    id: WallpaperCategoryId;
    label: string;
    icon: string;
    primary: boolean;
    count: number;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { id: 'desktop', label: 'desktop', icon: 'heroicons:computer-desktop-solid', primary: true, count: 66 },
  { id: 'gradient', label: 'gradient', icon: 'solar:mirror-left-bold', primary: true, count: 90 },
  { id: 'pattern', label: 'pattern', icon: 'solar:palette-round-bold', primary: false, count: 49 },
  { id: 'minimal', label: 'minimal', icon: 'solar:sun-2-bold', primary: false, count: 65 },
];

let globalIndex = 0;
export const WALLPAPER_CATEGORIES: WallpaperCategory[] = CATEGORY_CONFIGS.map(config => {
    const items: WallpaperItem[] = [];
    
    for (let i = 1; i <= config.count; i++) {
        const slug = `${config.id}-${i.toString().padStart(2, '0')}`;
        items.push({
            index: globalIndex++,
            filename: slug,
            fullUrl: `/images/backgrounds/${config.id}/${slug}.jpg`,
            previewUrl: `/images/backgrounds/${config.id}/${slug}.avif`,
        });
    }
    
    return {
        id: config.id,
        label: config.label,
        icon: config.icon,
        primary: config.primary,
        items,
    };
});

export const WALLPAPER_MAP = new Map<number, WallpaperItem>(
    WALLPAPER_CATEGORIES.flatMap(cat => cat.items).map(item => [item.index, item])
);

export function getWallpaperByIndex(index: number): WallpaperItem | undefined {
    return WALLPAPER_MAP.get(index);
}
