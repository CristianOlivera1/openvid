interface SkeletonProps {
    className?: string;
    variant?: "default" | "square" | "circle";
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
}

export function Skeleton({
    className = "",
    variant = "default",
    width,
    height,
    style
}: SkeletonProps) {
    const variantClasses = {
        default: "rounded-lg",
        square: "squircle-element",
        circle: "rounded-full",
    };

    const sizeStyle: React.CSSProperties = {};
    if (width) sizeStyle.width = typeof width === "number" ? `${width}px` : width;
    if (height) sizeStyle.height = typeof height === "number" ? `${height}px` : height;

    return (
        <div
            className={`bg-white/3 border border-white/5 animate-pulse ${variantClasses[variant]} ${className}`}
            style={{ ...sizeStyle, ...(style ?? {}) }}
        />
    );
}

interface SkeletonGridProps {
    columns?: number;
    rows?: number;
    gap?: number;
    itemHeight?: string | number;
    className?: string;
    variant?: "default" | "square" | "circle";
}

export function SkeletonGrid({
    columns = 3,
    rows = 3,
    gap = 2,
    itemHeight = 120,
    className = "",
    variant = "square"
}: SkeletonGridProps) {
    const items = Array.from({ length: rows * columns });

    return (
        <div
            className={`grid ${className}`}
            style={{
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${gap * 0.25}rem`
            }}
        >
            {items.map((_, i) => (
                <Skeleton
                    key={i}
                    variant={variant}
                    height={itemHeight}
                />
            ))}
        </div>
    );
}

export function WallpaperSkeleton() {
    return (
        <div className="flex flex-col gap-5">
            <div className="space-y-2">
                <Skeleton height={10} width={60} />
                <SkeletonGrid columns={6} rows={1} gap={2} itemHeight={40} variant="square" />
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <Skeleton height={10} width={10} />
                    <Skeleton height={10} width={80} />
                </div>
                <SkeletonGrid columns={6} rows={2} gap={2} itemHeight={40} variant="square" />
            </div>

            <Skeleton height={12} width={90} className="mx-auto" />
        </div>
    );
}

interface SkeletonMasonryProps {
    columns?: number;
    gap?: number;
    heights?: number[];
    className?: string;
}

export function SkeletonMasonry({
    columns = 3,
    gap = 2,
    heights = [120, 160, 140, 180, 130, 150, 170, 110, 190],
    className = ""
}: SkeletonMasonryProps) {
    function toColumns<T>(items: T[], n: number): T[][] {
        const cols: T[][] = Array.from({ length: n }, () => []);
        items.forEach((item, i) => cols[i % n].push(item));
        return cols;
    }

    return (
        <div className={`flex ${className}`} style={{ gap: `${gap * 0.25}rem` }}>
            {toColumns(heights, columns).map((col, ci) => (
                <div key={ci} className="flex flex-col flex-1" style={{ gap: `${gap * 0.25}rem` }}>
                    {col.map((h, i) => (
                        <Skeleton key={i} height={h} />
                    ))}
                </div>
            ))}
        </div>
    );
}

interface SkeletonTextProps {
    lines?: number;
    className?: string;
}

export function SkeletonText({ lines = 3, className = "" }: SkeletonTextProps) {
    const lineWidths = [100, 85, 92]; // Percentages for more natural look

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height={12}
                    width={`${lineWidths[i % lineWidths.length]}%`}
                />
            ))}
        </div>
    );
}

export function ElementsMenuSkeleton() {
    return (
        <div className="p-4 flex flex-col gap-5">
            <Skeleton height={20} width={100} />

            <Skeleton height={36} variant="square" />

            <div className="space-y-2">
                <Skeleton height={10} width={70} />
                <SkeletonGrid columns={6} rows={1} itemHeight={36} variant="square" />
            </div>

            <div className="space-y-2">
                <Skeleton height={10} width={55} />
                <SkeletonGrid columns={6} rows={1} itemHeight={36} variant="square" />
            </div>

            <div className="space-y-2">
                <Skeleton height={10} width={80} />
                <SkeletonGrid columns={6} rows={1} itemHeight={36} variant="square" />
            </div>
        </div>
    );
}

export function ZoomGlobalConfigSkeleton() {
    return (
        <div className="p-4 flex flex-col gap-6">
            <Skeleton height={20} width={80} />

            <div className="space-y-2">
                <Skeleton height={10} width={100} />
                <div className="space-y-1.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/3 border border-white/5">
                            <Skeleton variant="square" width={32} height={32} />
                            <div className="flex flex-col gap-1.5 flex-1">
                                <Skeleton height={10} width="50%" />
                                <Skeleton height={8} width="70%" />
                            </div>
                            <Skeleton height={8} width={24} />
                        </div>
                    ))}
                </div>
            </div>

            <Skeleton height={36} variant="square" />

            <div className="space-y-2 pt-2 border-t border-white/10">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Skeleton height={20} width={80} />
                        <Skeleton height={10} width="60%" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ZoomFragmentEditorSkeleton() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 p-3 border-b border-white/6">
                <Skeleton width={28} height={28} variant="square" />
                <Skeleton height={14} width={140} />
                <Skeleton height={12} width={60} className="ml-auto" />
            </div>

            <div className="px-4 py-4 space-y-5">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Skeleton width={16} height={16} variant="circle" />
                        <Skeleton height={10} width={100} />
                    </div>
                    <Skeleton variant="square" className="w-full" style={{ aspectRatio: "16/9" } as React.CSSProperties} />
                </div>

                <Skeleton height={36} variant="square" />
                <Skeleton height={36} variant="square" />

                <div className="h-px bg-white/10" />

                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <Skeleton height={10} width="40%" />
                            <Skeleton height={20} width={80} variant="square" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function MockupMenuSkeleton() {
    return (
        <div className="p-4 flex flex-col gap-6">
            <Skeleton height={20} width={80} />

            <div className="space-y-2">
                <Skeleton height={10} width={110} />
                <Skeleton height={140} variant="square" />
            </div>

            <div className="space-y-2.5">
                <Skeleton height={10} width={70} />
                <SkeletonGrid columns={3} rows={2} itemHeight={80} variant="square" />
            </div>
        </div>
    );
}

export function MockupGridSkeleton() {
    const skeletons = Array.from({ length: 9 });

    return (
        <div className="grid grid-cols-3 gap-3 p-3 w-full">
            {skeletons.map((_, i) => (
                <div
                    key={i}
                    className="aspect-video w-full rounded-lg bg-white/3 border border-white/5 animate-pulse"
                />
            ))}
        </div>
    );
}

export function BackgroundColorSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton height={36} variant="square" />

            <div className="space-y-3">
                <Skeleton height={10} width={80} />
                <SkeletonGrid columns={6} rows={4} gap={2} itemHeight={36} variant="square" />
            </div>

            <div className="space-y-3">
                <Skeleton height={10} width={90} />
                <div className="space-y-2 p-3 rounded-xl border border-white/5 bg-white/3">
                    <div className="flex gap-2">
                        <Skeleton height={34} className="flex-1" variant="square" />
                        <Skeleton height={34} className="flex-1" variant="square" />
                        <Skeleton height={34} className="flex-1" variant="square" />
                    </div>
                    <Skeleton height={20} variant="square" />
                    <div className="space-y-1.5 pt-1">
                        {[1, 2].map(i => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/3">
                                <Skeleton width={14} height={14} variant="circle" />
                                <Skeleton width={28} height={28} variant="square" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton height={8} width="40%" />
                                    <Skeleton height={6} />
                                </div>
                                <Skeleton width={24} height={8} />
                            </div>
                        ))}
                    </div>
                    <Skeleton height={80} variant="square" />
                </div>
            </div>
        </div>
    );
}

export function ImageBackgroundSkeleton() {
    return (
        <div className="space-y-6">
            <div className="border-2 border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center gap-2">
                <Skeleton width={32} height={32} variant="circle" />
                <Skeleton height={10} width="70%" />
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Skeleton width={14} height={14} variant="circle" />
                    <Skeleton height={10} width={70} />
                </div>
                <SkeletonGrid columns={4} rows={2} gap={2} itemHeight={72} variant="square" />
            </div>
        </div>
    );
}

export function TimelineSkeleton() {
    return (
        <div className="h-38 shrink-0 bg-[#0D0D11] border-t border-white/10 flex flex-col font-mono text-[10px]">
            <div className="flex flex-1 overflow-hidden">
                <div className="w-18 shrink-0 flex flex-col border-r border-white/5">
                    <div className="h-7 border-b border-white/10 bg-zinc-900/40" />
                    <div className="flex-1 flex items-center px-2 border-b border-white/5">
                        <div className="h-2 w-10 rounded bg-white/5 animate-pulse" />
                    </div>
                    <div className="flex-1 flex items-center px-2">
                        <div className="h-2 w-8 rounded bg-white/5 animate-pulse" />
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="h-7 border-b border-white/10 bg-zinc-900/40 relative shrink-0 flex items-end pb-1 gap-0 overflow-hidden">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute bottom-0 flex flex-col items-start"
                                style={{ left: `${(i / 6) * 100}%` }}
                            >
                                <div className="w-px h-3 bg-zinc-700/60" />
                                <div className="h-1.5 w-6 rounded bg-zinc-700/40 animate-pulse mt-1" />
                            </div>
                        ))}
                        <div className="absolute top-0 bottom-0 left-[30%] flex flex-col items-center z-10">
                            <div className="w-2.5 h-2.5 bg-blue-500/60 rotate-45 rounded-[2px] mt-2 animate-pulse" />
                            <div className="w-px flex-1 bg-blue-500/40" />
                        </div>
                    </div>

                    <div className="flex-1 flex items-center py-1.5 px-2 border-b border-white/5">
                        <div className="h-full w-full rounded-md bg-[#0a1510] border border-white/5 relative overflow-hidden">
                            <div
                                className="absolute top-0 bottom-0 rounded-md border border-[#34A853]/30 bg-[#182e20]/80 animate-pulse"
                                style={{ left: "0%", width: "100%" }}
                            >
                                <div
                                    className="absolute inset-0 opacity-10"
                                    style={{
                                        backgroundImage: "linear-gradient(to right, #34A853 1px, transparent 1px)",
                                        backgroundSize: "48px 100%",
                                    }}
                                />
                                <div className="flex items-center h-full ml-3 gap-2">
                                    <div className="h-2 w-16 rounded bg-emerald-500/20 animate-pulse" />
                                    <div className="h-2 w-10 rounded bg-emerald-500/10 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex items-center px-2">
                        <div className="h-full w-full relative flex items-center gap-2">
                            <div
                                className="absolute top-[10%] h-[80%] rounded border border-dashed border-blue-400/20 bg-blue-500/5 animate-pulse"
                                style={{ left: "20%", width: "18%" }}
                            />
                            <div
                                className="absolute top-[10%] h-[80%] rounded border border-dashed border-blue-400/20 bg-blue-500/5 animate-pulse"
                                style={{ left: "55%", width: "14%" }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function AudioMenuSkeleton() {
    return (
        <div className="p-4 flex flex-col gap-5">

            <div className="flex items-center gap-2">
                <Skeleton width={20} height={20} variant="circle" />
                <Skeleton height={14} width={50} />
            </div>

            <div className="bg-[#09090B] border border-white/5 squircle-element p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Skeleton width={18} height={18} variant="circle" />
                        <Skeleton height={12} width={90} />
                    </div>
                    <Skeleton height={20} width={56} variant="square" />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Skeleton width={16} height={16} variant="circle" />
                <Skeleton height={10} width={100} />
                <Skeleton height={6} className="flex-1" variant="default" />
                <Skeleton height={10} width={24} />
            </div>

            <div className="flex flex-col items-center gap-2">
                <Skeleton height={32} variant="square" className="w-full" />
                <Skeleton height={10} width={160} />
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Skeleton width={14} height={14} variant="circle" />
                    <Skeleton height={10} width={140} />
                </div>
                {Array.from({ length: 2 }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-[#09090B] border border-white/5 squircle-element p-3 flex flex-col gap-2"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                <Skeleton height={12} width="65%" />
                                <Skeleton height={9} width="80%" />
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <Skeleton width={28} height={28} variant="square" />
                                <Skeleton width={28} height={28} variant="square" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}

export function VideosMenuSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-5 h-full relative">
      
      <div className="flex items-center gap-2">
        <Skeleton width={20} height={20} variant="circle" />
        <Skeleton height={16} width={50} />
      </div>

      <div className="flex-1 overflow-y-hidden flex flex-col gap-2 -mx-1 px-1">
        
        <div className="mb-4">
          <Skeleton height={32} variant="square" className="w-full rounded-md" />
        </div>

        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#09090B] border border-white/5 squircle-element overflow-hidden p-2.5 flex items-center gap-3"
            >
              <div className="shrink-0">
                <Skeleton width={80} height={48} variant="square" className="rounded-md" />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                <Skeleton height={12} width="85%" />
                <div className="flex items-center gap-2">
                  <Skeleton height={10} width="35%" />
                  <Skeleton height={10} width={8} />
                  <Skeleton height={10} width="30%" />
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Skeleton width={28} height={28} variant="square" className="rounded-md" />
                <Skeleton width={28} height={28} variant="square" className="rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-white/5 shrink-0 flex justify-center">
        <Skeleton height={10} width="70%" />
      </div>
      
    </div>
  );
}

export function HistoryMenuSkeleton() {
    return (
        <div className="p-4 flex flex-col gap-5">
            {/* Título del menú */}
            <Skeleton height={20} width={120} />

            {/* Botón principal de "Subir / Nuevo" */}
            <Skeleton height={36} variant="square" />

            {/* Sección de la cuadrícula de historial */}
            <div className="space-y-4">
                <Skeleton height={10} width={80} /> {/* Subtítulo (ej. "Recientes") */}
                
                <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-2 p-2 rounded-lg bg-white/3 border border-white/5">
                            {/* Miniatura del proyecto/imagen */}
                            <Skeleton 
                                variant="square" 
                                className="w-full rounded-md" 
                                style={{ aspectRatio: "16/9" } as React.CSSProperties} 
                            />
                            {/* Textos simulados (Nombre y fecha) */}
                            <div className="space-y-1.5 mt-1">
                                <Skeleton height={10} width="80%" />
                                <Skeleton height={8} width="50%" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}