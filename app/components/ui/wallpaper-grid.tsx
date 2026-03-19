"use client";

interface WallpaperGridProps {
    selectedIndex?: number;
    onSelect?: (index: number) => void;
    count?: number;
}

export const WALLPAPERS = [
    "https://avatars.githubusercontent.com/u/171596250?v=4",
    "https://avatars.githubusercontent.com/u/171596250?v=4",      
    "https://avatars.githubusercontent.com/u/171596250?v=4",
    "https://avatars.githubusercontent.com/u/171596250?v=4",
    "https://avatars.githubusercontent.com/u/171596250?v=4",
    "https://avatars.githubusercontent.com/u/171596250?v=4",
    "https://avatars.githubusercontent.com/u/171596250?v=4",
];

export function WallpaperGrid({ selectedIndex = -1, onSelect }: WallpaperGridProps) {
    return (
        <div className="grid grid-cols-6 gap-2">
            {WALLPAPERS.map((imgSrc, i) => (
                <div
                    key={i}
                    onClick={() => onSelect?.(i)}
                    className={`aspect-square rounded-full cursor-pointer hover:ring-2 ring-white/30 transition bg-cover bg-center ${
                        selectedIndex === i ? "ring-2 ring-white shadow-md shadow-black/50" : ""
                    }`}
                    style={{
                        backgroundImage: `url('${imgSrc}')`
                    }}
                />
            ))}

            <div
                onClick={() => onSelect?.(-1)}
                className={`aspect-square rounded-full cursor-pointer hover:ring-2 ring-white/30 transition flex items-center justify-center border border-white/20 relative overflow-hidden bg-white ${
                    selectedIndex === -1 ? "ring-2 ring-white shadow-lg shadow-black/40" : ""
                }`}
                style={{
                    backgroundImage: 'linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%)',
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                }}
            >
                <div className="absolute w-[140%] h-0.5 bg-red-500/80 rotate-45 z-10" />
                <div className="absolute inset-0 bg-black/5" />
            </div>
        </div>
    );
}