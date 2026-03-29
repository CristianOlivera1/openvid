interface SvgProps {
    color?: string;
    className?: string;
}

// SHAPES
export const RectangleSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="M216 36H40a20 20 0 0 0-20 20v144a20 20 0 0 0 20 20h176a20 20 0 0 0 20-20V56a20 20 0 0 0-20-20m-4 160H44V60h168Z" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

export const CircleSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="M128 20a108 108 0 1 0 108 108A108.12 108.12 0 0 0 128 20m0 192a84 84 0 1 1 84-84a84.09 84.09 0 0 1-84 84" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

export const TriangleSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="M240.26 186.1L152.81 34.23a28.74 28.74 0 0 0-49.62 0L15.74 186.1a27.45 27.45 0 0 0 0 27.71A28.31 28.31 0 0 0 40.55 228h174.9a28.31 28.31 0 0 0 24.79-14.19a27.45 27.45 0 0 0 .02-27.71m-20.8 15.7a4.46 4.46 0 0 1-4 2.2H40.55a4.46 4.46 0 0 1-4-2.2a3.56 3.56 0 0 1 0-3.73L124 46.2a4.75 4.75 0 0 1 8 0l87.45 151.87a3.56 3.56 0 0 1 .01 3.73" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

export const HexagonSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="m225.6 62.64l-88-48.17a19.91 19.91 0 0 0-19.2 0l-88 48.17A20 20 0 0 0 20 80.19v95.62a20 20 0 0 0 10.4 17.55l88 48.17a19.89 19.89 0 0 0 19.2 0l88-48.17a20 20 0 0 0 10.4-17.55V80.19a20 20 0 0 0-10.4-17.55M212 173.44l-84 46l-84-46V82.56l84-46l84 46Z" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

export const DiamondSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="M128 24L24 128l104 104l104-104L128 24zm0 171.32L56.68 128L128 60.68L199.32 128L128 195.32z" fill={color} stroke={color} strokeWidth="6.5" strokeLinejoin="round" />
    </svg>
);

export const SquareSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 100 100" fill="none">
        <rect x="15" y="15" width="70" height="70" fill={color} />
    </svg>
);

// ARROWS
export const ArrowLeftSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M5 12h14M5 12l6 6m-6-6l6-6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const ArrowRightSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M19 12H5m14 0l-6 6m6-6l-6-6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const ArrowDoubleSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="m216.49 184.49l-32 32a12 12 0 0 1-17-17L179 188H48a12 12 0 0 1 0-24h131l-11.52-11.51a12 12 0 0 1 17-17l32 32a12 12 0 0 1 .01 17m-145-64a12 12 0 0 0 17-17L77 92h131a12 12 0 0 0 0-24H77l11.49-11.51a12 12 0 0 0-17-17l-32 32a12 12 0 0 0 0 17Z" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

export const ArrowCurveSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="M236 144a68.07 68.07 0 0 1-68 68H80a12 12 0 0 1 0-24h88a44 44 0 0 0 0-88H61l27.52 27.51a12 12 0 0 1-17 17l-48-48a12 12 0 0 1 0-17l48-48a12 12 0 1 1 17 17L61 76h107a68.08 68.08 0 0 1 68 68" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

export const ArrowDiagonalSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="M204 64v104a12 12 0 0 1-24 0V93L72.49 200.49a12 12 0 0 1-17-17L163 76H88a12 12 0 0 1 0-24h104a12 12 0 0 1 12 12" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

export const ArrowBendSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="m232.49 112.49l-48 48a12 12 0 0 1-17-17L195 116h-67a84.09 84.09 0 0 0-84 84a12 12 0 0 1-24 0A108.12 108.12 0 0 1 128 92h67l-27.49-27.52a12 12 0 0 1 17-17l48 48a12 12 0 0 1-.02 17.01" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

// DECORATIVE
export const StarSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="m12 2l3.104 6.728l7.358.873l-5.44 5.03l1.444 7.268L12 18.28L5.534 21.9l1.444-7.268L1.538 9.6l7.359-.873z" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
);

export const HeartSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M19.071 13.142L13.414 18.8a2 2 0 0 1-2.828 0l-5.657-5.657A5 5 0 1 1 12 6.072a5 5 0 0 1 7.071 7.07" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const LightningSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="M219.71 117.38a12 12 0 0 0-7.25-8.52l-51.18-20.47l10.59-70.61a12 12 0 0 0-20.64-10l-112 120a12 12 0 0 0 4.31 19.33l51.18 20.47l-10.59 70.64a12 12 0 0 0 20.64 10l112-120a12 12 0 0 0 2.94-10.84M113.6 203.55l6.27-41.77a12 12 0 0 0-7.41-12.92l-43.72-17.49l73.66-78.92l-6.27 41.77a12 12 0 0 0 7.41 12.92l43.72 17.49Z" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

export const ChatSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="M128 20a108 108 0 0 0-96.15 157.23L21 209.66A20 20 0 0 0 46.34 235l32.43-10.81A108 108 0 1 0 128 20m0 192a84 84 0 0 1-42.06-11.27a12 12 0 0 0-6-1.62a12.1 12.1 0 0 0-3.8.62l-29.79 9.93l9.93-29.79a12 12 0 0 0-1-9.81A84 84 0 1 1 128 212" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

export const SealSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="M228.75 100.05c-3.52-3.67-7.15-7.46-8.34-10.33c-1.06-2.56-1.14-7.83-1.21-12.47c-.15-10-.34-22.44-9.18-31.27s-21.27-9-31.27-9.18c-4.64-.07-9.91-.15-12.47-1.21c-2.87-1.19-6.66-4.82-10.33-8.34C148.87 20.46 140.05 12 128 12s-20.87 8.46-27.95 15.25c-3.67 3.52-7.46 7.15-10.33 8.34c-2.56 1.06-7.83 1.14-12.47 1.21c-10 .2-22.44.34-31.25 9.2s-9 21.25-9.2 31.25c-.07 4.64-.15 9.91-1.21 12.47c-1.19 2.87-4.82 6.66-8.34 10.33C20.46 107.13 12 116 12 128s8.46 20.87 15.25 28c3.52 3.67 7.15 7.46 8.34 10.33c1.06 2.56 1.14 7.83 1.21 12.47c.15 10 .34 22.44 9.18 31.27s21.27 9 31.27 9.18c4.64.07 9.91.15 12.47 1.21c2.87 1.19 6.66 4.82 10.33 8.34C107.13 235.54 116 244 128 244s20.87-8.46 27.95-15.25c3.67-3.52 7.46-7.15 10.33-8.34c2.56-1.06 7.83-1.14 12.47-1.21c10-.15 22.44-.34 31.27-9.18s9-21.27 9.18-31.27c.07-4.64.15-9.91 1.21-12.47c1.19-2.87 4.82-6.66 8.34-10.33c6.79-7.08 15.25-15.9 15.25-27.95s-8.46-20.87-15.25-27.95m-17.32 39.29c-4.82 5-10.28 10.72-13.2 17.76c-2.81 6.8-2.92 14.16-3 21.29c-.08 5.36-.19 12.71-2.15 14.66s-9.3 2.07-14.66 2.15c-7.13.11-14.49.22-21.29 3c-7 2.91-12.74 8.37-17.76 13.19c-3.59 3.45-8.97 8.61-11.37 8.61s-7.78-5.16-11.34-8.57c-5-4.82-10.72-10.28-17.76-13.2c-6.8-2.81-14.16-2.92-21.29-3c-5.36-.08-12.71-.19-14.66-2.15s-2.07-9.3-2.15-14.66c-.11-7.13-.22-14.49-3-21.29c-2.92-7-8.38-12.73-13.2-17.76c-3.44-3.59-8.6-8.97-8.6-11.37s5.16-7.78 8.57-11.34c4.82-5 10.28-10.72 13.2-17.76c2.81-6.8 2.92-14.16 3-21.29C60.88 72.25 61 64.9 63 63s9.3-2.07 14.66-2.15c7.13-.11 14.49-.22 21.29-3c7-2.91 12.74-8.37 17.76-13.19C120.22 41.16 125.6 36 128 36s7.78 5.16 11.34 8.57c5 4.82 10.72 10.28 17.76 13.2c6.8 2.81 14.16 2.92 21.29 3c5.36.08 12.71.19 14.66 2.15s2.07 9.3 2.15 14.66c.11 7.13.22 14.49 3 21.29c2.92 7 8.38 12.73 13.2 17.76c3.41 3.56 8.57 8.94 8.57 11.34s-5.13 7.81-8.54 11.37" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

export const DropSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 256 256" fill="none">
        <path d="M134.88 6.17a12 12 0 0 0-13.76 0a259 259 0 0 0-42.18 39C50.85 77.43 36 111.62 36 144a92 92 0 0 0 184 0c0-77.36-81.64-135.4-85.12-137.83M128 212a68.07 68.07 0 0 1-68-68c0-33.31 20-63.37 36.7-82.71A249.4 249.4 0 0 1 128 31.11a249.4 249.4 0 0 1 31.3 30.18C176 80.63 196 110.69 196 144a68.07 68.07 0 0 1-68 68m49.62-52.4a52 52 0 0 1-34 34a12.2 12.2 0 0 1-3.6.55a12 12 0 0 1-3.6-23.45a28 28 0 0 0 18.32-18.32a12 12 0 0 1 22.9 7.2Z" fill={color} stroke={color} strokeWidth="6.5" />
    </svg>
);

export const BlobSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M12 3c2.779 0 5.349 1.556 7.243 4.082C20.971 9.388 22 12.341 22 15.098c0 1.47-.293 2.718-.903 3.745c-.603 1.014-1.479 1.758-2.582 2.257c-1.593.718-3.335.9-6.515.9c-3.175 0-4.92-.183-6.514-.9c-1.012-.457-1.833-1.12-2.426-2.01l-.157-.247C2.293 17.815 2 16.569 2 15.098c0-2.757 1.03-5.71 2.757-8.016C6.65 4.556 9.22 3 12 3" fill={color} stroke={color} strokeWidth="0.2" />
    </svg>
);

export const BlobOutlineSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M5.897 20.188C7.567 20.94 9.793 21 12 21s4.434-.059 6.104-.812c.868-.392 1.614-.982 2.133-1.856c.514-.865.763-1.94.763-3.234c0-2.577-.983-5.315-2.557-7.416C16.873 5.588 14.61 4 12 4S7.127 5.588 5.557 7.682C3.983 9.783 3 12.522 3 15.098c0 1.295.249 2.369.763 3.234c.519.874 1.265 1.464 2.134 1.856" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const ScribbleSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 202 101" fill="none">
        <path d="M34.9272 71.7499C49.0201 51.2785 68.216 32.1268 91.8572 23.2776C99.0395 20.5764 108.893 18.507 115.614 23.4811C124.219 30.029 121.034 49.6958 109.17 50.7256C102.732 51.2337 99.075 44.2766 101.055 38.7656C102.052 35.5041 104.469 32.9168 107.238 30.7512C130.482 11.6545 164.891 3.54691 192.813 17.1454" stroke={color} strokeWidth="5.36788" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M53.8641 80.4045C46.2877 81.433 19.9919 97.2132 12.5981 97.9465C14.0167 94.3334 14.9012 90.5939 16.0245 86.7982C17.2743 82.4682 17.7508 78.0682 17.9885 73.7245" stroke={color} strokeWidth="5.36788" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const SplashSvg = ({ color = "currentColor", className }: SvgProps) => (
    <svg className={className} viewBox="0 0 73 71" fill="none">
        <path d="M43.8502 61.802C43.8502 61.802 32.8124 62.7538 22.438 66.6412" stroke={color} strokeWidth="7.83319" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M47.9789 45.5349C34.1731 35.0426 16.1822 30.1244 4.89014 27.1407" stroke={color} strokeWidth="7.83319" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M43.2808 5.48645C43.2808 5.48645 64.6871 28.3272 65.8335 37.4153" stroke={color} strokeWidth="7.83319" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const SVG_COMPONENTS: Record<string, React.FC<SvgProps>> = {
    "rectangle": RectangleSvg,
    "circle": CircleSvg,
    "triangle": TriangleSvg,
    "hexagon": HexagonSvg,
    "diamond": DiamondSvg,
    "square": SquareSvg,
    "arrow-right": ArrowRightSvg,
    "arrow-left": ArrowLeftSvg,
    "arrow-double": ArrowDoubleSvg,
    "arrow-curve": ArrowCurveSvg,
    "arrow-diagonal": ArrowDiagonalSvg,
    "arrow-bend": ArrowBendSvg,
    "star": StarSvg,
    "heart": HeartSvg,
    "lightning": LightningSvg,
    "chat": ChatSvg,
    "seal": SealSvg,
    "drop": DropSvg,
    "blob": BlobSvg,
    "blob-outline": BlobOutlineSvg,
    "scribble": ScribbleSvg,
    "splash": SplashSvg,
};

interface SvgData {
    viewBox: string;
    paths: string;
}

const SVG_DATA: Record<string, SvgData> = {
    "rectangle": {
        viewBox: "0 0 256 256",
        paths: '<path d="M216 36H40a20 20 0 0 0-20 20v144a20 20 0 0 0 20 20h176a20 20 0 0 0 20-20V56a20 20 0 0 0-20-20m-4 160H44V60h168Z" stroke-width="6.5" />'
    },
    "circle": {
        viewBox: "0 0 256 256",
        paths: '<path d="M128 20a108 108 0 1 0 108 108A108.12 108.12 0 0 0 128 20m0 192a84 84 0 1 1 84-84a84.09 84.09 0 0 1-84 84" stroke-width="6.5" />'
    },
    "triangle": {
        viewBox: "0 0 256 256",
        paths: '<path d="M240.26 186.1L152.81 34.23a28.74 28.74 0 0 0-49.62 0L15.74 186.1a27.45 27.45 0 0 0 0 27.71A28.31 28.31 0 0 0 40.55 228h174.9a28.31 28.31 0 0 0 24.79-14.19a27.45 27.45 0 0 0 .02-27.71m-20.8 15.7a4.46 4.46 0 0 1-4 2.2H40.55a4.46 4.46 0 0 1-4-2.2a3.56 3.56 0 0 1 0-3.73L124 46.2a4.75 4.75 0 0 1 8 0l87.45 151.87a3.56 3.56 0 0 1 .01 3.73" stroke-width="6.5" />'
    },
    "hexagon": {
        viewBox: "0 0 256 256",
        paths: '<path d="m225.6 62.64l-88-48.17a19.91 19.91 0 0 0-19.2 0l-88 48.17A20 20 0 0 0 20 80.19v95.62a20 20 0 0 0 10.4 17.55l88 48.17a19.89 19.89 0 0 0 19.2 0l88-48.17a20 20 0 0 0 10.4-17.55V80.19a20 20 0 0 0-10.4-17.55M212 173.44l-84 46l-84-46V82.56l84-46l84 46Z" stroke-width="6.5" />'
    },
    "diamond": {
        viewBox: "0 0 256 256",
        paths: '<path d="M128 24L24 128l104 104l104-104L128 24zm0 171.32L56.68 128L128 60.68L199.32 128L128 195.32z" stroke-width="6.5" stroke-linejoin="round" />'
    },
    "square": {
        viewBox: "0 0 100 100",
        paths: '<rect x="15" y="15" width="70" height="70" />'
    },
    "arrow-right": {
        viewBox: "0 0 24 24",
        paths: '<path d="M19 12H5m14 0l-6 6m6-6l-6-6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />'
    },
    "arrow-left": {
        viewBox: "0 0 24 24",
        paths: '<path d="M5 12h14M5 12l6 6m-6-6l6-6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />'
    },
    "arrow-double": {
        viewBox: "0 0 256 256",
        paths: '<path d="m216.49 184.49l-32 32a12 12 0 0 1-17-17L179 188H48a12 12 0 0 1 0-24h131l-11.52-11.51a12 12 0 0 1 17-17l32 32a12 12 0 0 1 .01 17m-145-64a12 12 0 0 0 17-17L77 92h131a12 12 0 0 0 0-24H77l11.49-11.51a12 12 0 0 0-17-17l-32 32a12 12 0 0 0 0 17Z" stroke-width="6.5" />'
    },
    "arrow-curve": {
        viewBox: "0 0 256 256",
        paths: '<path d="M236 144a68.07 68.07 0 0 1-68 68H80a12 12 0 0 1 0-24h88a44 44 0 0 0 0-88H61l27.52 27.51a12 12 0 0 1-17 17l-48-48a12 12 0 0 1 0-17l48-48a12 12 0 1 1 17 17L61 76h107a68.08 68.08 0 0 1 68 68" stroke-width="6.5" />'
    },
    "arrow-diagonal": {
        viewBox: "0 0 256 256",
        paths: '<path d="M204 64v104a12 12 0 0 1-24 0V93L72.49 200.49a12 12 0 0 1-17-17L163 76H88a12 12 0 0 1 0-24h104a12 12 0 0 1 12 12" stroke-width="6.5" />'
    },
    "arrow-bend": {
        viewBox: "0 0 256 256",
        paths: '<path d="m232.49 112.49l-48 48a12 12 0 0 1-17-17L195 116h-67a84.09 84.09 0 0 0-84 84a12 12 0 0 1-24 0A108.12 108.12 0 0 1 128 92h67l-27.49-27.52a12 12 0 0 1 17-17l48 48a12 12 0 0 1-.02 17.01" stroke-width="6.5" />'
    },
    "star": {
        viewBox: "0 0 24 24",
        paths: '<path d="m12 2l3.104 6.728l7.358.873l-5.44 5.03l1.444 7.268L12 18.28L5.534 21.9l1.444-7.268L1.538 9.6l7.359-.873z" stroke-width="2.5" stroke-linejoin="round" />'
    },
    "heart": {
        viewBox: "0 0 24 24",
        paths: '<path d="M19.071 13.142L13.414 18.8a2 2 0 0 1-2.828 0l-5.657-5.657A5 5 0 1 1 12 6.072a5 5 0 0 1 7.071 7.07" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />'
    },
    "lightning": {
        viewBox: "0 0 256 256",
        paths: '<path d="M219.71 117.38a12 12 0 0 0-7.25-8.52l-51.18-20.47l10.59-70.61a12 12 0 0 0-20.64-10l-112 120a12 12 0 0 0 4.31 19.33l51.18 20.47l-10.59 70.64a12 12 0 0 0 20.64 10l112-120a12 12 0 0 0 2.94-10.84M113.6 203.55l6.27-41.77a12 12 0 0 0-7.41-12.92l-43.72-17.49l73.66-78.92l-6.27 41.77a12 12 0 0 0 7.41 12.92l43.72 17.49Z" stroke-width="6.5" />'
    },
    "chat": {
        viewBox: "0 0 256 256",
        paths: '<path d="M128 20a108 108 0 0 0-96.15 157.23L21 209.66A20 20 0 0 0 46.34 235l32.43-10.81A108 108 0 1 0 128 20m0 192a84 84 0 0 1-42.06-11.27a12 12 0 0 0-6-1.62a12.1 12.1 0 0 0-3.8.62l-29.79 9.93l9.93-29.79a12 12 0 0 0-1-9.81A84 84 0 1 1 128 212" stroke-width="6.5" />'
    },
    "seal": {
        viewBox: "0 0 256 256",
        paths: '<path d="M228.75 100.05c-3.52-3.67-7.15-7.46-8.34-10.33c-1.06-2.56-1.14-7.83-1.21-12.47c-.15-10-.34-22.44-9.18-31.27s-21.27-9-31.27-9.18c-4.64-.07-9.91-.15-12.47-1.21c-2.87-1.19-6.66-4.82-10.33-8.34C148.87 20.46 140.05 12 128 12s-20.87 8.46-27.95 15.25c-3.67 3.52-7.46 7.15-10.33 8.34c-2.56 1.06-7.83 1.14-12.47 1.21c-10 .2-22.44.34-31.25 9.2s-9 21.25-9.2 31.25c-.07 4.64-.15 9.91-1.21 12.47c-1.19 2.87-4.82 6.66-8.34 10.33C20.46 107.13 12 116 12 128s8.46 20.87 15.25 28c3.52 3.67 7.15 7.46 8.34 10.33c1.06 2.56 1.14 7.83 1.21 12.47c.15 10 .34 22.44 9.18 31.27s21.27 9 31.27 9.18c4.64.07 9.91.15 12.47 1.21c2.87 1.19 6.66 4.82 10.33 8.34C107.13 235.54 116 244 128 244s20.87-8.46 27.95-15.25c3.67-3.52 7.46-7.15 10.33-8.34c2.56-1.06 7.83-1.14 12.47-1.21c10-.15 22.44-.34 31.27-9.18s9-21.27 9.18-31.27c.07-4.64.15-9.91 1.21-12.47c1.19-2.87 4.82-6.66 8.34-10.33c6.79-7.08 15.25-15.9 15.25-27.95s-8.46-20.87-15.25-27.95m-17.32 39.29c-4.82 5-10.28 10.72-13.2 17.76c-2.81 6.8-2.92 14.16-3 21.29c-.08 5.36-.19 12.71-2.15 14.66s-9.3 2.07-14.66 2.15c-7.13.11-14.49.22-21.29 3c-7 2.91-12.74 8.37-17.76 13.19c-3.59 3.45-8.97 8.61-11.37 8.61s-7.78-5.16-11.34-8.57c-5-4.82-10.72-10.28-17.76-13.2c-6.8-2.81-14.16-2.92-21.29-3c-5.36-.08-12.71-.19-14.66-2.15s-2.07-9.3-2.15-14.66c-.11-7.13-.22-14.49-3-21.29c-2.92-7-8.38-12.73-13.2-17.76c-3.44-3.59-8.6-8.97-8.6-11.37s5.16-7.78 8.57-11.34c4.82-5 10.28-10.72 13.2-17.76c2.81-6.8 2.92-14.16 3-21.29C60.88 72.25 61 64.9 63 63s9.3-2.07 14.66-2.15c7.13-.11 14.49-.22 21.29-3c7-2.91 12.74-8.37 17.76-13.19C120.22 41.16 125.6 36 128 36s7.78 5.16 11.34 8.57c5 4.82 10.72 10.28 17.76 13.2c6.8 2.81 14.16 2.92 21.29 3c5.36.08 12.71.19 14.66 2.15s2.07 9.3 2.15 14.66c.11 7.13.22 14.49 3 21.29c2.92 7 8.38 12.73 13.2 17.76c3.41 3.56 8.57 8.94 8.57 11.34s-5.13 7.81-8.54 11.37" stroke-width="6.5" />'
    },
    "drop": {
        viewBox: "0 0 256 256",
        paths: '<path d="M134.88 6.17a12 12 0 0 0-13.76 0a259 259 0 0 0-42.18 39C50.85 77.43 36 111.62 36 144a92 92 0 0 0 184 0c0-77.36-81.64-135.4-85.12-137.83M128 212a68.07 68.07 0 0 1-68-68c0-33.31 20-63.37 36.7-82.71A249.4 249.4 0 0 1 128 31.11a249.4 249.4 0 0 1 31.3 30.18C176 80.63 196 110.69 196 144a68.07 68.07 0 0 1-68 68m49.62-52.4a52 52 0 0 1-34 34a12.2 12.2 0 0 1-3.6.55a12 12 0 0 1-3.6-23.45a28 28 0 0 0 18.32-18.32a12 12 0 0 1 22.9 7.2Z" stroke-width="6.5" />'
    },
    "blob": {
        viewBox: "0 0 24 24",
        paths: '<path d="M12 3c2.779 0 5.349 1.556 7.243 4.082C20.971 9.388 22 12.341 22 15.098c0 1.47-.293 2.718-.903 3.745c-.603 1.014-1.479 1.758-2.582 2.257c-1.593.718-3.335.9-6.515.9c-3.175 0-4.92-.183-6.514-.9c-1.012-.457-1.833-1.12-2.426-2.01l-.157-.247C2.293 17.815 2 16.569 2 15.098c0-2.757 1.03-5.71 2.757-8.016C6.65 4.556 9.22 3 12 3" stroke-width="0.2" />'
    },
    "blob-outline": {
        viewBox: "0 0 24 24",
        paths: '<path d="M5.897 20.188C7.567 20.94 9.793 21 12 21s4.434-.059 6.104-.812c.868-.392 1.614-.982 2.133-1.856c.514-.865.763-1.94.763-3.234c0-2.577-.983-5.315-2.557-7.416C16.873 5.588 14.61 4 12 4S7.127 5.588 5.557 7.682C3.983 9.783 3 12.522 3 15.098c0 1.295.249 2.369.763 3.234c.519.874 1.265 1.464 2.134 1.856" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />'
    },
    "scribble": {
        viewBox: "0 0 202 101",
        paths: `
        <path d="M34.9272 71.7499C49.0201 51.2785 68.216 32.1268 91.8572 23.2776C99.0395 20.5764 108.893 18.507 115.614 23.4811C124.219 30.029 121.034 49.6958 109.17 50.7256C102.732 51.2337 99.075 44.2766 101.055 38.7656C102.052 35.5041 104.469 32.9168 107.238 30.7512C130.482 11.6545 164.891 3.54691 192.813 17.1454" stroke-width="5.36" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M53.8641 80.4045C46.2877 81.433 19.9919 97.2132 12.5981 97.9465C14.0167 94.3334 14.9012 90.5939 16.0245 86.7982C17.2743 82.4682 17.7508 78.0682 17.9885 73.7245" stroke-width="5.36" stroke-linecap="round" stroke-linejoin="round" />`
    },
    "splash": {
        viewBox: "0 0 73 71",
        paths: '<path d="M43.8502 61.802C43.8502 61.802 32.8124 62.7538 22.438 66.6412" stroke-width="7.83" stroke-linecap="round" stroke-linejoin="round" /><path d="M47.9789 45.5349C34.1731 35.0426 16.1822 30.1244 4.89014 27.1407" stroke-width="7.83" stroke-linecap="round" stroke-linejoin="round" /><path d="M43.2808 5.48645C43.2808 5.48645 64.6871 28.3272 65.8335 37.4153" stroke-width="7.83" stroke-linecap="round" stroke-linejoin="round" />'
    }
};

export function getSvgDataUrl(svgId: string, color: string): string {
    const svgData = SVG_DATA[svgId];
    if (!svgData) return '';

    const usesStroke = svgData.paths.includes('stroke-linecap') || svgData.paths.includes('stroke-linejoin');

    let styledPath: string;
    if (usesStroke) {
        styledPath = svgData.paths.replace(/<path/g, `<path fill="none" stroke="${color}"`);
    } else {
        styledPath = svgData.paths.replace(/<(path|rect|circle)/g, `<$1 fill="${color}" stroke="${color}"`);
    }

    const svgString = `<svg viewBox="${svgData.viewBox}" xmlns="http://www.w3.org/2000/svg">${styledPath}</svg>`;
    return `data:image/svg+xml;base64,${btoa(svgString)}`;
}
