import { Mockup, DEFAULT_MOCKUP_FEATURES } from "@/types/mockup.types";
import { BraveGlassPreview, BravePreview, BrowserTabGlassPreview, ChromeGlassPreview, ChromePreview, GlassBasePreview, GlassCurvePreview, GlassFullPreview, GlassUIContainerPreview, HardShellPreview, IphoneBasePreview, IphoneSlimPreview, MacosContainerGlassPreview, MacosDarkPreview, MacosGhostGlassPreview, MacosGhostIdePreview, MacosGhostPreview, MacosGlassPreview, MacosPreview, NonePreview, S24UltraPreview, VSCodePreview } from "./mockup-previews";

export const MOCKUPS: Mockup[] = [
    {
        id: "none",
        name: "None",
        category: "browser",
        features: {
            ...DEFAULT_MOCKUP_FEATURES,
            // None no tiene configuraciones
        },
        preview: (
            <NonePreview />
        ),
    },
    {
        id: "macos",
        name: "Macos",
        category: "browser",
        features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: false,
            frameColor: "#f6f6f6",
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 12,
        },
        preview: (
            <MacosPreview />
        ),
    },
    {
        id: "macos-glass",
        name: "Macos glass",
        category: "browser",
        features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: false,
            frameColor: "#f6f6f6",
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 12,
        },
        preview: (
            <MacosGlassPreview />
        ),
    },
    {
        id: "glass-ui-container",
        name: "Glass UI Container",
        category: "browser",
        features: {
            ...DEFAULT_MOCKUP_FEATURES,
            hasCornerRadius: true,
        },
        defaultConfig: {
            cornerRadius: 12,
        },
        preview: (
            <GlassUIContainerPreview />
        ),
    },
    {
        id: "macos-ghost",
        name: "Macos ghost",
        category: "browser",
        features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: false,
            frameColor: "#f6f6f6",
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 12,
        },
        preview: (
            <MacosGhostPreview />
        ),
    },
    {
        id: "macos-ghost-glass",
        name: "Macos ghost glass",
        category: "browser",
        features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: false,
            frameColor: "#f6f6f6",
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 12,
        },
        preview: (
            <MacosGhostGlassPreview />
        ),
    },
    {
        id: "macos-container-glass",
        name: "Macos container glass",
        category: "browser",
        features: {
            ...DEFAULT_MOCKUP_FEATURES,
            hasCornerRadius: true,
            hasHeaderScale: true,
        },
        defaultConfig: {
            cornerRadius: 12,
            headerScale: 70,
        },
        preview: (
            <MacosContainerGlassPreview />
        ),
    },
    {
        id: "brave",
        name: "Brave",
        category: "browser",
        features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: false,
            frameColor: "#f6f6f6",
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 12,
        },
        preview: (
            <BravePreview />
        ),
    },
    {
        id: "brave-glass",
        name: "Brave Glass",
        category: "browser",
        features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: false,
            frameColor: "#f6f6f6",
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 12,
        },
        preview: (
            <BraveGlassPreview />
        ),
    },
    {
        id: "browser-tab-glass",
        name: "Browser Tab Glass",
        category: "browser",
        features: {
            hasDarkMode: true,
            hasFrameColor: false,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: false,
        },
        defaultConfig: {
            darkMode: false,
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 12,
        },
        preview: (
            <BrowserTabGlassPreview />
        ),
    },
    {
        id: "chrome",
        name: "Chrome",
        category: "browser",
        features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: false,
            frameColor: "#f6f6f6",
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 12,
        },
        preview: (
            <ChromePreview />
        ),
    },
    {
        id: "chrome-glass",
        name: "Chrome Glass",
        category: "browser",
        features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: false,
            frameColor: "#f6f6f6",
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 12,
        },
        preview: (
            <ChromeGlassPreview />
        ),
    },

    // Mobile Mockups
    {
        id: "iphone-slim",
        name: "iPhone Slim",
        category: "mobile",
        features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: false, // No tiene URL
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: false,
            frameColor: "#262626",
            headerScale: 60,
            cornerRadius: 28,
        },
        preview: (
            <IphoneSlimPreview />
        ),
    },
    {
        id: "iphone-base",
        name: "iPhone Base",
        category: "mobile",
        preview: (
            <IphoneBasePreview />
        ),
    },
    {
        id: "glass-curve",
        name: "Glass Curve",
        category: "mobile",
        preview: (
            <GlassCurvePreview />
        ),
    },
    {
        id: "glass-base",
        name: "Glass Base",
        category: "mobile",
        preview: (
            <GlassBasePreview />
        ),
    },
    {
        id: "glass-full",
        name: "Glass Full",
        category: "mobile",
        preview: (
            <GlassFullPreview />
        ),
    },
    {
        id: "hard-shell",
        name: "Hard Shell",
        category: "mobile",
        preview: (
            <HardShellPreview />
        ),
    },
    {
        id: "s24-ultra",
        name: "S24 Ultra",
        category: "mobile",
        preview: (
            <S24UltraPreview />
        ),
    },

    // IDE Mockups
    {
        id: "vscode",
        name: "VS CODE",
        category: "ide",
        features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: true,
            frameColor: "#1e1e1e",
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 8,
        },
        preview: (
            <VSCodePreview />
        ),
    },
    {
        id: "macos-dark-ide",
        name: "Macos dark",
        category: "ide",
         features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: true,
            frameColor: "#1e1e1e",
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 8,
        },
        preview: (
            <MacosDarkPreview />
        ),
    },
    {
        id: "macos-ghost-ide",
        name: "Macos Ghost",
        category: "ide",
         features: {
            hasDarkMode: true,
            hasFrameColor: true,
            hasUrl: true,
            hasHeaderScale: true,
            hasCornerRadius: true,
            hasHeaderOpacity: true,
        },
        defaultConfig: {
            darkMode: true,
            frameColor: "#1e1e1e",
            url: "https://openvid.dev",
            headerScale: 60,
            cornerRadius: 8,
        },
        preview: (
            <MacosGhostIdePreview />
        ),
    },
];

export const MOCKUP_CATEGORIES = [
    { id: "all" as const, label: "Todos", icon: "ph:grid-four-bold" },
    { id: "browser" as const, label: "Browser", icon: "hugeicons:browser", bgUrl: "/images/mockups/bg-browser.avif" },
    { id: "mobile" as const, label: "Mobile", icon: "ph:device-mobile-bold", bgUrl: "/images/mockups/bg-mobile.avif" },
    { id: "ide" as const, label: "IDE", icon: "ph:code-bold", bgUrl: "/images/mockups/bg-ide.avif" },
];
