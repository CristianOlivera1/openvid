export type MockupCategory = "browser" | "mobile" | "ide" | "all";

// Configuraciones disponibles para cada mockup
export interface MockupFeatures {
    hasDarkMode: boolean;
    hasFrameColor: boolean;  // Color del encabezado/marco
    hasUrl: boolean;
    hasHeaderScale: boolean; // Escala proporcional del encabezado
    hasHeaderOpacity: boolean; // Opacidad del encabezado/marco
    hasCornerRadius: boolean;
}

// Configuración actual del mockup
export interface MockupConfig {
    darkMode: boolean;
    frameColor: string;      // Color del encabezado/marco  
    url: string;
    headerScale: number;     // Escala del encabezado (50-150, donde 100 es normal)
    headerOpacity: number;   // Opacidad del encabezado (0-100)
    cornerRadius: number;
}

// Definición de un mockup
export interface Mockup {
    id: string;
    name: string;
    category: Exclude<MockupCategory, "all">;
    preview: React.ReactNode;
    features?: MockupFeatures; // Opcional - usa DEFAULT si no está definido
    defaultConfig?: Partial<MockupConfig>;
}

// Estado del sistema de mockups
export interface MockupState {
    enabled: boolean;
    selectedMockupId: string;
    config: MockupConfig;
}

// Props para renderizar un mockup en el canvas
export interface MockupRenderProps {
    children: React.ReactNode;
    config: MockupConfig;
    className?: string;
}

// Configuración por defecto
export const DEFAULT_MOCKUP_CONFIG: MockupConfig = {
    darkMode: false,
    frameColor: "#f6f6f6",
    url: "https://openvid.dev",
    headerScale: 60,        // 100% = tamaño normal
    headerOpacity: 100,     // 100% = totalmente opaco
    cornerRadius: 12,
};

// Features por defecto (ninguna feature habilitada)
export const DEFAULT_MOCKUP_FEATURES: MockupFeatures = {
    hasDarkMode: false,
    hasFrameColor: false,
    hasUrl: false,
    hasHeaderScale: false,
    hasCornerRadius: false,
    hasHeaderOpacity: false,
};

// Helper para obtener las features de un mockup con fallback al default
export function getMockupFeatures(mockup: Mockup | undefined): MockupFeatures {
    return mockup?.features ?? DEFAULT_MOCKUP_FEATURES;
}

// Helper para obtener la config inicial de un mockup
export function getMockupDefaultConfig(mockup: Mockup | undefined): MockupConfig {
    return {
        ...DEFAULT_MOCKUP_CONFIG,
        ...(mockup?.defaultConfig ?? {}),
    };
}
